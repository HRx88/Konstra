pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let CURRENT_USER_ID = null;
let currentTab = 'received';
let selectedFile = null;

document.addEventListener('DOMContentLoaded', initializeUser);

function initializeUser() {
    const user = JSON.parse(localStorage.getItem("memberDetails"));

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    CURRENT_USER_ID = user.memberID;
    loadDocuments();

    // SSE for real-time updates
    const eventSource = new EventSource(`/api/documents/events/${CURRENT_USER_ID}`);
    eventSource.onmessage = () => loadDocuments();
    window.addEventListener('beforeunload', () => eventSource.close());

    // Event Listeners
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });

    // Tab navigation
    document.querySelectorAll('#docTabs .nav-link').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('#docTabs .nav-link').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentTab = e.target.dataset.tab;
            loadDocuments();
        });
    });

    // Upload modal
    document.getElementById('uploadBtn')?.addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('uploadModal')).show();
    });

    // File input
    document.getElementById('fileInput')?.addEventListener('change', handleFileSelect);
    document.getElementById('removeFile')?.addEventListener('click', clearFile);
    document.getElementById('submitUpload')?.addEventListener('click', uploadDocument);

    // Drag and drop
    const dropzone = document.getElementById('dropzone');
    dropzone?.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone?.addEventListener('drop', handleDrop);

    // Preview modal
    document.getElementById('closeModal')?.addEventListener('click', () => {
        document.getElementById('previewModal').style.display = 'none';
    });

    // Document list delegation
    document.getElementById('documentList')?.addEventListener('click', handleDocClick);
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

async function loadDocuments() {
    const list = document.getElementById('documentList');
    list.innerHTML = `<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div></div>`;

    try {
        const endpoint = currentTab === 'received'
            ? `/api/documents/user/${CURRENT_USER_ID}`
            : `/api/documents/user/${CURRENT_USER_ID}/uploads`;

        const response = await fetch(endpoint + `?t=${Date.now()}`);
        const result = await response.json();

        if (result.success) {
            renderDocuments(result.documents, currentTab);
        } else {
            renderError(result.message || 'Failed to load documents');
        }
    } catch (error) {
        console.error(error);
        renderError('Failed to load documents.');
    }
}

function renderError(msg) {
    document.getElementById('documentList').innerHTML = `
        <div class="col-12 empty-state">
            <i class="fas fa-exclamation-circle"></i>
            <h5>Error</h5>
            <p>${msg}</p>
        </div>`;
}

function renderDocuments(documents, tab) {
    const list = document.getElementById('documentList');

    if (!documents || documents.length === 0) {
        const emptyMsg = tab === 'received'
            ? "No documents received yet. Check back later!"
            : "You haven't uploaded any documents yet.";
        const emptyIcon = tab === 'received' ? 'fa-inbox' : 'fa-cloud-upload-alt';

        list.innerHTML = `
            <div class="col-12 empty-state">
                <i class="fas ${emptyIcon}"></i>
                <h5>No documents found</h5>
                <p>${emptyMsg}</p>
            </div>`;
        return;
    }

    list.innerHTML = documents.map(doc => {
        const iconData = getFileIcon(doc.FileType, doc.FileName);
        const statusBadge = tab === 'uploaded' ? getStatusBadge(doc.ReviewStatus) : '';

        let feedbackHtml = '';
        if (doc.AdminFeedback || doc.FeedbackFilePath) {
            feedbackHtml = '<div class="feedback-box">';
            if (doc.AdminFeedback) {
                feedbackHtml += `<div class="feedback-text"><i class="fas fa-comment-dots me-2 text-primary opacity-50"></i>"${doc.AdminFeedback}"</div>`;
            }
            if (doc.FeedbackFilePath) {
                feedbackHtml += `<a href="/api/documents/admin/feedback/download/${doc.DocumentID}" class="feedback-attachment" target="_blank"><i class="fas fa-paperclip me-1"></i> View Attachment</a>`;
            }
            feedbackHtml += '</div>';
        }

        return `
        <div class="col-md-6 col-lg-4 col-xl-3">
            <div class="document-card h-100">
                ${statusBadge}
                <div class="doc-icon-wrapper" style="background-color: ${iconData.bg}; color: ${iconData.color}">
                    <i class="fas ${iconData.icon}"></i>
                </div>
                <div class="doc-name" title="${doc.FileName}">${doc.FileName}</div>
                <div class="doc-meta">
                    <span>${(doc.FileSize / 1024).toFixed(1)} KB</span>
                    <span>${new Date(doc.UploadDate).toLocaleDateString()}</span>
                </div>
               
                ${feedbackHtml}

                <div class="card-actions mt-auto">
                    <button class="btn btn-light btn-sm flex-fill fw-bold border btn-preview" 
                            data-id="${doc.DocumentID}" data-type="${doc.FileType}" data-name="${doc.FileName}">
                        <i class="fas fa-eye me-1 text-muted"></i> Preview
                    </button>
                    <button class="btn btn-outline-success btn-sm flex-fill fw-bold btn-download" 
                            data-id="${doc.DocumentID}" data-name="${doc.FileName}">
                        <i class="fas fa-download me-1"></i>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function getStatusBadge(status) {
    if (!status || status === 'Received') return '<span class="status-badge received">From Admin</span>';
    if (status === 'Pending') return '<span class="status-badge pending">Pending Review</span>';
    if (status === 'Approved') return '<span class="status-badge approved">Approved</span>';
    if (status === 'Rejected') return '<span class="status-badge rejected" style="background-color: #ffebee; color: #c62828;">Rejected</span>';
    return '';
}

function getFileIcon(type, name) {
    if (type) {
        type = type.toLowerCase();
        if (type.includes('pdf')) return { icon: 'fa-file-pdf', color: '#e53e3e', bg: '#fff5f5' };
        if (type.includes('presentation') || type.includes('powerpoint')) return { icon: 'fa-file-powerpoint', color: '#e05822', bg: '#fffaf0' };
        if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return { icon: 'fa-file-excel', color: '#38a169', bg: '#f0fff4' };
        if (type.includes('word') || type.includes('document') || type.includes('msword')) return { icon: 'fa-file-word', color: '#3182ce', bg: '#ebf8ff' };
        if (type.includes('image')) return { icon: 'fa-file-image', color: '#805ad5', bg: '#faf5ff' };
    }
    if (name) {
        const ext = name.split('.').pop().toLowerCase();
        if (['doc', 'docx'].includes(ext)) return { icon: 'fa-file-word', color: '#3182ce', bg: '#ebf8ff' };
        if (['xls', 'xlsx', 'csv'].includes(ext)) return { icon: 'fa-file-excel', color: '#38a169', bg: '#f0fff4' };
        if (['ppt', 'pptx'].includes(ext)) return { icon: 'fa-file-powerpoint', color: '#e05822', bg: '#fffaf0' };
        if (['pdf'].includes(ext)) return { icon: 'fa-file-pdf', color: '#e53e3e', bg: '#fff5f5' };
    }
    return { icon: 'fa-file', color: '#718096', bg: '#edf2f7' };
}

// File handling
function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        setSelectedFile(e.target.files[0]);
    }
}

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('dropzone').classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        setSelectedFile(e.dataTransfer.files[0]);
    }
}

function setSelectedFile(file) {
    selectedFile = file;
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = (file.size / 1024).toFixed(1) + ' KB';
    document.getElementById('selectedFile').classList.remove('d-none');
    document.getElementById('dropzone').classList.add('d-none');
    document.getElementById('submitUpload').disabled = false;
}

function clearFile() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('selectedFile').classList.add('d-none');
    document.getElementById('dropzone').classList.remove('d-none');
    document.getElementById('submitUpload').disabled = true;
}

async function uploadDocument() {
    if (!selectedFile) return;

    const submitBtn = document.getElementById('submitUpload');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Uploading...';

    try {
        const formData = new FormData();
        formData.append('document', selectedFile);
        formData.append('userID', CURRENT_USER_ID);
        formData.append('uploadedByUser', 'true');

        const response = await fetch('/api/documents/upload-for-review', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Document Submitted!',
                text: 'Your document has been sent for admin review.',
                confirmButtonColor: '#0d6efd'
            });
            bootstrap.Modal.getInstance(document.getElementById('uploadModal')).hide();
            clearFile();

            // Switch to uploads tab
            document.querySelectorAll('#docTabs .nav-link').forEach(t => t.classList.remove('active'));
            document.querySelector('[data-tab="uploaded"]').classList.add('active');
            currentTab = 'uploaded';
            loadDocuments();
        } else {
            throw new Error(result.error || 'Upload failed');
        }
    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'Upload Failed',
            text: error.message || 'Could not upload document. Please try again.',
            confirmButtonColor: '#dc3545'
        });
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send for Review';
    }
}

// Document actions
function handleDocClick(e) {
    const previewBtn = e.target.closest('.btn-preview');
    const downloadBtn = e.target.closest('.btn-download');

    if (previewBtn) {
        previewDoc(previewBtn.dataset.id, previewBtn.dataset.type, previewBtn.dataset.name);
    } else if (downloadBtn) {
        downloadDoc(downloadBtn.dataset.id, downloadBtn.dataset.name);
    }
}

function downloadDoc(id, fileName) {
    Swal.fire({
        title: 'Download File?',
        text: fileName,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#20bf6b',
        cancelButtonColor: '#95a5a6',
        confirmButtonText: 'Download',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = `/api/documents/download/${id}/user/${CURRENT_USER_ID}`;
        }
    });
}

async function previewDoc(id, type, name) {
    const modal = document.getElementById('previewModal');
    const area = document.getElementById('previewArea');
    document.getElementById('previewTitle').textContent = name;

    modal.style.display = 'flex';
    area.innerHTML = '<div class="d-flex flex-column align-items-center justify-content-center h-100"><div class="spinner-border text-primary mb-3"></div><div class="text-muted">Loading preview...</div></div>';

    const url = `/api/documents/download/${id}/user/${CURRENT_USER_ID}`;

    try {
        // PDF Preview - High fidelity rendering
        if (type === 'application/pdf') {
            const loadingTask = pdfjsLib.getDocument(url);
            const pdf = await loadingTask.promise;

            // Create container with proper styling
            area.innerHTML = '<div class="pdf-container" style="background: #525659; padding: 20px; overflow-y: auto; max-height: 100%;"></div>';
            const container = area.querySelector('.pdf-container');

            // Render all pages at higher quality
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const scale = 2.0; // Higher scale for better quality
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                canvas.style.display = 'block';
                canvas.style.margin = '0 auto 20px';
                canvas.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
                canvas.style.background = 'white';
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                container.appendChild(canvas);

                const context = canvas.getContext('2d');
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
            }
        }
        // Word Document Preview - Improved formatting
        else if (type.includes('wordprocessingml') || type.includes('msword')) {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const result = await mammoth.convertToHtml({
                arrayBuffer,
                styleMap: [
                    "p[style-name='Heading 1'] => h1:fresh",
                    "p[style-name='Heading 2'] => h2:fresh",
                    "p[style-name='Heading 3'] => h3:fresh",
                    "r[style-name='Strong'] => strong",
                    "r[style-name='Emphasis'] => em"
                ]
            });

            // Create a Word-like preview container
            area.innerHTML = `
                <div class="word-preview-container" style="background: #f3f3f3; padding: 40px; overflow-y: auto; max-height: 100%;">
                    <div class="word-page" style="
                        background: white;
                        max-width: 816px;
                        margin: 0 auto;
                        padding: 96px 72px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        min-height: 1056px;
                        font-family: 'Calibri', 'Arial', sans-serif;
                        font-size: 11pt;
                        line-height: 1.5;
                        color: #000;
                    ">
                        ${result.value}
                    </div>
                </div>`;

            // Apply proper styling to rendered content
            const wordPage = area.querySelector('.word-page');
            wordPage.querySelectorAll('h1').forEach(h => {
                h.style.fontSize = '16pt';
                h.style.fontWeight = 'bold';
                h.style.marginTop = '24px';
                h.style.marginBottom = '12px';
            });
            wordPage.querySelectorAll('h2').forEach(h => {
                h.style.fontSize = '14pt';
                h.style.fontWeight = 'bold';
                h.style.marginTop = '18px';
                h.style.marginBottom = '10px';
            });
            wordPage.querySelectorAll('p').forEach(p => {
                p.style.marginBottom = '8px';
            });
            wordPage.querySelectorAll('table').forEach(t => {
                t.style.borderCollapse = 'collapse';
                t.style.width = '100%';
                t.style.marginBottom = '12px';
            });
            wordPage.querySelectorAll('td, th').forEach(cell => {
                cell.style.border = '1px solid #ddd';
                cell.style.padding = '8px';
            });
        }
        // Excel/Spreadsheet Preview - Better table rendering
        else if (type.includes('sheet') || type.includes('excel') || type.includes('csv') ||
            name.match(/\.(xlsx?|csv)$/i)) {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });

            area.innerHTML = '<div class="excel-container" style="background: #f8f9fa; padding: 20px; overflow: auto; max-height: 100%;"></div>';
            const container = area.querySelector('.excel-container');

            // Render all sheets with tabs
            if (workbook.SheetNames.length > 1) {
                const tabsHtml = workbook.SheetNames.map((name, idx) =>
                    `<button class="sheet-tab ${idx === 0 ? 'active' : ''}" data-sheet="${idx}" style="
                        padding: 8px 16px;
                        border: none;
                        background: ${idx === 0 ? 'white' : '#e9ecef'};
                        border-top-left-radius: 4px;
                        border-top-right-radius: 4px;
                        cursor: pointer;
                        margin-right: 2px;
                    ">${name}</button>`
                ).join('');

                container.innerHTML = `
                    <div class="sheet-tabs" style="margin-bottom: 10px;">${tabsHtml}</div>
                    <div class="sheet-content" style="background: white; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></div>
                `;

                const contentDiv = container.querySelector('.sheet-content');
                const renderSheet = (idx) => {
                    const html = XLSX.utils.sheet_to_html(workbook.Sheets[workbook.SheetNames[idx]]);
                    contentDiv.innerHTML = `<div style="overflow: auto; padding: 20px;">${html}</div>`;
                    styleTable(contentDiv.querySelector('table'));
                };

                container.querySelectorAll('.sheet-tab').forEach((tab, idx) => {
                    tab.addEventListener('click', () => {
                        container.querySelectorAll('.sheet-tab').forEach(t => {
                            t.style.background = '#e9ecef';
                            t.classList.remove('active');
                        });
                        tab.style.background = 'white';
                        tab.classList.add('active');
                        renderSheet(idx);
                    });
                });

                renderSheet(0);
            } else {
                const html = XLSX.utils.sheet_to_html(workbook.Sheets[workbook.SheetNames[0]]);
                container.innerHTML = `
                    <div style="background: white; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: auto; padding: 20px;">
                        ${html}
                    </div>`;
                styleTable(container.querySelector('table'));
            }
        }
        // PowerPoint Preview - Multiple fallback options
        else if (type.includes('presentation') || type.includes('powerpoint') || name.match(/\.(pptx?|ppt)$/i)) {
            // Option 1: Try to extract as HTML/images if possible
            // Option 2: Use viewer iframe
            // Option 3: Show download option

            area.innerHTML = `
                <div class="ppt-container" style="width: 100%; height: 100%; background: #f0f0f0; display: flex; align-items: center; justify-content: center;">
                    <div class="text-center p-5" style="background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 500px;">
                        <i class="fas fa-file-powerpoint fa-4x mb-4" style="color: #e05822;"></i>
                        <h4 class="mb-3">PowerPoint Presentation</h4>
                        <p class="text-muted mb-2"><strong>${name}</strong></p>
                        <p class="text-muted small mb-4">PowerPoint files require downloading to view with full fidelity. Browser preview may not display all formatting and animations correctly.</p>
                        
                        <div class="d-flex gap-2 justify-content-center flex-wrap">
                            <a href="${url}" class="btn btn-primary" download>
                                <i class="fas fa-download me-2"></i>Download & Open
                            </a>
                            <button class="btn btn-outline-secondary" onclick="tryViewerPreview('${url}', '${name}')">
                                <i class="fas fa-eye me-2"></i>Try Web Preview
                            </button>
                        </div>
                        
                        <div id="viewerContainer" class="mt-4" style="display: none;">
                            <div class="spinner-border text-primary mb-2"></div>
                            <p class="text-muted small">Loading preview...</p>
                        </div>
                    </div>
                </div>`;
        }
        // Image Preview - Full quality
        else if (type.startsWith('image/')) {
            area.innerHTML = `
                <div class="image-container" style="background: #000; display: flex; align-items: center; justify-content: center; height: 100%; padding: 20px;">
                    <img src="${url}" style="max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 4px 8px rgba(0,0,0,0.3);" />
                </div>`;
        }
        // Text files
        else if (type.includes('text/plain') || name.match(/\.(txt|log|md)$/i)) {
            const response = await fetch(url);
            const text = await response.text();
            area.innerHTML = `
                <div class="text-container" style="background: white; padding: 40px; overflow: auto; max-height: 100%;">
                    <pre style="font-family: 'Consolas', 'Monaco', monospace; font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(text)}</pre>
                </div>`;
        }
        // Fallback for unsupported formats
        else {
            throw new Error("Format not supported");
        }
    } catch (error) {
        console.error(error);
        area.innerHTML = `
            <div class="text-center p-5">
                <i class="fas fa-file-circle-xmark text-muted fa-3x mb-3"></i>
                <h4>Preview Unavailable</h4>
                <p class="text-muted">This file format cannot be previewed in the browser.</p>
                <p class="text-muted small">Error: ${error.message}</p>
                <a href="${url}" class="btn btn-primary mt-3"><i class="fas fa-download me-2"></i>Download File</a>
            </div>`;
    }
}

// Helper function to style Excel tables
function styleTable(table) {
    if (!table) return;

    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.fontSize = '13px';
    table.style.fontFamily = 'Calibri, Arial, sans-serif';

    table.querySelectorAll('th').forEach(th => {
        th.style.background = '#217346';
        th.style.color = 'white';
        th.style.fontWeight = 'bold';
        th.style.padding = '10px';
        th.style.border = '1px solid #d0d7de';
        th.style.textAlign = 'left';
    });

    table.querySelectorAll('td').forEach((td, idx) => {
        td.style.padding = '8px 10px';
        td.style.border = '1px solid #d0d7de';
        const row = td.parentElement;
        const rowIndex = Array.from(row.parentElement.children).indexOf(row);
        td.style.background = rowIndex % 2 === 0 ? 'white' : '#f9f9f9';
    });
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Try to show PowerPoint in web viewer
function tryViewerPreview(url, filename) {
    const container = document.getElementById('viewerContainer');
    const area = document.getElementById('previewArea');

    container.style.display = 'block';

    const fullUrl = window.location.origin + url;
    const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fullUrl)}&embedded=true`;

    area.innerHTML = `
        <div class="ppt-viewer-wrapper" style="width: 100%; height: 100%; background: #525659; position: relative;">
            <iframe 
                id="pptIframe"
                src="${googleViewerUrl}"
                style="width: 100%; height: 100%; border: none;"
                frameborder="0"
            ></iframe>
            <div class="viewer-notice" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 8px 12px; border-radius: 4px; font-size: 12px;">
                <i class="fas fa-info-circle me-1"></i> Web preview may not show all features
            </div>
        </div>`;

    // Show error if viewer fails
    setTimeout(() => {
        const iframe = document.getElementById('pptIframe');
        if (iframe) {
            iframe.addEventListener('error', () => {
                area.innerHTML = `
                    <div class="text-center p-5">
                        <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                        <h4>Preview Failed</h4>
                        <p class="text-muted">Unable to load web preview. Please download the file to view it properly.</p>
                        <a href="${url}" class="btn btn-primary mt-3" download><i class="fas fa-download me-2"></i>Download File</a>
                    </div>`;
            });
        }
    }, 1000);
}