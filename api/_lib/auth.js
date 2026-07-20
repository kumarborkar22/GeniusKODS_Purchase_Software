const crypto = require('crypto');
const { getJson, setJson, isStoreConfigured } = require('./store');

const APPROVED_USERS_KEY = 'cafeone:approved-users';
const ADMIN_USERS_KEY = 'cafeone:admin-users';

function parseCookies(cookieHeader) {
    return String(cookieHeader || '').split(';').reduce(function (cookies, part) {
        var splitIndex = part.indexOf('=');

        if (splitIndex === -1) {
            return cookies;
        }

        var key = part.slice(0, splitIndex).trim();
        var value = part.slice(splitIndex + 1).trim();

        cookies[key] = decodeURIComponent(value);

        return cookies;
    }, {});
}

function getApprovedUsers() {
    return String(process.env.APPROVED_USERS || '')
        .split(',')
        .map(function (email) {
            return email.trim().toLowerCase();
        })
        .filter(Boolean);
}

function getAdminUsers() {
    return String(process.env.ADMIN_USERS || '')
        .split(',')
        .map(function (email) {
            return email.trim().toLowerCase();
        })
        .filter(Boolean);
}

function isApprovedEmail(email) {
    return getApprovedUsers().indexOf(String(email || '').trim().toLowerCase()) !== -1;
}

function isAdminEmail(email) {
    return getAdminUsers().indexOf(String(email || '').trim().toLowerCase()) !== -1;
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function normalizeApprovedUser(user) {
    return {
        email: normalizeEmail(user && user.email),
        cafeName: String((user && user.cafeName) || '').trim(),
        active: user && typeof user.active === 'boolean' ? user.active : true,
        createdAt: (user && user.createdAt) || new Date().toISOString()
    };
}

async function seedApprovedUsers() {
    const storedUsers = await getJson(APPROVED_USERS_KEY, null);

    if (Array.isArray(storedUsers) && storedUsers.length > 0) {
        return storedUsers.map(normalizeApprovedUser).filter(function (user) {
            return Boolean(user.email);
        });
    }

    const seededUsers = getApprovedUsers().map(function (email) {
        return normalizeApprovedUser({
            email: email,
            cafeName: email,
            active: true,
            createdAt: new Date().toISOString()
        });
    });

    if (seededUsers.length > 0 && isStoreConfigured()) {
        await setJson(APPROVED_USERS_KEY, seededUsers);
    }

    return seededUsers;
}

async function getApprovedUserList() {
    return seedApprovedUsers();
}

async function findApprovedUser(email) {
    const approvedUsers = await getApprovedUserList();
    const normalizedEmail = normalizeEmail(email);

    return approvedUsers.find(function (user) {
        return user.email === normalizedEmail && user.active !== false;
    }) || null;
}

async function upsertApprovedUser(user) {
    if (!isStoreConfigured()) {
        throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured for admin writes.');
    }

    const approvedUsers = await getApprovedUserList();
    const normalizedUser = normalizeApprovedUser(user);
    const nextUsers = approvedUsers.filter(function (existingUser) {
        return existingUser.email !== normalizedUser.email;
    });

    nextUsers.push(normalizedUser);

    await setJson(APPROVED_USERS_KEY, nextUsers);

    return normalizedUser;
}

async function removeApprovedUser(email) {
    if (!isStoreConfigured()) {
        throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured for admin writes.');
    }

    const approvedUsers = await getApprovedUserList();
    const normalizedEmail = normalizeEmail(email);
    const nextUsers = approvedUsers.filter(function (user) {
        return user.email !== normalizedEmail;
    });

    await setJson(APPROVED_USERS_KEY, nextUsers);

    return nextUsers;
}

function base64UrlEncode(value) {
    return Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(value) {
    var normalizedValue = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    var padding = normalizedValue.length % 4;

    if (padding) {
        normalizedValue += '='.repeat(4 - padding);
    }

    return Buffer.from(normalizedValue, 'base64').toString('utf8');
}

function createSessionToken(email, role) {
    var secret = process.env.SESSION_SECRET;

    if (!secret) {
        throw new Error('SESSION_SECRET is not configured');
    }

    var payload = {
        email: normalizeEmail(email),
        role: role === 'admin' ? 'admin' : 'cafe',
        exp: Date.now() + (24 * 60 * 60 * 1000)
    };
    var encodedPayload = base64UrlEncode(JSON.stringify(payload));
    var signature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('hex');

    return encodedPayload + '.' + signature;
}

function verifySessionToken(token) {
    var secret = process.env.SESSION_SECRET;

    if (!secret || !token) {
        return null;
    }

    var parts = String(token).split('.');

    if (parts.length !== 2) {
        return null;
    }

    var encodedPayload = parts[0];
    var providedSignature = parts[1];
    var expectedSignature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) {
        return null;
    }

    try {
        var payload = JSON.parse(base64UrlDecode(encodedPayload));

        if (!payload.email || payload.exp < Date.now()) {
            return null;
        }

        return payload;
    } catch (error) {
        return null;
    }
}

async function getSessionContext(request) {
    const cookies = parseCookies(request && request.headers && request.headers.cookie);
    const session = verifySessionToken(cookies.cafeone_session);

    if (!session) {
        return null;
    }

    if (session.role === 'admin') {
        if (!isAdminEmail(session.email)) {
            return null;
        }

        return session;
    }

    const approvedUser = await findApprovedUser(session.email);

    if (!approvedUser) {
        return null;
    }

    return Object.assign({}, session, {
        cafeName: approvedUser.cafeName,
        approvedUser: approvedUser
    });
}

function buildSessionCookie(token) {
    var cookieParts = [
        'cafeone_session=' + encodeURIComponent(token),
        'HttpOnly',
        'Path=/',
        'SameSite=Lax',
        'Max-Age=' + String(24 * 60 * 60)
    ];

    if (process.env.VERCEL_ENV || process.env.NODE_ENV === 'production') {
        cookieParts.push('Secure');
    }

    return cookieParts.join('; ');
}

function clearSessionCookie() {
    return 'cafeone_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0';
}

module.exports = {
    parseCookies: parseCookies,
    isApprovedEmail: isApprovedEmail,
    isAdminEmail: isAdminEmail,
    getApprovedUserList: getApprovedUserList,
    findApprovedUser: findApprovedUser,
    upsertApprovedUser: upsertApprovedUser,
    removeApprovedUser: removeApprovedUser,
    createSessionToken: createSessionToken,
    verifySessionToken: verifySessionToken,
    getSessionContext: getSessionContext,
    buildSessionCookie: buildSessionCookie,
    clearSessionCookie: clearSessionCookie
};