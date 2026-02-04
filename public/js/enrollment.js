// --- State ---
let currentStep = 1;
const params = new URLSearchParams(window.location.search);

// Data from URL
const programId = params.get('id'); // Get Program ID
const item = params.get('item') || 'Unknown Program';
const type = params.get('type') || 'Education';
const programLocation = params.get('location') || 'Online'; // NEW: Get location
const basePrice = parseFloat(params.get('price')) || 0; // Store parent program price
let price = basePrice; // Current total price (can be updated with child price)
let currentDiscount = null; // Store applied reference code discount
let bundleDiscount = null; // Store bundle discount (10% when all levels selected)
const image = params.get('image') || '';

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    // Fill Summary
    document.getElementById('summaryTitle').innerText = item;
    document.getElementById('summaryType').innerText =
        type === 'Trip' ? 'Immersive Field Trip' :
            type === 'Lesson' ? 'Live Online Training' : 'Education Program';
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
    // Show slots for: Lesson OR Education with non-Online location
    const shouldShowSlots = type === 'Lesson' || (type === 'Education' && programLocation !== 'Online');

    if (programId && shouldShowSlots) {
        fetchSlots(programId);
    } else {
        document.getElementById('dateSelection').style.display = 'none';
    }

    // Generate Extra Fields
    generateExtraFields();

    // If 'Education' type with Online location (no slots needed), Start at Step 2 immediately
    if (type === 'Education' && programLocation === 'Online') {
        showStep(2);
    }

    // Load available discount codes into dropdown
    loadDiscountCodes();

    // Event Listeners
    document.getElementById('participantCount')?.addEventListener('change', updateSummary);

    document.getElementById('btnBack1')?.addEventListener('click', () => history.back());
    document.getElementById('btnNext1')?.addEventListener('click', () => nextStep(2));

    document.getElementById('btnBack2')?.addEventListener('click', () => prevStep(1));
    document.getElementById('btnSubmit')?.addEventListener('click', submitEnrollment);
    document.getElementById('btnApplyDiscount')?.addEventListener('click', applyDiscount);
});

// --- Fetch & Generate Slots ---
async function fetchSlots(id) {
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
                <label class="form-label" for="passport">Passport Number</label>
                <input type="text" class="form-control" id="passport" placeholder="Required for site entry">
            </div>
             <div class="mb-3">
                <label class="form-label" for="dietary">Dietary Restrictions</label>
                <select class="form-select" id="dietary">
                    <option value="None">None</option>
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Vegan">Vegan</option>
                    <option value="Halal">Halal</option>
                </select>
            </div>
        `;
    } else if (type === 'Lesson') {
        container.innerHTML = `
            <h6 class="fw-bold mb-3"><i class="fas fa-video text-primary me-2"></i>Live Training Requirements</h6>
            <div class="form-check mb-3">
                <input class="form-check-input" type="checkbox" id="cameraCheck">
                <label class="form-check-label">
                    I confirm I have a working webcam and microphone for the live session.
                </label>
            </div>
            <div class="form-check mb-4">
                <input class="form-check-input" type="checkbox" id="internetCheck">
                <label class="form-check-label">
                    I confirm I have a stable internet connection (minimum 10 Mbps).
                </label>
            </div>

            <h6 class="fw-bold mb-3"><i class="fas fa-layer-group text-danger me-2"></i>Select Additional Sessions <span class="badge bg-secondary fw-normal">Optional</span></h6>
            <div id="childProgramContainer">
                <div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i> Loading options...</div>
            </div>
        `;
        fetchChildPrograms(programId);
    } else {
        // Education Program - Show Child Program Selector (Multi-Select, Optional)
        container.innerHTML = `
            <h6 class="fw-bold mb-3"><i class="fas fa-layer-group text-danger me-2"></i>Select Program Levels <span class="badge bg-secondary fw-normal">Optional</span></h6>
            <p class="text-muted small mb-2">Select individual levels or <strong class="text-success">get 12.9% off when you select all levels!</strong></p>
            <div id="childProgramContainer">
                <div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i> Loading options...</div>
            </div>
        `;
        // Fetch child programs
        fetchChildPrograms(programId);
    }
}

// --- Fetch Child Programs ---
let selectedChildPrograms = []; // Array to store multiple selections
let childPrograms = [];

async function fetchChildPrograms(parentId) {
    const container = document.getElementById('childProgramContainer');

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`/api/programs/${parentId}/children`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch child programs');

        const data = await response.json();
        // Handle both raw array (new backend) and wrapped object (old backend)
        childPrograms = Array.isArray(data) ? data : (data.children || []);

        container.innerHTML = ''; // Clear loading/error msg

        if (childPrograms.length === 0) {
            container.innerHTML = '<p class="text-muted small">No additional programs available.</p>';
            return;
        }

        // Generate Checkboxes with Slot Logic
        for (const child of childPrograms) {
            const wrapper = document.createElement('div');
            wrapper.className = 'form-check mb-2 p-3 border rounded bg-light';

            const checkbox = document.createElement('input');
            checkbox.className = 'form-check-input child-program-checkbox';
            checkbox.type = 'checkbox';
            checkbox.value = child.ProgramID;
            checkbox.id = `child_${child.ProgramID}`;

            // Store data for easy access
            checkbox.dataset.price = child.Price || 0;
            checkbox.dataset.title = child.Title;

            const labelStr = `
                <div class="d-flex justify-content-between align-items-center">
                    <span class="fw-bold">${child.Title}</span>
                    <span class="badge bg-success">${child.Price > 0 ? '+$' + child.Price : 'Free'}</span>
                </div>
                <div class="small text-muted mt-0 mb-2">${child.Description || ''}</div>
            `;

            const label = document.createElement('label');
            label.className = 'form-check-label w-100';
            label.htmlFor = `child_${child.ProgramID}`;
            label.innerHTML = labelStr;

            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);

            // --- FETCH SLOTS FOR CHILD ---
            // Only if it's a Lesson type or we assume child programs might have slots
            // Let's assume ANY child program might have slots.
            try {
                const slotRes = await fetch(`/api/programs/${child.ProgramID}/slots`);
                if (slotRes.ok) {
                    const slots = await slotRes.json();
                    if (slots && slots.length > 0) {
                        const select = document.createElement('select');
                        select.className = 'form-select form-select-sm mt-2 child-slot-select';
                        select.id = `slot_child_${child.ProgramID}`;
                        select.style.display = 'none'; // Hidden until checked
                        select.dataset.programId = child.ProgramID;

                        let options = `<option value="">-- Select Session --</option>`;
                        slots.forEach(s => {
                            const d = new Date(s.StartTime);
                            const str = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            options += `<option value="${s.SlotID}">${str}</option>`;
                        });
                        select.innerHTML = options;

                        wrapper.appendChild(select);

                        // Show/Hide dropdown on check
                        checkbox.addEventListener('change', (e) => {
                            select.style.display = e.target.checked ? 'block' : 'none';
                            if (!e.target.checked) select.value = ''; // Reset
                            updateChildProgramSelection();
                        });

                        // Update on select change too
                        select.addEventListener('change', updateChildProgramSelection);
                    }
                }
            } catch (e) { console.error('Error loading child slots', e); }

            container.appendChild(wrapper);

            // Listener for Price Update (also attached above for display toggle, but safe to attach multiple)
            checkbox.addEventListener('change', updateChildProgramSelection);
        }

    } catch (error) {
        console.error('Error fetching child programs:', error);
        container.innerHTML = '<p class="text-danger small">Error loading programs.</p>';
    }
}

function updateChildProgramSelection() {
    // Reset
    selectedChildPrograms = [];
    let additionalPrice = 0;

    // Scan all checkboxes
    const allCheckboxes = document.querySelectorAll('.child-program-checkbox');
    const checkedBoxes = document.querySelectorAll('.child-program-checkbox:checked');

    checkedBoxes.forEach(cb => {
        const p = parseFloat(cb.dataset.price) || 0;
        additionalPrice += p;

        // Check for slot selection
        const slotSelect = document.querySelector(`#slot_child_${cb.value}`);
        const slotId = slotSelect && slotSelect.value ? parseInt(slotSelect.value) : null;

        selectedChildPrograms.push({
            id: parseInt(cb.value),
            title: cb.dataset.title,
            price: p,
            slotId: slotId // Capture slot ID
        });
    });

    // Update Global Price
    price = basePrice + additionalPrice;

    // Bundle discount: 12.9% off if ALL child programs are selected (separate from reference code)
    const allSelected = allCheckboxes.length > 0 && checkedBoxes.length === allCheckboxes.length;

    if (allSelected) {
        bundleDiscount = {
            code: 'BUNDLE_ALL',
            type: 'Percentage',
            value: 12.9
        };
        // Show bundle discount message
        updateDiscountMessage();
    } else {
        bundleDiscount = null;
        updateDiscountMessage();
    }

    // Update Summary UI
    updateSummary();

    // Update Summary Row visibility/content
    const summaryRow = document.getElementById('summaryChildProgramRow');
    const summarySpan = document.getElementById('summaryChildProgram');

    if (summaryRow && summarySpan) {
        if (selectedChildPrograms.length > 0) {
            summaryRow.style.display = 'flex';
            // Show comma separated titles
            // Also show slot info if available? (might be too long)
            const updates = selectedChildPrograms.map(s => s.title).join(', ');
            summarySpan.innerText = updates.length > 30 ? updates.substring(0, 30) + '...' : updates + (selectedChildPrograms.length > 1 ? ` (${selectedChildPrograms.length})` : '');
        } else {
            summaryRow.style.display = 'none';
        }
    }

    // Hide error if selected (basic check)
    // We defer specific slot validation to 'submitEnrollment'
}

// --- Navigation ---
function nextStep(step) {
    // Validation Step 1
    if (currentStep === 1) {
        // Enforce slot selection for Lesson OR Education with non-Online location
        const shouldRequireSlot = type === 'Lesson' || (type === 'Education' && programLocation !== 'Online');

        if (shouldRequireSlot && !document.getElementById('selectedSlot').value) {
            document.getElementById('slotError').style.display = 'block';
            return;
        }
    }

    // Validation Step 2
    if (currentStep === 2) {
        if (!document.getElementById('firstName').value || !document.getElementById('lastName').value || !document.getElementById('email').value) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Information',
                text: 'Please fill in all contact details.',
                confirmButtonColor: '#d32f2f'
            });
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
    let total = price * count;

    // Apply Bundle Discount first (if all levels selected)
    if (bundleDiscount) {
        if (bundleDiscount.type === 'Percentage') {
            const discountAmount = total * (bundleDiscount.value / 100);
            total -= discountAmount;
        } else {
            total -= bundleDiscount.value;
        }
    }

    // Apply Reference Code Discount second (stacking)
    if (currentDiscount) {
        if (currentDiscount.type === 'Percentage') {
            const discountAmount = total * (currentDiscount.value / 100);
            total -= discountAmount;
        } else {
            total -= currentDiscount.value;
        }
    }

    if (total < 0) total = 0;

    document.getElementById('summaryCount').innerText = count + (count === 1 ? ' Person' : ' People');
    document.getElementById('summaryTotal').innerText = '$' + total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper to update discount message showing combined discounts
function updateDiscountMessage() {
    const msgDiv = document.getElementById('discountMsg');
    if (!msgDiv) return;

    let messages = [];

    if (bundleDiscount) {
        messages.push(`<i class="fas fa-gift me-1"></i>Bundle: ${bundleDiscount.value}% OFF`);
    }

    if (currentDiscount) {
        const valueStr = currentDiscount.type === 'Percentage' ? `${currentDiscount.value}%` : `$${currentDiscount.value}`;
        messages.push(`<i class="fas fa-tag me-1"></i>Code: ${valueStr} OFF`);
    }

    if (messages.length > 0) {
        msgDiv.className = 'small mt-1 text-success fw-bold';
        msgDiv.innerHTML = messages.join(' + ');
    } else {
        msgDiv.className = 'small mt-1';
        msgDiv.innerText = '';
    }
}

// --- Load Discount Codes into Dropdown ---
async function loadDiscountCodes() {
    const select = document.getElementById('discountCodeInput');
    if (!select) return;

    try {
        // Fetch public codes (available to everyone)
        const pubRes = await fetch('/api/discounts/public');
        let publicCodes = [];
        if (pubRes.ok) {
            const pubData = await pubRes.json();
            publicCodes = pubData.discounts || [];
        }

        // Fetch user's personal codes if logged in
        let myCodes = [];
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const myRes = await fetch('/api/discounts/my', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (myRes.ok) {
                    const myData = await myRes.json();
                    myCodes = myData.discounts || [];
                }
            } catch (e) { /* ignore */ }
        }

        // Populate dropdown
        select.innerHTML = '<option value="">-- Select a code --</option>';

        if (myCodes.length > 0) {
            const myGroup = document.createElement('optgroup');
            myGroup.label = '🎁 My Codes';
            myCodes.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.Code;
                const valueStr = d.DiscountType === 'Percentage' ? `${d.Value}% OFF` : `$${d.Value} OFF`;
                opt.textContent = `${d.Code} (${valueStr})`;
                myGroup.appendChild(opt);
            });
            select.appendChild(myGroup);
        }

        if (publicCodes.length > 0) {
            const pubGroup = document.createElement('optgroup');
            pubGroup.label = '🏷️ Available Offers';
            publicCodes.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.Code;
                const valueStr = d.DiscountType === 'Percentage' ? `${d.Value}% OFF` : `$${d.Value} OFF`;
                opt.textContent = `${d.Code} (${valueStr})`;
                pubGroup.appendChild(opt);
            });
            select.appendChild(pubGroup);
        }

        if (myCodes.length === 0 && publicCodes.length === 0) {
            select.innerHTML = '<option value="">No codes available</option>';
            select.disabled = true;
        }

    } catch (err) {
        console.error('Error loading discount codes:', err);
    }
}

async function applyDiscount() {
    const codeSelect = document.getElementById('discountCodeInput');
    const msgDiv = document.getElementById('discountMsg');
    const btn = document.getElementById('btnApplyDiscount');
    const code = codeSelect.value;

    if (!code) {
        msgDiv.className = 'small mt-1 text-warning';
        msgDiv.innerText = 'Please select a code';
        return;
    }

    // UI Loading
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    msgDiv.className = 'small mt-1 text-muted';
    msgDiv.innerText = 'Applying...';

    try {
        const response = await fetch('/api/discounts/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code, programId: programId })
        });

        const result = await response.json();

        if (result.valid) {
            currentDiscount = result.discount;

            // Lock dropdown
            codeSelect.disabled = true;
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.classList.replace('btn-dark', 'btn-success');

            // Update message (will show combined discounts)
            updateDiscountMessage();
            updateSummary();
        } else {
            currentDiscount = null;
            msgDiv.className = 'small mt-1 text-danger';
            msgDiv.innerText = result.message || 'Invalid code';
            btn.disabled = false;
            btn.innerHTML = 'Apply';
            updateSummary(); // Reset total
        }
    } catch (error) {
        console.error('Discount Valid Error:', error);
        msgDiv.className = 'small mt-1 text-danger';
        msgDiv.innerText = 'Error validating code';
        btn.disabled = false;
        btn.innerHTML = 'Apply';
    }
}

function submitEnrollment() {
    // Validation (Moved from nextStep)
    if (!document.getElementById('firstName').value || !document.getElementById('lastName').value || !document.getElementById('email').value) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Information',
            text: 'Please fill in all contact details.',
            confirmButtonColor: '#d32f2f'
        });
        return;
    }

    // Child program selection is OPTIONAL, but if selected, SLOTS might be required
    for (const child of selectedChildPrograms) {
        // Check if there's a visible slot selector for this child
        const slotSelect = document.querySelector(`#slot_child_${child.id}`);
        if (slotSelect && slotSelect.style.display !== 'none' && !child.slotId) {
            Swal.fire({
                icon: 'warning',
                title: 'Session Required',
                html: `Please select a session time for <b>${child.title}</b>`,
                confirmButtonColor: '#d32f2f'
            });
            return;
        }
    }

    // COLLECT DATA
    const count = document.getElementById('participantCount').value;
    const slot = document.getElementById('selectedSlot').value;

    // Calculate Total properly (re-using logic from updateSummary)
    let total = price * count;

    // Apply Bundle Discount
    if (bundleDiscount) {
        if (bundleDiscount.type === 'Percentage') {
            total -= total * (bundleDiscount.value / 100);
        } else {
            total -= bundleDiscount.value;
        }
    }

    // Apply Reference Code Discount
    if (currentDiscount) {
        if (currentDiscount.type === 'Percentage') {
            total -= total * (currentDiscount.value / 100);
        } else {
            total -= currentDiscount.value;
        }
    }

    if (total < 0) total = 0;

    // Extra Details
    const details = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
    };

    if (type === 'Trip') {
        details.passport = document.getElementById('passport').value;
        details.dietary = document.getElementById('dietary').value;
    } else if (type === 'Lesson') {
        details.cameraConfirmed = document.getElementById('cameraCheck')?.checked || false;
        details.internetConfirmed = document.getElementById('internetCheck')?.checked || false;
    }

    // Always include selected child programs if any (works for Lesson & Edu)
    if (selectedChildPrograms.length > 0) {
        details.childProgramIds = selectedChildPrograms.map(p => p.id);
        details.childPrograms = selectedChildPrograms; // Store full object with slotId
        details.childProgramTitles = selectedChildPrograms.map(p => p.title).join(', ');
    }

    if (currentDiscount) {
        details.discountCode = currentDiscount.code;
        details.discountValue = currentDiscount.value;
        details.discountType = currentDiscount.type;
    }

    // ENCODE AND REDIRECT
    const detailsStr = encodeURIComponent(JSON.stringify(details));
    const slotStr = encodeURIComponent(slot || ''); // Pass ID

    // Get formatted date for display
    const dateDisplay = document.getElementById('summaryDate').innerText;
    const dateAppend = (slot && dateDisplay !== '-') ? ` - ${dateDisplay}` : '';

    // Include child program in item display if selected
    let itemDisplay = item;
    if (selectedChildPrograms.length > 0) {
        const titles = selectedChildPrograms.map(p => p.title).join(', ');
        itemDisplay = `${item} - ${titles.length > 20 ? titles.substring(0, 20) + '...' : titles}`;
    }

    const itemStr = encodeURIComponent(`${itemDisplay} (${count} pax)${dateAppend}`);
    const imgStr = encodeURIComponent(image);

    // SAVE TO SESSION STORAGE (For Success Page)
    const member = JSON.parse(localStorage.getItem('memberDetails'));
    const userId = member ? (member.memberID || member.id || member.UserID) : null;

    if (!userId) {
        Swal.fire({
            icon: 'warning',
            title: 'Login Required',
            text: 'Please log in to enroll in this program.',
            confirmButtonColor: '#d32f2f'
        }).then(() => {
            window.location.href = 'login.html';
        });
        return;
    }

    const pendingData = {
        userId: userId,
        programId: parseInt(programId),
        childProgramIds: selectedChildPrograms.map(p => p.id),
        childSlots: selectedChildPrograms.map(p => ({ programId: p.id, slotId: p.slotId })), // New: Store child slots
        slotId: slot ? parseInt(slot) : null,
        details: details,
        amount: total
    };
    sessionStorage.setItem('pendingEnrollment', JSON.stringify(pendingData));

    // Redirect to payment (Pass childIDs if needed in URL, but details has them)
    // We can skip passing childId param in URL since details has everything for backend
    window.location.href = `payment.html?id=${programId}&price=${total}&item=${itemStr}&image=${imgStr}&slot=${slotStr}&details=${detailsStr}`;
}