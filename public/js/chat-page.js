document.addEventListener('DOMContentLoaded', () => {
    const member = JSON.parse(localStorage.getItem("memberDetails"));
    const admin = JSON.parse(localStorage.getItem("adminDetails"));
    const userType = member ? 'User' : (admin ? 'Admin' : null);

    if (!userType) { window.location.href = 'login.html'; return; }

    const dashLinks = document.getElementById('dashLinks');
    const sidebarBrand = document.getElementById('sidebarBrand');

    if (userType === 'Admin') {
        // Update brand for Admin
        if (sidebarBrand) {
            sidebarBrand.innerHTML = '<i class="fas fa-user-shield me-2"></i>KonstraAdmin';
        }
        // Admin Navigation Links - matches admin-home.html
        dashLinks.innerHTML = `
            <a href="admin-home.html" class="nav-link"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
            <a href="admin-doc.html" class="nav-link"><i class="fas fa-folder-open"></i> Documents</a>
            <a href="chat.html" class="nav-link active"><i class="fas fa-comments"></i> Chat</a>
            <a href="my-meetings.html" class="nav-link"><i class="fas fa-video"></i> Meetings</a>
            <a href="admin-printadobe.html" class="nav-link"><i class="fas fa-graduation-cap"></i> PrintAdobe</a>
            <a href="admin-credentials.html" class="nav-link"><i class="fas fa-certificate"></i> Credentials</a>
            <a href="admin-projects.html" class="nav-link"><i class="fas fa-tasks"></i> Projects</a>
            <a href="admin-discounts.html" class="nav-link"><i class="fas fa-tags"></i> Discounts</a>
            <a href="admin-profile.html" class="nav-link"><i class="fas fa-user-circle"></i> Profile</a>
        `;
    } else {
        // Check if NGO or Regular User
        if (member && member.role === 'NGO') {
            // Update brand for NGO
            if (sidebarBrand) {
                sidebarBrand.innerHTML = '<i class="fas fa-handshake me-2"></i>KonstraPartner';
            }
            // NGO Navigation Links
            dashLinks.innerHTML = `
                <a href="ngo-dashboard.html" class="nav-link"><i class="fas fa-chart-pie"></i> Dashboard</a>
                <a href="ngo-doc.html" class="nav-link"><i class="fas fa-folder-open"></i> Documents</a>
                <a href="chat.html" class="nav-link active"><i class="fas fa-comments"></i> Partner Chat</a>
                <a href="booking-Consultation.html" class="nav-link"><i class="fas fa-calendar-check"></i> Book Consultation</a>
                <a href="my-meetings.html" class="nav-link"><i class="fas fa-video"></i> My Meetings</a>
                <a href="profile.html" class="nav-link"><i class="fas fa-user-circle"></i> Profile</a>
            `;
        } else {
            // Update brand for User
            if (sidebarBrand) {
                sidebarBrand.innerHTML = '<i class="fas fa-user me-2"></i>KonstraMember';
            }
            // Standard User Navigation Links - matches user-dashboard.html
            dashLinks.innerHTML = `
                <a href="user-dashboard.html" class="nav-link"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
                <a href="user-doc.html" class="nav-link"><i class="fas fa-folder-open"></i> Documents</a>
                <a href="chat.html" class="nav-link active"><i class="fas fa-comments"></i> Chat</a>
                <a href="user-printadobe.html" class="nav-link"><i class="fas fa-graduation-cap"></i> Printadobe</a>
                <a href="user-credentials.html" class="nav-link"><i class="fas fa-certificate"></i> Credentials</a>
                <a href="profile.html" class="nav-link"><i class="fas fa-user-circle"></i> Profile</a>
                <a href="user-overview.html" class="nav-link"><i class="fas fa-chart-pie"></i> Overview</a>
            `;
        }
    }

    // Mobile toggle functionality
    const mobileToggle = document.getElementById('mobileDashToggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            document.getElementById('dashSidebar').classList.toggle('active');
        });
    }

    // Logout functionality
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
});

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}
