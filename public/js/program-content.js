// Parse URL params
const params = new URLSearchParams(window.location.search);
const enrollmentId = params.get('enrollmentId');
const programId = params.get('programId');

let modules = [];
let levels = []; // Child Programs
let userEnrollments = []; // To check access
let completedModules = [];
let currentModule = null;

// Cleanup tracking
let watchInterval = null;
let pdfTimer = null;
let ytPlayer = null;
let eventSource = null;

// In-Video Quiz State
let activeInVideoQuizzes = [];
let completedInVideoQuizzes = new Set();
let isQuizShowing = false;
let currentQuizFailCount = 0;

document.addEventListener('DOMContentLoaded', async () => {
    if (!enrollmentId || !programId) {
        showToast('Invalid access. Missing enrollment or program ID.', 'error');
        setTimeout(() => {
            window.location.href = 'user-printadobe.html';
        }, 2000);
        return;
    }

    try {
        await Promise.all([
            loadLevels(),
            loadModules(),
            loadProgress(),
            loadUserEnrollments()
        ]);

        // Start automatic refresh via SSE
        setupSSE();

        // Static Listeners
        document.getElementById('logoutBtn')?.addEventListener('click', logout);
        document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Failed to load course data. Please refresh the page.', 'error');
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    cleanup();
});

function cleanup() {
    if (watchInterval) {
        clearInterval(watchInterval);
        watchInterval = null;
    }
    if (pdfTimer) {
        clearInterval(pdfTimer);
        pdfTimer = null;
    }
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        ytPlayer.destroy();
        ytPlayer = null;
    }
}

async function loadLevels() {
    try {
        const response = await fetch(`/api/programs/${programId}/children`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        levels = Array.isArray(data) ? data : (data.children || []);
    } catch (error) {
        console.error('Error loading levels:', error);
        levels = [];
    }
}

async function loadUserEnrollments() {
    try {
        const memberDetails = JSON.parse(localStorage.getItem('memberDetails'));
        if (!memberDetails?.memberID) {
            throw new Error('No member details found');
        }

        const response = await fetch(`/api/enrollments/my-enrollments?userID=${memberDetails.memberID}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        userEnrollments = await response.json();
    } catch (error) {
        console.error('Error loading enrollments:', error);
        userEnrollments = [];
    }
}

async function loadModules(silent = false) {
    try {
        const response = await fetch(`/api/programs/${programId}/modules`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const newModules = await response.json();

        // Check if modules have changed
        const modulesChanged = silent && (
            newModules.length !== modules.length ||
            JSON.stringify(newModules.map(m => ({ id: m.ModuleID, title: m.Title }))) !==
            JSON.stringify(modules.map(m => ({ id: m.ModuleID, title: m.Title })))
        );

        // Update current module if it was edited
        if (silent && currentModule) {
            const updatedActive = newModules.find(m => m.ModuleID === currentModule.ModuleID);
            if (updatedActive) {
                const titleChanged = updatedActive.Title !== currentModule.Title;
                const descChanged = updatedActive.Description !== currentModule.Description;
                const typeChanged = updatedActive.ContentType !== currentModule.ContentType;
                const urlChanged = updatedActive.ContentURL !== currentModule.ContentURL;

                if (titleChanged || typeChanged) {
                    const titleEl = document.getElementById('currentModuleTitle');
                    const typeEl = document.getElementById('currentModuleType');
                    if (titleEl) titleEl.textContent = updatedActive.Title;
                    if (typeEl) typeEl.textContent = (updatedActive.ContentType || 'video').toUpperCase();
                }

                if (descChanged) {
                    const descEl = document.getElementById('lessonDescription');
                    if (descEl) descEl.textContent = (updatedActive.Description || 'No description available for this module.').replace(/\[QUIZ\][\s\S]*?\[\/QUIZ\]/g, '').trim() || 'No description available for this module.';
                }

                // If URL changed, refresh content
                if (urlChanged) {
                    const moduleItem = document.querySelector(`.module-item[data-module-id="${updatedActive.ModuleID}"]`);
                    if (moduleItem) {
                        selectModule(updatedActive, { currentTarget: moduleItem });
                    }
                }

                currentModule = updatedActive;
            }
        }

        modules = newModules;

        // Set program title
        if (!silent) {
            try {
                const memberDetails = JSON.parse(localStorage.getItem('memberDetails'));
                if (memberDetails?.memberID) {
                    const enrollRes = await fetch(`/api/enrollments/my-enrollments?userID=${memberDetails.memberID}`);
                    if (enrollRes.ok) {
                        const enrollments = await enrollRes.json();
                        const currentEnroll = enrollments.find(e => e.EnrollmentID == enrollmentId);
                        const programTitleEl = document.getElementById('programTitle');
                        if (programTitleEl) {
                            programTitleEl.innerHTML = currentEnroll
                                ? `<i class="fas fa-graduation-cap me-2 text-warning"></i>${currentEnroll.ProgramTitle}`
                                : `<i class="fas fa-graduation-cap me-2 text-warning"></i>Course Content`;
                        }
                    }
                }
            } catch (e) {
                console.error('Error setting program title:', e);
                const programTitleEl = document.getElementById('programTitle');
                if (programTitleEl) {
                    programTitleEl.innerHTML = `<i class="fas fa-graduation-cap me-2 text-warning"></i>Course Content`;
                }
            }
        }

        if (modules.length === 0) {
            const moduleListEl = document.getElementById('moduleList');
            if (moduleListEl) {
                moduleListEl.innerHTML = `<p class="text-center text-muted p-4">No modules available yet.</p>`;
            }
            return;
        }

        updateModuleList();
        updateProgress();

        // Show notification if modules changed
        if (silent && modulesChanged) {
            showModuleUpdateNotification();
        }
    } catch (error) {
        console.error('Error loading modules:', error);
        showToast('Failed to load modules', 'error');
    }
}

function showModuleUpdateNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = `
        <i class="fas fa-sync-alt me-2"></i>
        <span>Module list updated</span>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function setupSSE() {
    // Close existing connection
    if (eventSource) {
        eventSource.close();
    }

    eventSource = new EventSource(`/api/programs/${programId}/modules/events`);

    eventSource.onopen = function () {
        console.log('Connected to module update stream');
    };

    eventSource.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'moduleUpdate') {
                loadModules(true);
            }
        } catch (error) {
            console.error('Error parsing SSE message:', error);
        }
    };

    eventSource.onerror = function (error) {
        console.error('SSE Error:', error);
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        // Retry after 5 seconds
        setTimeout(() => {
            if (!eventSource) { // Only reconnect if not already connected
                setupSSE();
            }
        }, 5000);
    };
}

async function loadProgress() {
    try {
        const response = await fetch(`/api/enrollments/${enrollmentId}/progress`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        completedModules = await response.json();
        updateProgress();
        updateModuleList();
    } catch (error) {
        console.error('Error loading progress:', error);
        completedModules = [];
    }
}

function updateModuleList() {
    const moduleList = document.getElementById('moduleList');
    if (!moduleList) return;

    const activeModuleId = currentModule ? currentModule.ModuleID : null;
    moduleList.innerHTML = '';

    // Main section
    const mainSection = document.createElement('div');
    mainSection.className = 'level-section mt-0';

    const mainHeader = document.createElement('div');
    mainHeader.className = 'level-header';
    mainHeader.innerHTML = `<div class="d-flex align-items-center"><i class="fas fa-folder-open me-2 text-warning"></i><span>Core Curriculum</span></div>`;

    const mainBody = document.createElement('div');
    mainBody.className = 'level-body p-2';

    modules.forEach(module => {
        const item = createModuleItem(module);
        if (activeModuleId === module.ModuleID) {
            item.classList.add('active');
        }
        mainBody.appendChild(item);
    });

    mainSection.appendChild(mainHeader);
    mainSection.appendChild(mainBody);
    moduleList.appendChild(mainSection);

    // Render levels
    const levelsContainer = document.getElementById('levelsListContainer');
    if (levelsContainer) {
        levelsContainer.innerHTML = '';
        levels.forEach(level => {
            renderLevelSection(level, levelsContainer);
        });
    }
}

function createModuleItem(module) {
    return createModuleItemWithProgress(module, completedModules);
}

function createModuleItemWithProgress(module, progressArray) {
    const isCompleted = progressArray.some(c => c.ModuleID === module.ModuleID);
    const item = document.createElement('div');
    item.className = `module-item ${isCompleted ? 'completed' : ''}`;

    if (currentModule && currentModule.ModuleID === module.ModuleID) {
        item.classList.add('active');
    }

    item.dataset.moduleId = module.ModuleID;
    item.addEventListener('click', (e) => selectModule(module, e));

    const iconMap = {
        'video': 'fa-play-circle',
        'quiz': 'fa-question-circle',
        'article': 'fa-file-alt',
        'pdf': 'fa-file-pdf'
    };
    const colorMap = {
        'video': 'text-danger',
        'quiz': 'text-primary',
        'article': 'text-info',
        'pdf': 'text-danger'
    };
    const type = module.ContentType || 'video';
    const iconClass = iconMap[type] || 'fa-circle';
    const colorClass = colorMap[type] || 'text-secondary';

    item.innerHTML = `
        <div class="module-checkbox">
            ${isCompleted ? '<i class="fas fa-check"></i>' : ''}
        </div>
        <div class="me-3 fs-5 ${colorClass}">
            <i class="fas ${iconClass}"></i>
        </div>
        <div class="module-info">
            <div class="module-title">${module.OrderIndex}. ${module.Title}</div>
            <div class="module-type">${type}</div>
        </div>
    `;
    return item;
}

async function renderLevelSection(level, container) {
    const isEnrolled = userEnrollments.some(e => e.ProgramID === level.ProgramID);

    const section = document.createElement('div');
    section.className = 'level-section mt-0';

    const header = document.createElement('div');
    header.className = 'level-header';

    let statusBadge = '';
    if (isEnrolled) {
        statusBadge = `<span class="badge bg-success"><i class="fas fa-check me-1"></i>Unlocked</span>`;
    } else if (level.Price > 0) {
        statusBadge = `<span class="badge bg-warning text-dark"><i class="fas fa-lock me-1"></i>$${level.Price}</span>`;
    } else {
        statusBadge = `<span class="badge bg-info text-dark">Free</span>`;
    }

    header.innerHTML = `<div class="d-flex align-items-center"><i class="fas fa-folder-open me-2 text-warning"></i><span>${level.Title}</span></div>${statusBadge}`;
    section.appendChild(header);

    const body = document.createElement('div');
    body.className = 'level-body p-2';

    if (isEnrolled) {
        body.innerHTML = `<div class="text-center text-muted small"><i class="fas fa-spinner fa-spin"></i> Loading content...</div>`;
        section.appendChild(body);

        try {
            const childEnrollment = userEnrollments.find(e => e.ProgramID === level.ProgramID);

            const [modulesRes, progressRes] = await Promise.all([
                fetch(`/api/programs/${level.ProgramID}/modules`),
                childEnrollment ? fetch(`/api/enrollments/${childEnrollment.EnrollmentID}/progress`) : Promise.resolve({ ok: true, json: () => [] })
            ]);

            if (!modulesRes.ok) {
                throw new Error(`HTTP ${modulesRes.status}`);
            }

            const levelModules = await modulesRes.json();
            const levelProgress = progressRes.ok ? await progressRes.json() : [];

            body.innerHTML = '';

            if (levelModules.length === 0) {
                body.innerHTML = `<div class="text-muted small ps-3">No modules yet.</div>`;
            } else {
                levelModules.forEach(mod => {
                    const item = createModuleItemWithProgress(mod, levelProgress);
                    body.appendChild(item);
                });
            }
        } catch (e) {
            console.error('Failed to load level modules:', e);
            body.innerHTML = `<div class="text-danger small">Failed to load content</div>`;
        }
    } else {
        body.innerHTML = `
            <div class="text-center p-3">
                <p class="small text-muted mb-2">${level.Description || 'Unlock this level to access content.'}</p>
                <button class="btn btn-sm btn-warning w-100 unlock-level-btn" 
                    data-level-id="${level.ProgramID}" 
                    data-price="${level.Price}"
                    data-title="${level.Title}">
                    ${level.Price > 0 ? `Unlock for $${level.Price}` : 'Start for Free'}
                </button>
            </div>
        `;
        section.appendChild(body);
    }

    container.appendChild(section);
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('unlock-level-btn')) {
        handleUnlockLevel(e.target);
    }
});

async function handleUnlockLevel(btn) {
    const levelId = btn.dataset.levelId;
    const price = btn.dataset.price;
    const title = btn.dataset.title;
    const memberDetails = JSON.parse(localStorage.getItem('memberDetails'));

    if (!memberDetails?.memberID) {
        showToast('Please log in to continue', 'error');
        return;
    }

    if (typeof Swal === 'undefined') {
        if (!confirm(`Unlock "${title}"? ${price > 0 ? `This will cost $${price}.` : 'This program is free.'}`)) {
            return;
        }
    } else {
        const result = await Swal.fire({
            title: `Unlock "${title}"?`,
            text: price > 0 ? `This will cost $${price}.` : 'This program is free to start.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: price > 0 ? `Yes, unlock for $${price}` : 'Yes, start now!'
        });

        if (!result.isConfirmed) return;
    }

    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';

    try {
        const response = await fetch('/api/enrollments/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: memberDetails.memberID,
                programId: levelId,
                details: 'Unlocked via Parent Program',
            })
        });

        const resData = await response.json();

        if (response.ok && (resData.success || resData.EnrollmentID)) {
            if (typeof Swal !== 'undefined') {
                await Swal.fire({
                    title: 'Unlocked!',
                    text: 'You now have access to this program.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showToast('Level unlocked successfully!', 'success');
            }

            await Promise.all([loadUserEnrollments(), loadLevels()]);
            updateModuleList();
        } else {
            const errorMsg = resData.message || 'Failed to unlock level';
            if (typeof Swal !== 'undefined') {
                Swal.fire('Error', errorMsg, 'error');
            } else {
                showToast(errorMsg, 'error');
            }
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    } catch (e) {
        console.error('Unlock error:', e);
        const errorMsg = 'An unexpected error occurred';
        if (typeof Swal !== 'undefined') {
            Swal.fire('Error', errorMsg, 'error');
        } else {
            showToast(errorMsg, 'error');
        }
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

function selectModule(module, event) {
    // Cleanup previous module resources
    cleanup();

    currentModule = module;

    // Update active state
    document.querySelectorAll('.module-item').forEach(item => {
        item.classList.remove('active');
    });
    if (event?.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    // Update header
    const typeIcon = {
        'video': 'fa-play-circle',
        'quiz': 'fa-question-circle',
        'article': 'fa-file-alt',
        'pdf': 'fa-file-pdf'
    }[module.ContentType || 'video'] || 'fa-circle';

    const typeColor = {
        'video': 'text-danger',
        'quiz': 'text-primary',
        'article': 'text-info',
        'pdf': 'text-danger'
    }[module.ContentType || 'video'] || 'text-secondary';

    const titleEl = document.getElementById('currentModuleTitle');
    const typeEl = document.getElementById('currentModuleType');

    if (titleEl) {
        titleEl.innerHTML = module.Title;
        titleEl.className = 'mb-1 fw-bold text-dark h4';
    }

    if (typeEl) {
        typeEl.innerHTML = `
            <i class="fas ${typeIcon} ${typeColor} me-1"></i> 
            <span class="text-uppercase fw-bold" style="letter-spacing:1px; font-size: 0.75rem;">${module.ContentType || 'video'}</span>
        `;
    }

    // Render content
    const contentMain = document.getElementById('contentMain');
    if (!contentMain) return;

    const isCompleted = completedModules.some(c => c.ModuleID === module.ModuleID);
    let contentHTML = '';
    const autoMarkEnabled = !isCompleted;

    // Video content
    if (module.ContentType === 'video' || !module.ContentType) {
        const url = module.ContentURL || '';

        if (url.match(/\.(mp4|webm|ogg)($|\?)/i)) {
            contentHTML = `
                <div class="video-container shadow-sm mb-4" style="padding-bottom: 0; height: auto;">
                    <video id="videoPlayer" controls style="width: 100%; border-radius: 12px;">
                        <source src="${url}" type="video/${url.split('.').pop().split('?')[0]}">
                        Your browser does not support the video tag.
                    </video>
                </div>
            `;
        } else {
            const embedUrl = getEmbedUrl(url);
            const isYouTube = embedUrl.includes('youtube.com/embed/');

            if (isYouTube && autoMarkEnabled) {
                const videoId = embedUrl.split('embed/')[1]?.split('?')[0];
                if (videoId) {
                    contentHTML = `
                        <div class="video-container shadow-sm mb-4">
                            <div id="ytPlayer" data-video-id="${videoId}"></div>
                        </div>
                        <p class="text-muted small text-center"><i class="fas fa-info-circle me-1"></i> This module will be marked complete when the video ends.</p>
                    `;
                }
            } else {
                contentHTML = `
                    <div class="video-container shadow-sm mb-4">
                        <iframe src="${embedUrl}" 
                                title="${module.Title}"
                                frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen></iframe>
                    </div>
                `;
            }
        }
    }
    // PDF content
    else if (module.ContentType === 'pdf') {
        contentHTML = `
            <div class="card mb-4 border-0 shadow-sm" style="height: 85vh; min-height: 800px; position: relative;">
                <iframe id="pdfViewer" src="${module.ContentURL}" width="100%" height="100%" style="border:none;">
                    This browser does not support PDFs. Please download the PDF to view it: <a href="${module.ContentURL}">Download PDF</a>
                </iframe>
            </div>
            <div id="pdfCompleteSection" class="text-center">
                <p class="text-muted small mb-2">
                    <i class="fas fa-info-circle me-1"></i> 
                    Please read through the PDF, then click the button below to mark as complete.
                </p>
                <button id="pdfCompleteBtn" class="btn btn-success" disabled>
                    <i class="fas fa-spinner fa-spin me-2" id="pdfBtnSpinner"></i>
                    <span id="pdfBtnText">Available in <span id="pdfCountdown">10</span>s...</span>
                </button>
            </div>
        `;
    }
    // Article content
    else if (module.ContentType === 'article') {
        contentHTML = `
            <div class="card mb-4 border-0 shadow-sm overflow-hidden" id="articleContainer">
                <div class="ratio" style="--bs-aspect-ratio: 100%; height: 800px;">
                    <iframe src="${module.ContentURL}" class="w-100 h-100 border-0" allowfullscreen title="Article Content" id="articleIframe"></iframe>
                </div>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <a href="${module.ContentURL}" target="_blank" class="btn btn-outline-primary btn-sm">
                    <i class="fas fa-external-link-alt me-1"></i> Open Original Link
                </a>
                
                ${autoMarkEnabled ? `
                <button id="articleCompleteBtn" class="btn btn-success" disabled>
                     <i class="fas fa-spinner fa-spin me-2" id="articleBtnSpinner"></i>
                     <span id="articleBtnText">Available in <span id="articleCountdown">5</span>s...</span>
                </button>
                ` : '<span class="text-success fw-bold"><i class="fas fa-check-circle me-1"></i> Completed</span>'}
            </div>
        `;
    }
    // Quiz content
    else if (module.ContentType === 'quiz') {
        contentHTML = renderQuizContent(module);
    }
    // External link
    else {
        contentHTML = `
            <div class="p-5 text-center bg-light rounded-3 mb-4">
                <i class="fas fa-external-link-alt fa-3x text-primary mb-3"></i>
                <h4>External Resource</h4>
                <p class="text-muted">This module links to an external resource.</p>
                <a href="${module.ContentURL}" target="_blank" class="btn btn-primary mt-2">
                    Open Resource <i class="fas fa-arrow-right ms-2"></i>
                </a>
            </div>
        `;
    }

    const cleanDescription = (module.Description || 'No description available for this module.').replace(/\[QUIZ\][\s\S]*?\[\/QUIZ\]/g, '').trim();

    // Extract quizzes to show timestamps to user
    const quizMatches = (module.Description || '').match(/\[QUIZ\]([\s\S]*?)\[\/QUIZ\]/g) || [];
    let quizInfoHTML = '';
    if (quizMatches.length > 0) {
        const times = quizMatches.map(m => {
            try { return JSON.parse(m.replace('[QUIZ]', '').replace('[/QUIZ]', '')).time; } catch (e) { return null; }
        }).filter(t => t !== null).sort((a, b) => a - b);

        if (times.length > 0) {
            quizInfoHTML = `
                <div class="mt-3 pt-3 border-top">
                    <small class="fw-bold text-muted text-uppercase mb-2 d-block" style="letter-spacing: 1px;">
                        <i class="fas fa-stopwatch me-1"></i> Interactive Quizzes
                    </small>
                    <div class="d-flex flex-wrap gap-2">
                        ${times.map(t => `<span class="badge bg-white border text-dark py-2 px-3"><i class="fas fa-question-circle text-primary me-2"></i>At ${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}</span>`).join('')}
                    </div>
                </div>
            `;
        }
    }

    contentMain.innerHTML = `
        ${contentHTML}
        <div class="module-description p-3 bg-light rounded-3 border-start border-4 border-danger shadow-sm" style="max-width: 1000px;">
            <div class="d-flex justify-content-between align-items-start">
                 <h5 class="mb-2 fw-bold text-dark"><i class="fas fa-info-circle me-2 text-danger"></i>About this lesson</h5>
            </div>
            <p class="text-secondary mb-0" id="lessonDescription" style="line-height: 1.6;">${cleanDescription || 'No description available for this module.'}</p>
            ${quizInfoHTML}
        </div>
    `;

    contentMain.scrollTop = 0;

    // Attach listeners
    setTimeout(() => {
        const pdfBtn = document.getElementById('pdfCompleteBtn');
        const articleBtn = document.getElementById('articleCompleteBtn');
        const quizBtn = document.getElementById('btnSubmitQuiz');

        if (pdfBtn) pdfBtn.addEventListener('click', completeModule);
        if (articleBtn) articleBtn.addEventListener('click', completeModule);
        if (quizBtn) quizBtn.addEventListener('click', submitQuiz);

        if (autoMarkEnabled) {
            setupAutoComplete(module.ContentType || 'video');
        }

        // Initialize in-video quizzes if it's a video
        if (module.ContentType === 'video' || !module.ContentType) {
            parseInVideoQuizzes(module.Description);
        }

        // Article iframe fallback
        if (module.ContentType === 'article') {
            setTimeout(() => {
                const iframe = document.getElementById('articleIframe');
                const container = document.getElementById('articleContainer');
                if (iframe && container) {
                    iframe.addEventListener('error', () => showArticleFallback(container, module.ContentURL));

                    setTimeout(() => {
                        try {
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                            if (!iframeDoc || iframeDoc.body.innerHTML === '') {
                                showArticleFallback(container, module.ContentURL);
                            }
                        } catch (e) {
                            showArticleFallback(container, module.ContentURL);
                        }
                    }, 3000);
                }
            }, 100);
        }
    }, 100);
}

function parseInVideoQuizzes(description) {
    activeInVideoQuizzes = [];
    completedInVideoQuizzes = new Set();
    isQuizShowing = false;
    currentQuizFailCount = 0;

    if (!description) return;

    // Use regex to find [QUIZ]{...}[/QUIZ] patterns
    const regex = /\[QUIZ\]([\s\S]*?)\[\/QUIZ\]/g;
    let match;
    while ((match = regex.exec(description)) !== null) {
        try {
            const quizData = JSON.parse(match[1]);
            if (quizData.time !== undefined && quizData.question) {
                activeInVideoQuizzes.push(quizData);
            }
        } catch (e) {
            console.error('Failed to parse in-video quiz JSON:', e);
        }
    }

    // Sort quizzes by timestamp
    activeInVideoQuizzes.sort((a, b) => a.time - b.time);
}

function checkInVideoQuizzes(currentTime) {
    if (isQuizShowing) return;

    // RULE: If the module is already completed, don't show any in-video quizzes
    if (currentModule && completedModules.some(c => c.ModuleID === currentModule.ModuleID)) {
        return;
    }

    // Trigger quiz if we have reached or PASSED the timestamp and haven't completed it yet.
    // This handles seeking/skipping forward.
    const quiz = activeInVideoQuizzes.find(q =>
        currentTime >= q.time &&
        !completedInVideoQuizzes.has(q.time)
    );

    if (quiz) {
        showInVideoQuiz(quiz);
    }
}

function showInVideoQuiz(quiz) {
    isQuizShowing = true;

    // Pause video
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer) {
        videoPlayer.pause();
    } else if (ytPlayer && ytPlayer.pauseVideo) {
        ytPlayer.pauseVideo();
    }

    const container = document.querySelector('.video-container');
    if (!container) return;

    const overlay = document.createElement('div');
    overlay.className = 'video-quiz-overlay';
    overlay.id = 'videoQuizOverlay';

    let optionsHTML = quiz.options.map((opt, idx) => `
        <button class="video-quiz-option" onclick="handleInVideoQuizSubmit(${idx}, ${quiz.correct}, ${quiz.time})">
            ${opt}
        </button>
    `).join('');

    overlay.innerHTML = `
        <div class="video-quiz-card">
            <h4><i class="fas fa-question-circle text-primary"></i> Quick Quiz</h4>
            <p class="mb-4 fw-bold">${quiz.question}</p>
            <div class="options-container">
                ${optionsHTML}
            </div>
            <div id="quizFeedback" class="mt-3 small" style="display:none;"></div>
        </div>
    `;

    container.appendChild(overlay);
}

window.handleInVideoQuizSubmit = function (selectedIdx, correctIdx, quizTime) {
    const feedback = document.getElementById('quizFeedback');
    const buttons = document.querySelectorAll('.video-quiz-option');

    // Disable all buttons
    buttons.forEach(btn => btn.disabled = true);

    if (selectedIdx === correctIdx) {
        buttons[selectedIdx].classList.add('correct');
        feedback.textContent = 'Correct! Continuing video...';
        feedback.className = 'mt-3 small text-success fw-bold';
        feedback.style.display = 'block';
        currentQuizFailCount = 0; // Reset on success

        setTimeout(() => {
            closeInVideoQuiz(quizTime);
        }, 1500);
    } else {
        currentQuizFailCount++;
        buttons[selectedIdx].classList.add('wrong');

        if (currentQuizFailCount >= 3) {
            feedback.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i> Failed 3 times. Resetting to 0%...`;
            feedback.className = 'mt-3 small text-danger fw-bold';
            feedback.style.display = 'block';

            setTimeout(() => {
                // Reset video and close quiz
                const videoPlayer = document.getElementById('videoPlayer');
                if (videoPlayer) {
                    videoPlayer.currentTime = 0;
                    watchedSeconds = 0; // Reset watch tracking too
                } else if (ytPlayer && ytPlayer.seekTo) {
                    ytPlayer.seekTo(0);
                    watchedSeconds = 0;
                }

                currentQuizFailCount = 0;
                closeInVideoQuiz(null); // Close without marking completed

                showToast('Video reset due to quiz failures', 'warning');
            }, 2000);
        } else {
            feedback.textContent = `Incorrect. (${currentQuizFailCount}/3 attempts) Please try again.`;
            feedback.className = 'mt-3 small text-danger fw-bold';
            feedback.style.display = 'block';

            setTimeout(() => {
                // Re-enable buttons for retry
                buttons.forEach(btn => {
                    btn.disabled = false;
                    btn.classList.remove('wrong');
                });
                feedback.style.display = 'none';
            }, 2000);
        }
    }
};

function closeInVideoQuiz(quizTime) {
    const overlay = document.getElementById('videoQuizOverlay');
    if (overlay) overlay.remove();

    if (quizTime !== null) {
        completedInVideoQuizzes.add(quizTime);
    }
    isQuizShowing = false;

    // Resume video
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer) {
        videoPlayer.play();
    } else if (ytPlayer && ytPlayer.playVideo) {
        ytPlayer.playVideo();
    }
}

function renderQuizContent(module) {
    try {
        const parsed = JSON.parse(module.ContentURL);
        let quizData = [];
        let passingPercentage = 70;
        let manualRequired = null;

        if (Array.isArray(parsed)) {
            quizData = parsed;
        } else if (parsed?.questions) {
            quizData = parsed.questions;
            if (parsed.settings) {
                if (parsed.settings.passingPercentage) passingPercentage = parsed.settings.passingPercentage;
                if (parsed.settings.requiredCorrect) manualRequired = parsed.settings.requiredCorrect;
            }
        }

        const totalQuestions = quizData.length;
        const requiredCorrect = manualRequired || Math.ceil(totalQuestions * (passingPercentage / 100));

        let quizHTML = `
            <div class="card mb-4 border-0 shadow-sm">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="mb-0"><i class="fas fa-question-circle me-2 text-primary"></i>Quiz</h5>
                        <span class="badge bg-primary">${totalQuestions} Questions</span>
                    </div>
                    <div class="alert alert-info py-2 mb-3">
                        <i class="fas fa-bullseye me-2"></i>
                        <strong>Passing Requirement:</strong> Get at least ${requiredCorrect} out of ${totalQuestions} questions correct
                    </div>
                    <form id="quizForm" data-required="${requiredCorrect}">
        `;

        quizData.forEach((q, index) => {
            quizHTML += `
                <div class="mb-4 p-3 bg-light rounded">
                    <p class="fw-bold mb-3">${index + 1}. ${q.question}</p>
                    <div class="ms-3">
            `;
            q.options.forEach((opt, optIndex) => {
                quizHTML += `
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="radio" name="q${index}" 
                               id="q${index}_opt${optIndex}" value="${optIndex}" required>
                        <label class="form-check-label" for="q${index}_opt${optIndex}">${opt}</label>
                    </div>
                `;
            });
            quizHTML += `</div></div>`;
        });

        quizHTML += `
                    </form>
                    <div class="text-center mt-4">
                        <button class="btn btn-primary btn-lg px-5" id="btnSubmitQuiz">
                            <i class="fas fa-paper-plane me-2"></i>Submit Quiz
                        </button>
                    </div>
                    <p class="text-muted small text-center mt-2">
                        <i class="fas fa-info-circle me-1"></i>You need at least ${requiredCorrect}/${totalQuestions} correct to pass
                    </p>
                </div>
            </div>
        `;
        return quizHTML;
    } catch (e) {
        console.error('Quiz render error:', e);
        return `<div class="alert alert-danger">Error loading quiz data</div>`;
    }
}

function showArticleFallback(container, url) {
    container.innerHTML = `
        <div class="card-body text-center py-5">
            <i class="fas fa-external-link-alt fa-4x text-primary mb-4"></i>
            <h4>Article Link</h4>
            <p class="text-muted mb-4">This content is hosted externally and cannot be displayed directly.</p>
            <a href="${url}" target="_blank" class="btn btn-primary btn-lg">
                <i class="fas fa-arrow-right me-2"></i> Open Article
            </a>
            <div class="mt-4 text-start bg-light p-3 rounded small">
                <strong>URL:</strong>
                <a href="${url}" target="_blank" class="text-break">${url}</a>
            </div>
        </div>
    `;
}

let watchedSeconds = 0;
let videoDuration = 0;
const REQUIRED_WATCH_PERCENT = 1.0;

function setupAutoComplete(contentType) {
    // Reset
    watchedSeconds = 0;
    videoDuration = 0;
    if (watchInterval) clearInterval(watchInterval);
    if (pdfTimer) clearInterval(pdfTimer);
    watchInterval = null;
    pdfTimer = null;

    // HTML5 Video
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer) {
        // Fix: Check if metadata is already loaded
        if (videoPlayer.readyState >= 1) {
            videoDuration = videoPlayer.duration;
        }

        videoPlayer.addEventListener('loadedmetadata', () => {
            videoDuration = videoPlayer.duration;
        });

        videoPlayer.addEventListener('playing', () => {
            if (watchInterval) clearInterval(watchInterval);
            watchInterval = setInterval(() => {
                if (!videoPlayer.paused && !videoPlayer.seeking) {
                    watchedSeconds++;
                    checkInVideoQuizzes(videoPlayer.currentTime);
                }
            }, 1000);
        });

        videoPlayer.addEventListener('pause', () => {
            if (watchInterval) {
                clearInterval(watchInterval);
                watchInterval = null;
            }
        });

        videoPlayer.addEventListener('ended', () => {
            if (watchInterval) {
                clearInterval(watchInterval);
                watchInterval = null;
            }
            // Ensure we have a valid duration before allowing completion check
            if (videoDuration <= 0 && videoPlayer.duration > 0) {
                videoDuration = videoPlayer.duration;
            }
            checkWatchCompletion();
        });
        return;
    }

    // YouTube
    const ytPlayerDiv = document.getElementById('ytPlayer');
    if (ytPlayerDiv) {
        const videoId = ytPlayerDiv.dataset.videoId;
        if (videoId) {
            if (typeof YT !== 'undefined' && YT.Player) {
                initYouTubePlayer(videoId);
            } else {
                loadYouTubeAPI(videoId);
            }
        }
        return;
    }

    // PDF countdown
    const pdfCompleteBtn = document.getElementById('pdfCompleteBtn');
    if (pdfCompleteBtn) {
        let countdown = 10;
        const countdownEl = document.getElementById('pdfCountdown');
        const spinnerEl = document.getElementById('pdfBtnSpinner');
        const textEl = document.getElementById('pdfBtnText');

        pdfTimer = setInterval(() => {
            countdown--;
            if (countdownEl) countdownEl.textContent = countdown;

            if (countdown <= 0) {
                clearInterval(pdfTimer);
                pdfTimer = null;
                pdfCompleteBtn.disabled = false;
                if (spinnerEl) spinnerEl.className = 'fas fa-check-circle me-2';
                if (textEl) textEl.innerHTML = 'I have read this PDF';
            }
        }, 1000);
    }

    // Article countdown
    const articleBtn = document.getElementById('articleCompleteBtn');
    if (articleBtn) {
        let countdown = 5;
        const countdownEl = document.getElementById('articleCountdown');
        const spinnerEl = document.getElementById('articleBtnSpinner');
        const textEl = document.getElementById('articleBtnText');

        pdfTimer = setInterval(() => { // Re-using pdfTimer variable for convenience to track interval
            countdown--;
            if (countdownEl) countdownEl.textContent = countdown;

            if (countdown <= 0) {
                clearInterval(pdfTimer);
                pdfTimer = null;
                articleBtn.disabled = false;
                if (spinnerEl) spinnerEl.className = 'fas fa-check-circle me-2';
                if (textEl) textEl.innerHTML = 'Mark as Complete';
            }
        }, 1000);
    }
}

function initYouTubePlayer(videoId) {
    if (typeof YT === 'undefined' || !YT.Player) {
        console.error('YouTube API not loaded');
        return;
    }

    ytPlayer = new YT.Player('ytPlayer', {
        videoId: videoId,
        playerVars: {
            'origin': window.location.origin,
            'rel': 0,
            'enablejsapi': 1
        },
        events: {
            'onReady': (event) => {
                videoDuration = event.target.getDuration();
            },
            'onStateChange': (event) => {
                if (event.data === 1) { // Playing
                    if (watchInterval) clearInterval(watchInterval);
                    watchInterval = setInterval(() => {
                        watchedSeconds++;
                        checkInVideoQuizzes(ytPlayer.getCurrentTime());
                    }, 1000);
                } else if (event.data === 2 || event.data === 0) { // Paused or Ended
                    if (watchInterval) {
                        clearInterval(watchInterval);
                        watchInterval = null;
                    }
                    if (event.data === 0) {
                        checkWatchCompletion();
                    }
                }
            }
        }
    });
}

function loadYouTubeAPI(videoId) {
    if (window.ytApiLoading) return;
    window.ytApiLoading = true;

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = function () {
        const ytPlayerDiv = document.getElementById('ytPlayer');
        if (ytPlayerDiv && ytPlayerDiv.dataset.videoId) {
            initYouTubePlayer(ytPlayerDiv.dataset.videoId);
        }
    };
}

function checkWatchCompletion() {
    if (videoDuration <= 0) {
        completeModule();
        return;
    }

    const watchPercent = watchedSeconds / videoDuration;

    if (watchPercent >= REQUIRED_WATCH_PERCENT) {
        completeModule();
    } else {
        const percentNeeded = Math.round(REQUIRED_WATCH_PERCENT * 100);
        const percentWatched = Math.round(watchPercent * 100);
        showErrorPopup(`You've only watched ${percentWatched}% of this video. Please watch at least ${percentNeeded}% to complete this module.`);
    }
}

function showErrorPopup(message) {
    const existing = document.getElementById('errorOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'errorOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';

    overlay.innerHTML = `
        <div style="background:white;padding:40px;border-radius:15px;max-width:400px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.3);">
            <i class="fas fa-exclamation-circle" style="font-size:50px;color:#d32f2f;margin-bottom:20px;"></i>
            <h4 style="margin-bottom:15px;color:#333;">Watch More to Complete</h4>
            <p style="color:#666;margin-bottom:25px;">${message}</p>
            <button id="btnCloseErrorOverlay" 
                    style="background:#d32f2f;color:white;border:none;padding:12px 30px;border-radius:25px;font-weight:600;cursor:pointer;">
                Got it
            </button>
        </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('btnCloseErrorOverlay').addEventListener('click', () => overlay.remove());
}

function getEmbedUrl(url) {
    if (!url) return '';

    let videoId = '';

    if (url.includes('youtube.com/watch')) {
        try {
            const urlParams = new URLSearchParams(new URL(url).search);
            videoId = urlParams.get('v');
        } catch (e) {
            console.error('Invalid YouTube URL:', e);
        }
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('youtube.com/embed/')) {
        return url;
    }

    if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?rel=0&enablejsapi=1&origin=${window.location.origin}`;
    }

    if (url.includes('vimeo.com')) {
        const vimeoId = url.split('vimeo.com/')[1]?.split('?')[0];
        if (vimeoId && /^\d+$/.test(vimeoId)) {
            return `https://player.vimeo.com/video/${vimeoId}`;
        }
    }

    return url;
}

async function completeModule() {
    if (!currentModule) return;

    const completeBtn = document.getElementById('completeBtn');
    if (completeBtn) {
        completeBtn.disabled = true;
        completeBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Completing...';
    }

    const parentProgramId = parseInt(programId);
    const moduleProgramId = parseInt(currentModule.ProgramID);
    let targetEnrollmentId = enrollmentId;

    if (moduleProgramId !== parentProgramId) {
        const childEnrollment = userEnrollments.find(e => parseInt(e.ProgramID) === moduleProgramId);
        if (childEnrollment) {
            targetEnrollmentId = childEnrollment.EnrollmentID;
        } else {
            showToast('Error: You are not enrolled in this level.', 'error');
            if (completeBtn) {
                completeBtn.disabled = false;
                completeBtn.innerHTML = '<i class="fas fa-check me-2"></i>Mark as Complete';
            }
            return;
        }
    }

    try {
        const response = await fetch(`/api/enrollments/${targetEnrollmentId}/modules/${currentModule.ModuleID}/complete`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            const celebration = document.getElementById('celebration');
            if (celebration) {
                celebration.classList.add('show');
                setTimeout(() => {
                    celebration.classList.remove('show');
                }, 2000);
            }

            await Promise.all([loadProgress(), updateProgress()]);

            if (completeBtn) completeBtn.style.display = 'none';
        } else {
            showToast(result.message || 'Failed to mark module as complete', 'info');
            if (completeBtn) {
                completeBtn.disabled = false;
                completeBtn.innerHTML = '<i class="fas fa-check me-2"></i>Mark as Complete';
            }
        }
    } catch (error) {
        console.error('Completion error:', error);
        showToast('Error completing module', 'error');
        if (completeBtn) {
            completeBtn.disabled = false;
            completeBtn.innerHTML = '<i class="fas fa-check me-2"></i>Mark as Complete';
        }
    }
}

function showToast(message, type = 'info') {
    const existingToast = document.getElementById('toastPopup');
    if (existingToast) existingToast.remove();

    const colors = {
        success: { bg: '#28a745', icon: 'fa-check-circle' },
        error: { bg: '#dc3545', icon: 'fa-exclamation-circle' },
        warning: { bg: '#ffc107', icon: 'fa-exclamation-triangle' },
        info: { bg: '#17a2b8', icon: 'fa-info-circle' }
    };
    const config = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.id = 'toastPopup';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${config.bg};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
    `;
    toast.innerHTML = `
        <i class="fas ${config.icon}"></i>
        <span>${message}</span>
    `;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function updateProgress() {
    const parentModuleIds = new Set(modules.map(m => m.ModuleID));
    const parentCompletedCount = completedModules.filter(c => parentModuleIds.has(c.ModuleID)).length;

    let globalTotal = modules.length;
    let globalCompleted = parentCompletedCount;

    if (levels.length > 0 && userEnrollments.length > 0) {
        const statsPromises = levels.map(async (level) => {
            const enrollment = userEnrollments.find(e => e.ProgramID === level.ProgramID);
            if (enrollment) {
                try {
                    const [modRes, progRes] = await Promise.all([
                        fetch(`/api/programs/${level.ProgramID}/modules`),
                        fetch(`/api/enrollments/${enrollment.EnrollmentID}/progress`)
                    ]);

                    if (!modRes.ok || !progRes.ok) {
                        throw new Error('Failed to fetch level stats');
                    }

                    const mods = await modRes.json();
                    const prog = await progRes.json();

                    return {
                        total: mods.length,
                        completed: prog.length
                    };
                } catch (e) {
                    console.error(`Error fetching stats for level ${level.ProgramID}:`, e);
                    return { total: 0, completed: 0 };
                }
            }
            return { total: 0, completed: 0 };
        });

        const results = await Promise.all(statsPromises);
        results.forEach(stat => {
            globalTotal += stat.total;
            globalCompleted += stat.completed;
        });
    }

    const percentage = globalTotal > 0 ? Math.round((globalCompleted / globalTotal) * 100) : 0;

    const progressText = document.getElementById('progressText');
    const progressBar = document.getElementById('progressBar');

    if (progressText) progressText.textContent = `${globalCompleted}/${globalTotal} (${percentage}%)`;
    if (progressBar) progressBar.style.width = `${percentage}%`;
}

function logout() {
    cleanup();
    localStorage.clear();
    window.location.href = 'index.html';
}

function submitQuiz() {
    if (!currentModule) return;

    try {
        const parsed = JSON.parse(currentModule.ContentURL);
        let quizData = [];
        let passingPercentage = 70;

        if (Array.isArray(parsed)) {
            quizData = parsed;
        } else if (parsed?.questions) {
            quizData = parsed.questions;
            if (parsed.settings?.passingPercentage) {
                passingPercentage = parsed.settings.passingPercentage;
            }
        }

        const form = document.getElementById('quizForm');
        if (!form) return;

        // Check all answered
        let allAnswered = true;
        quizData.forEach((_, index) => {
            const selected = form.querySelector(`input[name="q${index}"]:checked`);
            if (!selected) allAnswered = false;
        });

        if (!allAnswered) {
            showQuizResult(false, 'Please answer all questions before submitting.');
            return;
        }

        // Calculate score
        let correct = 0;
        quizData.forEach((q, index) => {
            const selected = form.querySelector(`input[name="q${index}"]:checked`);
            const questionDiv = form.querySelectorAll('.mb-4.p-3.bg-light.rounded')[index];
            const allOptions = form.querySelectorAll(`input[name="q${index}"]`);

            allOptions.forEach((opt, optIdx) => {
                const label = opt.closest('.form-check');
                if (!label) return;

                if (optIdx === q.correctIndex) {
                    label.classList.add('text-success');
                    label.innerHTML = label.innerHTML + ' <i class="fas fa-check-circle text-success"></i>';
                } else if (selected && parseInt(selected.value) === optIdx && optIdx !== q.correctIndex) {
                    label.classList.add('text-danger');
                    label.innerHTML = label.innerHTML + ' <i class="fas fa-times-circle text-danger"></i>';
                }
                opt.disabled = true;
            });

            if (selected && parseInt(selected.value) === q.correctIndex) {
                correct++;
                if (questionDiv) questionDiv.style.borderLeft = '4px solid #28a745';
            } else {
                if (questionDiv) questionDiv.style.borderLeft = '4px solid #dc3545';
            }
        });

        const score = Math.round((correct / quizData.length) * 100);
        const requiredCorrect = parseInt(form.dataset.required) || Math.ceil(quizData.length * 0.7);
        const passed = correct >= requiredCorrect;

        const submitBtn = document.querySelector('#quizForm + .text-center button');
        if (submitBtn) {
            if (passed) {
                submitBtn.outerHTML = `
                    <div class="alert alert-success text-center">
                        <h5><i class="fas fa-trophy me-2"></i>Your Score: ${score}%</h5>
                        <p class="mb-0">${correct}/${quizData.length} correct answers</p>
                    </div>
                `;
            } else {
                submitBtn.outerHTML = `
                    <div class="alert alert-warning text-center">
                        <h5><i class="fas fa-exclamation-circle me-2"></i>Your Score: ${score}%</h5>
                        <p>${correct}/${quizData.length} correct answers</p>
                        <button class="btn btn-primary mt-2" onclick="retakeQuiz()">
                            <i class="fas fa-redo me-2"></i>Retake Quiz
                        </button>
                    </div>
                `;
            }
        }

        if (passed) {
            showQuizResult(true, `Congratulations! You scored ${score}% (${correct}/${quizData.length} correct)`);
            completeModule();
        } else {
            showQuizResult(false, `You scored ${score}% (${correct}/${quizData.length} correct). You need at least ${requiredCorrect} correct to pass.`);
        }
    } catch (e) {
        console.error('Quiz submission error:', e);
        showQuizResult(false, 'Error processing quiz. Please try again.');
    }
}

function showQuizResult(passed, message) {
    const existing = document.getElementById('quizResultOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'quizResultOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';

    overlay.innerHTML = `
        <div style="background:white;padding:40px;border-radius:15px;max-width:400px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.3);">
            <i class="fas ${passed ? 'fa-check-circle text-success' : 'fa-times-circle text-danger'}" 
                style="font-size:60px;margin-bottom:20px;"></i>
            <h4 style="margin-bottom:15px;color:#333;">${passed ? 'Quiz Passed!' : 'Quiz Not Passed'}</h4>
            <p style="color:#666;margin-bottom:25px;">${message}</p>
            <button onclick="document.getElementById('quizResultOverlay').remove()" 
                    style="background:${passed ? '#28a745' : '#d32f2f'};color:white;border:none;padding:12px 30px;border-radius:25px;font-weight:600;cursor:pointer;">
                ${passed ? 'Continue' : 'Try Again'}
            </button>
        </div>
    `;

    document.body.appendChild(overlay);
}

function retakeQuiz() {
    if (currentModule) {
        const moduleItem = document.querySelector(`.module-item[data-module-id="${currentModule.ModuleID}"]`);
        if (moduleItem) {
            selectModule(currentModule, { currentTarget: moduleItem });
        }
    }
}