const socket = io();

// State
let onlineUserIDs = [];
let currentConversationID = null;
let currentContact = null;
let contacts = [];
let currentUser = {};

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // [Same Auth Logic as before]
    const memberDetails = JSON.parse(localStorage.getItem("memberDetails"));
    const adminDetails = JSON.parse(localStorage.getItem("adminDetails"));

    if (!memberDetails && !adminDetails) {
        window.location.href = "/login";
        return;
    }

    currentUser = memberDetails || adminDetails;
    currentUser.type = memberDetails ? 'User' : 'Admin'; 
    currentUser.id = memberDetails ? memberDetails.memberID : adminDetails.adminID;
    currentUser.name = currentUser.username || currentUser.name || 'Me';

    document.getElementById('current-user-name').textContent = currentUser.name;
    document.getElementById('my-role-badge').textContent = currentUser.type;
    document.getElementById('my-avatar').textContent = currentUser.name.charAt(0).toUpperCase();

    socket.emit("userOnline", { userID: currentUser.id, userType: currentUser.type });

    loadConversations();
}

function setupEventListeners() {
    document.getElementById('send-button').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Search Filter
    document.getElementById('search-contacts').addEventListener('input', function(e) {
        // Simple client-side filter
        const term = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.contact-item');
        items.forEach(item => {
            const name = item.querySelector('.contact-name').textContent.toLowerCase();
            item.style.display = name.includes(term) ? 'flex' : 'none';
        });
    });

    document.getElementById('new-conversation-btn').addEventListener('click', openNewConversationModal);
    document.getElementById('startConversationBtn').addEventListener('click', startNewConversation);
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = "/login";
    });

    // Mobile Back Button
    document.getElementById('back-btn').addEventListener('click', () => {
        document.body.classList.remove('show-chat'); // Return to sidebar on mobile
        currentConversationID = null; // Optional: clear active selection visually
        // Remove active class from list
        document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    });
}

// --- NOTIFICATION SYSTEM (TOAST) ---
function showNotification(name, message) {
    const container = document.getElementById('notification-area');
    const toastId = 'toast-' + Date.now();
    
    const html = `
        <div id="${toastId}" class="toast align-items-center text-bg-primary border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <strong>${name}</strong>: ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    container.appendChild(wrapper.firstElementChild);
    
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
    
    // Remove from DOM after hidden
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

// --- DATA LOGIC ---

async function loadConversations() {
    try {
        const response = await fetch(`/api/message/conversations/${currentUser.id}/${currentUser.type}`);
        const data = await response.json();
        if (data.success) {
            contacts = data.conversations;
            renderContactsList(contacts);
        }
    } catch (error) {
        console.error("Load conversations error:", error);
    }
}

function renderContactsList(data) {
    const listEl = document.getElementById('contacts-list');
    listEl.innerHTML = '';

    if (data.length === 0) {
        listEl.innerHTML = '<div class="text-center p-4 text-muted">No chats.<br>Start one +</div>';
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
        
        // Click Handler
        div.onclick = () => {
            // Remove unread badge immediately from UI
            chat.unreadCount = 0; 
            renderContactsList(contacts); // Re-render to clear badge
            openConversation(chat.ConversationID, contactID, contactType, contactName);
        };

        div.innerHTML = `
            <div class="position-relative">
                <div class="user-avatar-sm">${contactName ? contactName.charAt(0).toUpperCase() : '?'}</div>
                <div class="status-dot ${isOnline ? 'online' : 'offline'}"></div>
            </div>
            <div class="ms-3 flex-grow-1 overflow-hidden">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="contact-name text-truncate">${contactName || 'Unknown'}</span>
                    <span class="small text-muted" style="font-size: 0.75rem">${formatTime(chat.lastMessageTimestamp)}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <div class="text-muted small text-truncate" style="max-width: 140px;">${chat.lastMessage || 'Start chatting...'}</div>
                    ${chat.unreadCount > 0 ? `<div class="unread-badge shadow-sm">${chat.unreadCount}</div>` : ''}
                </div>
            </div>
        `;
        listEl.appendChild(div);
    });
}

function openConversation(convID, contactID, contactType, contactName) {
    currentConversationID = convID;
    currentContact = { id: contactID, type: contactType, name: contactName };

    // MOBILE: Toggle View
    document.body.classList.add('show-chat');

    // UI Updates
    document.getElementById('empty-chat').classList.add('d-none');
    document.getElementById('active-chat-interface').classList.remove('d-none');
    document.getElementById('active-chat-interface').classList.add('d-flex');
    
    document.getElementById('chat-contact-name').textContent = contactName;
    document.getElementById('header-avatar').textContent = contactName ? contactName.charAt(0).toUpperCase() : "?";
    
    // Highlight Active
    document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    
    updateChatHeaderStatus();
    loadMessages(convID);
}

async function loadMessages(convID) {
    const msgContainer = document.getElementById('messages');
    msgContainer.innerHTML = '<div class="text-center mt-4"><div class="spinner-border spinner-border-sm text-secondary"></div></div>';

    try {
        const res = await fetch(`/api/message/messages/${convID}`);
        const data = await res.json();
        
        msgContainer.innerHTML = ''; // Clear spinner
        
        if (data.messages && data.messages.length > 0) {
            data.messages.forEach(msg => {
                const isMe = (msg.senderID == currentUser.id && msg.senderType == currentUser.type);
                displayMessage(msg, isMe);
            });
            scrollToBottom();
            
            // Backend Mark as read
            fetch('/api/message/mark-as-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationID: convID, userID: currentUser.id, userType: currentUser.type })
            });
        }
    } catch (err) { console.error(err); }
}

function displayMessage(msg, isMe) {
    const container = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = `message ${isMe ? 'message-sent' : 'message-received'}`;
    
    const ticks = isMe ? `<span class="ms-1">${msg.isRead ? '<i class="fas fa-check-double text-info"></i>' : '<i class="fas fa-check"></i>'}</span>` : '';

    div.innerHTML = `
        <div>${msg.content}</div>
        <div class="message-meta">
            ${formatTime(msg.timestamp)} ${ticks}
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
        statusText.textContent = "Online"; statusText.className = "text-success small"; dot.className = "status-dot online";
    } else {
        statusText.textContent = "Offline"; statusText.className = "text-muted small"; dot.className = "status-dot offline";
    }
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// --- SOCKET HANDLERS ---

socket.on("receiveMessage", (msg) => {
    // 1. If currently in this chat -> Display message
    if (msg.conversationID === currentConversationID) {
        const isMe = (msg.senderID == currentUser.id && msg.senderType == currentUser.type);
        displayMessage(msg, isMe);
        scrollToBottom();
    } 
    // 2. If NOT in this chat (and I am not sender) -> Show Notification
    else {
        if (msg.senderID != currentUser.id) {
            // Find sender name from contacts
            const chat = contacts.find(c => c.ConversationID === msg.conversationID);
            const senderName = chat ? (chat.Participant1ID == msg.senderID ? chat.Participant1Name : chat.Participant2Name) : "New Message";
            
            showNotification(senderName, msg.content);
        }
    }
    
    // Refresh Sidebar to update order and unread counts
    loadConversations(); 
});

socket.on("updateOnlineUsers", (ids) => {
    onlineUserIDs = ids;
    renderContactsList(contacts); // Refresh online dots in list
    updateChatHeaderStatus();     // Refresh header status
});

// [Keep openNewConversationModal, loadUsersForNewConversation, startNewConversation from original file]
// (I omitted them here for brevity as they are unchanged logic-wise, but ensure they are in your final file)
// ---------------------------------------------------------------------------------------------------
// ... Re-insert the Modal Functions here (openNewConversationModal, etc) ... 
// ---------------------------------------------------------------------------------------------------

// Re-pasting the modal logic for completeness:
function openNewConversationModal() {
    const modal = new bootstrap.Modal(document.getElementById('newConversationModal'));
    modal.show();
    const selectLabel = document.getElementById('selectLabel');
    const targetTypeInput = document.getElementById('targetUserType');
    let targetType = currentUser.type === 'User' ? 'Admin' : 'User';
    selectLabel.textContent = `Select ${targetType}`;
    targetTypeInput.value = targetType;
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
            data.users.forEach(user => {
                const option = document.createElement('option');
                const id = userType === 'User' ? user.UserID : user.AdminID;
                option.value = id;
                option.textContent = `${user.Username}`;
                userSelect.appendChild(option);
            });
        } else { userSelect.innerHTML = '<option value="">No users available</option>'; }
    } catch (error) { console.error(error); }
}

async function startNewConversation() {
    const userSelect = document.getElementById('userSelect');
    const targetType = document.getElementById('targetUserType').value;
    const targetID = userSelect.value;
    if (!targetID) return;

    try {
        const response = await fetch('/api/message/conversations/get-or-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user1ID: currentUser.id, user1Type: currentUser.type, user2ID: parseInt(targetID), user2Type: targetType })
        });
        const data = await response.json();
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('newConversationModal')).hide();
            await loadConversations();
            // Open the new chat logic...
            const c = data.conversation;
            const isMeP1 = (c.Participant1ID == currentUser.id && c.Participant1Type == currentUser.type);
            openConversation(c.ConversationID, isMeP1 ? c.Participant2ID : c.Participant1ID, isMeP1 ? c.Participant2Type : c.Participant1Type, isMeP1 ? c.Participant2Name : c.Participant1Name);
        }
    } catch (err) { console.error(err); }
}