// Init logic
document.addEventListener('DOMContentLoaded', () => {
    const member = JSON.parse(localStorage.getItem('memberDetails'));
    if (!member) { window.location.href = 'login.html'; return; }

    document.getElementById('welcomeMsg').innerText = `Welcome back, ${member.username}`;
    document.getElementById('dateDisplay').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Fetch Stats
    fetchEnrollmentStats(member.memberID);

    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });
}

async function fetchEnrollmentStats(userId) {
    try {
        if (!userId) return;

        // Loading State
        document.getElementById('activeEnrollments').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        document.getElementById('courseProgress').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const response = await fetch(`/api/enrollments/user/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch enrollments');
        const enrollments = await response.json();

        // 1. Active Enrollments
        const activeCount = enrollments.length;
        document.getElementById('activeEnrollments').textContent = activeCount;

        // 2. Average Progress
        if (activeCount > 0) {
            const totalProgress = enrollments.reduce((sum, e) => sum + (e.Progress || 0), 0);
            const avg = Math.round(totalProgress / activeCount);
            document.getElementById('courseProgress').textContent = `${avg}%`;
        } else {
            document.getElementById('courseProgress').textContent = '0%';
        }

    } catch (err) {
        console.error("Stats Error:", err);
        document.getElementById('activeEnrollments').textContent = '0';
        document.getElementById('courseProgress').textContent = '0%';
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
