const socket = io("http://localhost:8000");
let currentChatUser = null;

const usersList = document.getElementById('usersList');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const currentChatUserElement = document.getElementById('currentChatUser');
const connectionStatus = document.getElementById('connectionStatus');

sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Admin joins immediately
socket.emit('admin-join');

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !currentChatUser) return;

    const messageData = {
        senderId: 'admin',
        receiverId: currentChatUser,
        message: message
    };

    socket.emit('send-message', messageData);
    messageInput.value = '';
}

function selectUser(userId) {
    currentChatUser = userId;
    currentChatUserElement.textContent = `Chat with: ${userId}`;
    
    // Remove active class from all users
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to selected user
    const selectedUser = document.querySelector(`[data-user-id="${userId}"]`);
    if (selectedUser) {
        selectedUser.classList.add('active');
    }

    // Load chat history
    socket.emit('load-chat', { userId: userId });
    
    messageInput.disabled = false;
    sendButton.disabled = false;
    messageInput.focus();
}

function displayMessage(messageData) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${messageData.sender_id === 'admin' ? 'sent' : 'received'}`;
    
    const time = new Date(messageData.timestamp).toLocaleTimeString();
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="message-text">${messageData.message}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addUserToList(userId, isOnline = true) {
    // Check if user already exists in list
    if (document.querySelector(`[data-user-id="${userId}"]`)) {
        updateUserStatus(userId, isOnline);
        return;
    }

    const userItem = document.createElement('button');
    userItem.className = `list-group-item list-group-item-action user-item ${isOnline ? 'user-online' : 'user-offline'}`;
    userItem.setAttribute('data-user-id', userId);
    userItem.innerHTML = `
        ${userId}
        <span class="badge ${isOnline ? 'bg-success' : 'bg-secondary'} float-end">${isOnline ? 'Online' : 'Offline'}</span>
    `;
    
    userItem.addEventListener('click', () => selectUser(userId));
    usersList.appendChild(userItem);
}

function updateUserStatus(userId, isOnline) {
    const userItem = document.querySelector(`[data-user-id="${userId}"]`);
    if (userItem) {
        const badge = userItem.querySelector('.badge');
        userItem.className = `list-group-item list-group-item-action user-item ${isOnline ? 'user-online' : 'user-offline'}`;
        badge.className = `badge ${isOnline ? 'bg-success' : 'bg-secondary'} float-end`;
        badge.textContent = isOnline ? 'Online' : 'Offline';
    }
}

// Socket event listeners
socket.on('online-users', (users) => {
    usersList.innerHTML = '';
    users.forEach(userId => {
        addUserToList(userId, true);
    });
});

socket.on('receive-message', (messageData) => {
    // Only display if it's from the current chat user or if no user is selected
    if (!currentChatUser || messageData.sender_id === currentChatUser || messageData.receiver_id === currentChatUser) {
        displayMessage(messageData);
    }
});

socket.on('chat-history', (messages) => {
    chatMessages.innerHTML = '';
    messages.forEach(message => {
        displayMessage(message);
    });
});

socket.on('user-online', (userId) => {
    addUserToList(userId, true);
});

socket.on('user-offline', (userId) => {
    updateUserStatus(userId, false);
});

socket.on('error', (error) => {
    alert('Error: ' + error);
});

socket.on('connect', () => {
    connectionStatus.textContent = 'Connected';
    connectionStatus.className = 'badge bg-success';
});

socket.on('disconnect', () => {
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.className = 'badge bg-danger';
});

// Load existing users on page load
fetch('/api/users')
    .then(response => response.json())
    .then(users => {
        users.forEach(user => {
            addUserToList(user.user_id, false);
        });
    });