(function ($) {
    'use strict';

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

    function setStatus(message, isError) {
        $('#admin-status')
            .text(message)
            .toggleClass('text-danger', Boolean(isError))
            .toggleClass('text-success', !Boolean(isError));
    }

    async function api(url, options) {
        var response = await fetch(url, Object.assign({
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            }
        }, options || {}));

        var data = null;

        try {
            data = await response.json();
        } catch (error) {
            data = null;
        }

        if (!response.ok) {
            throw new Error((data && data.message) || 'Request failed.');
        }

        return data;
    }

    function renderUsers(users) {
        var $body = $('#approved-users-body');
        var rows = Array.isArray(users) ? users : [];

        $body.empty();

        if (rows.length === 0) {
            $body.append('<tr><td colspan="5" class="text-center py-4">No approved users yet.</td></tr>');
            return;
        }

        rows.forEach(function (user) {
            $body.append([
                '<tr data-email="' + escapeHtml(user.email) + '">',
                '<td>' + escapeHtml(user.email) + '</td>',
                '<td>' + escapeHtml(user.cafeName || '') + '</td>',
                '<td>',
                user.active === false ? '<span class="pill pill--danger">Inactive</span>' : '<span class="pill pill--success">Active</span>',
                '</td>',
                '<td>' + escapeHtml((user.createdAt || '').slice(0, 10)) + '</td>',
                '<td><button class="site-btn js-remove-user" type="button" data-email="' + escapeHtml(user.email) + '">Remove</button></td>',
                '</tr>'
            ].join(''));
        });
    }

    function renderOrders(orders) {
        var $body = $('#orders-body');
        var rows = Array.isArray(orders) ? orders : [];

        $body.empty();

        if (rows.length === 0) {
            $body.append('<tr><td colspan="5" class="text-center py-4">No orders received yet.</td></tr>');
            $('#stat-orders').text('0');
            $('#stat-last-total').text(formatCurrency(0));
            return;
        }

        $('#stat-orders').text(String(rows.length));
        $('#stat-last-total').text(formatCurrency(rows[0].total || 0));

        rows.slice(0, 25).forEach(function (order) {
            var customerName = [order.customer && order.customer.firstName, order.customer && order.customer.lastName].filter(Boolean).join(' ');

            $body.append([
                '<tr>',
                '<td>' + escapeHtml(order.orderId || '') + '<div class="admin-note">' + escapeHtml((order.createdAt || '').replace('T', ' ').slice(0, 19)) + '</div></td>',
                '<td>' + escapeHtml(order.cafeName || order.submittedBy || '') + '</td>',
                '<td>' + escapeHtml(customerName || '') + '<div class="admin-note">' + escapeHtml(order.customer && order.customer.phone || '') + '</div></td>',
                '<td>' + formatCurrency(order.total || 0) + '</td>',
                '<td><span class="pill pill--success">' + escapeHtml(order.status || 'new') + '</span></td>',
                '</tr>'
            ].join(''));
        });
    }

    async function loadDashboard() {
        try {
            const session = await api('/api/session', { method: 'GET' });

            if (!session.authenticated || session.role !== 'admin') {
                window.location.href = './login.html?next=admin.html';
                return;
            }

            $('#admin-email').text(session.email);

            let users = [];
            let orders = [];

            try {
                const usersResponse = await api('/api/admin/approved-users', { method: 'GET' });
                users = Array.isArray(usersResponse.users) ? usersResponse.users : [];
            } catch (usersError) {
                setStatus(usersError.message || 'Unable to load approved users.', true);
            }

            try {
                const ordersResponse = await api('/api/admin/orders', { method: 'GET' });
                orders = Array.isArray(ordersResponse.orders) ? ordersResponse.orders : [];
            } catch (ordersError) {
                setStatus(ordersError.message || 'Unable to load orders.', true);
            }

            const activeUsers = users.filter(function (user) {
                return user.active !== false;
            });

            $('#stat-users').text(String(users.length));
            $('#stat-active-users').text(String(activeUsers.length));
            renderUsers(users);
            renderOrders(orders);
        } catch (error) {
            setStatus(error.message || 'Unable to load admin dashboard.', true);
        }
    }

    async function saveUser(event) {
        event.preventDefault();

        try {
            const payload = {
                email: $('#approved-user-email').val(),
                cafeName: $('#approved-user-name').val(),
                active: $('#approved-user-active').is(':checked')
            };

            await api('/api/admin/approved-users', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setStatus('Approved user saved.', false);
            $('#approved-user-form')[0].reset();
            $('#approved-user-active').prop('checked', true);
            await loadDashboard();
        } catch (error) {
            setStatus(error.message || 'Unable to save approved user.', true);
        }
    }

    async function removeUser(email) {
        try {
            await api('/api/admin/approved-users', {
                method: 'DELETE',
                body: JSON.stringify({ email: email })
            });

            setStatus('Approved user removed.', false);
            await loadDashboard();
        } catch (error) {
            setStatus(error.message || 'Unable to remove approved user.', true);
        }
    }

    async function logout() {
        try {
            await api('/api/logout', { method: 'POST' });
        } finally {
            window.location.href = './login.html?next=admin.html';
        }
    }

    $(document).on('submit', '#approved-user-form', saveUser);
    $(document).on('click', '.js-remove-user', function () {
        var email = $(this).data('email');

        if (email && window.confirm('Remove ' + email + ' from approved users?')) {
            removeUser(email);
        }
    });
    $(document).on('click', '#refresh-users', loadDashboard);
    $(document).on('click', '#refresh-orders', loadDashboard);
    $(document).on('click', '#admin-logout', logout);

    $(window).on('load', loadDashboard);
})(jQuery);
