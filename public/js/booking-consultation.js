// CONFIG
const CALENDLY_LINKS = {
    ONLINE: "https://calendly.com/konstrabeta/online",
    INPERSON: "https://calendly.com/konstrabeta/in-person"
};

// STATE
let currentStep = 1;
let selectedFormat = null;
let countdownInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    if (!user) window.location.href = 'login.html';
    else document.getElementById('userNameDisplay').textContent = user.username || "User";

    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });

    document.getElementById('btnSelectOnline')?.addEventListener('click', () => goToStep2('ONLINE'));
    document.getElementById('btnSelectInPerson')?.addEventListener('click', () => goToStep2('INPERSON'));
    document.getElementById('btnBackToStep1')?.addEventListener('click', goToStep1);
}

// --- WIZARD NAVIGATION ---
function updateProgress(step) {
    const bar = document.getElementById('wizardProgress');
    if (step === 1) bar.style.width = "33%";
    if (step === 2) bar.style.width = "66%";
    if (step === 3) bar.style.width = "100%";
}

function showStep(stepId) {
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.getElementById(stepId).classList.add('active');
}

function goToStep1() {
    currentStep = 1;
    updateProgress(1);
    showStep('step1');
    // Clean up calendar
    document.getElementById('calendlyContainer').innerHTML = '';
}

function goToStep2(format) {
    const user = getUser();
    selectedFormat = format;
    currentStep = 2;
    updateProgress(2);
    showStep('step2');

    // Initialize Inline Widget
    const container = document.getElementById('calendlyContainer');
    container.innerHTML = ''; // Clear prev

    Calendly.initInlineWidget({
        url: CALENDLY_LINKS[format],
        parentElement: container,
        prefill: {
            email: user.email,
            name: user.username
        },
        utm: {}
    });
}

function goToStep3(meetingData) {
    currentStep = 3;
    updateProgress(3);
    showStep('step3');

    // Populate Ticket
    document.getElementById('ticketType').textContent = meetingData.meetingType;
    const dateObj = new Date(meetingData.startTime);
    document.getElementById('ticketTime').textContent = dateObj.toLocaleString();

    if (meetingData.meetingType === 'Online' && meetingData.participantUrl) {
        document.getElementById('ticketLocation').innerHTML = `<a href="${meetingData.participantUrl}" target="_blank">${meetingData.participantUrl}</a>`;
    } else {
        document.getElementById('ticketLocation').textContent = "Konstra HQ - 123 Innovation Drive, Tech City";
    }

    // Start Auto-Reset
    startCountdown();
}

// --- CALENDLY EVENT HANDLING ---
window.addEventListener('message', function (e) {
    if (e.data.event && e.data.event === 'calendly.event_scheduled') {
        handleBookingSuccess(e.data.payload.event.uri);
    }
});

async function handleBookingSuccess(eventURI) {
    const user = getUser();
    const userID = user.memberID || user.adminID || user.id || user.UserID;

    try {
        // Show a loading state inside step 2 if needed, 
        // but usually we proceed directly to step 3 once data is saved.

        const response = await fetch('/api/meetings/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userID, calendlyEventURI: eventURI })
        });

        const result = await response.json();
        if (result.success) {
            goToStep3(result.data);
        } else {
            alert('Booking recorded but failed to sync details: ' + result.error);
        }

    } catch (err) {
        console.error(err);
        alert('Connection error saving booking.');
    }
}

// --- AUTO RESET LOGIC ---
function startCountdown() {
    let timeLeft = 15;
    const display = document.getElementById('countdownTimer');
    display.textContent = timeLeft;

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        timeLeft--;
        display.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            goToStep1(); // Loop back
        }
    }, 1000);
}

// --- UTILS ---
function getUser() {
    return JSON.parse(localStorage.getItem("currentUser")) ||
        JSON.parse(localStorage.getItem("memberDetails")) ||
        JSON.parse(localStorage.getItem("adminDetails"));
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
