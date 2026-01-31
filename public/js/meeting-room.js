document.addEventListener('DOMContentLoaded', async () => {
    // 1. Sidebar Logic (Shared)
    // 1. Sidebar Logic (Shared)
    setupSidebar();

    // Event Listeners
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('dashSidebar').classList.toggle('active');
    });

    // 2. Meeting Logic
    const params = new URLSearchParams(window.location.search);
    const meetingID = params.get('id');

    if (!meetingID) {
        showError("Invalid Link", "No meeting ID provided.");
        return;
    }

    const user = getUserDetails();
    if (!user) { window.location.href = 'login.html'; return; }

    const userID = user.memberID || user.adminID;
    const userType = user.memberID ? 'NGO' : 'Admin';

    try {
        const response = await fetch(`/api/meetings/join/${meetingID}?userID=${userID}&userType=${userType}`);
        const data = await response.json();

        if (data.success) {
            initializeRoom(data.roomUrl, userType);
        } else {
            showError("Access Denied", data.error || "Unable to join room.");
        }
    } catch (err) {
        console.error(err);
        showError("Network Error", "Server is unreachable.");
    }
});

function setupSidebar() {
    const member = JSON.parse(localStorage.getItem("memberDetails"));
    const admin = JSON.parse(localStorage.getItem("adminDetails"));
    const userType = member ? 'User' : (admin ? 'Admin' : null);

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

    const dashLinks = document.getElementById('dashLinks');

    // "Active" class is on 'Meetings' or 'Live Room'
    if (userType === 'Admin') {
        dashLinks.innerHTML = `
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
        dashLinks.innerHTML = `
            <a href="ngo-dashboard.html" class="nav-link"><i class="fas fa-chart-pie"></i> Dashboard</a>
            <a href="chat.html" class="nav-link"><i class="fas fa-comments"></i> Partner Chat</a>
            <a href="booking-Consultation.html" class="nav-link"><i class="fas fa-calendar-check"></i> Book Consultation</a>
            <a href="my-meetings.html" class="nav-link active"><i class="fas fa-video"></i> My Meetings</a>
            <a href="profile.html" class="nav-link"><i class="fas fa-user-circle"></i> Profile</a>
        `;
    }
}

function initializeRoom(url, userType) {
    // Update UI Badge
    const badge = document.getElementById('roleBadge');
    if (userType === 'Admin') {
        badge.innerHTML = '<i class="fas fa-crown text-warning me-2"></i> Host';
        badge.style.border = '1px solid rgba(255, 193, 7, 0.5)';
    } else {
        badge.innerHTML = '<i class="fas fa-user me-2"></i> Participant';
    }

    // Create Iframe
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.allow = "camera; microphone; fullscreen; display-capture; autoplay; screen-wake-lock";
    document.getElementById('iframeWrapper').appendChild(iframe);

    // Switch Views
    setTimeout(() => {
        document.getElementById('loadingArea').style.display = 'none';
        document.getElementById('videoContainer').style.display = 'block';
    }, 1000);
}

function getUserDetails() {
    return JSON.parse(localStorage.getItem("memberDetails")) || JSON.parse(localStorage.getItem("adminDetails"));
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

function showError(title, msg) {
    document.getElementById('loadingArea').style.display = 'none';
    document.getElementById('videoContainer').style.display = 'none';

    const errArea = document.getElementById('errorArea');
    errArea.style.display = 'flex';

    document.getElementById('errorTitle').innerText = title;
    document.getElementById('errorText').innerText = msg;
}
