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
    loadUserDiscounts(); // NEW: Load user's discount codes
    loadPublicDiscounts(); // NEW: Load public discount codes
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
                    const childrenData = await childrenRes.json();
                    const children = Array.isArray(childrenData) ? childrenData : (childrenData.children || []);

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
                            const childEnrollment = enrollmentData.find(en => en.ProgramID === child.ProgramID); // Use ProgramID (PascalCase)

                            if (childEnrollment) {
                                try {
                                    const [cModRes, cProgRes] = await Promise.all([
                                        fetch(`/api/programs/${child.ProgramID}/modules`),
                                        fetch(`/api/enrollments/${childEnrollment.EnrollmentID}/progress`)
                                    ]);

                                    // Debugging helper
                                    const parseJsonOrLog = async (res, name) => {
                                        try {
                                            return await res.json();
                                        } catch (e) {
                                            const text = await res.text();
                                            console.error(`JSON Error in ${name}:`, e, text.substring(0, 100)); // Log first 100 chars
                                            return [];
                                        }
                                    };

                                    const cMods = await parseJsonOrLog(cModRes, `Modules ${child.ProgramID}`);
                                    const cProg = await parseJsonOrLog(cProgRes, `Progress ${childEnrollment.EnrollmentID}`);

                                    return { total: Array.isArray(cMods) ? cMods.length : 0, completed: Array.isArray(cProg) ? cProg.length : 0 };
                                } catch (err) {
                                    console.error('Stats aggregation error:', err);
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

    // Handle different tabs
    if (currentTab === 'trips') {
        renderTripsContent(container);
        return;
    }

    if (currentTab === 'training') {
        renderTrainingContent(container);
        return;
    }

    // Default: active and history tabs (enrollment-based)
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

// IMMERSIVE TRIPS TAB
function renderTripsContent(container) {
    // Filter enrollments for Trip type programs
    const tripEnrollments = allEnrollments.filter(e => e.ProgramType === 'Trip');

    if (tripEnrollments.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 fade-in">
                <div class="empty-state-icon-wrapper mb-4">
                    <div class="position-relative d-inline-block">
                        <div class="bg-light rounded-circle shadow-sm" style="width: 100px; height: 100px; line-height: 100px;">
                            <i class="fas fa-plane fa-3x text-muted opacity-25"></i>
                        </div>
                        <div class="position-absolute top-50 start-50 translate-middle">
                            <i class="fas fa-globe fa-2x text-success shadow-sm" style="text-shadow: 0 2px 4px rgba(0,0,0,0.1);"></i>
                        </div>
                    </div>
                </div>
                <h4 class="fw-bold text-dark mb-2">No Enrolled Trips</h4>
                <p class="text-muted mb-4 mx-auto" style="max-width: 400px;">
                    You haven't enrolled in any immersive trips yet. Explore our exciting travel programs!
                </p>
                <a href="printadobe.html" class="btn btn-success px-5 py-2 fw-bold shadow-sm rounded-pill transition-all">
                    <i class="fas fa-compass me-2"></i>Explore Trips
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = tripEnrollments.map((e, index) => `
        <div class="col-md-6 col-lg-4 fade-in" style="animation-delay: ${index * 0.1}s">
            <div class="card h-100 shadow-sm border-0 trip-card">
                <div class="position-relative">
                    <img src="${e.ProgramImage || 'https://via.placeholder.com/400x200?text=Trip'}" 
                         class="card-img-top" alt="${e.ProgramTitle}" style="height: 200px; object-fit: cover;">
                    <span class="badge bg-success position-absolute top-0 end-0 m-3">
                        <i class="fas fa-plane me-1"></i> Immersive Trip
                    </span>
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title fw-bold">${e.ProgramTitle}</h5>
                    <p class="card-text text-muted small mb-3">
                        ${e.ProgramDescription ? e.ProgramDescription.substring(0, 100) + '...' : 'No description available.'}
                    </p>
                    
                    <div class="trip-details mb-3">
                        <div class="d-flex align-items-center mb-2">
                            <i class="fas fa-calendar-check text-success me-2"></i>
                            <span class="text-muted small">Enrolled: ${new Date(e.EnrollmentDate).toLocaleDateString()}</span>
                        </div>
                        <div class="d-flex align-items-center mb-2">
                            <i class="fas fa-clock text-primary me-2"></i>
                            <span class="text-muted small">${e.ProgramDuration || 'Duration TBA'}</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <i class="fas fa-map-marker-alt text-danger me-2"></i>
                            <span class="text-muted small">${e.ProgramLocation || 'Location TBA'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// LIVE ONLINE LESSONS TAB
async function renderTrainingContent(container) {
    // Filter enrollments for Lesson type programs
    const trainingEnrollments = allEnrollments.filter(e => e.ProgramType === 'Lesson');

    if (trainingEnrollments.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 fade-in">
                <div class="empty-state-icon-wrapper mb-4">
                    <div class="position-relative d-inline-block">
                        <div class="bg-light rounded-circle shadow-sm" style="width: 100px; height: 100px; line-height: 100px;">
                            <i class="fas fa-desktop fa-3x text-muted opacity-25"></i>
                        </div>
                        <div class="position-absolute top-50 start-50 translate-middle">
                            <i class="fas fa-video fa-2x text-primary shadow-sm" style="text-shadow: 0 2px 4px rgba(0,0,0,0.1);"></i>
                        </div>
                    </div>
                </div>
                <h4 class="fw-bold text-dark mb-2">No Enrolled Live Lessons</h4>
                <p class="text-muted mb-4 mx-auto" style="max-width: 400px;">
                    You haven't enrolled in any live online lessons yet. Explore our programs!
                </p>
                <a href="printadobe.html" class="btn btn-primary px-5 py-2 fw-bold shadow-sm rounded-pill transition-all">
                    <i class="fas fa-compass me-2"></i>Explore Lessons
                </a>
            </div>
        `;
        return;
    }

    // Fetch the enrolled slot for each lesson
    const lessonsWithSlots = await Promise.all(trainingEnrollments.map(async (e) => {
        try {
            // If user enrolled in a specific slot, fetch that slot's details
            if (e.SlotID) {
                const res = await fetch(`/api/programs/${e.ProgramID}/slots`);
                const slots = await res.json();
                const enrolledSlot = slots.find(s => s.SlotID === e.SlotID);
                return { ...e, enrolledSlot };
            }
            return { ...e, enrolledSlot: null };
        } catch (err) {
            return { ...e, enrolledSlot: null };
        }
    }));

    container.innerHTML = lessonsWithSlots.map((e, index) => {
        // Format the enrolled session date/time and determine status
        let sessionInfo = '<span class="text-muted small">No session assigned</span>';
        let sessionStatus = 'none'; // 'none', 'past', 'live', 'upcoming'
        const now = new Date();

        if (e.enrolledSlot) {
            const startDate = new Date(e.enrolledSlot.StartTime);
            const endDate = new Date(e.enrolledSlot.EndTime);
            const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const startTimeStr = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const endTimeStr = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            // Determine session status
            if (now > endDate) {
                sessionStatus = 'past';
                sessionInfo = `<span class="text-muted small"><s>${dateStr}<br>${startTimeStr} - ${endTimeStr}</s> <span class="badge bg-secondary">Ended</span></span>`;
            } else if (now >= startDate && now <= endDate) {
                sessionStatus = 'live';
                sessionInfo = `<span class="text-danger fw-bold small"><i class="fas fa-circle me-1" style="font-size: 8px;"></i> LIVE NOW<br>${startTimeStr} - ${endTimeStr}</span>`;
            } else {
                sessionStatus = 'upcoming';
                sessionInfo = `<span class="text-primary fw-bold small">${dateStr}<br>${startTimeStr} - ${endTimeStr}</span>`;
            }
        }

        // Build Join button based on session status
        let joinButton = '';
        if (sessionStatus === 'past') {
            joinButton = `<button class="btn btn-secondary flex-grow-1" disabled>
                <i class="fas fa-video-slash me-1"></i>Session Ended
            </button>`;
        } else if (sessionStatus === 'live') {
            joinButton = `<button class="btn btn-danger flex-grow-1" onclick="joinMeeting(${e.ProgramID}, '${e.ProgramTitle.replace(/'/g, "\\'")}')">
                <i class="fas fa-video me-1"></i>Join Now
            </button>`;
        } else if (sessionStatus === 'upcoming') {
            joinButton = `<button class="btn btn-primary flex-grow-1" onclick="joinMeeting(${e.ProgramID}, '${e.ProgramTitle.replace(/'/g, "\\'")}')">
                <i class="fas fa-video me-1"></i>Join
            </button>`;
        } else {
            joinButton = `<button class="btn btn-secondary flex-grow-1" disabled>
                <i class="fas fa-video-slash me-1"></i>No Session
            </button>`;
        }

        return `
        <div class="col-md-6 col-lg-4 fade-in" style="animation-delay: ${index * 0.1}s">
            <div class="card h-100 shadow-sm border-0 training-card">
                <div class="position-relative">
                    <img src="${e.ProgramImage || 'https://via.placeholder.com/400x200?text=Lesson'}" 
                         class="card-img-top" alt="${e.ProgramTitle}" style="height: 200px; object-fit: cover;">
                    <span class="badge bg-primary position-absolute top-0 end-0 m-3">
                        <i class="fas fa-desktop me-1"></i> Live Lesson
                    </span>
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title fw-bold">${e.ProgramTitle}</h5>
                    <p class="card-text text-muted small mb-3">
                        ${e.ProgramDescription ? e.ProgramDescription.substring(0, 100) + '...' : 'No description available.'}
                    </p>
                    
                    <div class="training-details mb-3">
                        <div class="d-flex align-items-center mb-2">
                            <i class="fas fa-calendar-alt text-primary me-2"></i>
                            <span class="text-muted small me-1">Lesson Date:</span>
                            ${sessionInfo}
                        </div>
                        <div class="d-flex align-items-center mb-2">
                            <i class="fas fa-calendar-check text-success me-2"></i>
                            <span class="text-muted small">Enrolled: ${new Date(e.EnrollmentDate).toLocaleDateString()}</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <i class="fas fa-tasks text-info me-2"></i>
                            <span class="text-muted small">Progress: ${e.Progress}%</span>
                        </div>
                    </div>

                    <div class="mt-auto d-flex gap-2">
                        <a href="program-content.html?enrollmentId=${e.EnrollmentID}&programId=${e.ProgramID}" class="btn btn-outline-primary flex-grow-1">
                            <i class="fas fa-book me-1"></i>Content
                        </a>
                        ${joinButton}
                    </div>
                </div>
            </div>
        </div>
    `}).join('');
}

// Join Meeting Handler
async function joinMeeting(programId, programTitle) {
    const member = JSON.parse(localStorage.getItem('memberDetails'));
    if (!member) {
        alert('Please log in to join the meeting.');
        return;
    }

    // Check if user is enrolled in this program
    const enrollment = allEnrollments.find(e => e.ProgramID === programId);

    if (!enrollment) {
        // Show enrollment prompt
        if (confirm(`You need to enroll in "${programTitle}" to join the live session. Would you like to view the program details?`)) {
            window.location.href = `printadobe.html?programId=${programId}`;
        }
        return;
    }

    // Fetch the program's slots to get the meeting URL
    try {
        const res = await fetch(`/api/programs/${programId}/slots`);
        const slots = await res.json();

        if (slots.length > 0) {
            // Find the next upcoming slot with a meeting URL
            const now = new Date();
            const upcomingSlot = slots.find(s => new Date(s.StartTime) >= now && s.MeetingURL);

            if (upcomingSlot && upcomingSlot.MeetingURL) {
                // Open meeting in new tab
                window.open(upcomingSlot.MeetingURL, '_blank');
                return;
            }

            // If no upcoming slot, use the first slot with a meeting URL
            const anySlotWithUrl = slots.find(s => s.MeetingURL);
            if (anySlotWithUrl && anySlotWithUrl.MeetingURL) {
                window.open(anySlotWithUrl.MeetingURL, '_blank');
                return;
            }
        }

        // No meeting URL found, redirect to program content
        alert('No active meeting session found. Redirecting to course content...');
        window.location.href = `program-content.html?enrollmentId=${enrollment.EnrollmentID}&programId=${programId}`;
    } catch (err) {
        console.error('Error fetching meeting:', err);
        window.location.href = `program-content.html?enrollmentId=${enrollment.EnrollmentID}&programId=${programId}`;
    }
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

// DISCOUNT CODES
async function loadUserDiscounts() {
    const container = document.getElementById('userDiscountList');
    if (!container) return;

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            container.innerHTML = '<div class="text-muted small text-center">Log in to see codes</div>';
            return;
        }

        const res = await fetch('/api/discounts/my', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            // Handle non-2xx responses
            container.innerHTML = '<div class="text-muted small text-center py-2">No active codes</div>';
            return;
        }

        const data = await res.json();
        const discounts = data.discounts || [];

        if (discounts.length === 0) {
            container.innerHTML = '<div class="text-muted small text-center py-2">No active codes</div>';
            return;
        }

        container.innerHTML = discounts.map(d => `
            <div class="d-flex justify-content-between align-items-center p-2 bg-light rounded mb-2">
                <div>
                    <div class="fw-bold text-primary small" style="user-select: all; cursor: pointer;" title="Click to copy">${d.Code}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">${d.DiscountType === 'Percentage' ? d.Value + '% OFF' : '$' + d.Value + ' OFF'}</div>
                </div>
                <span class="badge ${d.CurrentUses >= (d.MaxUses || 9999) ? 'bg-secondary' : 'bg-success'}">
                    ${d.CurrentUses >= (d.MaxUses || 9999) ? 'Used' : 'Active'}
                </span>
            </div>
        `).join('');

    } catch (err) {
        console.error('Error loading user discounts:', err);
        container.innerHTML = '<div class="text-muted small text-center py-2">No active codes</div>';
    }
}

// PUBLIC DISCOUNT CODES (Global offers from Admin)
async function loadPublicDiscounts() {
    const container = document.getElementById('publicDiscountList');
    if (!container) return;

    try {
        const res = await fetch('/api/discounts/public');

        if (!res.ok) throw new Error('Failed to fetch');

        const data = await res.json();
        const discounts = data.discounts;

        if (!discounts || discounts.length === 0) {
            container.innerHTML = '<div class="text-muted small text-center py-2">No offers available</div>';
            return;
        }

        container.innerHTML = discounts.map(d => `
            <div class="d-flex justify-content-between align-items-center p-2 bg-light rounded mb-2">
                <div>
                    <div class="fw-bold text-info small" style="user-select: all; cursor: pointer;" title="Click to copy">${d.Code}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">${d.DiscountType === 'Percentage' ? d.Value + '% OFF' : '$' + d.Value + ' OFF'}</div>
                </div>
                <span class="badge bg-info">
                    <i class="fas fa-gift me-1"></i>Promo
                </span>
            </div>
        `).join('');

    } catch (err) {
        console.error('Error loading public discounts:', err);
        container.innerHTML = '<div class="text-muted small text-center py-2">No offers</div>';
    }
}
