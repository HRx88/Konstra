document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });
});

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

// Pre-fill Admin Name
const admin = JSON.parse(localStorage.getItem('adminDetails'));
if (admin) {
    document.getElementById('adminWelcome').innerText = `Welcome, ${admin.username || admin.Username}`;
}
