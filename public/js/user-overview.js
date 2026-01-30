// STATE
let allEnrollments = [];
let certificatesCount = 0;
let totalModulesCompleted = 0;
let totalModulesCount = 0;

// INIT
document.addEventListener('DOMContentLoaded', () => {
    const member = JSON.parse(localStorage.getItem('memberDetails'));
    if (!member) {
        window.location.href = 'login.html';
        return;
    }

    // Set user info
    document.getElementById('userName').innerText = member.username;
    document.getElementById('dateDisplay').innerText = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    setupEventListeners();
    loadOverviewData(member.memberID);
});

function setupEventListeners() {
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });
}

async function loadOverviewData(userId) {
    try {
        document.getElementById('loadingSpinner').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';

        const [enrollmentRes, certRes] = await Promise.all([
            fetch(`/api/enrollments/my-enrollments?userID=${userId}`),
            fetch(`/api/credentials/my-credentials?userID=${userId}`)
        ]);

        const enrollmentData = await enrollmentRes.json();
        const certData = await certRes.json();

        // --- FAKE DATA INJECTION FOR DEMO ---
        if (enrollmentData.length > 0) {
            enrollmentData[0].Details = JSON.stringify({ QuizScore: 85 });
        }
        if (enrollmentData.length > 1) {
            enrollmentData[1].Details = JSON.stringify({ QuizScore: 92 });
        }
        // ------------------------------------

        if (Array.isArray(certData)) {
            certificatesCount = certData.length;
        }

        if (Array.isArray(enrollmentData)) {
            // Enhance data with progress details
            const enhancedData = await Promise.all(enrollmentData.map(async (e) => {
                let dynamicProgress = e.Progress || 0;
                let completedCount = 0;
                let totalCount = 0;

                try {
                    const [modulesRes, progressRes, childrenRes] = await Promise.all([
                        fetch(`/api/programs/${e.ProgramID}/modules`),
                        fetch(`/api/enrollments/${e.EnrollmentID}/progress`),
                        fetch(`/api/programs/${e.ProgramID}/children`)
                    ]);

                    const modules = await modulesRes.json();
                    const progress = await progressRes.json();
                    const children = await childrenRes.json();

                    const parentModuleIds = new Set(modules.map(m => m.ModuleID));
                    totalCount = modules.length;
                    completedCount = progress.filter(p => parentModuleIds.has(p.ModuleID)).length;

                    // Aggregate child programs
                    if (children.length > 0) {
                        const childStatsPromises = children.map(async (child) => {
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

            allEnrollments = enhancedData.filter(e => e.IsActive);
            calculateStats();
            renderEnrollmentsTable();
            updateProgressRing();
        }
    } catch (err) {
        console.error("Overview Load Error:", err);
    } finally {
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
    }
}

function calculateStats() {
    const active = allEnrollments.filter(e => e.Progress < 100).length;
    const completed = allEnrollments.filter(e => e.Progress === 100).length;

    // Calculate total modules
    totalModulesCompleted = allEnrollments.reduce((sum, e) => sum + (e.completedCount || 0), 0);
    totalModulesCount = allEnrollments.reduce((sum, e) => sum + (e.totalCount || 0), 0);

    document.getElementById('activeCourses').innerText = active;
    document.getElementById('completedCourses').innerText = completed;
    document.getElementById('certificatesCount').innerText = certificatesCount;
    document.getElementById('modulesCompleted').innerText = totalModulesCompleted;
}

function getTypeBadgeClass(type) {
    if (type === 'Workshop') return 'badge-workshop';
    if (type === 'Trip') return 'badge-trip';
    if (type === 'Lesson') return 'badge-lesson';
    return 'badge-course';
}

function renderEnrollmentsTable() {
    const tbody = document.getElementById('enrollmentsTable');
    const noEnrollments = document.getElementById('noEnrollments');

    if (allEnrollments.length === 0) {
        tbody.innerHTML = '';
        noEnrollments.style.display = 'block';
        return;
    }

    noEnrollments.style.display = 'none';

    // Show top 5 enrollments
    const displayEnrollments = allEnrollments.slice(0, 5);

    tbody.innerHTML = displayEnrollments.map(e => `
        <tr>
            <td class="ps-4">
                <div class="program-info">
                    <img src="${e.ProgramImage || 'https://via.placeholder.com/50'}" class="program-thumb" alt="${e.ProgramTitle}">
                    <div>
                        <div class="program-title">${e.ProgramTitle}</div>
                        <div class="program-enrolled">Enrolled ${new Date(e.EnrollmentDate).toLocaleDateString()}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="badge-type ${getTypeBadgeClass(e.ProgramType)}">${e.ProgramType || 'Course'}</span>
            </td>
            <td style="min-width: 150px;">
                <div class="d-flex align-items-center gap-2">
                    <div class="progress flex-grow-1">
                        <div class="progress-bar" style="width: ${e.Progress}%"></div>
                    </div>
                    <span class="fw-bold small">${e.Progress}%</span>
                </div>
            </td>
            <td>
                <span class="fw-bold text-dark">
                    ${(() => {
            try {
                const details = e.Details ? JSON.parse(e.Details) : {};
                return details.QuizScore ? details.QuizScore + '/100' : '-';
            } catch (err) { return '-'; }
        })()}
                </span>
            </td>
            <td>
                <span class="status-badge ${e.Progress >= 100 ? 'status-completed' : 'status-active'}">
                    ${e.Progress >= 100 ? 'Completed' : 'In Progress'}
                </span>
            </td>
            <td class="text-end pe-4">
                <a href="program-content.html?enrollmentId=${e.EnrollmentID}&programId=${e.ProgramID}" 
                   class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-arrow-right"></i>
                </a>
            </td>
        </tr>
    `).join('');
}

function updateProgressRing() {
    const overallProgress = totalModulesCount > 0
        ? Math.round((totalModulesCompleted / totalModulesCount) * 100)
        : 0;

    document.getElementById('overallProgress').innerText = overallProgress;
    document.getElementById('totalModulesCompleted').innerText = totalModulesCompleted;
    document.getElementById('totalModules').innerText = totalModulesCount;

    // Animate the ring
    const circle = document.getElementById('progressRing');
    const circumference = 2 * Math.PI * 52; // r=52
    const offset = circumference - (overallProgress / 100) * circumference;

    // Add gradient definition if not exists
    const svg = circle.closest('svg');
    if (!svg.querySelector('defs')) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#10b981;stop-opacity:1" />
            </linearGradient>
        `;
        svg.insertBefore(defs, svg.firstChild);
    }

    setTimeout(() => {
        circle.style.strokeDashoffset = offset;
    }, 100);
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
