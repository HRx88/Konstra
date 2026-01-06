// Helper for consistent avatar rendering with fallback
function getAvatarHTML(pic, name) {
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    if (pic) {
        return `<img src="${pic}" alt="${name}" 
            style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit;"
            onerror="this.style.display='none'; this.parentElement.textContent='${initial}';">`;
    }
    return initial;
}

const socket = io();

// State
let onlineUserIDs = [];
let currentConversationID = null;
let currentContact = null;
let contacts = [];
let currentUser = {};
let currentSearchTerm = '';
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // [Same Auth Logic as before]
    const memberDetails = JSON.parse(localStorage.getItem("memberDetails"));
    const adminDetails = JSON.parse(localStorage.getItem("adminDetails"));
    const token = localStorage.getItem("token");

    if (!memberDetails && !adminDetails) {
        window.location.href = "/login.html";
        return;
    }

    currentUser = memberDetails || adminDetails;
    currentUser.type = memberDetails ? 'User' : 'Admin';
    currentUser.id = memberDetails ? memberDetails.memberID || memberDetails.UserID || memberDetails.id : adminDetails.adminID || adminDetails.AdminID || adminDetails.id;
    // Fix casing: DB returns Username, but checks for username too
    currentUser.name = currentUser.Username || currentUser.username || currentUser.name || 'Me';

    document.getElementById('current-user-name').textContent = currentUser.name;
    document.getElementById('my-role-badge').textContent = currentUser.type;

    // Render initial avatar from localStorage
    const myAvatarEl = document.getElementById('my-avatar');
    myAvatarEl.innerHTML = getAvatarHTML(currentUser.ProfilePicture, currentUser.name);

    // SYNC PROFILE: Fetch fresh data to ensure ProfilePicture is up-to-date
    if (token) {
        fetch('/api/auth/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.user) {
                    // Merge fresh data
                    const freshUser = { ...currentUser, ...data.user };
                    freshUser.ProfilePicture = data.user.ProfilePicture; // Ensure this is captured
                    currentUser = freshUser;

                    // Update localStorage so next reload is also fresh
                    if (currentUser.type === 'User') {
                        localStorage.setItem("memberDetails", JSON.stringify(currentUser));
                    } else {
                        localStorage.setItem("adminDetails", JSON.stringify(currentUser));
                    }

                    // Re-render Header
                    document.getElementById('current-user-name').textContent = currentUser.Username || currentUser.name;
                    myAvatarEl.innerHTML = getAvatarHTML(currentUser.ProfilePicture, currentUser.name);

                    // Note: Messages already rendered might have old avatar until refresh or re-render, 
                    // but this ensures my-avatar and new messages are correct.
                }
            })
            .catch(err => console.error("Profile sync error:", err));
    }

    socket.emit("userOnline", { userID: currentUser.id, userType: currentUser.type });

    loadConversations().then(() => {
        // Automatically open the first chat for standard users
        if (currentUser.type === 'User' && contacts.length > 0) {
            const chat = contacts[0];
            const isMeP1 = (chat.Participant1ID == currentUser.id && chat.Participant1Type == currentUser.type);
            openConversation(
                chat.ConversationID,
                isMeP1 ? chat.Participant2ID : chat.Participant1ID,
                isMeP1 ? chat.Participant2Type : chat.Participant1Type,
                isMeP1 ? chat.Participant2Name : chat.Participant1Name,
                isMeP1 ? chat.Participant2ProfilePicture : chat.Participant1ProfilePicture
            );

            // Hide the sidebar for users as they only have one "Support" chat
            document.querySelector('.sidebar').classList.add('d-none');
            document.querySelector('.chat-area').style.width = '100%';
        }
    });
}

function setupEventListeners() {
    document.getElementById('send-button').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') sendMessage();
    });

    // Search Filter
    const searchInput = document.getElementById('search-contacts');
    const clearBtn = document.getElementById('clear-search');

    searchInput.addEventListener('input', function (e) {
        currentSearchTerm = e.target.value.toLowerCase();

        // Toggle Clear Button
        if (currentSearchTerm.length > 0) {
            clearBtn.classList.remove('d-none');
        } else {
            clearBtn.classList.add('d-none');
        }

        // Debounce search to hit backend
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (currentSearchTerm.length > 0) {
                performDeepSearch(currentSearchTerm);
            } else {
                loadConversations(); // Reset to normal view
            }
        }, 300);
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchTerm = '';
        clearBtn.classList.add('d-none');
        loadConversations();
    });

    document.getElementById('new-conversation-btn').addEventListener('click', openNewConversationModal);
    document.getElementById('startConversationBtn').addEventListener('click', startNewConversation);

    // Enforce single-chat for users by hiding navigational controls
    if (currentUser.type === 'User') {
        document.getElementById('new-conversation-btn').classList.add('d-none');
        document.getElementById('back-btn').classList.add('d-none');
        // Hide search for users since they only have 1 chat
        searchInput.parentElement.classList.add('d-none');
    }

    // Mobile Back Button
    document.getElementById('back-btn')?.addEventListener('click', () => {
        document.body.classList.remove('show-chat'); // Return to sidebar on mobile
        currentConversationID = null;

        // Restore portal toggle on mobile
        document.getElementById('mobileDashToggle')?.classList.remove('d-none');

        document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    });
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

// --- NOTIFICATION SYSTEM (TOAST) ---
function showNotification(name, message, pic) {
    const container = document.getElementById('notification-area');
    const toastId = 'toast-' + Date.now();

    const avatarHtml = getAvatarHTML(pic, name);

    const html = `
        <div id="${toastId}" class="toast-custom shadow">
            <div class="user-avatar-tiny overflow-hidden">${avatarHtml}</div>
            <div class="toast-content">
                <h6>${name}</h6>
                <p>${message}</p>
            </div>
        </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const toastEl = wrapper.firstElementChild;
    container.appendChild(toastEl);

    // Auto-remove
    setTimeout(() => {
        toastEl.style.opacity = '0';
        toastEl.style.transform = 'translateX(20px)';
        toastEl.style.transition = 'all 0.4s ease';
        setTimeout(() => toastEl.remove(), 400);
    }, 4000);

    // Optional click to open
    toastEl.onclick = () => {
        toastEl.remove();
        // logic to open chat can go here if we find the conversationID
    };
}

// --- DATA LOGIC ---

async function loadConversations() {
    try {
        // If a search is active, we refresh the search instead of the full list
        if (currentSearchTerm) {
            await performDeepSearch(currentSearchTerm);
            return;
        }

        const response = await fetch(`/api/message/conversations/${currentUser.id}/${currentUser.type}`);
        const data = await response.json();
        if (data.success) {
            contacts = data.conversations;

            // Force 0 unread for current chat to prevent badge flickering
            contacts.forEach(c => {
                if (c.ConversationID === currentConversationID) c.unreadCount = 0;
            });

            // If user has no chat, try to initialize one with first admin
            if (currentUser.type === 'User' && contacts.length === 0) {
                await initializeSupportChat();
                return;
            }

            renderContactsList(contacts);
        }
    } catch (error) {
        console.error("Load conversations error:", error);
    }
}

async function initializeSupportChat() {
    try {
        // Fetch admins
        const res = await fetch('/api/message/users/Admin');
        const adminData = await res.json();
        if (adminData.success && adminData.users.length > 0) {
            const firstAdmin = adminData.users[0];
            const startRes = await fetch('/api/message/conversations/get-or-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user1ID: currentUser.id,
                    user1Type: currentUser.type,
                    user2ID: firstAdmin.AdminID,
                    user2Type: 'Admin'
                })
            });
            const startData = await startRes.json();
            if (startData.success) {
                await loadConversations();
            }
        }
    } catch (err) { console.error("Initialize support chat error:", err); }
}

function renderContactsList(data) {
    const listEl = document.getElementById('contacts-list');
    listEl.innerHTML = '';

    if (data.length === 0) {
        listEl.innerHTML = `
            <div class="text-center p-5 text-muted">
                <i class="fas fa-search mb-2 d-block" style="font-size: 2rem; opacity: 0.1;"></i>
                <p class="small m-0">${currentSearchTerm ? 'No results found for <br><strong class="text-dark">"' + currentSearchTerm + '"</strong>' : 'No conversations yet'}</p>
            </div>
        `;
        return;
    }

    data.forEach(chat => {
        const isMeParticipant = (chat.Participant1ID == currentUser.id && chat.Participant1Type == currentUser.type) ||
            (chat.Participant2ID == currentUser.id && chat.Participant2Type == currentUser.type);

        let contactName, contactID, contactType, contactPic;

        if (isMeParticipant) {
            const isMeP1 = (chat.Participant1ID == currentUser.id && chat.Participant1Type == currentUser.type);
            contactName = isMeP1 ? chat.Participant2Name : chat.Participant1Name;
            contactID = isMeP1 ? chat.Participant2ID : chat.Participant1ID;
            contactType = isMeP1 ? chat.Participant2Type : chat.Participant1Type;
            contactPic = isMeP1 ? chat.Participant2ProfilePicture : chat.Participant1ProfilePicture;
        } else {
            // Observer logic (e.g. Admin viewing another Admin's chat with a User)
            const isP1Admin = chat.Participant1Type === 'Admin';
            contactName = isP1Admin ? chat.Participant2Name : chat.Participant1Name;
            contactID = isP1Admin ? chat.Participant2ID : chat.Participant1ID;
            contactType = isP1Admin ? chat.Participant2Type : chat.Participant1Type;
            contactPic = isP1Admin ? chat.Participant2ProfilePicture : chat.Participant1ProfilePicture;
        }

        const userKey = `${contactID}-${contactType}`;
        let isOnline = onlineUserIDs.includes(userKey);

        // If User is looking at Admin, Admin is online if ANY admin is online
        if (currentUser.type === 'User' && contactType === 'Admin') {
            isOnline = onlineUserIDs.some(id => id.endsWith('-Admin'));
        }

        const div = document.createElement('div');
        div.className = `contact-item ${currentConversationID === chat.ConversationID ? 'active' : ''}`;

        // Click Handler
        div.onclick = () => {
            // Remove unread badge immediately from UI
            chat.unreadCount = 0;
            renderContactsList(contacts); // Re-render to clear badge
            openConversation(chat.ConversationID, contactID, contactType, contactName, contactPic);
        };

        // Highlighting Logic
        let displayNameHtml = contactName || 'Unknown';
        let displayMessageHtml = chat.lastMessage || 'Start a conversation';
        let matchIndicator = '';

        if (currentSearchTerm) {
            const regex = new RegExp(`(${currentSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

            // Highlight name if matched
            displayNameHtml = displayNameHtml.replace(regex, '<mark class="p-0 bg-warning text-dark">$1</mark>');

            // Highlight message if it's a result or just standard display
            displayMessageHtml = displayMessageHtml.replace(regex, '<mark class="p-0 bg-warning text-dark">$1</mark>');

            if (chat.isSearchResult) {
                // It's a message match
                matchIndicator = '<i class="fas fa-search small me-1 text-primary" title="Message Match"></i>';
            } else if (displayNameHtml.includes('<mark')) {
                // It's a user match
                matchIndicator = '<i class="fas fa-user small me-1 text-success" title="User Match"></i>';
            }
        }

        div.innerHTML = `
            <div class="position-relative">
                <div class="user-avatar-sm shadow-sm overflow-hidden">
                    ${getAvatarHTML(contactPic, contactName)}
                </div>
                <div class="status-dot ${isOnline ? 'online' : 'offline'}"></div>
            </div>
            <div class="ms-2 flex-grow-1 overflow-hidden" title="${contactName || 'Unknown'}">
                <div class="d-flex justify-content-between align-items-center mb-0">
                    <span class="contact-name text-truncate fw-800" style="font-size: 0.9rem;">${displayNameHtml}</span>
                    <span class="small text-muted" style="font-size: 0.65rem; font-weight: 600;">${formatTime(chat.lastMessageTimestamp)}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <div class="contact-message-preview text-truncate" style="max-width: 160px;">
                        ${matchIndicator}
                        ${displayMessageHtml}
                    </div>
                    ${chat.unreadCount > 0 ? `<div class="unread-badge ms-2">${chat.unreadCount}</div>` : ''}
                </div>
            </div>
        `;
        listEl.appendChild(div);
    });

    // Apply any active filter (client-side only for current names/previews)
    // REMOVED: This was hiding deep search results because keywords in older messages 
    // were not present in the last-message preview.
    // applySearchFilter(); 
}

async function performDeepSearch(query) {
    try {
        const response = await fetch(`/api/message/search?userID=${currentUser.id}&userType=${currentUser.type}&query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success) {
            contacts = data.conversations;
            renderContactsList(contacts);
        }
    } catch (error) {
        console.error("Deep search failed:", error);
    }
}

function applySearchFilter() {
    if (!currentSearchTerm) {
        document.querySelectorAll('.contact-item').forEach(el => el.style.display = 'flex');
        return;
    }

    const items = document.querySelectorAll('.contact-item');
    items.forEach(item => {
        const nameEl = item.querySelector('.contact-name');
        const previewEl = item.querySelector('.contact-message-preview');

        const name = nameEl ? nameEl.textContent.toLowerCase() : '';
        const preview = previewEl ? previewEl.textContent.toLowerCase() : '';

        const matches = name.includes(currentSearchTerm) || preview.includes(currentSearchTerm);
        item.style.display = matches ? 'flex' : 'none';
    });
}

function openConversation(convID, contactID, contactType, contactName, contactPic) {
    currentConversationID = convID;
    currentContact = { id: contactID, type: contactType, name: contactName, profilePicture: contactPic };

    // MOBILE: Toggle View & Portal Menu
    document.body.classList.add('show-chat');
    document.getElementById('mobileDashToggle')?.classList.add('d-none');
    document.getElementById('dashSidebar')?.classList.remove('active');

    // UI Updates
    document.getElementById('empty-chat').classList.add('d-none');
    document.getElementById('active-chat-interface').classList.remove('d-none');
    document.getElementById('active-chat-interface').classList.add('d-flex');

    const displayContactName = (currentUser.type === 'User' && contactType === 'Admin')
        ? 'Konstra Support Team'
        : contactName;

    document.getElementById('chat-contact-name').textContent = displayContactName;

    // Update Header Avatar with Helper
    const headerAvatarEl = document.getElementById('header-avatar');
    headerAvatarEl.innerHTML = getAvatarHTML(contactPic, contactName);

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
                // Show messages from my "team" (Admin or User) on my side
                const isMe = (msg.senderType == currentUser.type);
                displayMessage(msg, isMe);
            });
            scrollToBottom();

            // Notify server that messages are read via Socket for real-time sync
            socket.emit("messagesRead", {
                conversationID: convID,
                userID: currentUser.id,
                userType: currentUser.type
            });
        }
    } catch (err) { console.error(err); }
}

function displayMessage(msg, isMe) {
    const container = document.getElementById('messages');

    // User Wrapper for Avatar alignment
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${isMe ? 'sent' : 'received'}`;

    const pic = isMe ? currentUser.ProfilePicture : currentContact.profilePicture;
    const name = isMe ? currentUser.name : currentContact.name;
    const initial = name ? name.charAt(0).toUpperCase() : '?';

    const avatarHtml = `
        <div class="message-avatar shadow-sm">
            ${getAvatarHTML(pic, name)}
        </div>
    `;

    const div = document.createElement('div');
    div.className = `message ${isMe ? 'message-sent' : 'message-received'}`;

    // Show name for team members (Admins)
    const showSenderName = (msg.senderType === 'Admin');
    const senderNameHtml = showSenderName ? `<div class="sender-name">${msg.senderName || 'Staff'}</div>` : '';

    const ticks = isMe ? `<span class="ms-1">${msg.isRead ? '<i class="fas fa-check-double text-info" style="font-size: 0.8rem;"></i>' : '<i class="fas fa-check" style="font-size: 0.8rem;"></i>'}</span>` : '';

    div.innerHTML = `
        ${senderNameHtml}
        <div class="message-content-bubble">${msg.content}</div>
        <div class="message-meta">
            ${formatTime(msg.timestamp)} ${ticks}
        </div>
    `;

    wrapper.innerHTML = avatarHtml;
    wrapper.appendChild(div);
    container.appendChild(wrapper);
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

    let isOnline = false;
    if (currentUser.type === 'User' && currentContact.type === 'Admin') {
        // Team online check for regular users
        isOnline = onlineUserIDs.some(id => id.endsWith('-Admin'));
    } else {
        // Individual check for admins or other contexts
        const userKey = `${currentContact.id}-${currentContact.type}`;
        isOnline = onlineUserIDs.includes(userKey);
    }

    const statusText = document.getElementById('chat-contact-status');
    const dot = document.getElementById('header-status-dot');

    if (isOnline) {
        statusText.innerHTML = '<i class="fas fa-circle" style="font-size: 6px;"></i> Online';
        statusText.classList.remove('text-muted');
        statusText.classList.add('text-success');
        dot.className = "status-dot online";
    } else {
        statusText.innerHTML = '<i class="fas fa-circle" style="font-size: 6px;"></i> Offline';
        statusText.classList.remove('text-success');
        statusText.classList.add('text-muted');
        dot.className = "status-dot offline";
    }
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// --- SOCKET HANDLERS ---

socket.on("receiveMessage", (msg) => {
    // 1. If currently in this chat -> Display message & Mark as Read
    if (msg.conversationID === currentConversationID) {
        const isMe = (msg.senderType == currentUser.type);
        displayMessage(msg, isMe);
        scrollToBottom();

        // Immediately notify server it's read if we are looking at it
        if (!isMe) {
            socket.emit("messagesRead", {
                conversationID: msg.conversationID,
                userID: currentUser.id,
                userType: currentUser.type
            });
        }
    }
    // 2. If NOT in this chat (and I am not sender) -> Show Notification
    else {
        if (msg.senderID != currentUser.id) {
            const chat = contacts.find(c => c.ConversationID === msg.conversationID);
            const senderName = chat ? (chat.Participant1ID == msg.senderID ? chat.Participant1Name : chat.Participant2Name) : "Support";
            const senderPic = chat ? (chat.Participant1ID == msg.senderID ? chat.Participant1ProfilePicture : chat.Participant2ProfilePicture) : null;

            showNotification(senderName, msg.content, senderPic);
        }
    }

    // Refresh Sidebar
    loadConversations();
});

socket.on("updateOnlineUsers", (ids) => {
    onlineUserIDs = ids;
    renderContactsList(contacts); // Refresh online dots in list
    updateChatHeaderStatus();     // Refresh header status
});

socket.on("updateReadReceipts", (data) => {
    // If someone else read the messages, update our side-bar counts
    loadConversations();

    // If it's the current chat, maybe refresh internal read ticks (future)
    if (data.conversationID === currentConversationID) {
        // Option: re-load messages to show double ticks
    }
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
            openConversation(
                c.ConversationID,
                isMeP1 ? c.Participant2ID : c.Participant1ID,
                isMeP1 ? c.Participant2Type : c.Participant1Type,
                isMeP1 ? c.Participant2Name : c.Participant1Name,
                isMeP1 ? c.Participant2ProfilePicture : c.Participant1ProfilePicture
            );
        }
    } catch (err) { console.error(err); }
}