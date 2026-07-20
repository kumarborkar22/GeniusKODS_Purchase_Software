/*  ---------------------------------------------------
    Template Name: GeniusKODS
    Description:  GeniusKODS eCommerce  HTML Template
    Author: Colorlib
    Author URI: https://colorlib.com
    Version: 1.0
    Created: Colorlib
---------------------------------------------------------  */

'use strict';

(function ($) {

    /*------------------
        Preloader
    --------------------*/
    $(window).on('load', function () {
        $(".loader").fadeOut();
        $("#preloder").delay(200).fadeOut("slow");

        /*------------------
            Gallery filter
        --------------------*/
        $('.featured__controls li').on('click', function () {
            $('.featured__controls li').removeClass('active');
            $(this).addClass('active');
        });
        if ($('.featured__filter').length > 0) {
            var containerEl = document.querySelector('.featured__filter');
            var mixer = mixitup(containerEl);
        }
    });

    function filterFeaturedItems(searchTerm) {
        var normalizedTerm = $.trim(searchTerm).toLowerCase();
        var hasTerm = normalizedTerm.length > 0;

        $('.featured__filter .featured__item--search-hidden').removeClass('featured__item--search-hidden');

        if (!hasTerm) {
            return;
        }

        $('.featured__filter .featured__item').each(function () {
            var itemText = $(this).find('.featured__item__text').text().toLowerCase();

            if (itemText.indexOf(normalizedTerm) === -1) {
                $(this).closest('[class*="col-"]').addClass('featured__item--search-hidden');
            }
        });
    }

    $(document).on('submit', '#hero-search-form', function (event) {
        event.preventDefault();

        var searchValue = $('#hero-search-input').val();
        filterFeaturedItems(searchValue);

        $('.featured__controls li').removeClass('active');
        $('.featured__controls li[data-filter="*"]').addClass('active');

        if ($('.featured').length > 0) {
            $('html, body').animate({
                scrollTop: $('.featured').offset().top - 40
            }, 300);
        }
    });

    $(document).on('input', '#hero-search-input', function () {
        if ($.trim($(this).val()) === '') {
            filterFeaturedItems('');
        }
    });

    $(document).on('click', '.featured__controls li', function () {
        if ($.trim($('#hero-search-input').val()) !== '') {
            $('#hero-search-input').val('');
            filterFeaturedItems('');
        }
    });

    function filterShopGridItems(searchTerm) {
        var normalizedTerm = $.trim(searchTerm).toLowerCase();
        var hasTerm = normalizedTerm.length > 0;
        var visibleCount = 0;

        $('.product .product__item').closest('[class*="col-"]').css('display', '');
        $('.product__item--search-hidden').removeClass('product__item--search-hidden');
        $('.shop-grid__item--search-hidden').removeClass('shop-grid__item--search-hidden');

        if (!hasTerm) {
            $('.filter__found span').text(String($('.product .product__item').length));
            return;
        }

        $('.product .product__item').each(function () {
            var productName = $(this).find('.product__item__text').text().toLowerCase();
            var productCategories = String($(this).data('categories') || '').toLowerCase();

            if (productName.indexOf(normalizedTerm) === -1 && productCategories.indexOf(normalizedTerm) === -1) {
                $(this).closest('[class*="col-"]').addClass('shop-grid__item--search-hidden');
            } else {
                visibleCount += 1;
            }
        });

        $('.filter__found span').text(String(visibleCount));
    }

    function scrollToShopGridResults() {
        var firstVisibleCard = $('.product .product__item').filter(function () {
            return $(this).closest('[class*="col-"]').is(':visible');
        }).first();

        if (firstVisibleCard.length > 0) {
            $('html, body').animate({
                scrollTop: firstVisibleCard.closest('[class*="col-"]').offset().top - 40
            }, 300);
            return;
        }

        if ($('.product').length > 0) {
            $('html, body').animate({
                scrollTop: $('.product').offset().top - 60
            }, 300);
        }
    }

    function filterShopGridByCategory(category) {
        var normalizedCategory = String(category || 'all').toLowerCase();

        $('.product__item--search-hidden').removeClass('product__item--search-hidden');
        $('.shop-grid__item--search-hidden').removeClass('shop-grid__item--search-hidden');

        $('.product .product__item').each(function () {
            var productCategories = String($(this).data('categories') || '').toLowerCase();
            var shouldShow = normalizedCategory === 'all' || productCategories.indexOf(normalizedCategory) !== -1;

            if (!shouldShow) {
                $(this).closest('[class*="col-"]').addClass('shop-grid__item--search-hidden');
            }
        });
    }

    var cartStorageKey = 'cafeone-cart';

    function getCartItems() {
        try {
            var storedCart = localStorage.getItem(cartStorageKey);
            var parsedCart = storedCart ? JSON.parse(storedCart) : [];

            return Array.isArray(parsedCart) ? parsedCart : [];
        } catch (error) {
            return [];
        }
    }

    function saveCartItems(items) {
        localStorage.setItem(cartStorageKey, JSON.stringify(items));
    }

    function formatCurrency(value) {
        return '$' + Number(value || 0).toFixed(2);
    }

    function parsePriceValue(priceText) {
        var numericValue = parseFloat(String(priceText || '').replace(/[^0-9.-]+/g, ''));

        return isNaN(numericValue) ? 0 : numericValue;
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

    function createCartItemFromProduct($productItem) {
        var name = $.trim($productItem.find('.product__item__text h6').text());
        var priceText = $.trim($productItem.find('.product__item__text h5').text());
        var imageUrl = $productItem.find('.product__item__pic').data('setbg') || '';
        var slugSource = name + ' ' + imageUrl;

        return {
            id: slugSource.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
            name: name,
            price: parsePriceValue(priceText),
            image: imageUrl,
            quantity: 1
        };
    }

    function addToCart(product) {
        var cartItems = getCartItems();
        var existingItem = cartItems.find(function (item) {
            return item.id === product.id;
        });

        if (existingItem) {
            existingItem.quantity = Number(existingItem.quantity || 0) + 1;
        } else {
            cartItems.push(product);
        }

        saveCartItems(cartItems);
        refreshCartSummary();
    }

    function removeCartItem(itemId) {
        var cartItems = getCartItems().filter(function (item) {
            return item.id !== itemId;
        });

        saveCartItems(cartItems);
        renderCartPage();
    }

    function updateCartItemQuantity(itemId, quantity) {
        var cartItems = getCartItems();

        cartItems = cartItems.map(function (item) {
            if (item.id === itemId) {
                item.quantity = Math.max(1, parseInt(quantity, 10) || 1);
            }

            return item;
        });

        saveCartItems(cartItems);
        refreshCartSummary();
    }

    function refreshCartSummary() {
        var cartItems = getCartItems();
        var totalQuantity = 0;
        var subtotal = 0;

        cartItems.forEach(function (item) {
            var quantity = Number(item.quantity || 0);
            var price = Number(item.price || 0);

            totalQuantity += quantity;
            subtotal += price * quantity;
        });

        $('.header__cart li a .fa-shopping-bag').next('span').text(String(totalQuantity));
        $('.humberger__menu__cart li a .fa-shopping-bag').next('span').text(String(totalQuantity));
        $('.header__cart__price span, .humberger__menu__cart .header__cart__price span').text(formatCurrency(subtotal));
    }

    function initQuantityControls(scope) {
        var $scope = scope ? $(scope) : $(document);

        $scope.find('.pro-qty').each(function () {
            var $quantityControl = $(this);

            if ($quantityControl.data('quantity-initialized')) {
                return;
            }

            $quantityControl.data('quantity-initialized', true);
            $quantityControl.prepend('<span class="dec qtybtn">-</span>');
            $quantityControl.append('<span class="inc qtybtn">+</span>');
        });
    }

    function renderCartPage() {
        var $cartBody = $('#cart-items-body');

        if ($cartBody.length === 0) {
            refreshCartSummary();
            return;
        }

        var cartItems = getCartItems();
        var subtotal = 0;

        $cartBody.empty();

        if (cartItems.length === 0) {
            $cartBody.append('<tr><td colspan="5" class="text-center py-5">Your cart is empty. <a href="./shop-grid.html">Continue shopping</a></td></tr>');
            $('#cart-subtotal, #cart-total').text(formatCurrency(0));
            refreshCartSummary();
            return;
        }

        cartItems.forEach(function (item) {
            var quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
            var itemTotal = Number(item.price || 0) * quantity;

            subtotal += itemTotal;

            $cartBody.append(
                '<tr data-cart-item-id="' + item.id + '">' +
                    '<td class="shoping__cart__item">' +
                        '<img src="' + item.image + '" alt="' + item.name + '">' +
                        '<h5>' + item.name + '</h5>' +
                    '</td>' +
                    '<td class="shoping__cart__price">' + formatCurrency(item.price) + '</td>' +
                    '<td class="shoping__cart__quantity">' +
                        '<div class="quantity">' +
                            '<div class="pro-qty" data-cart-item-id="' + item.id + '">' +
                                '<input type="text" value="' + quantity + '">' +
                            '</div>' +
                        '</div>' +
                    '</td>' +
                    '<td class="shoping__cart__total">' + formatCurrency(itemTotal) + '</td>' +
                    '<td class="shoping__cart__item__close"><span class="icon_close"></span></td>' +
                '</tr>'
            );
        });

        $('#cart-subtotal, #cart-total').text(formatCurrency(subtotal));
        initQuantityControls($cartBody);
        refreshCartSummary();
    }

    function renderCheckoutPage() {
        var $checkoutItems = $('#checkout-order-items');

        if ($checkoutItems.length === 0) {
            return;
        }

        var cartItems = getCartItems();
        var subtotal = 0;

        $checkoutItems.empty();

        if (cartItems.length === 0) {
            $checkoutItems.append('<li>Your cart is empty. <span>$0.00</span></li>');
            $('#checkout-subtotal, #checkout-total').text(formatCurrency(0));
            return;
        }

        cartItems.forEach(function (item) {
            var quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
            var itemTotal = Number(item.price || 0) * quantity;

            subtotal += itemTotal;

            $checkoutItems.append(
                '<li>' + escapeHtml(item.name) + ' x ' + quantity + ' <span>' + formatCurrency(itemTotal) + '</span></li>'
            );
        });

        $('#checkout-subtotal, #checkout-total').text(formatCurrency(subtotal));
    }

    function clearCart() {
        localStorage.removeItem(cartStorageKey);
        refreshCartSummary();
        renderCartPage();
        renderCheckoutPage();
    }

    function getCurrentPageName() {
        var pathName = window.location.pathname || '';
        var segments = pathName.split('/').filter(Boolean);

        return (segments.length > 0 ? segments[segments.length - 1] : 'index.html').toLowerCase();
    }

    function getLoginRedirectUrl(targetPage) {
        return './login.html?next=' + encodeURIComponent(targetPage || getCurrentPageName());
    }

    function isAdminPage() {
        return ['admin.html'].indexOf(getCurrentPageName()) !== -1;
    }

    function getLoginSuccessTarget() {
        var searchParams = new URLSearchParams(window.location.search || '');
        var nextPage = String(searchParams.get('next') || '').trim();

        if (nextPage) {
            return './' + nextPage.replace(/^\/+/, '');
        }

        return './shop-grid.html';
    }

    function isProtectedPage() {
        return ['shoping-cart.html', 'checkout.html'].indexOf(getCurrentPageName()) !== -1;
    }

    async function ensureApprovedAccess() {
        if (window.location.protocol === 'file:') {
            return true;
        }

        if (!isProtectedPage() && !isAdminPage()) {
            return true;
        }

        try {
            var response = await fetch('/api/session', {
                method: 'GET',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                window.location.href = getLoginRedirectUrl(isAdminPage() ? 'admin.html' : getCurrentPageName());
                return false;
            }

            var data = await response.json();

            if (!data.authenticated || (isAdminPage() && data.role !== 'admin')) {
                window.location.href = getLoginRedirectUrl(isAdminPage() ? 'admin.html' : getCurrentPageName());
                return false;
            }

            return true;
        } catch (error) {
            window.location.href = getLoginRedirectUrl(isAdminPage() ? 'admin.html' : getCurrentPageName());
            return false;
        }
    }

    async function handleLoginSubmit(event) {
        event.preventDefault();

        var $status = $('#login-status');
        var $submitButton = $('#login-form button[type="submit"]');
        var email = $.trim($('#login-email').val());
        var accessCode = $.trim($('#login-access-code').val());

        if (!email || !accessCode) {
            $status.text('Enter your approved email and access code.').addClass('text-danger').removeClass('text-success');
            return;
        }

        $submitButton.prop('disabled', true);
        $status.text('Signing you in...').removeClass('text-danger').removeClass('text-success');

        try {
            var response = await fetch('/api/login', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    accessCode: accessCode
                })
            });

            var responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || 'Login failed.');
            }

            $status.text('Login successful. Redirecting...').removeClass('text-danger').addClass('text-success');

            if (responseData.role === 'admin') {
                window.location.href = './admin.html';
                return;
            }

            window.location.href = getLoginSuccessTarget();
        } catch (error) {
            $status.text(error.message || 'Login failed.').addClass('text-danger').removeClass('text-success');
        } finally {
            $submitButton.prop('disabled', false);
        }
    }

    function initLoginPage() {
        if ($('#login-form').length === 0) {
            return;
        }

        if (window.location.protocol === 'file:') {
            $(document).on('submit', '#login-form', handleLoginSubmit);
            return;
        }

        fetch('/api/session', {
            method: 'GET',
            credentials: 'same-origin'
        }).then(function (response) {
            if (response.ok) {
                response.json().then(function (data) {
                    if (data.role === 'admin') {
                        window.location.href = './admin.html';
                        return;
                    }

                    window.location.href = getLoginSuccessTarget();
                });
            }
        }).catch(function () {
            return null;
        });

        $(document).on('submit', '#login-form', handleLoginSubmit);
    }

    function setCheckoutStatus(message, isError) {
        var $status = $('#checkout-status');

        if ($status.length === 0) {
            return;
        }

        $status
            .text(message)
            .toggleClass('text-danger', Boolean(isError))
            .toggleClass('text-success', !Boolean(isError));
    }

    async function handleCheckoutSubmit(event) {
        event.preventDefault();

        var $form = $('#checkout-form');
        var $submitButton = $form.find('button[type="submit"]');
        var cartItems = getCartItems();

        if (cartItems.length === 0) {
            setCheckoutStatus('Your cart is empty. Add products before placing an order.', true);
            return;
        }

        var requiredFields = [
            { selector: '#checkout-first-name', label: 'first name' },
            { selector: '#checkout-last-name', label: 'last name' },
            { selector: '#checkout-country', label: 'country' },
            { selector: '#checkout-address-1', label: 'address' },
            { selector: '#checkout-city', label: 'city' },
            { selector: '#checkout-state', label: 'state' },
            { selector: '#checkout-zip', label: 'ZIP code' },
            { selector: '#checkout-phone', label: 'phone' },
            { selector: '#checkout-email', label: 'email' }
        ];

        for (var i = 0; i < requiredFields.length; i += 1) {
            if ($.trim($(requiredFields[i].selector).val()) === '') {
                setCheckoutStatus('Please fill in your ' + requiredFields[i].label + '.', true);
                $(requiredFields[i].selector).focus();
                return;
            }
        }

        if ($('#acc').is(':checked') && $.trim($('#checkout-account-password').val()) === '') {
            setCheckoutStatus('Please enter an account password if you want to create an account.', true);
            $('#checkout-account-password').focus();
            return;
        }

        var orderTotal = cartItems.reduce(function (sum, item) {
            return sum + (Number(item.price || 0) * Math.max(1, parseInt(item.quantity, 10) || 1));
        }, 0);

        var orderPayload = {
            customer: {
                firstName: $.trim($('#checkout-first-name').val()),
                lastName: $.trim($('#checkout-last-name').val()),
                country: $.trim($('#checkout-country').val()),
                address1: $.trim($('#checkout-address-1').val()),
                address2: $.trim($('#checkout-address-2').val()),
                city: $.trim($('#checkout-city').val()),
                state: $.trim($('#checkout-state').val()),
                zip: $.trim($('#checkout-zip').val()),
                phone: $.trim($('#checkout-phone').val()),
                email: $.trim($('#checkout-email').val())
            },
            accountRequested: $('#acc').is(':checked'),
            differentAddressRequested: $('#diff-acc').is(':checked'),
            orderNotes: $.trim($('#checkout-order-notes').val() || ''),
            paymentMethod: 'cash-on-delivery',
            items: cartItems,
            subtotal: orderTotal,
            total: orderTotal
        };

        $submitButton.prop('disabled', true);
        setCheckoutStatus('Sending your order...', false);

        try {
            var response = await fetch('/api/send-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderPayload)
            });

            var responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || 'Unable to send order right now.');
            }

            clearCart();
        $('.checkout__form form')[0].reset();
        $('#cod').prop('checked', true);
            setCheckoutStatus('Order placed successfully. Payment will be collected on delivery. Order #' + responseData.orderId + ' has been emailed to you.', false);
        } catch (error) {
            setCheckoutStatus(error.message || 'Failed to place order. Please try again.', true);
        } finally {
            $submitButton.prop('disabled', false);
        }
    }

    $(document).on('submit', '#shop-grid-search-form', function (event) {
        event.preventDefault();

        filterShopGridItems($('#shop-grid-search-input').val());

        if ($('.product').length > 0) {
            $('html, body').animate({
                scrollTop: $('.product').offset().top - 40
            }, 300);
        }
    });

    $(document).on('click', '.product__item__pic__hover a', function (event) {
        var $icon = $(this).find('i.fa-shopping-cart');

        if ($icon.length === 0) {
            return;
        }

        event.preventDefault();
        addToCart(createCartItemFromProduct($(this).closest('.product__item')));
    });

    $(document).on('click', '#cart-update-btn', function (event) {
        event.preventDefault();
        renderCartPage();
    });

    $(document).on('click', '.shoping__cart__item__close .icon_close', function () {
        var itemId = $(this).closest('tr').data('cartItemId');

        removeCartItem(itemId);
    });

    $(document).on('click', '.shoping-cart .qtybtn', function () {
        var $button = $(this);
        var $control = $button.closest('.pro-qty');
        var currentValue = parseInt($control.find('input').val(), 10) || 1;
        var nextValue = $button.hasClass('inc') ? currentValue + 1 : Math.max(1, currentValue - 1);

        $control.find('input').val(nextValue);
        updateCartItemQuantity($control.data('cartItemId'), nextValue);
        renderCartPage();
    });

    $(document).on('change', '.shoping-cart .pro-qty input', function () {
        var $control = $(this).closest('.pro-qty');

        updateCartItemQuantity($control.data('cartItemId'), $(this).val());
        renderCartPage();
    });

    $(document).on('input', '.shoping-cart .pro-qty input', function () {
        var $control = $(this).closest('.pro-qty');
        var quantity = Math.max(1, parseInt($(this).val(), 10) || 1);

        updateCartItemQuantity($control.data('cartItemId'), quantity);
    });

    $(document).on('input', '#shop-grid-search-input', function () {
        if ($.trim($(this).val()) === '') {
            filterShopGridItems('');
        }
    });

    $(document).on('submit', '#checkout-form', handleCheckoutSubmit);

    /*------------------
        Background Set
    --------------------*/
    $('.set-bg').each(function () {
        var bg = $(this).data('setbg');
        $(this).css('background-image', 'url("' + bg + '")');
    });

    //Humberger Menu
    $(".humberger__open").on('click', function () {
        $(".humberger__menu__wrapper").addClass("show__humberger__menu__wrapper");
        $(".humberger__menu__overlay").addClass("active");
        $("body").addClass("over_hid");
    });

    $(".humberger__menu__overlay").on('click', function () {
        $(".humberger__menu__wrapper").removeClass("show__humberger__menu__wrapper");
        $(".humberger__menu__overlay").removeClass("active");
        $("body").removeClass("over_hid");
    });

    /*------------------
		Navigation
	--------------------*/
    $(".mobile-menu").slicknav({
        prependTo: '#mobile-menu-wrap',
        allowParentLinks: true
    });

    /*-----------------------
        Categories Slider
    ------------------------*/
    $(".categories__slider").owlCarousel({
        loop: true,
        margin: 0,
        items: 4,
        dots: false,
        nav: true,
        navText: ["<span class='fa fa-angle-left'><span/>", "<span class='fa fa-angle-right'><span/>"],
        animateOut: 'fadeOut',
        animateIn: 'fadeIn',
        smartSpeed: 1200,
        autoHeight: false,
        autoplay: true,
        responsive: {

            0: {
                items: 1,
            },

            480: {
                items: 2,
            },

            768: {
                items: 3,
            },

            992: {
                items: 4,
            }
        }
    });


    $('.hero__categories__all').on('click', function(){
        $('.hero__categories ul').slideToggle(400);
    });

    /*--------------------------
        Latest Product Slider
    ----------------------------*/
    $(".latest-product__slider").owlCarousel({
        loop: true,
        margin: 0,
        items: 1,
        dots: false,
        nav: true,
        navText: ["<span class='fa fa-angle-left'><span/>", "<span class='fa fa-angle-right'><span/>"],
        smartSpeed: 1200,
        autoHeight: false,
        autoplay: true
    });

    /*-----------------------------
        Product Discount Slider
    -------------------------------*/
    $(".product__discount__slider").owlCarousel({
        loop: true,
        margin: 0,
        items: 3,
        dots: true,
        smartSpeed: 1200,
        autoHeight: false,
        autoplay: true,
        responsive: {

            320: {
                items: 1,
            },

            480: {
                items: 2,
            },

            768: {
                items: 2,
            },

            992: {
                items: 3,
            }
        }
    });

    /*---------------------------------
        Product Details Pic Slider
    ----------------------------------*/
    $(".product__details__pic__slider").owlCarousel({
        loop: true,
        margin: 20,
        items: 4,
        dots: true,
        smartSpeed: 1200,
        autoHeight: false,
        autoplay: true
    });

    /*-----------------------
		Price Range Slider
	------------------------ */
    var rangeSlider = $(".price-range"),
        minamount = $("#minamount"),
        maxamount = $("#maxamount"),
        minPrice = rangeSlider.data('min'),
        maxPrice = rangeSlider.data('max');
    rangeSlider.slider({
        range: true,
        min: minPrice,
        max: maxPrice,
        values: [minPrice, maxPrice],
        slide: function (event, ui) {
            minamount.val('$' + ui.values[0]);
            maxamount.val('$' + ui.values[1]);
        }
    });
    minamount.val('$' + rangeSlider.slider("values", 0));
    maxamount.val('$' + rangeSlider.slider("values", 1));

    /*--------------------------
        Select
    ----------------------------*/
    $("select").niceSelect();

    /*------------------
		Single Product
	--------------------*/
    $('.product__details__pic__slider img').on('click', function () {

        var imgurl = $(this).data('imgbigurl');
        var bigImg = $('.product__details__pic__item--large').attr('src');
        if (imgurl != bigImg) {
            $('.product__details__pic__item--large').attr({
                src: imgurl
            });
        }
    });

    /*-------------------
		Quantity change
	--------------------- */
    initQuantityControls();
    var proQty = $('.pro-qty');
    proQty.on('click', '.qtybtn', function () {
        var $button = $(this);
        var oldValue = $button.parent().find('input').val();
        if ($button.hasClass('inc')) {
            var newVal = parseFloat(oldValue) + 1;
        } else {
            // Don't allow decrementing below zero
            if (oldValue > 0) {
                var newVal = parseFloat(oldValue) - 1;
            } else {
                newVal = 0;
            }
        }
        $button.parent().find('input').val(newVal);
    });

    refreshCartSummary();
    renderCartPage();
    renderCheckoutPage();

    if ($('#checkout-form').length > 0) {
        setCheckoutStatus('', false);
    }

    initLoginPage();
    ensureApprovedAccess();

})(jQuery);