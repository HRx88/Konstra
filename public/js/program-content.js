// Parse URL params
const params = new URLSearchParams(window.location.search);
const enrollmentId = params.get('enrollmentId');
const programId = params.get('programId');

let modules = [];
let levels = []; // Child Programs
let userEnrollments = []; // To check access
let completedModules = [];
let currentModule = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!enrollmentId || !programId) {
        alert('Invalid access. Missing enrollment or program ID.');
        window.location.href = 'user-printadobe.html';
        return;
    }

    await Promise.all([loadLevels(), loadModules(), loadProgress(), loadUserEnrollments()]);

    // Start automatic refresh via SSE
    setupSSE();

    // Static Listeners
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });
});

async function loadLevels() {
    try {
        const response = await fetch(`/api/programs/${programId}/children`);
        if (response.ok) {
            levels = await response.json();
        }
    } catch (error) {
        console.error('Error loading levels:', error);
        levels = [];
    }
}

async function loadUserEnrollments() {
    try {
        const memberDetails = JSON.parse(localStorage.getItem('memberDetails'));
        if (!memberDetails) return;

        const response = await fetch(`/api/enrollments/my-enrollments?userID=${memberDetails.memberID}`);
        if (response.ok) {
            userEnrollments = await response.json();
        }
    } catch (error) {
        console.error('Error loading enrollments:', error);
    }
}

async function loadModules(silent = false) {
    try {
        const response = await fetch(`/api/programs/${programId}/modules`);
        const newModules = await response.json();

        // Check if modules have changed (compare IDs and Titles to detect edits)
        const modulesChanged = silent && (
            newModules.length !== modules.length ||
            JSON.stringify(newModules.map(m => ({ id: m.ModuleID, title: m.Title }))) !==
            JSON.stringify(modules.map(m => ({ id: m.ModuleID, title: m.Title })))
        );

        // If currently viewing a module that was just edited, update the UI
        if (silent && currentModule) {
            const updatedActive = newModules.find(m => m.ModuleID === currentModule.ModuleID);
            if (updatedActive) {
                const titleChanged = updatedActive.Title !== currentModule.Title;
                const descChanged = updatedActive.Description !== currentModule.Description;
                const typeChanged = updatedActive.ContentType !== currentModule.ContentType;
                const urlChanged = updatedActive.ContentURL !== currentModule.ContentURL;

                if (titleChanged || typeChanged) {
                    document.getElementById('currentModuleTitle').textContent = updatedActive.Title;
                    document.getElementById('currentModuleType').textContent = (updatedActive.ContentType || 'video').toUpperCase();
                }

                if (descChanged) {
                    const descEl = document.getElementById('lessonDescription');
                    if (descEl) descEl.textContent = updatedActive.Description || 'No description available for this module.';
                }

                // If URL changed, we must refresh the content view (re-render player)
                if (urlChanged) {
                    selectModule(updatedActive, { currentTarget: document.querySelector(`.module-item[data-module-id="${updatedActive.ModuleID}"]`) });
                }

                currentModule = updatedActive;
            }
        }

        modules = newModules;

        // Try to get program title from enrollment or set a default
        if (!silent) {
            try {
                const enrollRes = await fetch(`/api/enrollments/my-enrollments?userID=${JSON.parse(localStorage.getItem('memberDetails'))?.memberID}`);
                const enrollments = await enrollRes.json();
                const currentEnroll = enrollments.find(e => e.EnrollmentID == enrollmentId);
                if (currentEnroll) {
                    document.getElementById('programTitle').innerHTML = `<i class="fas fa-graduation-cap me-2 text-warning"></i>${currentEnroll.ProgramTitle}`;
                } else {
                    document.getElementById('programTitle').innerHTML = `<i class="fas fa-graduation-cap me-2 text-warning"></i>Course Content`;
                }
            } catch (e) {
                document.getElementById('programTitle').innerHTML = `<i class="fas fa-graduation-cap me-2 text-warning"></i>Course Content`;
            }
        }

        if (modules.length === 0) {
            document.getElementById('moduleList').innerHTML = `
                <p class="text-center text-muted p-4">No modules available yet.</p>
            `;
            return;
        }

        updateModuleList();
        updateProgress();

        // Show notification if new modules were added (only during silent refresh)
        if (silent && modulesChanged) {
            showModuleUpdateNotification();
        }
    } catch (error) {
        console.error('Error loading modules:', error);
    }
}

// Show a subtle notification when modules are updated
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

// Set up real-time updates via SSE
let eventSource = null;
function setupSSE() {
    if (eventSource) {
        eventSource.close();
    }

    eventSource = new EventSource(`/api/programs/${programId}/modules/events`);

    eventSource.onopen = function () {
        console.log('Connected to module update stream');
    };

    eventSource.onmessage = function (event) {
        const data = JSON.parse(event.data);

        if (data.type === 'moduleUpdate') {
            // Module list changed, refresh it silently
            loadModules(true);
        }
    };

    eventSource.onerror = function (error) {
        console.error('SSE Error:', error);
        eventSource.close();
        // Try to reconnect after 5 seconds
        setTimeout(setupSSE, 5000);
    };
}

async function loadProgress() {
    try {
        const response = await fetch(`/api/enrollments/${enrollmentId}/progress`);
        completedModules = await response.json();

        updateProgress();
        updateModuleList();
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

function updateModuleList() {
    const moduleList = document.getElementById('moduleList');

    // Remember currently active module ID
    const activeModuleId = currentModule ? currentModule.ModuleID : null;

    moduleList.innerHTML = '';

    // Create a Section Wrapper for Main Modules
    const mainSection = document.createElement('div');
    mainSection.className = 'level-section mt-0'; // No top margin for the first one

    // Header
    const mainHeader = document.createElement('div');
    mainHeader.className = 'level-header';
    mainHeader.innerHTML = `<div class="d-flex align-items-center"><i class="fas fa-folder-open me-2 text-warning"></i><span>Core Curriculum</span></div>`;

    // Body (Modules List)
    const mainBody = document.createElement('div');
    mainBody.className = 'level-body p-2';

    modules.forEach(module => {
        const isCompleted = completedModules.some(c => c.ModuleID === module.ModuleID);
        const isActive = activeModuleId === module.ModuleID;

        const item = createModuleItem(module);
        if (isActive) item.classList.add('active');
        mainBody.appendChild(item);
    });

    mainSection.appendChild(mainHeader);
    mainSection.appendChild(mainBody);
    moduleList.appendChild(mainSection);

    // Render Levels (Child Programs)
    const levelsContainer = document.getElementById('levelsListContainer');
    if (levelsContainer) {
        levelsContainer.innerHTML = '';
        levels.forEach(level => {
            renderLevelSection(level, levelsContainer);
        });
    }
}

// Helper for creating module item (Global Scope) - uses global completedModules
function createModuleItem(module) {
    return createModuleItemWithProgress(module, completedModules);
}

// Helper for creating module item with a specific progress array
function createModuleItemWithProgress(module, progressArray) {
    const isCompleted = progressArray.some(c => c.ModuleID === module.ModuleID);
    const item = document.createElement('div');
    item.className = `module-item ${isCompleted ? 'completed' : ''}`;
    // Note: 'active' class is handled by the caller if needed, or we can check global currentModule

    // Check if this module is the currently active one (if currentModule is set)
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



// Render a Level (Child Program) section
async function renderLevelSection(level, container) {
    const isEnrolled = userEnrollments.some(e => e.ProgramID === level.ProgramID);

    const section = document.createElement('div');
    section.className = 'level-section mt-0';

    // Header
    const header = document.createElement('div');
    header.className = 'level-header';

    let statusBadge = '';
    if (isEnrolled) {
        statusBadge = `<span class="badge bg-success"><i class="fas fa-check me-1"></i>Unlocked</span>`;
    } else if (level.Price > 0) {
        statusBadge = `<span class="badge bg-warning text-dark"><i class="fas fa-lock me-1"></i>$${level.Price}</span>`;
    } else {
        // Free but not enrolled? Should auto-enroll or show "Start"?
        statusBadge = `<span class="badge bg-info text-dark">Free</span>`;
    }

    header.innerHTML = `<div class="d-flex align-items-center"><i class="fas fa-folder-open me-2 text-warning"></i><span>${level.Title}</span></div>${statusBadge}`;
    section.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'level-body p-2';

    if (isEnrolled) {
        // If enrolled, show modules (Need to fetch them!)
        body.innerHTML = `<div class="text-center text-muted small"><i class="fas fa-spinner fa-spin"></i> Loading content...</div>`;
        section.appendChild(body);

        // Fetch modules AND progress for this level
        try {
            const childEnrollment = userEnrollments.find(e => e.ProgramID === level.ProgramID);
            console.log(`[DEBUG] Fetching modules for level ${level.ProgramID}`, level);

            const [modulesRes, progressRes] = await Promise.all([
                fetch(`/api/programs/${level.ProgramID}/modules`),
                childEnrollment ? fetch(`/api/enrollments/${childEnrollment.EnrollmentID}/progress`) : Promise.resolve({ json: () => [] })
            ]);

            if (!modulesRes.ok) throw new Error(`HTTP error! status: ${modulesRes.status}`);
            const levelModules = await modulesRes.json();
            const levelProgress = childEnrollment ? await progressRes.json() : [];

            body.innerHTML = '';

            if (levelModules.length === 0) {
                body.innerHTML = `<div class="text-muted small ps-3">No modules yet.</div>`;
            } else {
                levelModules.forEach(mod => {
                    // Use child's progress array instead of global completedModules
                    const item = createModuleItemWithProgress(mod, levelProgress);
                    body.appendChild(item);
                });
            }
        } catch (e) {
            console.error('[DEBUG] Failed to load level modules:', e);
            body.innerHTML = `<div class="text-danger small">Failed to load content: ${e.message}</div>`;
        }
    } else {
        // Locked / Not Enrolled
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

// Handle Unlocking a Level (Program)
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

    if (!memberDetails) {
        alert('Please log in.');
        return;
    }

    // Use SweetAlert for confirmation
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

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';

    try {
        const response = await fetch('/api/enrollments/create', { // FIXED: Added /create
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
            await Swal.fire({
                title: 'Unlocked!',
                text: 'You now have access to this program.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            // Refresh to show content
            await Promise.all([loadUserEnrollments(), loadLevels()]);
            updateModuleList();
        } else {
            Swal.fire('Error', resData.message || 'Failed to unlock.', 'error');
            btn.disabled = false;
            btn.innerHTML = price > 0 ? `Unlock for $${price}` : 'Start for Free';
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'An unexpected error occurred.', 'error');
        btn.disabled = false;
        btn.innerHTML = price > 0 ? `Unlock for $${price}` : 'Start for Free';
    }
}

function selectModule(module, event) {
    console.log('[DEBUG selectModule] Selected module:', module.Title, 'ModuleID:', module.ModuleID, 'ProgramID:', module.ProgramID);
    currentModule = module;

    // Update active state
    document.querySelectorAll('.module-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    // Update header
    const typeIcon = {
        'video': 'fa-play-circle',
        'quiz': 'fa-question-circle',
        'article': 'fa-file-alt',
        'pdf': 'fa-file-pdf'
    }[module.ContentType || 'video'];

    const typeColor = {
        'video': 'text-danger',
        'quiz': 'text-primary',
        'article': 'text-info',
        'pdf': 'text-danger'
    }[module.ContentType || 'video'];

    document.getElementById('currentModuleTitle').innerHTML = module.Title;
    document.getElementById('currentModuleTitle').className = 'mb-1 fw-bold text-dark h4';

    document.getElementById('currentModuleType').innerHTML = `
        <i class="fas ${typeIcon} ${typeColor} me-1"></i> 
        <span class="text-uppercase fw-bold" style="letter-spacing:1px; font-size: 0.75rem;">${module.ContentType || 'video'}</span>
    `;

    // Render content based on type
    const contentMain = document.getElementById('contentMain');
    const isCompleted = completedModules.some(c => c.ModuleID === module.ModuleID);

    let contentHTML = '';
    let autoMarkEnabled = !isCompleted; // Only auto-mark if not already completed

    // Handle Video
    if (module.ContentType === 'video' || !module.ContentType) {
        const url = module.ContentURL || '';

        // Check if it's a direct video file (MP4, WebM, etc.)
        if (url.match(/\.(mp4|webm|ogg)($|\?)/i)) {
            // HTML5 Video Player with auto-complete on ended
            contentHTML = `
                <div class="video-container shadow-sm mb-4" style="padding-bottom: 0; height: auto;">
                    <video id="videoPlayer" controls style="width: 100%; border-radius: 12px;">
                        <source src="${url}" type="video/${url.split('.').pop().split('?')[0]}">
                        Your browser does not support the video tag.
                    </video>
                </div>
            `;
        } else {
            // YouTube/External embed
            const embedUrl = getEmbedUrl(url);
            const isYouTube = embedUrl.includes('youtube.com/embed/');

            if (isYouTube && autoMarkEnabled) {
                // YouTube with API for auto-complete
                const videoId = embedUrl.split('embed/')[1].split('?')[0];
                contentHTML = `
                    <div class="video-container shadow-sm mb-4">
                        <div id="ytPlayer" data-video-id="${videoId}"></div>
                    </div>
                    <p class="text-muted small text-center"><i class="fas fa-info-circle me-1"></i> This module will be marked complete when the video ends.</p>
                `;
            } else {
                // Generic iframe (manual complete required)
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
    // Handle PDF - timed completion button (scroll detection doesn't work on iframes)
    else if (module.ContentType === 'pdf') {
        contentHTML = `
            <div class="card mb-4 border-0 shadow-sm" style="height: 600px; position: relative;">
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
    // Handle Article/Link - scroll detection
    else if (module.ContentType === 'article') {
        contentHTML = `
            <div class="card mb-4 border-0 shadow-sm overflow-hidden" id="articleContainer">
                <div class="ratio" style="--bs-aspect-ratio: 100%; max-height: 800px; height: 600px;">
                    <iframe src="${module.ContentURL}" class="w-100 h-100 border-0" allowfullscreen title="Article Content" id="articleIframe"></iframe>
                </div>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <a href="${module.ContentURL}" target="_blank" class="btn btn-outline-primary btn-sm">
                    <i class="fas fa-external-link-alt me-1"></i> Open Original Link
                </a>
                <p class="text-muted small mb-0"><i class="fas fa-info-circle me-1"></i> Scroll content to view more</p>
            </div>
        `;

        // Add iframe error handling with timeout
        setTimeout(() => {
            const iframe = document.getElementById('articleIframe');
            const container = document.getElementById('articleContainer');

            if (iframe && container) {
                // Set up error handler for iframe load failures
                iframe.addEventListener('error', () => {
                    showArticleFallback(container, module.ContentURL);
                });

                // Also check if iframe is blocked after a timeout
                setTimeout(() => {
                    try {
                        // Try to access iframe content - will throw if blocked by CORS
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        if (!iframeDoc || iframeDoc.body.innerHTML === '') {
                            // Iframe appears empty, might be blocked
                            showArticleFallback(container, module.ContentURL);
                        }
                    } catch (e) {
                        // CORS or other security restriction - use fallback
                        showArticleFallback(container, module.ContentURL);
                    }
                }, 3000); // Wait 3 seconds for iframe to load
            }
        }, 100);

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
    }
    // Handle Quiz
    else if (module.ContentType === 'quiz') {
        try {
            const parsed = JSON.parse(module.ContentURL);
            let quizData = [];
            let passingPercentage = 70;
            let manualRequired = null;

            if (Array.isArray(parsed)) {
                quizData = parsed;
            } else if (parsed && parsed.questions) {
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
                quizHTML += `
                </div>
                    </div >
            `;
            });

            quizHTML += `
                        </form >
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
            contentHTML = quizHTML;
        } catch (e) {
            contentHTML = `<div class="alert alert-danger">Error loading quiz data</div>`;
        }
    }
    // Handle External Link (manual)
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

    contentMain.innerHTML = `
        ${contentHTML}
        <div class="module-description p-3 bg-light rounded-3 border-start border-4 border-danger shadow-sm" style="max-width: 1000px;">
            <h5 class="mb-2 fw-bold text-dark"><i class="fas fa-info-circle me-2 text-danger"></i>About this lesson</h5>
            <p class="text-secondary mb-0" id="lessonDescription" style="line-height: 1.6;">${module.Description || 'No description available for this module.'}</p>
        </div>
        `;

    // Scroll to top
    contentMain.scrollTop = 0;

    // Attach Dynamic Listeners
    document.getElementById('pdfCompleteBtn')?.addEventListener('click', completeModule);
    document.getElementById('btnSubmitQuiz')?.addEventListener('click', submitQuiz);
    document.getElementById('errorOverlayOverlayButton')?.addEventListener('click', () => document.getElementById('errorOverlay').remove()); // Placeholder for error popup

    // Setup auto-complete listeners (only if not already completed)
    if (autoMarkEnabled) {
        setupAutoComplete(module.ContentType || 'video');
    }
}

// Watch time tracking variables
let watchedSeconds = 0;
let videoDuration = 0;
let watchInterval = null;
let pdfTimer = null; // Global PDF timer
const REQUIRED_WATCH_PERCENT = 0.90; // Must watch 90% of video

// Auto-complete setup based on content type
function setupAutoComplete(contentType) {
    // Reset watch time
    watchedSeconds = 0;
    videoDuration = 0;
    if (watchInterval) clearInterval(watchInterval);
    if (pdfTimer) clearInterval(pdfTimer); // Clear existing PDF timer

    // HTML5 Video: Track actual watch time
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer) {
        videoPlayer.addEventListener('loadedmetadata', () => {
            videoDuration = videoPlayer.duration;
        });

        // Track time while playing (not when paused/seeking)
        videoPlayer.addEventListener('playing', () => {
            watchInterval = setInterval(() => {
                if (!videoPlayer.paused && !videoPlayer.seeking) {
                    watchedSeconds++;
                    updateWatchProgress();
                }
            }, 1000);
        });

        videoPlayer.addEventListener('pause', () => {
            if (watchInterval) clearInterval(watchInterval);
        });

        videoPlayer.addEventListener('ended', () => {
            if (watchInterval) clearInterval(watchInterval);
            checkWatchCompletion();
        });
        return;
    }

    // YouTube Player: Track watch time with API
    const ytPlayerDiv = document.getElementById('ytPlayer');
    if (ytPlayerDiv) {
        const videoId = ytPlayerDiv.dataset.videoId;
        if (videoId && typeof YT !== 'undefined' && YT.Player) {
            initYouTubePlayer(videoId);
        } else {
            loadYouTubeAPI(videoId);
        }
        return;
    }

    // Scroll detection for articles/PDFs (unchanged)
    const articleContent = document.getElementById('articleContent');
    if (articleContent) {
        let hasCompleted = false;
        articleContent.addEventListener('scroll', () => {
            if (hasCompleted) return;
            const scrollHeight = articleContent.scrollHeight;
            const scrollTop = articleContent.scrollTop;
            const clientHeight = articleContent.clientHeight;

            if (scrollTop + clientHeight >= scrollHeight - 20) {
                hasCompleted = true;
                console.log('Article scrolled to bottom - auto-marking complete');
                completeModule();
            }
        });
    }

    // PDF: Enable button after countdown (scroll can't be detected on iframes)
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
                pdfCompleteBtn.disabled = false;
                if (spinnerEl) spinnerEl.className = 'fas fa-check-circle me-2';
                if (textEl) textEl.innerHTML = 'I have read this PDF';
            }
        }, 1000);
    }
}

// Initialize YouTube player with watch tracking
function initYouTubePlayer(videoId) {
    let ytPlayer = new YT.Player('ytPlayer', {
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
                // YT.PlayerState: PLAYING=1, PAUSED=2, ENDED=0
                if (event.data === 1) { // Playing
                    watchInterval = setInterval(() => {
                        watchedSeconds++;
                        updateWatchProgress();
                    }, 1000);
                } else if (event.data === 2 || event.data === 0) { // Paused or Ended
                    if (watchInterval) clearInterval(watchInterval);
                    if (event.data === 0) {
                        checkWatchCompletion();
                    }
                }
            }
        }
    });
}

// Load YouTube IFrame API dynamically
function loadYouTubeAPI(videoId) {
    if (window.ytApiLoading) return;
    window.ytApiLoading = true;

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = function () {
        const ytPlayerDiv = document.getElementById('ytPlayer');
        if (ytPlayerDiv) {
            initYouTubePlayer(ytPlayerDiv.dataset.videoId);
        }
    };
}

// Update watch progress indicator
function updateWatchProgress() {
    // Progress is tracked silently - no console log needed
}

// Check if user watched enough to mark complete
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

// Show styled error popup
function showErrorPopup(message) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'errorOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';

    // Create popup
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

// Helper to convert YouTube URLs to Embed URLs
function getEmbedUrl(url) {
    if (!url) return '';

    // Handle YouTube
    let videoId = '';

    // https://www.youtube.com/watch?v=VIDEO_ID
    if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(new URL(url).search);
        videoId = urlParams.get('v');
    }
    // https://youtu.be/VIDEO_ID
    else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
    }
    // Already embed URL
    else if (url.includes('youtube.com/embed/')) {
        return url;
    }

    if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?rel=0&enablejsapi=1&origin=${window.location.origin}`;
    }

    // Handle Vimeo (simple check)
    if (url.includes('vimeo.com')) {
        // Assuming standard vimeo.com/ID format -> player.vimeo.com/video/ID
        const vimeoId = url.split('vimeo.com/')[1];
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

    // Determine valid enrollment ID for this module
    // Convert to integers for consistent comparison
    const parentProgramId = parseInt(programId);
    const moduleProgramId = parseInt(currentModule.ProgramID);

    let targetEnrollmentId = enrollmentId; // Default to parent

    console.log('[DEBUG completeModule] parentProgramId:', parentProgramId, 'moduleProgramId:', moduleProgramId);

    if (moduleProgramId !== parentProgramId) {
        // It's a child program module - find the child's enrollment
        const childEnrollment = userEnrollments.find(e => parseInt(e.ProgramID) === moduleProgramId);
        console.log('[DEBUG completeModule] Child enrollment found:', childEnrollment);
        if (childEnrollment) {
            targetEnrollmentId = childEnrollment.EnrollmentID;
        } else {
            console.error('No enrollment found for this child program module');
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
            // Show celebration
            const celebration = document.getElementById('celebration');
            celebration.classList.add('show');
            setTimeout(() => {
                celebration.classList.remove('show');
            }, 2000);

            // Reload progress (Parent + Children)
            await Promise.all([loadProgress(), updateProgress()]);

            // Hide button
            if (completeBtn) completeBtn.style.display = 'none';
        } else {
            // Only show error if it's not "Module already completed" (optional, but requested to remove "localhost says" message)
            // The user said "remove all the localhost:8000 say message" which implies replacing alert with toast.
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

// Toast Notification
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

// Update progress bar (Global: Parent + Unlocked Children)
async function updateProgress() {
    // Get parent module IDs for accurate counting
    const parentModuleIds = new Set(modules.map(m => m.ModuleID));

    // Only count completions that match actual parent modules
    // (Fixes issue where child module completions were historically recorded against parent)
    const parentCompletedCount = completedModules.filter(c => parentModuleIds.has(c.ModuleID)).length;

    let globalTotal = modules.length;
    let globalCompleted = parentCompletedCount;

    // Aggregate progress from unlocked levels
    if (levels.length > 0 && userEnrollments.length > 0) {
        const statsPromises = levels.map(async (level) => {
            const enrollment = userEnrollments.find(e => e.ProgramID === level.ProgramID);
            if (enrollment) {
                try {
                    // Fetch modules count for this level
                    const modRes = await fetch(`/api/programs/${level.ProgramID}/modules`);
                    const mods = await modRes.json();

                    // Fetch progress count for this level's enrollment
                    const progRes = await fetch(`/api/enrollments/${enrollment.EnrollmentID}/progress`);
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
    localStorage.clear();
    window.location.href = 'index.html';
}

// ========== Quiz Submission ==========
function submitQuiz() {
    if (!currentModule) return;

    try {
        const parsed = JSON.parse(currentModule.ContentURL);
        let quizData = [];
        let passingPercentage = 70;

        if (Array.isArray(parsed)) {
            quizData = parsed;
        } else if (parsed && parsed.questions) {
            quizData = parsed.questions;
            if (parsed.settings && parsed.settings.passingPercentage) {
                passingPercentage = parsed.settings.passingPercentage;
            }
        }

        const form = document.getElementById('quizForm');

        // Check all questions answered
        let allAnswered = true;
        quizData.forEach((_, index) => {
            const selected = form.querySelector(`input[name="q${index}"]:checked`);
            if (!selected) allAnswered = false;
        });

        if (!allAnswered) {
            showQuizResult(false, 'Please answer all questions before submitting.');
            return;
        }

        // Calculate score and highlight answers
        let correct = 0;
        quizData.forEach((q, index) => {
            const selected = form.querySelector(`input[name="q${index}"]:checked`);
            const questionDiv = form.querySelectorAll('.mb-4.p-3.bg-light.rounded')[index];
            const allOptions = form.querySelectorAll(`input[name="q${index}"]`);

            // Mark each option
            allOptions.forEach((opt, optIdx) => {
                const label = opt.closest('.form-check');
                if (optIdx === q.correctIndex) {
                    // Correct answer - always show green
                    label.classList.add('text-success');
                    label.innerHTML = label.innerHTML + ' <i class="fas fa-check-circle text-success"></i>';
                } else if (selected && parseInt(selected.value) === optIdx && optIdx !== q.correctIndex) {
                    // Wrong answer selected - show red
                    label.classList.add('text-danger');
                    label.innerHTML = label.innerHTML + ' <i class="fas fa-times-circle text-danger"></i>';
                }
                opt.disabled = true; // Disable all options after submit
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

        // Update submit button to show results
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

// Retake quiz - reload the current module
function retakeQuiz() {
    if (currentModule) {
        // Re-render the module content to reset the quiz
        const moduleItem = document.querySelector(`.module-item[data-module-id="${currentModule.ModuleID}"]`);
        if (moduleItem) {
            selectModule(currentModule, { currentTarget: moduleItem });
        } else {
            // Fallback - just re-select the module
            selectModule(currentModule, { currentTarget: document.querySelector('.module-item.active') });
        }
    }
}
