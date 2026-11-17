const { getSessionContext } = require('./_lib/auth');
const { getJson } = require('./_lib/store');

const ORDERS_KEY = 'cafeone:orders';

module.exports = async function handler(request, response) {
    if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        return response.status(405).json({ message: 'Method not allowed' });
    }

    const session = await getSessionContext(request);

    if (!session) {
        return response.status(401).json({ message: 'You must sign in before viewing purchase history.' });
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        return response.status(500).json({ message: 'Order storage is not configured.' });
    }

    const storedOrders = await getJson(ORDERS_KEY, []);
    const orders = Array.isArray(storedOrders) ? storedOrders : [];
    const visibleOrders = session.role === 'admin' ? orders : orders.filter(function (order) {
        return String(order.submittedBy || '').toLowerCase() === String(session.email || '').toLowerCase();
    });
    const purchases = [];

    visibleOrders.forEach(function (order) {
        const orderItems = Array.isArray(order.items) ? order.items : [];

        orderItems.forEach(function (item, index) {
            purchases.push({
                id: String(order.orderId || order.createdAt || 'order') + '-' + index,
                date: String(order.createdAt || '').slice(0, 10),
                item: String(item.name || '').trim(),
                quantity: Number(item.quantity || 0),
                unit: String(item.unit || 'unit'),
                price: Number(item.price || 0)
            });
        });
    });

    return response.status(200).json({ purchases: purchases.filter(function (purchase) {
        return purchase.item && purchase.quantity > 0;
    }) });
};
