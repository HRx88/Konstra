pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let CURRENT_USER_ID = null;

document.addEventListener('DOMContentLoaded', initializeUser);
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('previewModal').style.display = 'none';
});

function initializeUser() {
    // Robust user check (matching check in dashboard)
    const user = JSON.parse(localStorage.getItem("currentUser")) ||
        JSON.parse(localStorage.getItem("memberDetails")) ||
        JSON.parse(localStorage.getItem("adminDetails"));

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // Using ID fallback
    CURRENT_USER_ID = user.memberID || user.adminID || user.id;
    loadUserDocuments();

    // Dynamic Update: Real-time SSE listener
    const eventSource = new EventSource(`/api/documents/events/${CURRENT_USER_ID}`);
    eventSource.onmessage = function (event) {
        console.log("New document update received");
        console.log("New document update received");
        loadUserDocuments();
    };

    // Static Listeners
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });

    // Delegation for Document List
    document.getElementById('documentList')?.addEventListener('click', handleDocClick);

    // Cleanup on page unload (optional but good practice)
    window.addEventListener('beforeunload', () => eventSource.close());
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

async function loadUserDocuments() {
    try {
        console.log("Fetching documents...");
        // Add timestamp to prevent caching
        const response = await fetch(`/api/documents/user/${CURRENT_USER_ID}?t=${Date.now()}`);
        const result = await response.json();

        if (result.success) {
            console.log(`Fetched ${result.documents.length} documents.`);
            renderDocuments(result.documents);
        }
        else renderError(result.message);
    } catch (error) {
        console.error(error);
        renderError('Failed to load documents.');
    }
}

function renderError(msg) {
    document.getElementById('documentList').innerHTML = `<div class="col-12 text-center py-5 text-muted">${msg}</div>`;
}

function getFileIcon(type, name) {
    // 1. Check MIME type first
    if (type) {
        type = type.toLowerCase();
        if (type.includes('pdf')) return { icon: 'fa-file-pdf', color: '#e53e3e', bg: '#fff5f5' };
        // Check Presentation and Spreadsheet BEFORE 'document' because office mimetypes often contain 'officedocument'
        if (type.includes('presentation') || type.includes('powerpoint') || type.includes('slideshow') || type.includes('pps')) return { icon: 'fa-file-powerpoint', color: '#e05822', bg: '#fffaf0' };
        if (type.includes('sheet') || type.includes('excel') || type.includes('csv') || type.includes('spreadsheet') || type.includes('xls')) return { icon: 'fa-file-excel', color: '#38a169', bg: '#f0fff4' };
        if (type.includes('word') || type.includes('document') || type.includes('msword')) return { icon: 'fa-file-word', color: '#3182ce', bg: '#ebf8ff' };
        if (type.includes('image')) return { icon: 'fa-file-image', color: '#805ad5', bg: '#faf5ff' };
        if (type.includes('text') || type.includes('txt')) return { icon: 'fa-file-alt', color: '#718096', bg: '#f7fafc' };
        if (type.includes('zip') || type.includes('compressed') || type.includes('rar') || type.includes('tar')) return { icon: 'fa-file-archive', color: '#d69e2e', bg: '#fffff0' };
    }

    // 2. Fallback to Filename Extension (for murky MIME types)
    if (name) {
        const ext = name.split('.').pop().toLowerCase();
        if (['doc', 'docx'].includes(ext)) return { icon: 'fa-file-word', color: '#3182ce', bg: '#ebf8ff' };
        if (['xls', 'xlsx', 'csv'].includes(ext)) return { icon: 'fa-file-excel', color: '#38a169', bg: '#f0fff4' };
        if (['ppt', 'pptx', 'pps'].includes(ext)) return { icon: 'fa-file-powerpoint', color: '#e05822', bg: '#fffaf0' };
        if (['pdf'].includes(ext)) return { icon: 'fa-file-pdf', color: '#e53e3e', bg: '#fff5f5' };
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { icon: 'fa-file-archive', color: '#d69e2e', bg: '#fffff0' };
        if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return { icon: 'fa-file-image', color: '#805ad5', bg: '#faf5ff' };
    }

    return { icon: 'fa-file', color: '#718096', bg: '#edf2f7' };
}

function renderDocuments(documents) {
    const list = document.getElementById('documentList');
    if (!documents || documents.length === 0) {
        list.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-folder-open text-muted fa-3x mb-3 opacity-25"></i>
                <h5 class="text-muted">No documents found</h5>
            </div>`;
        return;
    }

    list.innerHTML = documents.map(doc => {
        const iconData = getFileIcon(doc.FileType, doc.FileName);
        return `
        <div class="col-md-6 col-lg-4 col-xl-3">
            <div class="document-card">
                <div class="doc-icon-wrapper" style="background-color: ${iconData.bg}; color: ${iconData.color}">
                    <i class="fas ${iconData.icon}"></i>
                </div>
                <div class="doc-name" title="${doc.FileName}">${doc.FileName}</div>
                <div class="doc-meta">
                    <span>${(doc.FileSize / 1024).toFixed(1)} KB</span>
                    <span>${new Date(doc.UploadDate).toLocaleDateString()}</span>
                </div>
                <div class="card-actions">
                    <button class="btn btn-light btn-sm flex-fill fw-bold border btn-preview" data-id="${doc.DocumentID}" data-type="${doc.FileType}" data-name="${doc.FileName}">
                        <i class="fas fa-eye me-1 text-muted"></i> Preview
                    </button>
                    <button class="btn btn-outline-success btn-sm flex-fill fw-bold btn-download" data-id="${doc.DocumentID}" data-name="${doc.FileName}">
                        <i class="fas fa-download me-1"></i>
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
}

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
    // Direct download to avoid popup spam, or keep confirm if preferred. 
    // Keeping confirm for professional feel.
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
        if (type === 'application/pdf') {
            const loadingTask = pdfjsLib.getDocument(url);
            const pdf = await loadingTask.promise;
            area.innerHTML = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const scale = 1.5;
                const viewport = page.getViewport({ scale: scale });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                area.appendChild(canvas);
                await page.render({ canvasContext: context, viewport: viewport }).promise;
            }
        }
        else if (type.includes('wordprocessingml')) {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
            if (result.value) area.innerHTML = `<div class="bg-white p-5 shadow-sm w-100" style="max-width:800px;">${result.value}</div>`;
            else throw new Error("Empty document");
        }
        else if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const html = XLSX.utils.sheet_to_html(worksheet, { id: "excelTable", editable: false });
            area.innerHTML = `<div class="bg-white p-3 overflow-auto w-100">${html}</div>`;
            // Add basic Bootstrap table class
            const table = area.querySelector('table');
            if (table) table.className = 'table table-bordered table-striped table-sm';
        }
        else if (type.startsWith('image/')) {
            area.innerHTML = `<img src="${url}" class="img-fluid rounded" />`;
        }
        else if (type === 'text/plain') {
            const response = await fetch(url);
            const text = await response.text();
            area.innerHTML = `<pre class="bg-white p-4 w-100 border rounded">${text}</pre>`;
        }
        else { throw new Error("Format not supported"); }
    } catch (error) {
        console.error(error);
        area.innerHTML = `
            <div class="text-center p-5">
                <i class="fas fa-file-circle-xmark text-muted fa-3x mb-3"></i>
                <h4>Preview Unavailable</h4>
                <p class="text-muted">This file format cannot be viewed in the browser.</p>
                <a href="${url}" class="btn btn-primary mt-2"><i class="fas fa-download me-2"></i>Download File</a>
            </div>`;
    }
}
