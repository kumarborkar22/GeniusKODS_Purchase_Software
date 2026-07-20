const { getSessionContext } = require('../_lib/auth');
const { getJson } = require('../_lib/store');

const ORDERS_KEY = 'cafeone:orders';

module.exports = async function handler(request, response) {
    const session = await getSessionContext(request);

    if (!session || session.role !== 'admin') {
        return response.status(401).json({ message: 'Admin access required.' });
    }

    if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        return response.status(405).json({ message: 'Method not allowed' });
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        return response.status(500).json({ message: 'Order storage is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.' });
    }

    const orders = await getJson(ORDERS_KEY, []);

    return response.status(200).json({ orders: Array.isArray(orders) ? orders : [] });
};