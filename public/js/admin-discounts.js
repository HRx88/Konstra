document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Load Data
    await loadPrograms();
    await loadDiscounts();

    // Setup Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    // Form Submit
    document.getElementById('createDiscountForm').addEventListener('submit', createDiscount);
});

async function loadDiscounts() {
    const tbody = document.getElementById('discountTableBody');
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/discounts', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch discounts');

        const data = await response.json();
        const discounts = data.discounts;

        if (discounts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted">No discount codes found.</td></tr>';
            return;
        }

        // Get program name helper
        const getProgramName = (programId) => {
            if (!programId) return null;
            const select = document.getElementById('dProgram');
            const option = select?.querySelector(`option[value="${programId}"]`);
            return option ? option.textContent : `Program #${programId}`;
        };

        tbody.innerHTML = discounts.map(d => {
            const programName = getProgramName(d.ProgramID);
            const programNameEscaped = programName ? programName.replace(/'/g, "\\'") : '';
            return `
            <tr>
                <td class="ps-4 fw-bold text-primary">${d.Code}</td>
                <td>
                    <span class="badge ${d.DiscountType === 'Percentage' ? 'bg-info' : 'bg-success'}">
                        ${d.DiscountType === 'Percentage' ? d.Value + '%' : '$' + d.Value} OFF
                    </span>
                </td>
                <td>${d.CurrentUses} / ${d.MaxUses || '∞'}</td>
                <td>${d.ProgramID ? `<span class="badge bg-secondary">${programName}</span>` : '<span class="badge bg-dark">Global</span>'}</td>
                <td>${d.ExpiryDate ? new Date(d.ExpiryDate).toLocaleDateString() : 'Never'}</td>
                <td>
                    <span class="badge ${d.IsActive ? 'bg-success' : 'bg-danger'}">
                        ${d.IsActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td class="text-end pe-4">
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-secondary" onclick="copyCode('${d.Code}')" title="Copy Code">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="shareViaAnnouncement('${d.Code}', '${d.DiscountType}', ${d.Value}, '${programNameEscaped}', ${d.CurrentUses}, ${d.MaxUses || 'null'})" title="Post as Announcement">
                            <i class="fas fa-bullhorn"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info" onclick="emailToUsers('${d.Code}', '${d.DiscountType}', ${d.Value}, '${programNameEscaped}')" title="Email to Users">
                            <i class="fas fa-envelope"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteDiscount(${d.CodeID}, '${d.Code}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-danger">Error loading data</td></tr>';
    }
}

async function loadPrograms() {
    const select = document.getElementById('dProgram');
    try {
        const response = await fetch('/api/programs'); // Helper to list programs? 
        // Admin likely needs a specific list, but public endpoint usually works for title/id
        // If not, we might need an admin endpoint. Let's try standard public one.
        const programs = await response.json();

        programs.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.ProgramID;
            opt.innerText = p.Title;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Error loading programs for select', e);
    }
}

async function createDiscount(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Creating...';

    const data = {
        code: document.getElementById('dCode').value.toUpperCase(),
        type: document.getElementById('dType').value,
        value: document.getElementById('dValue').value,
        programId: document.getElementById('dProgram').value || null,
        maxUses: document.getElementById('dMaxUses').value || null,
        expiry: document.getElementById('dExpiry').value || null
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/discounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Created!',
                text: 'Discount code activated.',
                timer: 1500,
                showConfirmButton: false
            });

            // Close modal & Refresh
            const modalEl = document.getElementById('createDiscountModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            document.getElementById('createDiscountForm').reset();
            loadDiscounts();
        } else {
            throw new Error(result.message);
        }

    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message
        });
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

window.deleteDiscount = async (id, code) => {
    const result = await Swal.fire({
        title: 'Delete Code?',
        text: `Are you sure you want to delete "${code}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d32f2f',
        confirmButtonText: 'Yes, delete it'
    });

    if (result.isConfirmed) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/discounts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                Swal.fire('Deleted!', 'Code has been removed.', 'success');
                loadDiscounts();
            } else {
                throw new Error('Failed to delete');
            }
        } catch (e) {
            Swal.fire('Error', 'Could not delete code', 'error');
        }
    }
};

// === NEW SHARING FUNCTIONS ===

// 1. Copy Code to Clipboard
window.copyCode = async (code) => {
    try {
        await navigator.clipboard.writeText(code);
        Swal.fire({
            icon: 'success',
            title: 'Copied!',
            text: `"${code}" copied to clipboard.`,
            timer: 1500,
            showConfirmButton: false
        });
    } catch (e) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        Swal.fire({
            icon: 'success',
            title: 'Copied!',
            text: `"${code}" copied to clipboard.`,
            timer: 1500,
            showConfirmButton: false
        });
    }
};

// 2. Share via Announcement
window.shareViaAnnouncement = async (code, type, value, programName = '', currentUses = 0, maxUses = null) => {
    const discountText = type === 'Percentage' ? `${value}% OFF` : `$${value} OFF`;
    const programInfo = programName ? ` on ${programName}` : '';
    const usageInfo = maxUses ? `\n\n📊 Usage: ${currentUses}/${maxUses} used` : '';
    const remainingInfo = maxUses ? ` (${maxUses - currentUses} remaining!)` : '';

    const { value: formValues } = await Swal.fire({
        title: 'Post Discount as Announcement',
        width: '600px',
        html: `
            <div class="mb-3 text-start">
                <label class="form-label small text-muted fw-bold" for="swal-title">TITLE</label>
                <input type="text" id="swal-title" class="form-control" value="🎉 Special Offer: ${discountText}${programInfo}!">
            </div>
            <div class="mb-3 text-start">
                <label class="form-label small text-muted fw-bold" for="swal-content">MESSAGE</label>
                <textarea id="swal-content" class="form-control" rows="4">Use code "${code}" at checkout to get ${discountText}${programInfo}!${remainingInfo}${usageInfo}\n\nLimited time only. Grab it now!</textarea>
            </div>
            <div class="text-start">
                <label class="form-label small text-muted fw-bold" for="swal-priority">PRIORITY</label>
                <select id="swal-priority" class="form-select">
                    <option value="Normal">Normal</option>
                    <option value="Important" selected>Important</option>
                    <option value="Urgent">Urgent</option>
                </select>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Post Announcement',
        focusConfirm: false,
        preConfirm: () => {
            return {
                title: document.getElementById('swal-title').value,
                content: document.getElementById('swal-content').value,
                priority: document.getElementById('swal-priority').value
            };
        }
    });

    if (formValues) {
        try {
            const token = localStorage.getItem('token');
            // Get admin ID from adminDetails (like admin-home.js does)
            const adminDetails = JSON.parse(localStorage.getItem('adminDetails') || '{}');
            const createdBy = adminDetails.adminID || adminDetails.AdminID || 1;

            const response = await fetch('/api/announcements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ...formValues, createdBy })
            });

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Posted!',
                    text: 'Announcement has been published to all users.',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to post');
            }
        } catch (e) {
            Swal.fire('Error', e.message || 'Could not post announcement', 'error');
        }
    }
};

// 3. Email to Users
window.emailToUsers = async (code, type, value, programName = '') => {
    const discountText = type === 'Percentage' ? `${value}% OFF` : `$${value} OFF`;
    const programInfo = programName ? `\nApplicable for: ${programName}` : '\nApplicable for: All Programs';

    const { value: formValues } = await Swal.fire({
        title: 'Email Discount to Users',
        width: '600px',
        html: `
            <div class="mb-3 text-start">
                <label class="form-label small text-muted fw-bold" for="swal-subject">SUBJECT</label>
                <input type="text" id="swal-subject" class="form-control" value="🎁 Exclusive Offer: ${discountText}${programName ? ' on ' + programName : ''}!">
            </div>
            <div class="mb-3 text-start">
                <label class="form-label small text-muted fw-bold" for="swal-body">MESSAGE</label>
                <textarea id="swal-body" class="form-control" rows="6">Hi there!

We're excited to offer you an exclusive discount!

Use code: ${code}
Discount: ${discountText}${programInfo}

Apply this code at checkout to save on your next purchase.

Best regards,
The Konstra Team</textarea>
            </div>
            <div class="alert alert-info small text-start mb-0">
                <i class="fas fa-info-circle me-1"></i> This will send an email to all registered <strong>Users</strong>.
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Send Emails',
        confirmButtonColor: '#17a2b8',
        focusConfirm: false,
        preConfirm: () => {
            return {
                subject: document.getElementById('swal-subject').value,
                body: document.getElementById('swal-body').value,
                discountCode: code
            };
        }
    });

    if (formValues) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/discounts/email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formValues)
            });

            const result = await response.json();

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Emails Sent!',
                    text: `Discount code emailed to ${result.count || 'all'} users.`,
                    timer: 2500,
                    showConfirmButton: false
                });
            } else {
                throw new Error(result.message || 'Failed to send');
            }
        } catch (e) {
            Swal.fire('Error', e.message || 'Could not send emails', 'error');
        }
    }
};
