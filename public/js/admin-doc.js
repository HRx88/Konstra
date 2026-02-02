// --- YOUR ORIGINAL LOGIC (ADAPTED) ---
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"

let allUsers = [];
let selectedUser = null;
let ADMIN_ID = null;
let currentRoleFilter = 'User'; // Default

document.addEventListener('DOMContentLoaded', initializeAdmin);

function initializeAdmin() {
    const adminDetails = JSON.parse(localStorage.getItem("adminDetails"));
    if (!adminDetails || !adminDetails.adminID) {
        window.location.href = "index.html"; // Guard clause
        return;
    }
    ADMIN_ID = adminDetails.adminID;

    setupEventListeners();
    loadUsers();
}

function setupEventListeners() {
    // Static
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });
    document.getElementById('searchInput')?.addEventListener('input', (e) => filterUsers(e.target.value));
    document.getElementById('btnUpload')?.addEventListener('click', uploadFile);
    document.getElementById('refreshReviewBtn')?.addEventListener('click', loadPendingDocuments);

    // Tab Switch Listener (Main Tabs)
    document.getElementById('tab-review')?.addEventListener('shown.bs.tab', loadPendingDocuments);

    // Role Filter Tabs (User vs NGO)
    document.querySelectorAll('#roleTabs button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // UI Toggle
            document.querySelectorAll('#roleTabs button').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');

            // Logic
            currentRoleFilter = e.currentTarget.dataset.role;
            document.getElementById('searchInput').value = ''; // Reset search

            // Reset Selection
            document.getElementById('actionArea').style.display = 'none';
            selectedUser = null;
            document.querySelectorAll('.user-item').forEach(el => el.classList.remove('selected'));

            renderUsers(allUsers);
        });
    });

    // Delegation: User List
    document.getElementById('userList')?.addEventListener('click', (e) => {
        const item = e.target.closest('.user-item');
        if (item) {
            selectUser(parseInt(item.dataset.id), item.dataset.name, item);
        }
    });

    // Delegation: Docs Table
    document.getElementById('docsTableBody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.classList.contains('btn-preview')) {
            previewDoc(parseInt(btn.dataset.id), btn.dataset.type, btn.dataset.name);
        } else if (btn.classList.contains('btn-delete')) {
            deleteDoc(parseInt(btn.dataset.id));
        }
    });
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

async function loadUsers() {
    try {
        const res = await fetch('/api/documents/users');
        const data = await res.json();
        if (data.success) {
            allUsers = data.users;
            renderUsers(allUsers);
        }
    } catch (error) { console.error(error); }
}

function renderUsers(users) {
    // Filter by Role first
    let filtered = users.filter(u => {
        // If currentRoleFilter is 'User', include 'User' type (and maybe nulls if any)
        // If 'NGO', include 'NGO' type
        const uType = u.Role || 'User';
        return uType === currentRoleFilter;
    });

    const list = document.getElementById('userList');
    if (filtered.length === 0) {
        list.innerHTML = `<div class="text-center text-muted py-3 small">No ${currentRoleFilter} accounts found.</div>`;
        return;
    }

    list.innerHTML = filtered.map(u => `
        <div class="user-item" data-id="${u.UserID}" data-name="${u.Username}">
            <div class="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center" style="width:35px; height:35px;">
                ${u.Username.charAt(0).toUpperCase()}
            </div>
            <div>
                <div class="fw-bold small">${u.Username}</div>
                <small class="text-muted" style="font-size:0.75rem">${u.Email}</small>
            </div>
        </div>
    `).join('');
}

// ... unchanged ...

function filterUsers(term) {
    const termLower = term.toLowerCase();
    const filtered = allUsers.filter(u => {
        const uType = u.Role || 'User';
        const matchesRole = uType === currentRoleFilter;
        const matchesSearch = u.Username.toLowerCase().includes(termLower) || u.Email.toLowerCase().includes(termLower);
        return matchesRole && matchesSearch;
    });

    // We duplicate the render logic slightly to use the pre-filtered list
    // Or just call renderUsers with the SUBSET, BUT renderUsers applies filter again?
    // Let's make renderUsers smarter or just render manually here.
    // Actually, safest is to modify renderUsers to NOT filter active role if we pass a subset? 
    // No, better to keep logic in one place.
    // Let's rewrite renderUsers to take the FULL list and filter internally, OR handle pre-filtered.

    // Simpler: Just render the HTML here since we already filtered everything
    const list = document.getElementById('userList');
    if (filtered.length === 0) {
        list.innerHTML = `<div class="text-center text-muted py-3 small">No matches found.</div>`;
        return;
    }

    list.innerHTML = filtered.map(u => `
        <div class="user-item" data-id="${u.UserID}" data-name="${u.Username}">
            <div class="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center" style="width:35px; height:35px;">
                ${u.Username.charAt(0).toUpperCase()}
            </div>
            <div>
                <div class="fw-bold small">${u.Username}</div>
                <small class="text-muted" style="font-size:0.75rem">${u.Email}</small>
            </div>
        </div>
    `).join('');
}

// Expanded getFileIcon logic (Same as ngo-doc.html)
function getFileIcon(type, name) {
    // 1. Check MIME type first
    if (type) {
        type = type.toLowerCase();
        if (type.includes('pdf')) return { icon: 'fa-file-pdf', color: '#e53e3e', bg: '#fff5f5' };
        // Check Presentation and Spreadsheet BEFORE 'document'
        if (type.includes('presentation') || type.includes('powerpoint') || type.includes('slideshow') || type.includes('pps')) return { icon: 'fa-file-powerpoint', color: '#e05822', bg: '#fffaf0' };
        if (type.includes('sheet') || type.includes('excel') || type.includes('csv') || type.includes('spreadsheet') || type.includes('xls')) return { icon: 'fa-file-excel', color: '#38a169', bg: '#f0fff4' };
        if (type.includes('word') || type.includes('document') || type.includes('msword')) return { icon: 'fa-file-word', color: '#3182ce', bg: '#ebf8ff' };
        if (type.includes('image')) return { icon: 'fa-file-image', color: '#805ad5', bg: '#faf5ff' };
        if (type.includes('text') || type.includes('txt')) return { icon: 'fa-file-alt', color: '#718096', bg: '#f7fafc' };
        if (type.includes('zip') || type.includes('compressed') || type.includes('rar') || type.includes('tar')) return { icon: 'fa-file-archive', color: '#d69e2e', bg: '#fffff0' };
    }

    // 2. Fallback to Filename Extension
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

function filterUsers(term) {
    const filtered = allUsers.filter(u => u.Username.toLowerCase().includes(term.toLowerCase()));
    renderUsers(filtered);
}

function selectUser(id, name, element) {
    selectedUser = { id, name };
    document.getElementById('actionArea').style.display = 'block';
    document.getElementById('selectedUserName').innerText = `Target: ${name} `;

    // Visual selection
    document.querySelectorAll('.user-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    loadUserDocuments(id);
}

async function loadUserDocuments(userId) {
    const res = await fetch(`/api/documents/user/${userId}`);
    const data = await res.json();
    const tbody = document.getElementById('docsTableBody');

    if (data.success && data.documents.length > 0) {
        tbody.innerHTML = data.documents.map(doc => {
            const iconData = getFileIcon(doc.FileType, doc.FileName);
            return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="me-3 d-flex align-items-center justify-content-center rounded" style="width: 40px; height: 40px; background-color: ${iconData.bg}; color: ${iconData.color};">
                            <i class="fas ${iconData.icon} fs-5"></i>
                        </div>
                        <div style="word-break: break-all;">${doc.FileName}</div>
                    </div>
                </td>
                <td>${(doc.FileSize / 1024).toFixed(1)} KB</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1 btn-preview" data-id="${doc.DocumentID}" data-type="${doc.FileType}" data-name="${doc.FileName}"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${doc.DocumentID}"><i class="fas fa-trash"></i></button>
                </td>
                </tr>
        `;
        }).join('');
    } else {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">No files found.</td></tr>';
    }
}

async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    if (!selectedUser) return Swal.fire('Warning', 'Select a user first!', 'warning');
    if (!fileInput.files[0]) return Swal.fire('Warning', 'Select a file!', 'warning');

    const formData = new FormData();
    formData.append('document', fileInput.files[0]);
    formData.append('userID', selectedUser.id);
    formData.append('adminID', ADMIN_ID);

    Swal.fire({ title: 'Uploading...', didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            Swal.fire('Success', 'Uploaded!', 'success');
            fileInput.value = '';
            loadUserDocuments(selectedUser.id);
        } else {
            Swal.fire('Error', data.error, 'error');
        }
    } catch (error) { Swal.fire('Error', 'Network Error', 'error'); }
}

function deleteDoc(docId) {
    Swal.fire({
        title: 'Delete?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d32f2f',
        confirmButtonText: 'Yes'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/documents/${docId}/user/${selectedUser.id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    loadUserDocuments(selectedUser.id);
                    Swal.fire('Deleted', '', 'success');
                }
            } catch (e) { }
        }
    });
}

document.getElementById('closeModal').addEventListener('click', () => {
    const modal = document.getElementById('previewModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300); // Wait for transition
});

// --- REVIEW LOGIC ---
async function loadPendingDocuments() {
    const tbody = document.getElementById('reviewTableBody');
    const emptyState = document.getElementById('reviewEmptyState');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3"><div class="spinner-border text-primary spinner-border-sm"></div> Loading...</td></tr>';

    try {
        const res = await fetch('/api/documents/admin/pending');
        const data = await res.json();

        if (data.success && data.documents.length > 0) {
            tbody.innerHTML = data.documents.map(doc => {
                const iconData = getFileIcon(doc.FileType, doc.FileName);
                return `
                <tr>
                    <td>
                        <div class="fw-bold">${doc.Username}</div>
                        <small class="text-muted">${doc.Email}</small>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="me-2 text-primary">
                                <i class="fas ${iconData.icon}"></i>
                            </div>
                            <span class="text-truncate" style="max-width: 200px;">${doc.FileName}</span>
                        </div>
                    </td>
                    <td>${new Date(doc.UploadDate).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="previewDoc(${doc.DocumentID}, '${doc.FileType}', '${doc.FileName}', ${doc.UserID || 0})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <a href="/api/documents/download/${doc.DocumentID}/user/${doc.UserID}" class="btn btn-sm btn-outline-dark me-1">
                            <i class="fas fa-download"></i>
                        </a>
                        <button class="btn btn-sm btn-success me-1" onclick="approveDoc(${doc.DocumentID})">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="rejectDoc(${doc.DocumentID})">
                            <i class="fas fa-times"></i>
                        </button>
                    </td>
                </tr>
                `;
            }).join('');
            emptyState.style.display = 'none';
        } else {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
        }
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading pending items</td></tr>';
    }
}

window.approveDoc = async function (docId) {
    const { value: formValues } = await Swal.fire({
        title: 'Approve Document',
        html:
            '<div style="text-align: left;">' +
            '<label class="form-label small text-muted">Feedback</label>' +
            '<textarea id="swal-feedback" class="form-control" placeholder="Feedback (Optional)" style="height: 150px;"></textarea>' +
            '<div class="mt-3"><label class="form-label small text-muted">Attach File (Optional)</label>' +
            '<input id="swal-file" type="file" class="form-control"></div>' +
            '</div>',
        showCancelButton: true,
        confirmButtonText: 'Approve',
        confirmButtonColor: '#28a745',
        focusConfirm: false,
        preConfirm: () => {
            return {
                feedback: document.getElementById('swal-feedback').value,
                file: document.getElementById('swal-file').files[0]
            }
        }
    });

    if (formValues) {
        try {
            const formData = new FormData();
            if (formValues.feedback) formData.append('feedback', formValues.feedback);
            if (formValues.file) formData.append('feedbackFile', formValues.file);

            const res = await fetch(`/api/documents/admin/approve/${docId}`, {
                method: 'PUT',
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                Swal.fire({ icon: 'success', title: 'Approved!', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                loadPendingDocuments();
            } else {
                Swal.fire('Error', data.error, 'error');
            }
        } catch (err) {
            Swal.fire('Error', 'Action failed', 'error');
        }
    }
};

window.rejectDoc = async function (docId) {
    const { value: formValues } = await Swal.fire({
        title: 'Reject Document',
        html:
            '<div style="text-align: left;">' +
            '<label class="form-label small text-muted">Reason</label>' +
            '<textarea id="swal-feedback" class="form-control" placeholder="Reason for Rejection (Required)" style="height: 150px;"></textarea>' +
            '<div class="mt-3"><label class="form-label small text-muted">Attach File (Optional)</label>' +
            '<input id="swal-file" type="file" class="form-control"></div>' +
            '</div>',
        showCancelButton: true,
        confirmButtonText: 'Reject',
        confirmButtonColor: '#dc3545',
        focusConfirm: false,
        preConfirm: () => {
            const feedback = document.getElementById('swal-feedback').value;
            const file = document.getElementById('swal-file').files[0];
            if (!feedback) {
                Swal.showValidationMessage('Reason is required for rejection');
            }
            return { feedback, file };
        }
    });

    if (formValues) {
        try {
            const formData = new FormData();
            formData.append('feedback', formValues.feedback);
            if (formValues.file) formData.append('feedbackFile', formValues.file);

            const res = await fetch(`/api/documents/admin/reject/${docId}`, {
                method: 'PUT',
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                Swal.fire({ icon: 'success', title: 'Rejected', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                loadPendingDocuments();
            } else {
                Swal.fire('Error', data.error, 'error');
            }
        } catch (err) {
            Swal.fire('Error', 'Action failed', 'error');
        }
    }
};

// --- PREVIEW FUNCTION ---
async function previewDoc(id, type, name, userId) {
    // If called from review tab, we might need a different download URL or permission logic
    // But currently download URL is /api/documents/download/:id/user/:userID
    // If admin is viewing, passing the document owner's userID is needed if check logic requires it.
    // The current previewDoc uses selectedUser.id, which might be null if we are in review tab!

    // Fix: Allow passing userId explicitly
    const targetUserId = userId || (selectedUser ? selectedUser.id : 0);

    const modal = document.getElementById('previewModal');
    const area = document.getElementById('previewArea');
    document.getElementById('previewTitle').innerText = name;

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);

    area.innerHTML = '<div class="d-flex flex-column align-items-center justify-content-center h-100"><div class="spinner-border text-primary mb-3"></div><div class="text-muted">Loading preview...</div></div>';

    const url = `/api/documents/download/${id}/user/${targetUserId}`;


    try {
        if (type === 'application/pdf') {
            const loadingTask = pdfjsLib.getDocument(url);
            const pdf = await loadingTask.promise;
            area.innerHTML = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.2 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                canvas.style.marginBottom = '1rem';
                canvas.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
                area.appendChild(canvas);
                await page.render({ canvasContext: context, viewport: viewport }).promise;
            }
        }
        else if (type.includes('wordprocessingml')) {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
            if (result.value) area.innerHTML = `<div class="bg-white p-5 shadow-sm w-100 text-dark" style="max-width:800px;">${result.value}</div>`;
            else throw new Error("Empty document");
        }
        else if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const html = XLSX.utils.sheet_to_html(worksheet, { id: "excelTable", editable: false });
            area.innerHTML = `<div class="bg-white p-3 overflow-auto w-100 text-dark">${html}</div>`;
            const table = area.querySelector('table');
            if (table) table.className = 'table table-bordered table-striped table-sm';
        }
        else if (type.startsWith('image/')) {
            area.innerHTML = `<img src="${url}" style="max-width:100%; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px;">`;
        }
        else if (type === 'text/plain') {
            const response = await fetch(url);
            const text = await response.text();
            area.innerHTML = `<pre class="bg-white p-4 w-100 border rounded" style="white-space: pre-wrap;">${text}</pre>`;
        }
        else if (type.includes('presentation') || type.includes('powerpoint')) {
            throw new Error("PPT_NOT_SUPPORTED");
        }
        else {
            throw new Error("FORMAT_NOT_SUPPORTED");
        }
    } catch (e) {
        console.error(e);
        let msg = "This file format cannot be viewed in the browser.";
        let title = "Preview Unavailable";

        if (e.message === "PPT_NOT_SUPPORTED") {
            title = "PowerPoint Preview";
            msg = "PowerPoint preview involves complex formatting not supported in the browser. Please download to view.";
        }

        area.innerHTML = `
            <div class="text-center p-5">
                <i class="fas fa-file-circle-xmark text-muted fa-3x mb-3"></i>
                <h4 class="text-dark">${title}</h4>
                <p class="text-muted mb-4">${msg}</p>
                <a href="${url}" class="btn btn-primary"><i class="fas fa-download me-2"></i>Download File</a>
            </div>`;
    }
}
