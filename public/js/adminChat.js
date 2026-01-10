const socket = io();

// State
let onlineUserIDs = [];
let currentConversationID = null;
let currentContact = null;
let contacts = [];
let currentUser = {};

// Initialization
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    const memberDetails = JSON.parse(localStorage.getItem("memberDetails"));
    const adminDetails = JSON.parse(localStorage.getItem("adminDetails"));

    if (!memberDetails && !adminDetails) {
        // Mock login for UI testing if no local storage
        console.warn("No user found, redirecting in prod...");
        window.location.href = "/login.html";
        return;
    }

    // Fallback for demo if no localstorage
    currentUser = memberDetails || adminDetails || { id: 1, type: 'User', name: 'Demo User' };

    // Normalize data
    if (memberDetails) {
        currentUser.id = memberDetails.memberID;
        currentUser.type = 'User';
        currentUser.name = memberDetails.username || 'User';
    } else if (adminDetails) {
        currentUser.id = adminDetails.adminID;
        currentUser.type = 'Admin';
        currentUser.name = adminDetails.name || 'Admin';
    }

    // Update Sidebar Profile
    document.getElementById('current-user-name').textContent = currentUser.name;
    document.getElementById('my-role-badge').textContent = currentUser.type;
    document.getElementById('my-avatar').textContent = currentUser.name.charAt(0).toUpperCase();

    // Socket Connection
    socket.emit("userOnline", { userID: currentUser.id, userType: currentUser.type });

    loadConversations();
}

function setupEventListeners() {
    document.getElementById('send-button').addEventListener('click', sendMessage);

    document.getElementById('message-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') sendMessage();
    });

    document.getElementById('search-contacts').addEventListener('input', function (e) {
        const term = e.target.value.toLowerCase();
        const filtered = contacts.filter(c => {
            const name = (c.Participant1ID == currentUser.id) ? c.Participant2Name : c.Participant1Name;
            return name && name.toLowerCase().includes(term);
        });
        renderContactsList(filtered);
    });

    document.getElementById('new-conversation-btn').addEventListener('click', openNewConversationModal);
    document.getElementById('startConversationBtn').addEventListener('click', startNewConversation);

    document.getElementById('logout-btn').addEventListener('click', function () {
        localStorage.clear();
        window.location.href = "/login.html";
    });

    document.getElementById('btnMobileBack')?.addEventListener('click', () => toggleMobileView(false));
    document.getElementById('btnDeleteConversation')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Feature coming soon');
    });
}

// --- View Logic (Mobile Responsive) ---
function toggleMobileView(showChat) {
    const sidebar = document.getElementById('sidebar');
    const chat = document.getElementById('chat-interface');

    if (showChat) {
        sidebar.classList.add('hidden');
        chat.classList.add('active');
    } else {
        sidebar.classList.remove('hidden');
        chat.classList.remove('active');
        currentConversationID = null; // Deselect

        // Remove active class from list
        document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    }
}

// --- Notification Logic ---
function showNotification(title, body) {
    const toastEl = document.getElementById('liveToast');
    document.getElementById('toast-sender').textContent = title;
    document.getElementById('toast-body').textContent = body;

    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

function updateGlobalUnreadCount() {
    let total = 0;
    contacts.forEach(c => total += (c.unreadCount || 0));
    document.getElementById('total-unread-count').textContent = total;

    if (total > 0) {
        document.title = `(${total}) Chat Dashboard`;
    } else {
        document.title = `Chat Dashboard`;
    }
}

// --- Data Loading & UI Rendering ---

async function loadConversations() {
    const listEl = document.getElementById('contacts-list');

    try {
        const response = await fetch(`/api/message/conversations/${currentUser.id}/${currentUser.type}`);
        const data = await response.json();

        if (data.success) {
            contacts = data.conversations;
            renderContactsList(contacts);
            updateGlobalUnreadCount();
        }
    } catch (error) {
        console.error("Load conversations error:", error);
        // Keep rendering empty list if fail, don't break UI
        if (contacts.length === 0) listEl.innerHTML = '<div class="text-center p-4 text-muted">No conversations found.</div>';
    }
}

function renderContactsList(data) {
    const listEl = document.getElementById('contacts-list');
    listEl.innerHTML = '';

    if (data.length === 0) {
        listEl.innerHTML = '<div class="text-center p-4 text-muted small">No conversations.<br>Click the pencil icon to start.</div>';
        return;
    }

    data.forEach(chat => {
        const isMeP1 = (chat.Participant1ID == currentUser.id && chat.Participant1Type == currentUser.type);
        const contactName = isMeP1 ? chat.Participant2Name : chat.Participant1Name;
        const contactID = isMeP1 ? chat.Participant2ID : chat.Participant1ID;
        const contactType = isMeP1 ? chat.Participant2Type : chat.Participant1Type;

        const userKey = `${contactID}-${contactType}`;
        const isOnline = onlineUserIDs.includes(userKey);

        const div = document.createElement('div');
        div.className = `contact-item ${currentConversationID === chat.ConversationID ? 'active' : ''}`;
        div.onclick = () => openConversation(chat.ConversationID, contactID, contactType, contactName, chat);

        // Styling for unread message
        const unreadBadge = chat.unreadCount > 0
            ? `<span class="unread-badge animate__animated animate__pulse">${chat.unreadCount}</span>`
            : '';

        const lastMsgStyle = chat.unreadCount > 0 ? 'fw-bold text-dark' : '';

        div.innerHTML = `
            <div class="avatar-container position-relative">
                <div class="avatar">${contactName ? contactName.charAt(0).toUpperCase() : '?'}</div>
                <div class="status-dot ${isOnline ? 'status-online' : 'status-offline'}"></div>
            </div>
            <div class="contact-content">
                <div class="contact-top">
                    <span class="contact-name">${contactName || 'Unknown'}</span>
                    <span class="contact-time">${formatTime(chat.lastMessageTimestamp)}</span>
                </div>
                <div class="contact-msg-preview">
                    <span class="${lastMsgStyle}">${chat.lastMessage || 'Start chatting...'}</span>
                    ${unreadBadge}
                </div>
            </div>
        `;
        listEl.appendChild(div);
    });
}

function openConversation(convID, contactID, contactType, contactName, chatObj) {
    currentConversationID = convID;
    currentContact = { id: contactID, type: contactType, name: contactName };

    // Mobile View Toggle
    toggleMobileView(true);

    // Update UI Headers
    document.getElementById('empty-chat').classList.add('d-none');
    document.getElementById('active-chat-interface').classList.remove('d-none');
    document.getElementById('active-chat-interface').classList.add('d-flex');

    document.getElementById('chat-contact-name').textContent = contactName || "Unknown";
    document.getElementById('header-avatar').textContent = contactName ? contactName.charAt(0).toUpperCase() : "?";

    // Optimistic update: Remove badge immediately
    if (chatObj) chatObj.unreadCount = 0;
    renderContactsList(contacts); // Re-render to clear badge
    updateGlobalUnreadCount();

    updateChatHeaderStatus();
    loadMessages(convID);
}

async function loadMessages(convID) {
    const msgContainer = document.getElementById('messages');
    msgContainer.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-primary" role="status"></div></div>';

    try {
        const res = await fetch(`/api/message/messages/${convID}`);
        const data = await res.json();

        msgContainer.innerHTML = '';

        if (data.messages && data.messages.length > 0) {
            let lastDate = null;

            data.messages.forEach(msg => {
                const isMe = (msg.senderID == currentUser.id && msg.senderType == currentUser.type);
                displayMessage(msg, isMe);
            });
            scrollToBottom();

            // Mark read in DB
            fetch('/api/message/mark-as-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationID: convID, userID: currentUser.id, userType: currentUser.type })
            });
        } else {
            msgContainer.innerHTML = '<div class="text-center mt-5 text-muted"><i class="far fa-paper-plane fa-3x mb-3 text-secondary opacity-50"></i><p>No messages yet.<br>Say hello!</p></div>';
        }
    } catch (err) {
        console.error(err);
        msgContainer.innerHTML = '<div class="text-danger text-center mt-5">Failed to load messages</div>';
    }
}

function displayMessage(msg, isMe) {
    const container = document.getElementById('messages');
    const div = document.createElement('div');

    div.className = `message ${isMe ? 'message-sent' : 'message-received'}`;

    const ticks = isMe
        ? `<span class="ms-1">${msg.isRead ? '<i class="fas fa-check-double text-info"></i>' : '<i class="fas fa-check"></i>'}</span>`
        : '';

    div.innerHTML = `
        <div>${msg.content}</div>
        <div class="message-meta">
            ${formatTime(msg.timestamp)}
            ${ticks}
        </div>
    `;
    container.appendChild(div);
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    if (!content || !currentConversationID) return;

    socket.emit("sendMessage", {
        conversationID: currentConversationID,
        senderID: currentUser.id,
        senderType: currentUser.type,
        content: content
    });

    input.value = '';
    input.focus();
}

function scrollToBottom() {
    const el = document.getElementById('messages');
    el.scrollTop = el.scrollHeight;
}

function updateChatHeaderStatus() {
    if (!currentContact) return;
    const userKey = `${currentContact.id}-${currentContact.type}`;
    const isOnline = onlineUserIDs.includes(userKey);

    const statusText = document.getElementById('chat-contact-status');
    const dot = document.getElementById('header-status-dot');

    if (isOnline) {
        statusText.classList.remove('d-none');
        dot.className = "status-dot status-online";
    } else {
        statusText.classList.add('d-none');
        dot.className = "status-dot status-offline";
    }
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// --- Modals ---
function openNewConversationModal() {
    const modal = new bootstrap.Modal(document.getElementById('newConversationModal'));
    modal.show();

    // Logic: Users see Admins, Admins see Users
    let targetType = currentUser.type === 'User' ? 'Admin' : 'User';
    document.getElementById('targetUserType').value = targetType;
    loadUsersForNewConversation(targetType);
}

async function loadUsersForNewConversation(userType) {
    const userSelect = document.getElementById('userSelect');
    userSelect.innerHTML = '<option value="">Loading...</option>';

    try {
        const response = await fetch(`/api/message/users/${userType}`);
        const data = await response.json();

        userSelect.innerHTML = '';

        if (data.success && data.users.length > 0) {
            const placeholder = document.createElement('option');
            placeholder.value = "";
            placeholder.textContent = "Select a person...";
            userSelect.appendChild(placeholder);

            data.users.forEach(user => {
                const option = document.createElement('option');
                const id = userType === 'User' ? user.UserID : user.AdminID;
                option.value = id;
                option.textContent = `${user.Username} ${user.IsOnline ? '(Online)' : ''}`;
                userSelect.appendChild(option);
            });
        } else {
            userSelect.innerHTML = '<option value="">No users available</option>';
        }
    } catch (error) {
        console.error('Error loading users:', error);
        userSelect.innerHTML = '<option value="">Error loading list</option>';
    }
}

async function startNewConversation() {
    const userSelect = document.getElementById('userSelect');
    const targetType = document.getElementById('targetUserType').value;
    const targetID = userSelect.value;

    if (!targetID) {
        alert("Please select a recipient.");
        return;
    }

    try {
        const response = await fetch('/api/message/conversations/get-or-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user1ID: currentUser.id,
                user1Type: currentUser.type,
                user2ID: parseInt(targetID),
                user2Type: targetType
            })
        });

        const data = await response.json();
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('newConversationModal')).hide();

            const c = data.conversation;
            // Mock data refresh
            await loadConversations();

            // Logic to open immediately
            const isMeP1 = (c.Participant1ID == currentUser.id && c.Participant1Type == currentUser.type);
            const contactID = isMeP1 ? c.Participant2ID : c.Participant1ID;
            const contactType = isMeP1 ? c.Participant2Type : c.Participant1Type;
            const contactName = isMeP1 ? c.Participant2Name : c.Participant1Name;

            openConversation(c.ConversationID, contactID, contactType, contactName);
        }
    } catch (err) {
        console.error(err);
        alert("Failed to start conversation.");
    }
}

// --- Socket Events ---
socket.on("updateOnlineUsers", (ids) => {
    onlineUserIDs = ids;
    if (contacts.length > 0) renderContactsList(contacts);
    updateChatHeaderStatus();
});

socket.on("receiveMessage", (msg) => {
    // 1. If chat is open, append message
    if (msg.conversationID === currentConversationID) {
        const isMe = (msg.senderID == currentUser.id && msg.senderType == currentUser.type);
        displayMessage(msg, isMe);
        scrollToBottom();

        // Immediately mark as read since we are looking at it
        fetch('/api/message/mark-as-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationID: currentConversationID, userID: currentUser.id, userType: currentUser.type })
        });

    } else {
        // 2. If chat is NOT open, show Notification
        // Check if the message is from me (ignore) or them (notify)
        const isMe = (msg.senderID == currentUser.id && msg.senderType == currentUser.type);

        if (!isMe) {
            // Show Banner Pop-out
            // Try to find sender name from contacts list logic or payload
            // In a real app, the msg payload should carry senderName, or we look it up in `contacts`
            let senderName = "New Message";
            const existingChat = contacts.find(c => c.ConversationID === msg.conversationID);
            if (existingChat) {
                const isMeP1 = (existingChat.Participant1ID == currentUser.id);
                senderName = isMeP1 ? existingChat.Participant2Name : existingChat.Participant1Name;
            }

            showNotification(senderName, msg.content);
        }
    }
    // Refresh sidebar to update order and unread counts
    loadConversations();
});

socket.on("newConversation", () => {
    loadConversations();
});