document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get Params
    const params = new URLSearchParams(window.location.search);
    const price = parseFloat(params.get('price'));
    const item = params.get('item');
    const image = params.get('image'); // Capture Image

    // Show Image Preview in Loader Card (Nice UI touch)
    if (image && image !== 'null') {
        const imgContainer = document.getElementById('imagePreview');
        imgContainer.innerHTML = `<img src="${image}" style="width:80px; height:80px; object-fit:cover; border-radius:10px; margin-bottom:20px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">`;
    }

    // --- ERROR CHECK (POP-OUT) ---
    if (!price || !item) {
        document.querySelector('.loader-card').style.display = 'none'; // Hide loader

        await Swal.fire({
            icon: 'error',
            title: 'Missing Information',
            text: 'Invalid order details. Returning to home page.',
            confirmButtonText: 'Go Back',
            confirmButtonColor: '#d32f2f',
            allowOutsideClick: false
        });

        window.location.href = 'user-printadobe.html'; // Redirect back
        return;
    }

    try {
        // Show a mini toast notification that we are working
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer)
                toast.addEventListener('mouseleave', Swal.resumeTimer)
            }
        });

        Toast.fire({
            icon: 'info',
            title: 'Initiating Payment...'
        });

        // 2. Fetch Keys & Create Session
        const configResponse = await fetch('/api/payment/config');
        const { publishableKey } = await configResponse.json();
        const stripe = Stripe(publishableKey);

        const programId = params.get('id'); // Get Program ID
        const slot = params.get('slot');
        const details = params.get('details'); // JSON string from URL

        const member = JSON.parse(localStorage.getItem('memberDetails'));
        const userId = member ? (member.memberID || member.id || member.UserID || member.ID) : null;

        const isDonation = item && item.toLowerCase() === 'donation';

        if (!userId && !isDonation) {
            document.querySelector('.loader-card').style.display = 'none';
            await Swal.fire({
                icon: 'warning',
                title: 'Login Required',
                text: 'Please log in to complete this purchase.',
                confirmButtonColor: '#d32f2f'
            });
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch('/api/payment/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                programId, // Pass ID
                amount: price,
                item: item,
                image: image,
                slot,
                details,
                userId: userId
            })
        });

        const { sessionId, error } = await response.json();

        // --- BACKEND ERROR (POP-OUT) ---
        if (error) {
            console.error("Backend Error:", error);
            document.querySelector('.loader-card').style.display = 'none';

            await Swal.fire({
                icon: 'error',
                title: 'Payment Error',
                text: 'Could not create payment session. Please try again.',
                confirmButtonColor: '#d32f2f'
            });

            window.history.back();
            return;
        }

        // 3. Redirect to Stripe
        const result = await stripe.redirectToCheckout({ sessionId });

        // --- STRIPE ERROR (POP-OUT) ---
        if (result.error) {
            document.querySelector('.loader-card').style.display = 'none';
            await Swal.fire({
                icon: 'error',
                title: 'Stripe Connection Failed',
                text: result.error.message,
                confirmButtonColor: '#d32f2f'
            });
        }

    } catch (err) {
        console.error("Payment Init Failed", err);
        document.querySelector('.loader-card').innerHTML = `
            <h4 class="text-danger">Connection Error</h4>
            <p>Could not connect to server.</p>
            <a href="user-printadobe.html" class="btn btn-secondary btn-sm">Go Back</a>
        `;

        // Also show a toast for the catch block
        Swal.fire({
            icon: 'error',
            title: 'Network Error',
            text: 'Please check your connection.',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000
        });
    }
});
