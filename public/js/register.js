// Password strength indicator
const passwordInput = document.getElementById('password');
const passwordStrength = document.getElementById('password-strength');
const profilePictureInput = document.getElementById('profile-picture');
const profilePreview = document.getElementById('profile-preview');

passwordInput.addEventListener('input', function () {
    const password = this.value;
    let strength = '';
    let strengthClass = '';

    if (password.length === 0) {
        strength = '';
    } else if (password.length < 6) {
        strength = 'Weak';
        strengthClass = 'strength-weak';
    } else if (password.length < 10) {
        strength = 'Medium';
        strengthClass = 'strength-medium';
    } else {
        strength = 'Strong';
        strengthClass = 'strength-strong';
    }

    passwordStrength.textContent = strength;
    passwordStrength.className = `password-strength ${strengthClass}`;
});

// Profile picture preview
profilePictureInput.addEventListener('input', function () {
    const url = this.value;
    if (url) {
        profilePreview.src = url;
        profilePreview.style.display = 'block';

        // Check if image loads successfully
        profilePreview.onerror = function () {
            profilePreview.style.display = 'none';
            showError('Failed to load profile picture from the provided URL');
        };

        profilePreview.onload = function () {
            // Clear any previous image loading errors
            const errorElement = document.getElementById('error-message');
            if (errorElement.textContent.includes('profile picture')) {
                errorElement.style.display = 'none';
            }
        };
    } else {
        profilePreview.style.display = 'none';
    }
});

// Form submission
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const profilePicture = document.getElementById('profile-picture').value;
    const registerButton = document.getElementById('register-button');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    // Hide messages
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    // Validation
    if (!username || !email || !password || !confirmPassword) {
        showError('Please fill in all required fields');
        return;
    }

    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }

    if (username.length < 3) {
        showError('Username must be at least 3 characters long');
        return;
    }

    // Show loading state
    registerButton.textContent = 'Creating Account...';
    registerButton.classList.add('loading');

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                email,
                password,
                profilePicture: profilePicture || undefined
            })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Account created successfully! Redirecting to login...');

            // Redirect to login page after short delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showError(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('Network error. Please try again.');
    } finally {
        // Reset button
        registerButton.textContent = 'Create Account';
        registerButton.classList.remove('loading');
    }
});

function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function showSuccess(message) {
    const successElement = document.getElementById('success-message');
    successElement.textContent = message;
    successElement.style.display = 'block';
}

// Check if user is already logged in
function checkExistingLogin() {
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = 'chat.html';
    }
}

// Check for existing login on page load
checkExistingLogin();
