document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get Session ID and Type from URL
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const type = params.get('type');

    // --- 🛑 DONATION SUCCESS VIEW ---
    if (type === 'donation') {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('donationSuccessState').style.display = 'block';

        // Add redirection logic
        const redirectMsg = document.getElementById('redirectMsg');
        const countdownEl = document.getElementById('countdown');
        if (redirectMsg && countdownEl) {
            redirectMsg.style.display = 'block';
            let timeLeft = 6;
            const timer = setInterval(() => {
                timeLeft--;
                countdownEl.innerText = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(timer);
                    window.location.href = 'our-project.html';
                }
            }, 1000);
        } else {
            // Fallback if elements not found
            setTimeout(() => {
                window.location.href = 'our-project.html';
            }, 6000);
        }
        return;
    }

    // 2. Get Form Data from Session Storage (Saved in enrollment.html)
    const enrollmentJson = sessionStorage.getItem('pendingEnrollment');

    if (!sessionId) {
        // Direct access attempt
        window.location.href = 'user-dashboard.html';
        return;
    }

    if (!enrollmentJson) {
        // If session storage is cleared but we have a session ID, we can't create enrollment
        // In a real app, you might try to recover or just tell user to contact support
        showError("Session Expired", "Enrollment data missing. Please try booking again.");
        return;
    }

    const enrollmentData = JSON.parse(enrollmentJson);

    // 3. Call Backend to Save Enrollment
    try {
        const payload = {
            ...enrollmentData,
            paymentId: sessionId,
            amount: enrollmentData.amount || 0
        };

        const response = await fetch('/api/enrollments/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            // Clear storage to prevent double submission
            sessionStorage.removeItem('pendingEnrollment');

            // Show Success UI
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('successState').style.display = 'block';
        } else {
            throw new Error(result.error || "Database save failed");
        }

    } catch (err) {
        console.error(err);
        showError(err.message, sessionId);
    }
});

function showError(msg, refId) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorMsg').innerText = msg;
    if (refId) document.getElementById('paymentId').innerText = refId;
}
