const { getSessionContext } = require('./_lib/auth');
const { getJson, setJson, isStoreConfigured } = require('./_lib/store');

const ORDERS_KEY = 'cafeone:orders';

function formatCurrency(value) {
    return '$' + Number(value || 0).toFixed(2);
}

function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, function (character) {
        return ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character];
    });
}

function renderItemsHtml(items) {
    return items.map(function (item) {
        var quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
        var lineTotal = Number(item.price || 0) * quantity;

        return '<tr>' +
            '<td style="padding:8px 0;border-bottom:1px solid #eee;">' + escapeHtml(item.name) + '</td>' +
            '<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">' + quantity + '</td>' +
            '<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">' + formatCurrency(item.price) + '</td>' +
            '<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">' + formatCurrency(lineTotal) + '</td>' +
        '</tr>';
    }).join('');
}

function buildOrderEmailHtml(orderId, payload) {
    var customer = payload.customer || {};
    var items = Array.isArray(payload.items) ? payload.items : [];

    return [
        '<h2>New order received</h2>',
        '<p><strong>Order ID:</strong> ' + escapeHtml(orderId) + '</p>',
        '<p><strong>Customer:</strong> ' + escapeHtml(customer.firstName) + ' ' + escapeHtml(customer.lastName) + '</p>',
        '<p><strong>Email:</strong> ' + escapeHtml(customer.email) + '</p>',
        '<p><strong>Phone:</strong> ' + escapeHtml(customer.phone) + '</p>',
        '<p><strong>Address:</strong> ' + escapeHtml(customer.address1) + (customer.address2 ? ', ' + escapeHtml(customer.address2) : '') + ', ' + escapeHtml(customer.city) + ', ' + escapeHtml(customer.state) + ', ' + escapeHtml(customer.country) + ' ' + escapeHtml(customer.zip) + '</p>',
        '<p><strong>Payment:</strong> Cash on Delivery</p>',
        '<p><strong>Notes:</strong> ' + escapeHtml(payload.orderNotes || 'None') + '</p>',
        '<table style="width:100%;border-collapse:collapse;margin-top:16px;">',
        '<thead>',
        '<tr>',
        '<th style="text-align:left;padding:8px 0;border-bottom:2px solid #ddd;">Item</th>',
        '<th style="text-align:center;padding:8px 0;border-bottom:2px solid #ddd;">Qty</th>',
        '<th style="text-align:right;padding:8px 0;border-bottom:2px solid #ddd;">Price</th>',
        '<th style="text-align:right;padding:8px 0;border-bottom:2px solid #ddd;">Total</th>',
        '</tr>',
        '</thead>',
        '<tbody>',
        renderItemsHtml(items),
        '</tbody>',
        '</table>',
        '<p style="margin-top:16px;"><strong>Subtotal:</strong> ' + formatCurrency(payload.subtotal) + '</p>',
        '<p><strong>Total:</strong> ' + formatCurrency(payload.total) + '</p>'
    ].join('');
}

function buildOrderEmailText(orderId, payload) {
    var customer = payload.customer || {};
    var items = Array.isArray(payload.items) ? payload.items : [];
    var lines = [
        'New order received',
        'Order ID: ' + orderId,
        'Customer: ' + (customer.firstName || '') + ' ' + (customer.lastName || ''),
        'Email: ' + (customer.email || ''),
        'Phone: ' + (customer.phone || ''),
        'Address: ' + [customer.address1, customer.address2, customer.city, customer.state, customer.country, customer.zip].filter(Boolean).join(', '),
        'Payment: Cash on Delivery',
        'Notes: ' + (payload.orderNotes || 'None'),
        'Items:'
    ];

    items.forEach(function (item) {
        var quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
        var lineTotal = Number(item.price || 0) * quantity;

        lines.push('- ' + item.name + ' x ' + quantity + ' | ' + formatCurrency(item.price) + ' | ' + formatCurrency(lineTotal));
    });

    lines.push('Subtotal: ' + formatCurrency(payload.subtotal));
    lines.push('Total: ' + formatCurrency(payload.total));

    return lines.join('\n');
}

module.exports = async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ message: 'Method not allowed' });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const orderToEmail = process.env.ORDER_TO_EMAIL;
    const orderFromEmail = process.env.ORDER_FROM_EMAIL;

    if (!resendApiKey || !orderToEmail || !orderFromEmail) {
        return response.status(500).json({
            message: 'Email settings are missing. Set RESEND_API_KEY, ORDER_TO_EMAIL, and ORDER_FROM_EMAIL.'
        });
    }

    let payload;

    try {
        payload = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    } catch (error) {
        return response.status(400).json({ message: 'Invalid JSON body.' });
    }

    if (!payload || !payload.customer || !Array.isArray(payload.items) || payload.items.length === 0) {
        return response.status(400).json({ message: 'Invalid order payload.' });
    }

    if (!isStoreConfigured()) {
        return response.status(500).json({ message: 'Order storage is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.' });
    }

    const session = await getSessionContext(request);

    if (!session) {
        return response.status(401).json({ message: 'You must sign in with an approved account before placing orders.' });
    }

    const customer = payload.customer;
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address1', 'city', 'state', 'country', 'zip'];

    for (const field of requiredFields) {
        if (!String(customer[field] || '').trim()) {
            return response.status(400).json({ message: `Missing required field: ${field}` });
        }
    }

    const orderId = `CF-${Date.now().toString(36).toUpperCase()}`;
    const subject = `New COD order ${orderId} - ${customer.firstName} ${customer.lastName}`;

    const orderRecord = {
        orderId: orderId,
        status: 'new',
        createdAt: new Date().toISOString(),
        submittedBy: session.email,
        submittedRole: session.role,
        cafeName: session.cafeName || '',
        customer: customer,
        items: payload.items,
        subtotal: payload.subtotal,
        total: payload.total,
        orderNotes: payload.orderNotes || ''
    };

    const storedOrders = await getJson(ORDERS_KEY, []);
    const nextOrders = Array.isArray(storedOrders) ? storedOrders.slice() : [];
    nextOrders.unshift(orderRecord);
    await setJson(ORDERS_KEY, nextOrders);

    const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
            from: orderFromEmail,
            to: [orderToEmail],
            subject,
            html: buildOrderEmailHtml(orderId, payload),
            text: buildOrderEmailText(orderId, payload),
            reply_to: customer.email
        })
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
        return response.status(500).json({
            message: resendData.message || 'Failed to send order email.'
        });
    }

    return response.status(200).json({
        message: 'Order emailed successfully.',
        orderId
    });
}