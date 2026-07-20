const { getSessionContext } = require('./_lib/auth');

module.exports = async function handler(request, response) {
    if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        return response.status(405).json({ message: 'Method not allowed' });
    }

    const session = await getSessionContext(request);

    if (!session) {
        return response.status(401).json({ authenticated: false });
    }

    return response.status(200).json({
        authenticated: true,
        email: session.email,
        role: session.role || 'cafe',
        cafeName: session.cafeName || ''
    });
};