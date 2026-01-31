function logout() { localStorage.clear(); window.location.href = "index.html"; }

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });

    const member = JSON.parse(localStorage.getItem("memberDetails"));
    const admin = JSON.parse(localStorage.getItem("adminDetails"));

    if (!member && !admin) { window.location.href = "login.html"; return; }

    const userType = member ? 'User' : 'Admin';
    const userID = member ? member.memberID : admin.adminID;
    const userName = member ? member.username : admin.username;

    // --- DYNAMIC BRANDING ---
    const brandText = document.querySelector('.sidebar-header .brand-text');
    if (brandText) {
        if (userType === 'Admin') {
            brandText.innerHTML = '<i class="fas fa-user-shield me-2"></i>KonstraAdmin';
        } else if (member && member.role === 'NGO') {
            brandText.innerHTML = '<i class="fas fa-handshake me-2"></i>KonstraPartner';
        } else {
            brandText.innerHTML = '<i class="fas fa-user me-2"></i>KonstraMember';
        }
    }

    // --- DYNAMIC SIDEBAR LINKS ---
    const sidebarLinks = document.getElementById('sidebarLinks');
    if (userType === 'Admin') {
        sidebarLinks.innerHTML = `
				<a href="admin-home.html" class="nav-link"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
				<a href="admin-doc.html" class="nav-link"><i class="fas fa-folder-open"></i> Documents</a>
				<a href="chat.html" class="nav-link"><i class="fas fa-comments"></i> Chat</a>
				<a href="my-meetings.html" class="nav-link active"><i class="fas fa-video"></i> Meetings</a>
				<a href="admin-printadobe.html" class="nav-link"><i class="fas fa-graduation-cap"></i> PrintAdobe</a>
				<a href="admin-credentials.html" class="nav-link"><i class="fas fa-certificate"></i> Credentials</a>
				<a href="admin-projects.html" class="nav-link"><i class="fas fa-tasks"></i> Projects</a>
				<a href="admin-discounts.html" class="nav-link"><i class="fas fa-tags"></i> Discounts</a>
				<a href="admin-profile.html" class="nav-link"><i class="fas fa-user-circle"></i> Profile</a>
			`;
    } else {
        sidebarLinks.innerHTML = `
            <a href="ngo-dashboard.html" class="nav-link"><i class="fas fa-chart-pie"></i> Dashboard</a>
            <a href="ngo-doc.html" class="nav-link"><i class="fas fa-folder-open"></i> Documents</a>
            <a href="chat.html" class="nav-link"><i class="fas fa-comments"></i> Partner Chat</a>
            <a href="booking-Consultation.html" class="nav-link"><i class="fas fa-calendar-check"></i> Book Consultation</a>
            <a href="my-meetings.html" class="nav-link active"><i class="fas fa-video"></i> My Meetings</a>
            <a href="profile.html" class="nav-link"><i class="fas fa-user-circle"></i> Profile</a>
        `;
    }

    // Header Info
    const badge = document.getElementById('roleBadge');
    badge.textContent = userType === 'Admin' ? 'Admin Mode' : `Hello, ${userName}`;
    badge.className = userType === 'Admin' ? 'badge bg-danger bg-opacity-10 text-danger border border-danger me-2' : 'badge bg-primary bg-opacity-10 text-primary border border-primary me-2';

    // Load Data
    try {
        const response = await fetch(`/api/meetings/user/${userID}/${userType}`);
        const data = await response.json();
        document.getElementById('loader').style.display = 'none';

        if (data.success) {
            renderGrid(data.meetings, userType);
        } else {
            document.getElementById('meetingsGrid').innerHTML = `<div class="col-12"><div class="alert alert-warning">${data.error}</div></div>`;
        }
    } catch (err) {
        document.getElementById('loader').style.display = 'none';
        document.getElementById('meetingsGrid').innerHTML = `<div class="col-12"><div class="alert alert-danger">Network Error</div></div>`;
    }
});

function renderGrid(meetings, userType) {
    const grid = document.getElementById('meetingsGrid');
    if (!meetings || meetings.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center py-5 text-muted"><h5>No meetings found</h5></div>`;
        return;
    }

    grid.innerHTML = meetings.map(m => {
        const dateObj = new Date(m.StartTime);
        const isOnline = m.MeetingType === 'Online';
        const isPast = new Date() > new Date(m.EndTime);

        let btnHtml = isPast ?
            `<button class="btn btn-secondary btn-sm w-100 disabled">Ended</button>` :
            (isOnline ? `<a href="meeting-room.html?id=${m.MeetingID}" class="btn ${userType === 'Admin' ? 'btn-outline-danger' : 'btn-success'} btn-sm w-100"><i class="fas fa-video me-1"></i> Join Room</a>` :
                `<button class="btn btn-light text-muted btn-sm w-100 disabled">In Person</button>`);

        return `
            <div class="col-md-6 col-lg-4">
                <div class="meeting-card d-flex flex-column h-100">
                    <div class="p-3 d-flex align-items-start">
                        <div class="date-box me-3">
                            <div class="h4 fw-bold mb-0">${dateObj.getDate()}</div>
                            <div class="small text-uppercase">${dateObj.toLocaleString('default', { month: 'short' })}</div>
                        </div>
                        <div>
                            <h6 class="fw-bold mb-1 text-truncate" style="max-width: 180px;">${m.EventName}</h6>
                            <div class="text-muted small"><i class="far fa-clock"></i> ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    </div>
                    <div class="card-footer-custom mt-auto">${btnHtml}</div>
                </div>
            </div>`;
    }).join('');
}
