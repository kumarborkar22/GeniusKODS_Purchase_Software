const { buildSessionCookie, createSessionToken, findApprovedUser, isAdminEmail } = require('./_lib/auth');

module.exports = async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ message: 'Method not allowed' });
    }

    let payload;

    try {
        payload = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    } catch (error) {
        return response.status(400).json({ message: 'Invalid JSON body.' });
    }

    const email = String((payload && payload.email) || '').trim().toLowerCase();
    const accessCode = String((payload && payload.accessCode) || '').trim();

    if (!email || !accessCode) {
        return response.status(400).json({ message: 'Email and access code are required.' });
    }

    const approvedUser = await findApprovedUser(email);

    const isAdmin = isAdminEmail(email);

    if (!approvedUser && !isAdmin) {
        return response.status(401).json({ message: 'This email is not approved.' });
    }

    if (accessCode !== String(process.env.SITE_ACCESS_CODE || '').trim()) {
        return response.status(401).json({ message: 'Invalid access code.' });
    }

    const token = createSessionToken(email, isAdmin ? 'admin' : 'cafe');

    response.setHeader('Set-Cookie', buildSessionCookie(token));

    return response.status(200).json({
        message: 'Login successful.',
        email: email,
        role: isAdmin ? 'admin' : 'cafe'
    });
};