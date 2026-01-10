let currentResetTarget = null;
const resetModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));

document.addEventListener('DOMContentLoaded', () => {
    fetchProfile();
    fetchUsers();
    setupEventListeners();
});

function setupEventListeners() {
    // Static
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });

    // Profile Picture Upload Handler
    document.getElementById('profilePictureInput')?.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                showStatus('Image must be less than 2MB', 'danger');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                const preview = document.getElementById('avatarPreview');
                preview.innerHTML = `<img src="${event.target.result}" alt="Avatar">`;
                updateProfilePicture(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    // Buttons
    document.getElementById('btnGeneratePassword')?.addEventListener('click', generatePassword);
    document.getElementById('btnConfirmReset')?.addEventListener('click', confirmResetPassword);

    // Filter Tabs
    document.querySelectorAll('.role-tab-item').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.role-tab-item').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const role = tab.getAttribute('data-role');
            if (role === 'all') {
                renderUsers(allUsers);
            } else {
                renderUsers(allUsers.filter(u => u.Role === role));
            }
        });
    });

    // Forms
    document.getElementById('profileForm')?.addEventListener('submit', handleProfileUpdate);
    document.getElementById('registerNgoForm')?.addEventListener('submit', handleNgoRegistration);

    // Delegation: User Table (Reset Button)
    document.getElementById('userTableBody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && btn.dataset.action === 'reset-password') {
            openResetModal(parseInt(btn.dataset.id), btn.dataset.type, btn.dataset.username);
        }
    });
}

// ... Rest of the logic ...

async function updateProfilePicture(base64Image) {
    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ profilePicture: base64Image })
        });
        const data = await response.json();
        if (data.success) {
            showStatus('Profile picture updated!', 'success');
            // Update LocalStorage
            const user = JSON.parse(localStorage.getItem('adminDetails') || '{}');
            user.ProfilePicture = base64Image;
            localStorage.setItem('adminDetails', JSON.stringify(user));
        } else {
            showStatus(data.message, 'danger');
        }
    } catch (error) {
        showStatus('Error updating profile picture', 'danger');
    }
}

async function fetchProfile() {
    try {
        const response = await fetch('/api/auth/profile', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
            document.getElementById('adminUsername').value = data.user.Username;
            document.getElementById('adminEmail').value = data.user.Email;

            if (data.user.ProfilePicture) {
                document.getElementById('avatarPreview').innerHTML = `<img src="${data.user.ProfilePicture}" alt="Avatar">`;
            }
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
    }
}

let allUsers = [];

async function fetchUsers() {
    try {
        const response = await fetch('/api/auth/users', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
            allUsers = data.users;
            renderUsers(allUsers);
        }
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No users found.</td></tr>';
        return;
    }

    users.forEach(user => {
        const initialIcon = `<i class="fas ${user.Role === 'NGO' ? 'fa-building' : 'fa-user'} text-muted"></i>`;
        let avatarHtml = initialIcon;

        if (user.ProfilePicture) {
            avatarHtml = `<img src="${user.ProfilePicture}" alt="${user.Username}" 
                style="width: 100%; height: 100%; object-fit: cover;"
                onerror="this.style.display='none'; this.parentNode.innerHTML='${initialIcon.replace(/"/g, "&quot;")}';">`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="avatar-sm bg-light rounded-circle p-2 me-3 d-flex align-items-center justify-content-center overflow-hidden" 
                            style="width: 40px; height: 40px;">
                        ${avatarHtml}
                    </div>
                    <span class="fw-bold">${user.Username}</span>
                </div>
            </td>
            <td>${user.Email}</td>
            <td><span class="role-badge role-${user.Role.toLowerCase()}">${user.Role}</span></td>
            <td class="text-muted small">${new Date(user.CreatedAt).toLocaleDateString()}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-danger" data-action="reset-password" data-id="${user.ID}" data-type="${user.UserType}" data-username="${user.Username}">
                    <i class="fas fa-key me-1"></i> Reset
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const payload = {
        username: document.getElementById('adminUsername').value,
        email: document.getElementById('adminEmail').value
    };
    const password = document.getElementById('adminPassword').value;
    if (password) payload.password = password;

    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.success) {
            showStatus('Profile updated successfully!', 'success');
            document.getElementById('adminPassword').value = '';
        } else {
            showStatus(data.message, 'danger');
        }
    } catch (error) {
        showStatus('Error updating profile', 'danger');
    }
}

async function handleNgoRegistration(e) {
    e.preventDefault();
    const payload = {
        username: document.getElementById('ngoUsername').value,
        email: document.getElementById('ngoEmail').value,
        password: document.getElementById('ngoPassword').value
    };

    try {
        const response = await fetch('/api/auth/register-ngo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.success) {
            showStatus('NGO account created and email sent!', 'success');
            document.getElementById('registerNgoForm').reset();
            fetchUsers();
        } else {
            showStatus(data.message, 'danger');
        }
    } catch (error) {
        showStatus('Error creating NGO account', 'danger');
    }
}

function openResetModal(id, type, name) {
    currentResetTarget = { id, type, name };
    document.getElementById('resetTargetName').textContent = name;
    document.getElementById('newPasswordInput').value = Math.random().toString(36).slice(-10);
    resetModal.show();
}

async function confirmResetPassword() {
    const newPassword = document.getElementById('newPasswordInput').value;
    try {
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                userId: currentResetTarget.id,
                userType: currentResetTarget.type,
                newPassword: newPassword
            })
        });
        const data = await response.json();
        if (data.success) {
            showStatus(data.message, 'success');
            resetModal.hide();
        } else {
            showStatus(data.message, 'danger');
        }
    } catch (error) {
        showStatus('Error resetting password', 'danger');
    }
}

function generatePassword() {
    document.getElementById('ngoPassword').value = Math.random().toString(36).slice(-12);
}

function showStatus(msg, type) {
    const el = document.getElementById('statusMessage');
    el.textContent = msg;
    el.className = `alert alert-${type} shadow-sm`;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 4000);
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}
