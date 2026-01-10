const TOKEN = localStorage.getItem('token');

// Redirect if not logged in
if (!TOKEN) {
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadSidebar();

    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });
});

function loadSidebar() {
    const member = JSON.parse(localStorage.getItem("memberDetails"));
    const admin = JSON.parse(localStorage.getItem("adminDetails"));

    // Only proceed if not admin (Admin profile separate) or handle generally
    const role = member ? (member.role === 'NGO' ? 'NGO' : 'User') : (admin ? 'Admin' : null);

    const dashLinks = document.getElementById('dashLinks');

    if (role === 'Admin') {
        // Admin links (if shared profile page, otherwise ignore)
        dashLinks.innerHTML = `
            <a href="admin-home.html" class="nav-link"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
            <a href="admin-profile.html" class="nav-link active"><i class="fas fa-user-circle"></i> Profile</a>
        `;
    } else if (role === 'NGO') {
        dashLinks.innerHTML = `
            <a href="ngo-dashboard.html" class="nav-link"><i class="fas fa-chart-pie"></i> Dashboard</a>
            <a href="ngo-doc.html" class="nav-link"><i class="fas fa-folder-open"></i> Documents</a>
            <a href="chat.html" class="nav-link"><i class="fas fa-comments"></i> Partner Chat</a>
            <a href="booking-Consultation.html" class="nav-link"><i class="fas fa-calendar-check"></i> Book Consultation</a>
            <a href="my-meetings.html" class="nav-link"><i class="fas fa-video"></i> My Meetings</a>
            <a href="profile.html" class="nav-link active"><i class="fas fa-user-circle"></i> Profile</a>
        `;
    } else {
        // Standard User
        dashLinks.innerHTML = `
            <a href="user-dashboard.html" class="nav-link"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
            <a href="chat.html" class="nav-link"><i class="fas fa-comments"></i> Chat</a>
            <a href="user-printadobe.html" class="nav-link"><i class="fas fa-graduation-cap"></i> Printadobe</a>
            <a href="user-credentials.html" class="nav-link"><i class="fas fa-certificate"></i> Credentials</a>
            <a href="profile.html" class="nav-link active"><i class="fas fa-user-circle"></i> Profile</a>
        `;
    }
}

// Profile Picture Preview
document.getElementById('profilePictureInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire('Error', 'Image must be less than 2MB', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const preview = document.getElementById('avatarPreview');
            preview.innerHTML = `<img src="${event.target.result}" alt="Avatar">`;

            // Auto-save profile picture
            updateProfilePicture(event.target.result);
        };
        reader.readAsDataURL(file);
    }
});

async function loadProfile() {
    try {
        const res = await fetch('/api/auth/profile', {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const data = await res.json();

        if (data.success) {
            document.getElementById('usernameInput').value = data.user.Username || '';
            document.getElementById('emailInput').value = data.user.Email || '';

            if (data.user.ProfilePicture) {
                document.getElementById('avatarPreview').innerHTML =
                    `<img src="${data.user.ProfilePicture}" alt="Avatar" 
                     onerror="this.style.display='none'; this.parentNode.innerHTML='<i class=\\'fas fa-user\\' ></i>';">`;
            }
        }
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

async function updateProfilePicture(base64Image) {
    try {
        const res = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ profilePicture: base64Image })
        });

        const data = await res.json();
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Picture Updated',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
            // Update localStorage
            const user = JSON.parse(localStorage.getItem('memberDetails') || '{}');
            user.ProfilePicture = base64Image;
            localStorage.setItem('memberDetails', JSON.stringify(user));
        } else {
            throw new Error(data.message);
        }
    } catch (err) {
        Swal.fire('Error', err.message || 'Failed to update picture', 'error');
    }
}

// Account Info Form
document.getElementById('accountForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        username: document.getElementById('usernameInput').value,
        email: document.getElementById('emailInput').value
    };

    try {
        const res = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            Swal.fire('Success', 'Account information updated!', 'success');
        } else {
            throw new Error(data.message);
        }
    } catch (err) {
        Swal.fire('Error', err.message || 'Update failed', 'error');
    }
});

// Password Form
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('newPasswordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;

    if (newPassword !== confirmPassword) {
        Swal.fire('Error', 'Passwords do not match', 'error');
        return;
    }

    if (newPassword.length < 6) {
        Swal.fire('Error', 'Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const res = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ password: newPassword })
        });

        const data = await res.json();
        if (data.success) {
            Swal.fire('Success', 'Password updated successfully!', 'success');
            document.getElementById('passwordForm').reset();
        } else {
            throw new Error(data.message);
        }
    } catch (err) {
        Swal.fire('Error', err.message || 'Password update failed', 'error');
    }
});

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
