// Check for Google Auth Redirect (query params)
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const googleUserData = urlParams.get('googleUserData');
const error = urlParams.get('error');

if (error) {
    showError("Authentication failed. " + (error === 'server_error' ? 'Server error occurred.' : 'Please try again.'));
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
} else if (token && googleUserData) {
    try {
        const userData = JSON.parse(decodeURIComponent(googleUserData));

        // Determine details key based on implementation consistency
        // The frontend generally expects 'memberDetails' or 'adminDetails'
        // But let's check what the UserType is
        const storageKey = userData.UserType === 'Admin' ? 'adminDetails' : 'memberDetails';

        localStorage.setItem(storageKey, JSON.stringify({
            memberID: userData.ID, // Map ID to memberID/adminID if needed, but existing code expects memberID/adminID
            adminID: userData.ID,  // Just set both or check type
            username: userData.Username,
            email: userData.Email,
            profilePicture: userData.ProfilePicture,
            role: userData.Role
        }));

        localStorage.setItem('token', token);

        showSuccess('Login successful! Redirecting...');
        setTimeout(() => {
            handleRedirect(userData.UserType, userData.Role);
        }, 1000);
    } catch (e) {
        console.error("Error parsing user data", e);
        showError("Login failed due to data error.");
    }
}

// Form submission
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginButton = document.getElementById('login-button');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    // Hide messages
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    // Validation
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }

    // Show loading state
    loginButton.textContent = 'Signing In...';
    loginButton.classList.add('loading');

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Login successful! Redirecting...');

            // Store user details in localStorage based on user type
            if (data.user.UserType === 'User') {
                localStorage.setItem('memberDetails', JSON.stringify({
                    memberID: data.user.ID,
                    username: data.user.Username,
                    email: data.user.Email,
                    profilePicture: data.user.ProfilePicture,
                    role: data.user.Role
                }));
            } else if (data.user.UserType === 'Admin') {
                localStorage.setItem('adminDetails', JSON.stringify({
                    adminID: data.user.ID,
                    username: data.user.Username,
                    email: data.user.Email,
                    profilePicture: data.user.ProfilePicture,
                    role: data.user.Role
                }));
            }

            // Store token
            localStorage.setItem('token', data.token);

            // Redirect based on role
            setTimeout(() => {
                handleRedirect(data.user.UserType, data.user.Role);
            }, 1000);
        } else {
            showError(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please try again.');
    } finally {
        // Reset button
        loginButton.textContent = 'Sign In';
        loginButton.classList.remove('loading');
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

// Helper function for redirection
function handleRedirect(userType, role) {
    if (userType === 'Admin') {
        window.location.href = 'admin-home.html';
    } else if (role === 'NGO') {
        window.location.href = 'ngo-dashboard.html';
    } else {
        window.location.href = 'user-dashboard.html';
    }
}

// Check if user is already logged in (only if not processing OAuth)
function checkExistingLogin() {
    if (token) return; // Don't check if we just logged in via Google

    const localToken = localStorage.getItem('token');
    if (localToken) {
        // Verify token is still valid
        fetch('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${localToken}`
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    handleRedirect(data.user.userType, data.user.Role);
                }
            })
            .catch(() => {
                // Token is invalid, clear storage
                localStorage.removeItem('token');
                localStorage.removeItem('memberDetails');
                localStorage.removeItem('adminDetails');
            });
    }
}

// Check for existing login on page load
checkExistingLogin();
