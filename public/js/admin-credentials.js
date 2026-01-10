let allRecords = [];
let availableGroups = [];

document.addEventListener('DOMContentLoaded', () => {
    const admin = JSON.parse(localStorage.getItem('adminDetails'));
    // if (!admin) { window.location.href = 'login.html'; return; } // Uncomment for auth

    loadDashboardData();
    loadCertifierGroups();
    setupEventListeners();
});

function setupEventListeners() {
    // Static
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });
    document.getElementById('btnConfirmIssue')?.addEventListener('click', confirmIssuePrompt);

    // Delegation: Credential Table (Issue Button & Thumbnail)
    document.getElementById('credentialTable')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        const img = e.target.closest('.cert-thumb');

        if (btn && btn.classList.contains('btn-issue')) {
            openIssueModal(btn.dataset.uid, btn.dataset.pid, btn.dataset.name, btn.dataset.email);
        }

        if (img) {
            window.open(img.dataset.url, '_blank');
        }
    });
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

async function loadDashboardData() {
    try {
        const res = await fetch('/api/credentials/dashboard');
        if (!res.ok) throw new Error('Failed to fetch dashboard data');
        allRecords = await res.json();
        renderTable();
    } catch (error) {
        console.error("Dashboard Load Error:", error);
        document.getElementById('credentialTable').innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error loading data.</td></tr>`;
    }
}

async function loadCertifierGroups() {
    try {
        const res = await fetch('/api/credentials/groups');
        if (!res.ok) throw new Error('Failed to fetch groups');
        availableGroups = await res.json();
        populateGroupDropdown();
    } catch (error) {
        console.error("Groups Error:", error);
        document.getElementById('modalGroupId').innerHTML = '<option disabled>Error loading groups</option>';
    }
}

function populateGroupDropdown() {
    const select = document.getElementById('modalGroupId');
    select.innerHTML = '<option value="" disabled selected>Select a Group</option>';

    if (availableGroups.length === 0) {
        select.innerHTML += '<option disabled>No groups found</option>';
        return;
    }

    availableGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        select.appendChild(option);
    });
}

function renderTable() {
    const tbody = document.getElementById('credentialTable');
    if (!allRecords || allRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No completed programs found.</td></tr>';
        return;
    }

    tbody.innerHTML = allRecords.map(r => {
        const isIssued = (r.CredentialID != null);

        // Status Badge
        const statusBadge = isIssued
            ? `<span class="status-issued"><i class="fas fa-check-circle me-1"></i>Issued</span>`
            : `<span class="status-pending"><i class="fas fa-hourglass-half me-1"></i>Pending</span>`;

        // Thumbnail Logic (Uses ImageURL if available)
        const thumb = (isIssued && r.ImageURL)
            ? `<img src="${r.ImageURL}" class="cert-thumb" data-url="${r.PublicURL}" style="cursor:pointer;" alt="Cert">`
            : `<span class="text-muted small">-</span>`;

        // Date Logic
        const dateDisplay = isIssued
            ? new Date(r.IssuedAt || Date.now()).toLocaleDateString()
            : `<span class="text-muted small">Not Issued</span>`;

        // Action Buttons
        let actionBtn = '';
        if (isIssued) {
            actionBtn = `<a href="${r.PublicURL}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="fas fa-link"></i></a>`;
            if (r.PdfURL) {
                actionBtn += ` <a href="${r.PdfURL}" target="_blank" class="btn btn-sm btn-outline-secondary ms-1"><i class="fas fa-file-pdf"></i></a>`;
            }
        } else {
            actionBtn = `<button class="btn btn-sm btn-dark btn-issue" data-uid="${r.UserID}" data-pid="${r.ProgramID}" data-name="${r.Username}" data-email="${r.Email}"><i class="fas fa-medal me-1"></i>Issue</button>`;
        }

        return `
            <tr>
                <td>
                    <div class="fw-bold">${r.Username}</div>
                    <div class="small text-muted">${r.Email}</div>
                </td>
                <td>${r.ProgramTitle}</td>
                <td>${thumb}</td>
                <td>${dateDisplay}</td>
                <td>${statusBadge}</td>
                <td>${actionBtn}</td>
            </tr>
        `;
    }).join('');
}

const modal = new bootstrap.Modal(document.getElementById('issueModal'));

function openIssueModal(uid, pid, name, email) {
    document.getElementById('modalUserId').value = uid;
    document.getElementById('modalProgramId').value = pid;
    document.getElementById('modalUserName').value = name;
    document.getElementById('modalUserEmail').value = email;
    document.getElementById('modalGroupId').value = "";
    modal.show();
}

function confirmIssuePrompt() {
    const groupId = document.getElementById('modalGroupId').value;
    const userName = document.getElementById('modalUserName').value;

    if (!groupId) {
        Swal.fire('Error', 'Please select a Group.', 'warning');
        return;
    }

    const selectedGroup = availableGroups.find(g => g.id === groupId);
    const groupName = selectedGroup ? selectedGroup.name : 'Selected Group';

    Swal.fire({
        title: 'Confirm Issuance',
        html: `Issue <b>${groupName}</b> to <b>${userName}</b>? <br><small class="text-muted">This will generate the image and email the user.</small>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Issue it!',
        confirmButtonColor: '#198754'
    }).then((result) => {
        if (result.isConfirmed) performIssue(groupId);
    });
}

async function performIssue(groupId) {
    const payload = {
        userID: document.getElementById('modalUserId').value,
        programID: document.getElementById('modalProgramId').value,
        recipientName: document.getElementById('modalUserName').value,
        recipientEmail: document.getElementById('modalUserEmail').value,
        groupID: groupId
    };

    modal.hide();
    Swal.fire({
        title: 'Issuing...',
        text: 'Generating certificate via Certifier.io',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const res = await fetch('/api/credentials/issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok) {
            Swal.fire('Success!', 'Credential issued successfully.', 'success');
            loadDashboardData(); // Refresh table to show the new image
        } else {
            Swal.fire('Error', result.message || 'Failed to issue', 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Network connection failed', 'error');
    }
}
