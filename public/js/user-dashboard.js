// STATE
let allEnrollments = [];
let certificatesCount = 0;
let currentTab = 'active';

// INIT
document.addEventListener('DOMContentLoaded', () => {
    const member = JSON.parse(localStorage.getItem('memberDetails'));
    if (!member) { window.location.href = 'login.html'; return; }

    // Helper: Time of day greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
    document.getElementById('welcomeMsg').innerText = `${greeting}, ${member.username}`;
    document.getElementById('dateDisplay').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    setupEventListeners();
    setupEventListeners();
    loadDashboardData(member.memberID);
    loadAnnouncements();
    setupSSE();

    // Refund on return to tab
    window.addEventListener('focus', () => {
        loadDashboardData(member.memberID, true); // Silent refresh
    });
});

function setupEventListeners() {
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });

    // View All Modal Listener
    document.getElementById('announcementModal')?.addEventListener('show.bs.modal', loadAllAnnouncements);
}

async function loadDashboardData(userId, silent = false) {
    try {
        if (!silent) {
            document.getElementById('loadingSpinner').style.display = 'block';
            document.getElementById('contentArea').style.display = 'none';
        }
        const [enrollmentRes, certRes] = await Promise.all([
            fetch(`/api/enrollments/my-enrollments?userID=${userId}`),
            fetch(`/api/credentials/my-credentials?userID=${userId}`)
        ]);

        const enrollmentData = await enrollmentRes.json();
        const certData = await certRes.json();

        if (Array.isArray(certData)) {
            certificatesCount = certData.length;
        }

        if (Array.isArray(enrollmentData)) {
            // ENHANCE DATA WITH DETAILED PROGRESS (Same as user-printadobe.js)
            const enhancedData = await Promise.all(enrollmentData.map(async (e) => {
                let dynamicProgress = e.Progress || 0;
                let completedCount = 0;
                let totalCount = 0;

                try {
                    // Fetch Parent Modules & Progress
                    const [modulesRes, progressRes, childrenRes] = await Promise.all([
                        fetch(`/api/programs/${e.ProgramID}/modules`),
                        fetch(`/api/enrollments/${e.EnrollmentID}/progress`),
                        fetch(`/api/programs/${e.ProgramID}/children`)
                    ]);

                    const modules = await modulesRes.json();
                    const progress = await progressRes.json();
                    const children = await childrenRes.json();

                    // Get parent module IDs for accurate counting
                    const parentModuleIds = new Set(modules.map(m => m.ModuleID));

                    // Base counts (Parent) - only count progress that matches actual parent modules
                    // (Fixes issue where child module completions were historically recorded against parent)
                    totalCount = modules.length;
                    completedCount = progress.filter(p => parentModuleIds.has(p.ModuleID)).length;

                    // Aggregate Child Programs (if enrolled)
                    if (children.length > 0) {
                        const childStatsPromises = children.map(async (child) => {
                            // Find enrollment for this child program
                            // We need to look through ALL user enrollments to find if we have one for this child program
                            // Since 'enrollmentData' contains all current user enrollments, we can search it.
                            const childEnrollment = enrollmentData.find(en => en.ProgramID === child.ProgramID);

                            if (childEnrollment) {
                                try {
                                    const [cModRes, cProgRes] = await Promise.all([
                                        fetch(`/api/programs/${child.ProgramID}/modules`),
                                        fetch(`/api/enrollments/${childEnrollment.EnrollmentID}/progress`)
                                    ]);
                                    const cMods = await cModRes.json();
                                    const cProg = await cProgRes.json();
                                    return { total: cMods.length, completed: cProg.length };
                                } catch (err) {
                                    return { total: 0, completed: 0 };
                                }
                            }
                            return { total: 0, completed: 0 };
                        });

                        const childStats = await Promise.all(childStatsPromises);
                        childStats.forEach(stat => {
                            totalCount += stat.total;
                            completedCount += stat.completed;
                        });
                    }

                    dynamicProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                } catch (err) {
                    console.error('Error fetching progress details:', err);
                }

                return { ...e, Progress: dynamicProgress, completedCount, totalCount };
            }));

            // We want to show ALL programs now, including child programs (Levels), but only if the program IS ACTIVE
            allEnrollments = enhancedData.filter(e => e.IsActive);

            calculateStats();
            renderContent();
        }
    } catch (err) {
        console.error("Dashboard Load Error:", err);
        document.getElementById('contentArea').innerHTML = `<div class="col-12 text-center text-danger">Failed to load data.</div>`;
    } finally {
        if (!silent) {
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('contentArea').style.display = 'flex';
        }
    }
}

function calculateStats() {
    const active = allEnrollments.filter(e => e.Progress < 100).length;
    const completed = allEnrollments.filter(e => e.Progress === 100).length;

    document.getElementById('activeEnrollments').innerText = active;
    document.getElementById('completedCourses').innerText = completed;
    document.getElementById('certificatesCount').innerText = certificatesCount;
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.nav-link').forEach(n => {
        n.classList.remove('active', 'fw-bold', 'text-dark');
        n.classList.add('text-muted');
    });
    const activeBtn = document.getElementById(`tab-${tab}`);
    activeBtn.classList.add('active', 'fw-bold', 'text-dark');
    activeBtn.classList.remove('text-muted');

    const member = JSON.parse(localStorage.getItem('memberDetails'));
    // Reload data silently when switching tabs to ensure freshness
    if (member) {
        loadDashboardData(member.memberID, true);
    } else {
        renderContent();
    }
}

// Helper for badges (from user-printadobe.js)
const getTypeBadge = (type) => {
    if (type === 'Workshop') return 'bg-info';
    if (type === 'Immersive Trip') return 'bg-success';
    return 'bg-primary';
};

function renderContent() {
    const container = document.getElementById('contentArea');

    // Enable Carousel Mode (DISABLED per user request for vertical scrolling)
    container.classList.remove('carousel-mode');
    container.classList.add('row'); // Ensure row class is present for grid behavior

    const filtered = currentTab === 'active'
        ? allEnrollments.filter(e => e.Progress < 100)
        : allEnrollments.filter(e => e.Progress === 100);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 fade-in">
                <div class="empty-state-icon-wrapper mb-4">
                    <div class="position-relative d-inline-block">
                        <div class="bg-light rounded-circle shadow-sm" style="width: 100px; height: 100px; line-height: 100px;">
                            <i class="fas ${currentTab === 'active' ? 'fa-rocket' : 'fa-clipboard-check'} fa-3x text-muted opacity-25"></i>
                        </div>
                        <div class="position-absolute top-50 start-50 translate-middle">
                            <i class="fas ${currentTab === 'active' ? 'fa-search' : 'fa-history'} fa-2x text-warning shadow-sm" style="text-shadow: 0 2px 4px rgba(0,0,0,0.1);"></i>
                        </div>
                    </div>
                </div>
                <h4 class="fw-bold text-dark mb-2">No ${currentTab} items found</h4>
                <p class="text-muted mb-4 mx-auto" style="max-width: 400px;">
                    ${currentTab === 'active' ?
                "You haven't enrolled in any courses yet. Explore our professional programs to get started." :
                "You haven't completed any courses yet. Once you finish a course, it will appear here in your history."
            }
                </p>
                ${currentTab === 'active' ? `
                <a href="printadobe.html" class="btn btn-warning px-5 py-2 fw-bold shadow-sm rounded-pill transition-all">
                    <i class="fas fa-compass me-2"></i>Browse Catalog
                </a>` : ''}
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map((e, index) => `
        <div class="col-md-6 col-lg-4 fade-in" style="animation-delay: ${index * 0.1}s">
            <div class="card h-100 shadow-sm border-0">
                <div class="position-relative">
                    <img src="${e.ProgramImage || 'https://via.placeholder.com/400x200?text=Program'}" 
                         class="card-img-top" alt="${e.ProgramTitle}" style="height: 180px; object-fit: cover;">
                    <span class="badge ${getTypeBadge(e.ProgramType)} position-absolute top-0 end-0 m-3">
                        ${e.ProgramType}
                    </span>
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title fw-bold">${e.ProgramTitle}</h5>
                    <p class="card-text text-muted small mb-3">
                        ${e.ProgramDescription ? e.ProgramDescription.substring(0, 80) + '...' : 'No description available.'}
                    </p>
                    
                    <div class="mb-3">
                        <div class="d-flex justify-content-between mb-1">
                            <small class="text-muted">Module Progress</small>
                            <small class="fw-bold text-dark">${e.completedCount}/${e.totalCount} completed</small>
                        </div>
                        <div class="progress" style="height: 8px;">
                            <div class="progress-bar bg-danger" role="progressbar" 
                                 style="width: ${e.Progress}%" 
                                 aria-valuenow="${e.Progress}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                            <small class="text-muted fw-bold">${e.Progress}%</small> 
                            <small class="text-${e.Progress >= 100 ? 'success' : 'warning'} fw-bold">
                                ${e.Progress >= 100 ? 'Completed' : 'In Progress'}
                            </small>
                        </div>
                    </div>

                    <div class="mt-auto">
                         <a href="program-content.html?enrollmentId=${e.EnrollmentID}&programId=${e.ProgramID}" class="btn btn-dark w-100">
                            ${e.Progress === 0 ? 'Begin Learning' : (e.Progress >= 100 ? 'Review content' : 'Resume Course')} <i class="fas fa-arrow-right ms-2"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// ANNOUNCEMENTS
async function loadAnnouncements() {
    try {
        const res = await fetch('/api/announcements?limit=3');
        const announcements = await res.json();

        if (announcements.length > 0) {
            document.getElementById('announcementSection').style.display = 'block';
            const container = document.getElementById('announcementList');
            container.innerHTML = announcements.map(a => createAnnouncementCard(a)).join('');
        }
    } catch (err) {
        console.error('Error loading announcements:', err);
    }
}

function setupSSE() {
    const eventSource = new EventSource('/api/announcements/stream');

    eventSource.onopen = () => {
        console.log('[SSE] Connection established');
    };

    eventSource.onmessage = (event) => {
        try {
            const parsed = JSON.parse(event.data);
            if (parsed.type === 'new_announcement') {
                handleNewAnnouncement(parsed.data);
            }
        } catch (e) {
            // Check for initial connection or other non-JSON messages
            if (event.data && !event.data.includes('connected')) {
                console.debug('SSE parse skipped:', e);
            }
        }
    };

    eventSource.onerror = (err) => {
        console.error("SSE Error:", err);
        // EventSource automatically retries, strict closing might prevent reconnection
        if (eventSource.readyState === EventSource.CLOSED) {
            console.log('[SSE] Connection closed');
        }
    };
}

function handleNewAnnouncement(announcement) {
    const section = document.getElementById('announcementSection');
    const container = document.getElementById('announcementList');

    // Ensure section is visible
    section.style.display = 'block';

    // Remove empty state if present
    if (container.innerHTML.includes('No announcements')) {
        container.innerHTML = '';
    }

    // Prepend new card (with animation)
    const newCardHTML = createAnnouncementCard(announcement);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newCardHTML; // Gives us the col-md-4
    const newElement = tempDiv.firstElementChild;

    newElement.classList.add('fade-in'); // Ensure CSS animation class exists
    container.prepend(newElement);

    // Optional: Limit to 3 items visually by removing the last one if we have > 3
    if (container.children.length > 3) {
        container.lastElementChild.remove();
    }
}

function createAnnouncementCard(a) {
    return `
        <div class="col-12 mb-3">
            <div class="card border-0 shadow-sm h-100 announcement-card ${a.Priority === 'Urgent' ? 'border-danger' : ''}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge ${getPriorityBadge(a.Priority)}">${a.Priority}</span>
                        <small class="text-muted">${new Date(a.CreatedAt).toLocaleDateString()}</small>
                    </div>
                    <h6 class="fw-bold mb-2">${a.Title}</h6>
                    <p class="text-muted small mb-0">${a.Content}</p>
                </div>
            </div>
        </div>
    `;
}

function getPriorityBadge(priority) {
    if (priority === 'Urgent') return 'badge-urgent';
    if (priority === 'Important') return 'badge-important';
    return 'badge-normal';
}

async function loadAllAnnouncements() {
    const container = document.getElementById('allAnnouncementsBody');
    try {
        const res = await fetch('/api/announcements'); // No limit = fetch all active
        const announcements = await res.json();

        if (announcements.length === 0) {
            container.innerHTML = '<p class="text-center text-muted my-5">No announcements found.</p>';
            return;
        }

        container.innerHTML = `<div class="d-flex flex-column gap-3">` + announcements.map(a => `
            <div class="card border-0 shadow-sm">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge ${getPriorityBadge(a.Priority)}">${a.Priority}</span>
                        <small class="text-muted">${new Date(a.CreatedAt).toLocaleString()}</small>
                    </div>
                    <h5 class="fw-bold mb-2">${a.Title}</h5>
                    <div class="text-muted" style="white-space: pre-wrap;">${a.Content}</div>
                </div>
            </div>
        `).join('') + `</div>`;

    } catch (err) {
        container.innerHTML = '<p class="text-center text-danger">Failed to load announcements.</p>';
    }
}
