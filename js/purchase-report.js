(function () {
    'use strict';

    var storageKey = 'cafeone-purchase-history';
    var monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    var today = new Date();
    var currentMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    var seededPurchases = [
        { id: 'tomato-2026-06-08', date: '2026-06-08', item: 'Tomato', quantity: 18, unit: 'kg', price: 36 },
        { id: 'tomato-2026-07-07', date: '2026-07-07', item: 'Tomato', quantity: 22, unit: 'kg', price: 42 },
        { id: 'tomato-2026-08-05', date: '2026-08-05', item: 'Tomato', quantity: 20, unit: 'kg', price: 48 },
        { id: 'tomato-2026-09-06', date: '2026-09-06', item: 'Tomato', quantity: 24, unit: 'kg', price: 40 },
        { id: 'tomato-2026-10-04', date: '2026-10-04', item: 'Tomato', quantity: 21, unit: 'kg', price: 44 },
        { id: 'tomato-2026-11-03', date: '2026-11-03', item: 'Tomato', quantity: 16, unit: 'kg', price: 52 }
    ];
    var purchaseItems = [
        'Tomato', 'Potato', 'Onion', 'Capsicum', 'Lettuce', 'Cabbage', 'Cucumber',
        'Carrot', 'Beetroot', 'Mushroom', 'Paneer', 'Sweet Corn', 'Garlic',
        'Ginger', 'Coriander', 'Mint', 'Lemon', 'Banana', 'Apple', 'Orange',
        'Oil', 'Mayo', 'Bread', 'Burger Patty', 'Momos'
    ];

    function formatCurrency(value) {
        return '\u20b9' + Number(value || 0).toFixed(2);
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, function (character) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[character];
        });
    }

    function readPurchases() {
        try {
            var stored = localStorage.getItem(storageKey);
            var parsed = stored ? JSON.parse(stored) : seededPurchases;
            return Array.isArray(parsed) ? parsed : seededPurchases.slice();
        } catch (error) {
            return seededPurchases.slice();
        }
    }

    function savePurchases(purchases) {
        localStorage.setItem(storageKey, JSON.stringify(purchases));
    }

    function setDataStatus(message) {
        document.getElementById('report-data-status').textContent = message;
    }

    async function loadOnlinePurchases() {
        if (window.location.protocol === 'file:') {
            setDataStatus('Showing browser-saved data. Open the deployed site to load submitted orders.');
            return;
        }

        try {
            var response = await fetch('/api/purchases', {
                method: 'GET',
                credentials: 'same-origin'
            });
            var responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || 'Unable to load online purchase data.');
            }

            var onlinePurchases = Array.isArray(responseData.purchases) ? responseData.purchases : [];
            var storedPurchases = readPurchases();
            var localPurchases = storedPurchases.filter(function (purchase) {
                return String(purchase.id || '').indexOf('tomato-2026-') !== 0 &&
                    String(purchase.id || '').indexOf('order-') !== 0;
            });

            savePurchases(localPurchases.concat(onlinePurchases));
            render();
            setDataStatus(onlinePurchases.length
                ? 'Showing submitted orders and browser-saved entries.'
                : 'No submitted orders found yet. Add a purchase entry below.');
        } catch (error) {
            setDataStatus((error.message || 'Unable to load online purchase data.') +
                ' Showing browser-saved entries instead.');
        }
    }

    function monthLabel(month) {
        var parts = month.split('-');
        return monthNames[Number(parts[1]) - 1] + ' ' + parts[0];
    }

    function getPurchasesForMonth(purchases, month) {
        return purchases.filter(function (purchase) {
            return String(purchase.date || '').slice(0, 7) === month;
        }).sort(function (first, second) {
            return String(second.date).localeCompare(String(first.date));
        });
    }

    function getSelectedMonth() {
        return document.getElementById('report-month').value || currentMonth;
    }

    function renderMonthOptions(purchases) {
        var monthSelect = document.getElementById('report-month');
        var months = purchases.map(function (purchase) {
            return String(purchase.date).slice(0, 7);
        });
        months.push(currentMonth);
        months = months.filter(function (month, index) {
            return month && months.indexOf(month) === index;
        }).sort().reverse();
        monthSelect.innerHTML = months.map(function (month) {
            return '<option value="' + month + '">' + monthLabel(month) + '</option>';
        }).join('');
        monthSelect.value = months.indexOf(currentMonth) !== -1 ? currentMonth : months[0];
    }

    function renderItemOptions(purchases) {
        var itemSelect = document.getElementById('report-item');
        var current = itemSelect.value;
        var items = purchaseItems.concat(purchases.map(function (purchase) {
            return purchase.item;
        })).filter(function (item, index, list) {
            return item && list.indexOf(item) === index;
        }).sort();
        itemSelect.innerHTML = '<option value="all">All items</option>' + items.map(function (item) {
            return '<option value="' + escapeHtml(item) + '">' + escapeHtml(item) + '</option>';
        }).join('');
        if (items.indexOf(current) !== -1) {
            itemSelect.value = current;
        } else {
            itemSelect.value = 'all';
        }
        document.getElementById('purchase-item-options').innerHTML = items.map(function (item) {
            return '<option value="' + escapeHtml(item) + '"></option>';
        }).join('');
    }

    function getSelectedItem() {
        return document.getElementById('report-item').value || 'all';
    }

    function getVisiblePurchases(purchases, month) {
        var selectedItem = getSelectedItem();
        return getPurchasesForMonth(purchases, month).filter(function (purchase) {
            return selectedItem === 'all' || purchase.item === selectedItem;
        });
    }

    function renderSummary(monthPurchases) {
        var quantity = monthPurchases.reduce(function (total, purchase) {
            return total + Number(purchase.quantity || 0);
        }, 0);
        var spent = monthPurchases.reduce(function (total, purchase) {
            return total + Number(purchase.quantity || 0) * Number(purchase.price || 0);
        }, 0);
        var average = quantity ? spent / quantity : 0;
        var units = monthPurchases.map(function (purchase) {
            return purchase.unit;
        }).filter(function (unit, index, list) {
            return list.indexOf(unit) === index;
        });
        var unitLabel = units.length === 1 ? units[0] : 'mixed units';
        document.getElementById('report-quantity').textContent = quantity.toFixed(2).replace(/\.00$/, '') + ' ' + unitLabel;
        document.getElementById('report-spent').textContent = formatCurrency(spent);
        document.getElementById('report-average').textContent = formatCurrency(average) + '/' + unitLabel;
        document.getElementById('report-entries').textContent = String(monthPurchases.length);
    }

    function renderChart(purchases) {
        var item = getSelectedItem();
        var chart = document.getElementById('report-chart');
        var months = [];
        for (var offset = 5; offset >= 0; offset -= 1) {
            var date = new Date(today.getFullYear(), today.getMonth() - offset, 1);
            months.push(date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0'));
        }
        var values = months.map(function (month) {
            return purchases.filter(function (purchase) {
                return (item === 'all' || purchase.item === item) && String(purchase.date).slice(0, 7) === month;
            }).reduce(function (total, purchase) {
                return total + Number(purchase.quantity || 0);
            }, 0);
        });
        var maximum = Math.max.apply(Math, values.concat([1]));
        document.getElementById('report-chart-title').textContent = (item === 'all' ? 'All items' : item) + ' quantity by month';
        chart.innerHTML = months.map(function (month, index) {
            var height = Math.max(4, Math.round((values[index] / maximum) * 160));
            return '<div class="report-chart__column">' +
                '<span class="report-chart__value">' + (values[index] ? values[index] : 0) + '</span>' +
                '<div class="report-chart__bar" style="height:' + height + 'px"></div>' +
                '<span class="report-chart__label">' + monthNames[Number(month.slice(5, 7)) - 1].slice(0, 3) + '</span>' +
                '</div>';
        }).join('');
    }

    function renderTable(purchases) {
        var selectedMonth = getSelectedMonth();
        var monthPurchases = getVisiblePurchases(purchases, selectedMonth);
        var body = document.getElementById('report-table-body');
        document.getElementById('report-table-title').textContent = 'Purchases in ' + monthLabel(selectedMonth);
        renderSummary(monthPurchases);
        if (!monthPurchases.length) {
            body.innerHTML = '<tr><td class="report-empty" colspan="6">No purchases recorded for this month yet.</td></tr>';
            return;
        }
        body.innerHTML = monthPurchases.map(function (purchase) {
            var total = Number(purchase.quantity || 0) * Number(purchase.price || 0);
            return '<tr><td>' + escapeHtml(purchase.date) + '</td><td>' + escapeHtml(purchase.item) + '</td><td>' +
                escapeHtml(purchase.quantity) + ' ' + escapeHtml(purchase.unit) + '</td><td>' + formatCurrency(purchase.price) +
                '</td><td>' + formatCurrency(total) + '</td><td><button class="report-delete" type="button" data-id="' +
                purchase.id + '">Remove</button></td></tr>';
        }).join('');
    }

    function render() {
        var purchases = readPurchases();
        renderMonthOptions(purchases);
        renderItemOptions(purchases);
        renderTable(purchases);
        renderChart(purchases);
    }

    document.getElementById('purchase-date').value = currentMonth + '-01';
    document.getElementById('report-month').addEventListener('change', render);
    document.getElementById('report-item').addEventListener('change', function () {
        var purchases = readPurchases();
        renderTable(purchases);
        renderChart(purchases);
    });
    document.getElementById('purchase-form').addEventListener('submit', function (event) {
        event.preventDefault();
        var date = document.getElementById('purchase-date').value;
        var purchases = readPurchases();
        purchases.push({
            id: 'purchase-' + Date.now(),
            date: date,
            item: document.getElementById('purchase-item').value.trim(),
            quantity: Number(document.getElementById('purchase-quantity').value),
            unit: document.getElementById('purchase-unit').value,
            price: Number(document.getElementById('purchase-price').value)
        });
        savePurchases(purchases);
        document.getElementById('purchase-form').reset();
        document.getElementById('purchase-date').value = date;
        render();
        document.getElementById('report-month').value = date.slice(0, 7);
        renderTable(readPurchases());
    });
    document.getElementById('report-table-body').addEventListener('click', function (event) {
        if (!event.target.classList.contains('report-delete')) {
            return;
        }
        var id = event.target.getAttribute('data-id');
        savePurchases(readPurchases().filter(function (purchase) {
            return purchase.id !== id;
        }));
        render();
    });

    render();
    loadOnlinePurchases();
}());
