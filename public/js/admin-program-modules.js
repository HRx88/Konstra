const params = new URLSearchParams(window.location.search);
const programId = params.get('programId');
let modules = [];
// tracks variable removed - using levels (Child Programs)
let modal;
let deleteModal;
let tracksModal;
let moduleToDeleteId = null;
let uploadedFileUrl = null; // Store uploaded file URL

document.addEventListener('DOMContentLoaded', () => {
    if (!programId) {
        console.warn('No programId provided. Defaulting to ProgramID 2 for testing.');
        const url = new URL(window.location);
        url.searchParams.set('programId', '2');
        window.history.replaceState({}, '', url);
        window.location.search = '?programId=2';
        return;
    }

    modal = new bootstrap.Modal(document.getElementById('moduleModal'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    tracksModal = new bootstrap.Modal(document.getElementById('tracksModal'));

    setupEventListeners();
    fetchProgramTitle();
    // loadTracks removed - we load levels only when modal opens or if we want to show breadcrumbs
    loadModules();
    setupFileUpload();
});

function setupEventListeners() {
    // Static Buttons
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('btnAddModule')?.addEventListener('click', openAddModal);
    document.getElementById('btnManageTracks')?.addEventListener('click', openTracksModal);

    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });

    // Add/Edit Modal Buttons
    document.getElementById('btnCloseModalHeader')?.addEventListener('click', () => safeHideModal(modal));
    document.getElementById('btnCancelModal')?.addEventListener('click', () => safeHideModal(modal));
    document.getElementById('btnSaveModule')?.addEventListener('click', saveModule);

    // Track Modal Buttons
    document.getElementById('btnCloseTracksModal')?.addEventListener('click', () => safeHideModal(tracksModal));
    document.getElementById('btnAddLevel')?.addEventListener('click', saveLevel);

    // Delete Modal Buttons
    document.getElementById('btnCloseDeleteModalHeader')?.addEventListener('click', () => safeHideModal(deleteModal));
    document.getElementById('btnCancelDeleteModal')?.addEventListener('click', () => safeHideModal(deleteModal));
    document.getElementById('btnConfirmDelete')?.addEventListener('click', confirmDelete);

    // Form Inputs
    document.getElementById('moduleContentType')?.addEventListener('change', toggleContentSections);

    // Quiz Editor
    document.getElementById('btnAddQuestion')?.addEventListener('click', addQuestion);
    const requiredInput = document.getElementById('requiredCorrectInput');
    if (requiredInput) {
        requiredInput.addEventListener('change', updatePassingScore);
        requiredInput.addEventListener('keyup', updatePassingScore);
    }

    // Video Quiz Editor
    document.getElementById('btnAddVideoQuiz')?.addEventListener('click', addVideoQuiz);
    document.getElementById('videoQuizzes')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'remove-video-quiz') {
            removeVideoQuiz(id);
        } else if (action === 'add-option') {
            addVideoQuizOption(id);
        } else if (action === 'remove-option') {
            removeVideoQuizOption(btn);
        }
    });

    // Event Delegation: Modules Table (Edit/Delete)
    document.getElementById('moduleTableBody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const moduleId = btn.dataset.id;
        if (btn.classList.contains('btn-edit')) {
            openEditModal(parseInt(moduleId));
        } else if (btn.classList.contains('btn-delete')) {
            deleteModule(parseInt(moduleId));
        }
    });

    // Event Delegation: Quiz Questions (Remove)
    document.getElementById('quizQuestions')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && btn.dataset.action === 'remove-question') {
            removeQuestion(btn.dataset.id);
        }
    });

    // Event Delegation: Levels List
    document.getElementById('levelsList')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.classList.contains('btn-delete-level')) {
            deleteLevel(btn.dataset.id);
        } else if (btn.classList.contains('btn-manage-level')) {
            window.location.href = `admin-program-modules.html?programId=${btn.dataset.id}`;
        }
    });
}

async function fetchProgramTitle() {
    try {
        const response = await fetch(`/api/programs/${programId}`);
        if (response.ok) {
            const program = await response.json();
            document.getElementById('programInfo').textContent = `Program: ${program.Title}`;
        } else {
            document.getElementById('programInfo').textContent = 'Program details unavailable';
        }
    } catch (error) {
        console.error('Error fetching program title:', error);
        document.getElementById('programInfo').textContent = 'Error loading program details';
    }
}

// ========== Levels (Child Programs) Management ==========
let levels = [];
async function loadLevels() {
    try {
        // Use the new getChildren endpoint
        const response = await fetch(`/api/programs/${programId}/children`);
        levels = await response.json();
        renderLevelsList();
    } catch (error) {
        console.error('Error loading levels:', error);
        levels = [];
    }
}

function openTracksModal() {
    loadLevels();
    tracksModal.show();
}

function renderLevelsList() {
    const list = document.getElementById('levelsList');
    if (levels.length === 0) {
        list.innerHTML = `<div class="text-center text-muted py-3">No levels created yet.</div>`;
        return;
    }

    list.innerHTML = levels.map(level => `
        <div class="level-item">
            <div>
                <span class="level-title">${level.Title}</span>
                ${level.Price > 0 ? `<span class="badge bg-success ms-2">$${level.Price}</span>` : '<span class="badge bg-secondary ms-2">Free</span>'}
            </div>
            <div>
                <button class="btn btn-sm btn-outline-primary btn-manage-level me-1" data-id="${level.ProgramID}" title="Manage Content">
                    <i class="fas fa-edit"></i> Content
                </button>
                <button class="btn btn-sm btn-outline-danger btn-delete-level" data-id="${level.ProgramID}" title="Delete Program">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function saveLevel() {
    const titleInput = document.getElementById('newLevelTitle');
    const title = titleInput.value.trim();
    if (!title) {
        showToast('Please enter a level name.', 'warning');
        return;
    }

    const priceInput = document.getElementById('newLevelPrice');
    const price = parseFloat(priceInput.value) || 0.00;

    // We need to fetch current program details to inherit some defaults if needed, 
    // or just send minimal data required for a program
    // The create API requires: title, type, price, duration, maxParticipants
    // We'll use defaults for now or ask user? For quick "Add Level", defaults are better.

    // Fetch parent to get some defaults
    let parentProgram = {};
    try {
        const res = await fetch(`/api/programs/${programId}`);
        parentProgram = await res.json();
    } catch (e) { }

    const payload = {
        title: title,
        type: parentProgram.Type || 'Education',
        description: `Level for ${parentProgram.Title || 'Program'}`,
        price: price,
        duration: parentProgram.Duration || 'Self-paced',
        maxParticipants: parentProgram.MaxParticipants || 9999,
        parentProgramId: parseInt(programId) // LINK TO PARENT
    };

    try {
        const response = await fetch(`/api/programs`, { // standard create program endpoint
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (response.ok) {
            titleInput.value = '';
            priceInput.value = '';
            showToast('Level created successfully!', 'success');
            await loadLevels();
        } else {
            showToast(result.error || 'Failed to add level', 'error');
        }
    } catch (error) {
        console.error('Save level error:', error);
        showToast('Error saving level', 'error');
    }
}

async function deleteLevel(levelId) {
    if (!confirm('Are you sure? This will delete the entire sub-program and its modules.')) return;

    try {
        const response = await fetch(`/api/programs/${levelId}`, { method: 'DELETE' });

        if (response.ok) {
            showToast('Level deleted successfully', 'success');
            await loadLevels();
        } else {
            showToast('Failed to delete level', 'error');
        }
    } catch (error) {
        console.error('Delete level error:', error);
        showToast('Error deleting level', 'error');
    }
}

// ========== File Upload Setup ==========
function setupFileUpload() {
    const sourceRadios = document.querySelectorAll('input[name="contentSource"]');
    const urlSection = document.getElementById('urlInputSection');
    const fileSection = document.getElementById('fileInputSection');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('moduleFile');

    // Toggle between URL and File upload
    sourceRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'url') {
                urlSection.style.display = 'block';
                fileSection.style.display = 'none';
            } else {
                urlSection.style.display = 'none';
                fileSection.style.display = 'block';
            }
        });
    });

    // Click to select file
    dropZone.addEventListener('click', () => fileInput.click());

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-primary', 'bg-primary-subtle');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-primary', 'bg-primary-subtle');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary', 'bg-primary-subtle');
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
}

async function handleFileUpload(file) {
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const uploadStatus = document.getElementById('uploadStatus');
    const fileInfo = document.getElementById('uploadedFileInfo');
    const fileName = document.getElementById('uploadedFileName');

    // Reset state
    uploadedFileUrl = null;
    fileInfo.style.display = 'none';
    progressDiv.style.display = 'block';
    progressBar.style.width = '0%';
    uploadStatus.textContent = `Uploading ${file.name}...`;

    // Auto-detect content type
    const contentTypeSelect = document.getElementById('moduleContentType');
    if (file.type.startsWith('video/')) {
        contentTypeSelect.value = 'video';
    } else if (file.type === 'application/pdf') {
        contentTypeSelect.value = 'pdf';
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = percent + '%';
                uploadStatus.textContent = `Uploading... ${percent}%`;
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const result = JSON.parse(xhr.responseText);
                if (result.success) {
                    uploadedFileUrl = result.url;
                    progressDiv.style.display = 'none';
                    fileInfo.style.display = 'block';
                    fileName.textContent = file.name;
                } else {
                    throw new Error(result.message);
                }
            } else {
                throw new Error('Upload failed');
            }
        });

        xhr.addEventListener('error', () => {
            uploadStatus.textContent = 'Upload failed. Please try again.';
            progressBar.classList.add('bg-danger');
        });

        xhr.open('POST', '/api/modules/upload');
        xhr.send(formData);

    } catch (error) {
        console.error('Upload error:', error);
        uploadStatus.textContent = 'Upload failed: ' + error.message;
        progressBar.classList.add('bg-danger');
    }
}

// ========== Module CRUD ==========
async function loadModules() {
    try {
        const response = await fetch(`/api/programs/${programId}/modules`);
        modules = await response.json();

        const tbody = document.getElementById('moduleTableBody');

        if (modules.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-5 text-muted">
                        No modules yet. Click "Add Module" to create one.
                    </td>
                </tr>
            `;
            return;
        }

        // Render Rows (Flat List)
        const renderRows = (mods) => {
            return mods.map(m => `
                <tr>
                    <td><strong>${m.OrderIndex}</strong></td>
                    <td>${m.Title}</td>
                    <td><span class="badge bg-secondary">${m.ContentType}</span></td>
                    <td><small class="text-muted">${truncate(m.ContentURL, 40)}</small></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary btn-action btn-edit me-1" 
                                data-id="${m.ModuleID}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-action btn-delete" 
                                data-id="${m.ModuleID}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        };

        tbody.innerHTML = renderRows(modules);

    } catch (error) {
        console.error('Error loading modules:', error);
        document.getElementById('moduleTableBody').innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5 text-danger">
                    Error loading modules. Please try again.
                </td>
            </tr>
        `;
    }
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Add Module';
    document.getElementById('moduleForm').reset();
    document.getElementById('moduleId').value = '';

    // Reset file upload state
    uploadedFileUrl = null;
    document.getElementById('uploadedFileInfo').style.display = 'none';
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('sourceURL').checked = true;
    document.getElementById('urlInputSection').style.display = 'block';
    document.getElementById('fileInputSection').style.display = 'none';

    // Reset quiz section
    document.getElementById('quizEditorSection').style.display = 'none';
    document.getElementById('quizQuestions').innerHTML = `<p class="text-muted text-center py-3 mb-0" id="noQuestionsMsg">
        No questions yet. Click "Add Question" to create one.
    </p>`;
    questionCounter = 0;
    document.getElementById('requiredCorrectInput').value = 1;
    updatePassingScore();

    // Set next order index (simple approximation)
    const nextOrder = modules.length > 0 ? Math.max(...modules.map(m => m.OrderIndex)) + 1 : 1;
    document.getElementById('moduleOrderIndex').value = nextOrder;

    // Reset Video Quiz section
    document.getElementById('videoQuizEditorSection').style.display = 'block'; // Default type is video
    document.getElementById('videoQuizzes').innerHTML = `<p class="text-muted text-center py-3 mb-0" id="noVideoQuizzesMsg">
        No stop points yet. Add one to show a quiz during the video.
    </p>`;
    videoQuizCounter = 0;

    modal.show();
}

function openEditModal(moduleId) {
    const module = modules.find(m => m.ModuleID === moduleId);
    if (!module) return;

    document.getElementById('modalTitle').textContent = 'Edit Module';
    document.getElementById('moduleId').value = module.ModuleID;
    document.getElementById('moduleTitle').value = module.Title;
    document.getElementById('moduleDescription').value = module.Description || '';
    document.getElementById('moduleContentType').value = module.ContentType;
    document.getElementById('moduleOrderIndex').value = module.OrderIndex;

    // Track Set removed - modules are flattened under program

    // Reset states
    uploadedFileUrl = null;
    document.getElementById('uploadedFileInfo').style.display = 'none';
    document.getElementById('uploadProgress').style.display = 'none';

    // Handle based on content type
    if (module.ContentType === 'quiz') {
        document.getElementById('urlInputSection').style.display = 'none';
        document.getElementById('fileInputSection').style.display = 'none';
        document.getElementById('quizEditorSection').style.display = 'block';
        document.getElementById('moduleContentURL').value = '';
        // Load quiz questions from JSON
        loadQuizData(module.ContentURL);
    } else {
        document.getElementById('sourceURL').checked = true;
        document.getElementById('urlInputSection').style.display = 'block';
        document.getElementById('fileInputSection').style.display = 'none';
        document.getElementById('quizEditorSection').style.display = 'none';
        document.getElementById('moduleContentURL').value = module.ContentURL;
        // Clear quiz questions when not a quiz type
        document.getElementById('quizQuestions').innerHTML = `<p class="text-muted text-center py-3 mb-0" id="noQuestionsMsg">
            No questions yet. Click "Add Question" to create one.
        </p>`;
        questionCounter = 0;
        document.getElementById('requiredCorrectInput').value = 1;
    }

    // Handle Video Quiz Builder
    if (module.ContentType === 'video' || !module.ContentType) {
        document.getElementById('videoQuizEditorSection').style.display = 'block';
        loadVideoQuizData(module.Description);
    } else {
        document.getElementById('videoQuizEditorSection').style.display = 'none';
        document.getElementById('videoQuizzes').innerHTML = `<p class="text-muted text-center py-3 mb-0" id="noVideoQuizzesMsg">
            No stop points yet. Add one to show a quiz during the video.
        </p>`;
        videoQuizCounter = 0;
    }

    updatePassingScore(); // Update display after loading/resetting

    modal.show();
}

async function saveModule() {
    const form = document.getElementById('moduleForm');
    const contentType = document.getElementById('moduleContentType').value;

    // Get content URL based on content type
    let contentURL = '';
    let passingPercentage = null;

    if (contentType === 'quiz') {
        // Collect quiz questions from DOM
        const quizData = [];
        const questionCards = document.querySelectorAll('#quizQuestions .card');

        questionCards.forEach(card => {
            // Use input fields instead of text elements
            const questionInput = card.querySelector('input[data-field="question"]');
            const questionText = questionInput ? questionInput.value.trim() : '';

            const options = [];
            let correctIndex = -1;

            const optionInputs = card.querySelectorAll('input[data-field="option"]');
            const radioInputs = card.querySelectorAll('input[type="radio"]');

            optionInputs.forEach((input, idx) => {
                options.push(input.value.trim());
                // Check corresponding radio button
                if (radioInputs[idx] && radioInputs[idx].checked) {
                    correctIndex = idx;
                }
            });

            if (questionText && options.length > 0 && correctIndex !== -1) {
                quizData.push({
                    question: questionText,
                    options: options,
                    correctIndex: correctIndex
                });
            }
        });

        // For quiz, serialize questions as JSON
        if (quizData.length === 0) {
            showToast('Please add at least one question to the quiz.', 'warning');
            return;
        }

        // Calculate percentage from required count
        const requiredCount = parseInt(document.getElementById('requiredCorrectInput').value);
        const totalQuestions = quizData.length;

        if (isNaN(requiredCount) || requiredCount < 1 || requiredCount > totalQuestions) {
            showToast(`Please enter a valid required count between 1 and ${totalQuestions}.`, 'warning');
            return;
        }

        // Calculate percentage with 2 decimal precision to ensure accuracy on reload
        passingPercentage = (requiredCount / totalQuestions) * 100;

        // Wrap questions and settings in object
        const quizPayload = {
            questions: quizData,
            settings: {
                passingPercentage: passingPercentage,
                requiredCorrect: requiredCount
            }
        };
        contentURL = JSON.stringify(quizPayload);
    } else {
        // Get content URL from either URL input or uploaded file
        const contentSource = document.querySelector('input[name="contentSource"]:checked').value;

        if (contentSource === 'file' && uploadedFileUrl) {
            contentURL = uploadedFileUrl;
        } else {
            contentURL = document.getElementById('moduleContentURL').value;
        }

        // Validate content URL for non-quiz types
        if (!contentURL) {
            showToast('Please provide a content URL or upload a file.', 'warning');
            return;
        }
    }

    const moduleId = document.getElementById('moduleId').value;
    // const trackIdVal = document.getElementById('moduleTrack').value;

    let description = document.getElementById('moduleDescription').value;

    // If it's a video, process video quizzes and embed them in the description
    if (contentType === 'video' || !contentType) {
        // Strip existing [QUIZ] tags
        description = description.replace(/\[QUIZ\][\s\S]*?\[\/QUIZ\]/g, '').trim();

        // Collect new video quizzes
        const videoQuizCards = document.querySelectorAll('#videoQuizzes .card');
        videoQuizCards.forEach(card => {
            const time = parseInt(card.querySelector('input[data-field="time"]').value);
            const question = card.querySelector('input[data-field="question"]').value.trim();
            const correctIndex = parseInt(card.querySelector('input[name="' + card.id + '_correct"]:checked')?.value || 0);

            const options = [];
            card.querySelectorAll('input[data-field="option"]').forEach(opt => {
                if (opt.value.trim()) options.push(opt.value.trim());
            });

            if (!isNaN(time) && question && options.length > 0) {
                const quizJson = JSON.stringify({
                    time,
                    question,
                    options,
                    correct: correctIndex
                });
                description += `\n\n[QUIZ]${quizJson}[/QUIZ]`;
            }
        });
    }

    const data = {
        title: document.getElementById('moduleTitle').value,
        description: description,
        contentURL: contentURL,
        contentType: document.getElementById('moduleContentType').value,
        orderIndex: parseInt(document.getElementById('moduleOrderIndex').value)
    };

    if (!data.title) {
        showToast('Please enter a module title.', 'warning');
        return;
    }

    try {
        let response;
        if (moduleId) {
            response = await fetch(`/api/modules/${moduleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch(`/api/programs/${programId}/modules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        const result = await response.json();

        if (result.success) {
            safeHideModal(modal);
            showToast('Module saved successfully!', 'success');
            await loadModules();
        } else {
            showToast(result.message || 'Failed to save module', 'error');
        }
    } catch (error) {
        console.error('Save error:', error);
        showToast('Error saving module. Please try again.', 'error');
    }
}

function deleteModule(moduleId) {
    moduleToDeleteId = moduleId;
    deleteModal.show();
}

async function confirmDelete() {
    if (!moduleToDeleteId) return;

    // Disable button to prevent double submit
    const deleteBtn = document.querySelector('#deleteModal .btn-danger');
    const originalText = deleteBtn.innerHTML;
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

    try {
        const response = await fetch(`/api/modules/${moduleToDeleteId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            safeHideModal(deleteModal);
            showToast('Module deleted successfully!', 'success');
            await loadModules();
        } else {
            showToast(result.message || 'Failed to delete module', 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Error deleting module. Please try again.', 'error');
    } finally {
        // Reset button
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = originalText;
        moduleToDeleteId = null;
    }
}

function truncate(str, length) {
    return str.length > length ? str.substring(0, length) + '...' : str;
}

// Fix for accessibility focus issue: blur button before hiding modal
function safeHideModal(modalInstance) {
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
    if (modalInstance) {
        modalInstance.hide();
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// ========== Toast Popup Messages ==========
function showToast(message, type = 'info') {
    // Remove any existing toast
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

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Update passing score display based on question count
function updatePassingScore() {
    const questionCount = document.querySelectorAll('#quizQuestions .card').length;
    const passingText = document.getElementById('passingScoreText');
    const requiredInput = document.getElementById('requiredCorrectInput');
    const totalLabel = document.getElementById('totalQuestionsLabel');

    // Update total label and input max
    if (totalLabel) totalLabel.textContent = `/ ${questionCount}`;
    if (requiredInput) {
        requiredInput.max = questionCount;
        if (questionCount > 0 && parseInt(requiredInput.value) > questionCount) {
            requiredInput.value = questionCount;
        }
        if (questionCount > 0 && parseInt(requiredInput.value) < 1) {
            requiredInput.value = 1;
        }
    }

    if (passingText) {
        if (questionCount === 0) {
            passingText.textContent = `Add questions first`;
            if (requiredInput) requiredInput.value = 0;
        } else {
            const required = parseInt(requiredInput.value) || 1;
            const percentage = Math.round((required / questionCount) * 100);
            passingText.textContent = `Auto-calculated: ${percentage}%`;
        }
    }
}

// ========== Quiz Editor Functions ==========
let quizQuestions = [];
let questionCounter = 0;

function toggleContentSections() {
    const contentType = document.getElementById('moduleContentType').value;
    const urlSection = document.getElementById('urlInputSection');
    const fileSection = document.getElementById('fileInputSection');
    const quizSection = document.getElementById('quizEditorSection');

    if (contentType === 'quiz') {
        urlSection.style.display = 'none';
        fileSection.style.display = 'none';
        quizSection.style.display = 'block';
        document.getElementById('sourceURL').checked = true;
    } else {
        quizSection.style.display = 'none';
        // Show URL/File based on current toggle
        const source = document.querySelector('input[name="contentSource"]:checked').value;
        if (source === 'url') {
            urlSection.style.display = 'block';
            fileSection.style.display = 'none';
        } else {
            urlSection.style.display = 'none';
            fileSection.style.display = 'block';
        }
    }

    // Toggle Video Quiz Builder
    const videoQuizSection = document.getElementById('videoQuizEditorSection');
    if (contentType === 'video' || !contentType) {
        videoQuizSection.style.display = 'block';
    } else {
        videoQuizSection.style.display = 'none';
    }
}

// ========== Video Quiz Builder Functions ==========
let videoQuizCounter = 0;

function addVideoQuiz(data = null) {
    const container = document.getElementById('videoQuizzes');
    const noMsg = document.getElementById('noVideoQuizzesMsg');
    if (noMsg) noMsg.style.display = 'none';

    videoQuizCounter++;
    const vqId = 'vq' + videoQuizCounter;

    const quizDiv = document.createElement('div');
    quizDiv.className = 'card mb-3 border-primary shadow-sm';
    quizDiv.id = vqId;

    // Correctly handle the case where 'data' is an Event object (when clicked from UI)
    const isQuizData = data && typeof data === 'object' && 'question' in data;

    // Default values (Default to 4 options for new quizzes)
    const time = isQuizData ? data.time : 10;
    const question = isQuizData ? data.question : '';
    const options = isQuizData ? data.options : ['', '', '', ''];
    const correct = isQuizData ? data.correct : 0;

    quizDiv.innerHTML = `
        <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-primary">STOP POINT</span>
                    <div class="input-group input-group-sm" style="width: 150px;">
                        <span class="input-group-text"><i class="fas fa-clock"></i></span>
                        <input type="number" class="form-control" data-field="time" value="${time}" min="0" placeholder="Secs">
                        <span class="input-group-text">sec</span>
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger" data-action="remove-video-quiz" data-id="${vqId}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            
            <div class="mb-3">
                <input type="text" class="form-control form-control-sm fw-bold" data-field="question" 
                       value="${question}" placeholder="Enter question to show at this time...">
            </div>

            <div class="options-list" id="${vqId}_options">
                ${options.map((opt, i) => `
                    <div class="input-group input-group-sm mb-2">
                        <div class="input-group-text">
                            <input class="form-check-input mt-0" type="radio" name="${vqId}_correct" value="${i}" ${i === correct ? 'checked' : ''}>
                        </div>
                        <input type="text" class="form-control" data-field="option" value="${opt}" placeholder="Option">
                        <button class="btn btn-outline-secondary" type="button" data-action="remove-option">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
            
            <div class="d-flex justify-content-between align-items-center">
                <button type="button" class="btn btn-sm btn-link text-decoration-none p-0" data-action="add-option" data-id="${vqId}">
                    <i class="fas fa-plus-circle me-1"></i> Add Option
                </button>
                <small class="text-muted"><i class="fas fa-info-circle me-1"></i> Select correct answer</small>
            </div>
        </div>
    `;

    container.appendChild(quizDiv);
}

function removeVideoQuiz(id) {
    const el = document.getElementById(id);
    if (el) el.remove();

    const container = document.getElementById('videoQuizzes');
    if (container.querySelectorAll('.card').length === 0) {
        const noMsg = document.getElementById('noVideoQuizzesMsg');
        if (noMsg) noMsg.style.display = 'block';
    }
}

function addVideoQuizOption(vqId) {
    const optionsList = document.getElementById(vqId + '_options');
    if (!optionsList) return;

    const div = document.createElement('div');
    div.className = 'input-group input-group-sm mb-2';

    // Calculate new index based on existing inputs
    const existingInputs = optionsList.querySelectorAll('input[type="radio"]');
    const newIndex = existingInputs.length; // 0-based

    div.innerHTML = `
        <div class="input-group-text">
            <input class="form-check-input mt-0" type="radio" name="${vqId}_correct" value="${newIndex}">
        </div>
        <input type="text" class="form-control" data-field="option" value="" placeholder="Option">
        <button class="btn btn-outline-secondary" type="button" data-action="remove-option">
            <i class="fas fa-times"></i>
        </button>
    `;
    optionsList.appendChild(div);
}

function removeVideoQuizOption(btn) {
    if (!btn) return;
    const group = btn.closest('.input-group');
    const optionsList = btn.closest('.options-list');

    // Don't remove if it's the last option (maybe keep at least 2?)
    // But for flexibility, we allow removing all, user should be careful.
    if (group) group.remove();

    // Re-index radio buttons
    if (optionsList) {
        const radios = optionsList.querySelectorAll('input[type="radio"]');
        radios.forEach((radio, index) => {
            radio.value = index;
            // Also need to check if the checked one was removed.
            // If the checked one was removed, maybe select the first one?
            // The browser just clears the selection if the checked radio is removed.
        });

        // If nothing is checked, user needs to check one. That's fine.
    }
}

function loadVideoQuizData(description) {
    const container = document.getElementById('videoQuizzes');
    container.innerHTML = `<p class="text-muted text-center py-3 mb-0" id="noVideoQuizzesMsg">
        No stop points yet. Add one to show a quiz during the video.
    </p>`;
    videoQuizCounter = 0;

    if (!description) return;

    const regex = /\[QUIZ\]([\s\S]*?)\[\/QUIZ\]/g;
    let match;
    let found = false;

    while ((match = regex.exec(description)) !== null) {
        try {
            const data = JSON.parse(match[1]);
            addVideoQuiz(data);
            found = true;
        } catch (e) {
            console.error('Error parsing video quiz JSON:', e);
        }
    }

    if (found) {
        const noMsg = document.getElementById('noVideoQuizzesMsg');
        if (noMsg) noMsg.style.display = 'none';
    }
}

function addQuestion() {
    const container = document.getElementById('quizQuestions');
    const noMsg = document.getElementById('noQuestionsMsg');
    if (noMsg) noMsg.style.display = 'none';

    questionCounter++;
    const qId = 'q' + questionCounter;

    const questionDiv = document.createElement('div');
    questionDiv.className = 'card mb-2';
    questionDiv.id = qId;
    questionDiv.innerHTML = `
        <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <strong>Question ${container.querySelectorAll('.card').length + 1}</strong>
                <button type="button" class="btn btn-sm btn-outline-danger" data-action="remove-question" data-id="${qId}" aria-label="Remove Question">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <input type="text" class="form-control mb-2" placeholder="Enter question..." 
                    data-field="question" id="question_${qId}" name="question_${qId}" aria-label="Question Text" required>
            <div class="row g-2">
                <div class="col-6">
                    <div class="input-group input-group-sm">
                        <span class="input-group-text">
                            <input type="radio" name="correct_${qId}" value="0" checked aria-label="Select Option A as correct">
                        </span>
                        <input type="text" class="form-control" placeholder="Option A" data-field="option" id="opt_${qId}_0" name="opt_${qId}_0" aria-label="Option A" required>
                    </div>
                </div>
                <div class="col-6">
                    <div class="input-group input-group-sm">
                        <span class="input-group-text">
                            <input type="radio" name="correct_${qId}" value="1" aria-label="Select Option B as correct">
                        </span>
                        <input type="text" class="form-control" placeholder="Option B" data-field="option" id="opt_${qId}_1" name="opt_${qId}_1" aria-label="Option B" required>
                    </div>
                </div>
                <div class="col-6">
                    <div class="input-group input-group-sm">
                        <span class="input-group-text">
                            <input type="radio" name="correct_${qId}" value="2" aria-label="Select Option C as correct">
                        </span>
                        <input type="text" class="form-control" placeholder="Option C" data-field="option" id="opt_${qId}_2" name="opt_${qId}_2" aria-label="Option C" required>
                    </div>
                </div>
                <div class="col-6">
                    <div class="input-group input-group-sm">
                        <span class="input-group-text">
                            <input type="radio" name="correct_${qId}" value="3" aria-label="Select Option D as correct">
                        </span>
                        <input type="text" class="form-control" placeholder="Option D" data-field="option" id="opt_${qId}_3" name="opt_${qId}_3" aria-label="Option D" required>
                    </div>
                </div>
            </div>
            <small class="text-muted mt-1 d-block">Select the radio button next to the correct answer</small>
        </div>
    `;

    container.appendChild(questionDiv);
    updatePassingScore();
}

function removeQuestion(qId) {
    const element = document.getElementById(qId);
    if (element) {
        element.remove();
        updateQuestionNumbers();
        updatePassingScore();
    }
}

function updateQuestionNumbers() {
    const questions = document.querySelectorAll('#quizQuestions .card');
    questions.forEach((q, index) => {
        const label = q.querySelector('strong');
        if (label) label.textContent = `Question ${index + 1}`;
    });

    if (questions.length === 0) {
        const noMsg = document.getElementById('noQuestionsMsg');
        if (noMsg) noMsg.style.display = 'block';
    }
}

function getQuizData() {
    const questions = [];
    const questionCards = document.querySelectorAll('#quizQuestions .card');

    questionCards.forEach(card => {
        const qId = card.id;
        const questionText = card.querySelector('[data-field="question"]').value;
        const optionInputs = card.querySelectorAll('[data-field="option"]');
        const options = Array.from(optionInputs).map(input => input.value);
        const correctIndex = parseInt(card.querySelector(`input[name="correct_${qId}"]:checked`).value);

        if (questionText && options.every(o => o)) {
            questions.push({
                question: questionText,
                options: options,
                correctIndex: correctIndex
            });
        }
    });

    return questions;
}

function loadQuizData(quizJson) {
    try {
        let questions = [];
        let passingPercentage = 70; // Default

        if (quizJson) {
            const parsed = JSON.parse(quizJson);
            if (Array.isArray(parsed)) {
                // Legacy format: just array of questions
                questions = parsed;
            } else if (parsed && parsed.questions) {
                // New format: object with settings
                questions = parsed.questions;
                if (parsed.settings && parsed.settings.passingPercentage) {
                    passingPercentage = parsed.settings.passingPercentage;
                }
            }
        }

        const container = document.getElementById('quizQuestions');
        container.innerHTML = '';
        questionCounter = 0;

        if (!questions || questions.length === 0) {
            container.innerHTML = `<p class="text-muted text-center py-3 mb-0" id="noQuestionsMsg">
                No questions yet. Click "Add Question" to create one.
            </p>`;
            document.getElementById('requiredCorrectInput').value = 0;
            updatePassingScore();
            return;
        }

        questions.forEach((q, index) => {
            addQuestion();
            const card = container.querySelectorAll('.card')[index];
            card.querySelector('[data-field="question"]').value = q.question;
            const optionInputs = card.querySelectorAll('[data-field="option"]');
            q.options.forEach((opt, i) => {
                if (optionInputs[i]) optionInputs[i].value = opt;
            });
            const qId = card.id;
            card.querySelector(`input[name="correct_${qId}"][value="${q.correctIndex}"]`).checked = true;
        });

        // Calculate required count based on percentage
        const requiredCount = Math.ceil(questions.length * (passingPercentage / 100));
        document.getElementById('requiredCorrectInput').value = requiredCount;
        updatePassingScore();
    } catch (e) {
        console.error('Error loading quiz data:', e);
        showToast('Error loading quiz: ' + e.message, 'error');
    }
}
