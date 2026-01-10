document.addEventListener('DOMContentLoaded', () => {
    const member = JSON.parse(localStorage.getItem('memberDetails'));
    if (!member) { window.location.href = 'login.html'; return; }

    // Assume member object has something like 'memberID' or 'userID' or 'id'
    // Based on earlier code, it seems to be memberID from login.html
    const userId = member.memberID || member.userID || member.id;

    if (userId) {
        loadEnrollments(userId);
    } else {
        console.error("User ID not found in localStorage");
    }
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });
}

async function loadEnrollments(userId) {
    const grid = document.getElementById('enrollmentGrid');
    const loader = document.getElementById('loader');
    const emptyState = document.getElementById('emptyState');

    try {
        const res = await fetch(`/api/enrollments/my-enrollments?userID=${userId}`);
        const enrollments = await res.json();

        loader.style.display = 'none';

        if (!res.ok || enrollments.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        grid.style.display = 'flex';

        // Helper to get badge color based on type
        const getTypeBadge = (type) => {
            if (type === 'Workshop') return 'bg-info';
            if (type === 'Immersive Trip') return 'bg-success';
            return 'bg-primary';
        };

        grid.innerHTML = '';

        // Load each enrollment with dynamic progress
        for (const e of enrollments) {
            // Fetch actual module progress
            let completedCount = 0;
            let totalCount = 0;
            let dynamicProgress = e.Progress || 0;

            try {
                const [modulesRes, progressRes] = await Promise.all([
                    fetch(`/api/programs/${e.ProgramID}/modules`),
                    fetch(`/api/enrollments/${e.EnrollmentID}/progress`)
                ]);

                const modules = await modulesRes.json();
                const progress = await progressRes.json();

                totalCount = modules.length;
                completedCount = progress.length;
                dynamicProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            } catch (err) {
                console.error('Error fetching progress:', err);
            }

            const cardHTML = `
            <div class="col-md-6 col-lg-4">
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
                                <small class="fw-bold text-dark">${completedCount}/${totalCount} completed</small>
                            </div>
                            <div class="progress" style="height: 8px;">
                                <div class="progress-bar bg-danger" role="progressbar" 
                                     style="width: ${dynamicProgress}%" 
                                     aria-valuenow="${dynamicProgress}" aria-valuemin="0" aria-valuemax="100"></div>
                            </div>
                            <div class="d-flex justify-content-between mt-1">
                                <small class="text-muted fw-bold">${dynamicProgress}%</small> 
                                <small class="text-${dynamicProgress >= 100 ? 'success' : 'warning'} fw-bold">
                                    ${dynamicProgress >= 100 ? 'Completed' : 'In Progress'}
                                </small>
                            </div>
                        </div>

                        <div class="mt-auto d-flex justify-content-between align-items-center">
                            <small class="text-muted"><i class="far fa-calendar-alt me-1"></i> ${new Date(e.EnrollmentDate).toLocaleDateString()}</small>
                            <a href="program-content.html?enrollmentId=${e.EnrollmentID}&programId=${e.ProgramID}" class="btn btn-sm btn-outline-dark">Access Content</a>
                        </div>
                    </div>
                </div>
            </div>
            `;
            grid.innerHTML += cardHTML;
        }

    } catch (error) {
        console.error("Error loading enrollments:", error);
        loader.style.display = 'none';
        emptyState.style.display = 'block';
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
