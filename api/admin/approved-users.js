const { getSessionContext, getApprovedUserList, upsertApprovedUser, removeApprovedUser } = require('../_lib/auth');
const { isStoreConfigured } = require('../_lib/store');

module.exports = async function handler(request, response) {
    const session = await getSessionContext(request);

    if (!session || session.role !== 'admin') {
        return response.status(401).json({ message: 'Admin access required.' });
    }

    if (request.method === 'GET') {
        const users = await getApprovedUserList();
        return response.status(200).json({ users: users });
    }

    if (!isStoreConfigured()) {
        return response.status(500).json({ message: 'Approved-user storage is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.' });
    }

    let payload;

    try {
        payload = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    } catch (error) {
        return response.status(400).json({ message: 'Invalid JSON body.' });
    }

    if (request.method === 'POST') {
        const email = String((payload && payload.email) || '').trim().toLowerCase();

        if (!email) {
            return response.status(400).json({ message: 'Email is required.' });
        }

        const cafeName = String((payload && payload.cafeName) || '').trim() || email;
        const active = payload && typeof payload.active === 'boolean' ? payload.active : true;

        const user = await upsertApprovedUser({
            email: email,
            cafeName: cafeName,
            active: active,
            createdAt: new Date().toISOString()
        });

        return response.status(200).json({ message: 'Approved user saved.', user: user });
    }

    if (request.method === 'DELETE') {
        const email = String((payload && payload.email) || '').trim().toLowerCase();

        if (!email) {
            return response.status(400).json({ message: 'Email is required.' });
        }

        const users = await removeApprovedUser(email);

        return response.status(200).json({ message: 'Approved user removed.', users: users });
    }

    response.setHeader('Allow', 'GET, POST, DELETE');
    return response.status(405).json({ message: 'Method not allowed' });
};