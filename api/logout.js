const { clearSessionCookie } = require('./_lib/auth');

module.exports = async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ message: 'Method not allowed' });
    }

    response.setHeader('Set-Cookie', clearSessionCookie());

    return response.status(200).json({ message: 'Logged out.' });
};