(function () {
    var form = document.getElementById('login-form');

    if (!form) return;

    form.addEventListener('submit', async function (event) {
        event.preventDefault();

        var email = document.getElementById('login-email').value.trim();
        var accessCode = document.getElementById('login-access-code').value.trim();
        var status = document.getElementById('login-status');
        var button = form.querySelector('button[type="submit"]');

        status.textContent = '';
        status.className = '';

        if (!email || !accessCode) {
            status.textContent = 'Enter your email and access code.';
            status.className = 'text-danger';
            return;
        }

        button.disabled = true;
        status.textContent = 'Signing you in...';

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

            var data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed.');
            }

            window.location.href =
                data.role === 'admin' ? './admin.html' : './shop-grid.html';
        } catch (error) {
            status.textContent = error.message;
            status.className = 'text-danger';
        } finally {
            button.disabled = false;
        }
    });
})();