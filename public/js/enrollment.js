// --- State ---
let currentStep = 1;
const params = new URLSearchParams(window.location.search);

// Data from URL
// Data from URL
const programId = params.get('id'); // Get Program ID
const item = params.get('item') || 'Unknown Program';
const type = params.get('type') || 'Education';
const price = parseFloat(params.get('price')) || 0;
const image = params.get('image') || '';

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    // Fill Summary
    document.getElementById('summaryTitle').innerText = item;
    document.getElementById('summaryType').innerText = type === 'Trip' ? 'Immersive Field Trip' : 'Education Program';
    document.getElementById('summaryImg').src = image || 'https://images.unsplash.com/photo-1581092921461-eab6245b0262';
    updateSummary();

    // Load User Info if logged in
    const member = JSON.parse(localStorage.getItem('memberDetails'));
    if (member) {
        const names = (member.username || '').split(' ');
        document.getElementById('firstName').value = names[0] || '';
        document.getElementById('lastName').value = names.slice(1).join(' ') || '';
        document.getElementById('email').value = member.email || '';
    }

    // Logic: If NOT 'Trip', hide participant count (Default 1)
    if (type !== 'Trip') {
        document.getElementById('participantContainer').style.display = 'none';
    }

    // Generate Slots (Real Data)
    if (programId) {
        fetchSlots(programId);
    } else {
        document.getElementById('slotContainer').innerHTML = '<p class="text-danger">Program ID missing.</p>';
    }

    // Generate Extra Fields
    generateExtraFields();

    // Event Listeners
    document.getElementById('participantCount')?.addEventListener('change', updateSummary);

    document.getElementById('btnBack1')?.addEventListener('click', () => history.back());
    document.getElementById('btnNext1')?.addEventListener('click', () => nextStep(2));

    document.getElementById('btnBack2')?.addEventListener('click', () => prevStep(1));
    document.getElementById('btnSubmit')?.addEventListener('click', submitEnrollment);
});

// --- Fetch & Generate Slots ---
async function fetchSlots(id) {
    if (type === 'Trip') {
        document.getElementById('dateSelection').style.display = 'none';
        return;
    }

    const container = document.getElementById('slotContainer');
    container.innerHTML = '<p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading sessions...</p>';

    try {
        const response = await fetch(`/api/programs/${id}/slots`);
        if (!response.ok) throw new Error('Failed to load slots');
        const slots = await response.json();

        container.innerHTML = '';
        if (slots.length === 0) {
            container.innerHTML = '<p class="text-muted">No upcoming sessions available. Please contact us.</p>';
            return;
        }

        slots.forEach(slot => {
            // Format Date: "Mon, 12 Jan"
            const dateObj = new Date(slot.StartTime);
            const dateStr = dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
            // Format Time: "10:00 AM"
            const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            const btn = document.createElement('div');
            btn.className = 'slot-btn';
            btn.innerHTML = `<span class="slot-date">${dateStr}</span><span class="slot-time">${timeStr}</span>`;
            // Pass SlotID and String representation
            btn.onclick = () => selectSlot(btn, slot.SlotID, `${dateStr} - ${timeStr}`);
            container.appendChild(btn);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p class="text-danger">Error loading sessions.</p>';
    }
}

// Updated selectSlot to store ID
function selectSlot(el, id, displayVal) {
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('selectedSlot').value = id; // Store ID
    document.getElementById('summaryDate').innerText = displayVal;
    document.getElementById('summarySlotRow').style.display = 'flex';
    document.getElementById('slotError').style.display = 'none';
}

// --- Extra Fields Generator ---
function generateExtraFields() {
    const container = document.getElementById('extraFields');
    if (type === 'Trip') {
        container.innerHTML = `
            <h6 class="fw-bold mb-3"><i class="fas fa-passport text-danger me-2"></i>Trip Requirements</h6>
            <div class="mb-3">
                <label class="form-label">Passport Number</label>
                <input type="text" class="form-control" id="passport" placeholder="Required for site entry">
            </div>
             <div class="mb-3">
                <label class="form-label">Dietary Restrictions</label>
                <select class="form-select" id="dietary">
                    <option value="None">None</option>
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Vegan">Vegan</option>
                    <option value="Halal">Halal</option>
                </select>
            </div>
        `;
    } else {
        container.innerHTML = `
            <h6 class="fw-bold mb-3"><i class="fas fa-laptop text-danger me-2"></i>Class Requirements</h6>
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="laptopCheck">
                <label class="form-check-label">
                    I confirm I will bring a laptop (Windows/Mac) capable of running CAD software.
                </label>
            </div>
             <div class="mt-3">
                <label class="form-label">Experience Level</label>
                <select class="form-select" id="experience">
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                </select>
            </div>
        `;
    }
}

// --- Navigation ---
function nextStep(step) {
    // Validation Step 1
    if (currentStep === 1) {
        if (type !== 'Trip' && !document.getElementById('selectedSlot').value) {
            document.getElementById('slotError').style.display = 'block';
            return;
        }
    }

    // Validation Step 2
    if (currentStep === 2) {
        if (!document.getElementById('firstName').value || !document.getElementById('lastName').value || !document.getElementById('email').value) {
            alert("Please fill in all contact details.");
            return;
        }
    }

    showStep(step);
}

function prevStep(step) {
    showStep(step);
}

function showStep(step) {
    document.querySelectorAll('.step-card').forEach(c => c.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');

    // Dots
    document.querySelectorAll('.dot').forEach((d, i) => {
        if (i < step) d.classList.add('active');
        else d.classList.remove('active');
    });

    currentStep = step;
}

function updateSummary() {
    const count = parseInt(document.getElementById('participantCount').value);
    const total = price * count;

    document.getElementById('summaryCount').innerText = count + (count === 1 ? ' Person' : ' People');
    document.getElementById('summaryTotal').innerText = '$' + total.toLocaleString();
}

function submitEnrollment() {
    // Validation (Moved from nextStep)
    if (!document.getElementById('firstName').value || !document.getElementById('lastName').value || !document.getElementById('email').value) {
        alert("Please fill in all contact details.");
        return;
    }

    // Remove T&C check as step is removed

    // COLLECT DATA
    const count = document.getElementById('participantCount').value;
    const slot = document.getElementById('selectedSlot').value;
    const total = price * count;

    // Extra Details
    const details = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
    };

    if (type === 'Trip') {
        details.passport = document.getElementById('passport').value;
        details.dietary = document.getElementById('dietary').value;
    } else {
        details.experience = document.getElementById('experience').value;
        details.laptopConfirmed = document.getElementById('laptopCheck').checked;
    }

    // ENCODE AND REDIRECT
    const detailsStr = encodeURIComponent(JSON.stringify(details));
    const slotStr = encodeURIComponent(slot || ''); // Pass ID

    // Get formatted date for display
    const dateDisplay = document.getElementById('summaryDate').innerText;
    const dateAppend = (slot && dateDisplay !== '-') ? ` - ${dateDisplay}` : '';

    const itemStr = encodeURIComponent(`${item} (${count} pax)${dateAppend}`);
    const imgStr = encodeURIComponent(image);

    // SAVE TO SESSION STORAGE (For Success Page)
    const member = JSON.parse(localStorage.getItem('memberDetails'));
    const userId = member ? member.id : null; // Ensure member object has 'id' or 'UserID'

    if (!userId) {
        alert("Please log in to enroll.");
        // Alternatively redirect to login with return URL
        return;
    }

    const pendingData = {
        userId: userId,
        programId: parseInt(programId),
        slotId: slot ? parseInt(slot) : null,
        details: details,
        amount: total
    };
    sessionStorage.setItem('pendingEnrollment', JSON.stringify(pendingData));

    // Redirect to payment
    window.location.href = `payment.html?id=${programId}&price=${total}&item=${itemStr}&image=${imgStr}&slot=${slotStr}&details=${detailsStr}`;
}
