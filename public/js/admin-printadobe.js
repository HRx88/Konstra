let allPrograms = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    // Check Admin Auth
    const admin = JSON.parse(localStorage.getItem('adminDetails'));
    if (!admin) { window.location.href = 'login.html'; return; }

    loadPrograms();
    setupEventListeners();
});

function setupEventListeners() {
    // Static
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });
    document.getElementById('btnAddProgram')?.addEventListener('click', openModal);
    document.getElementById('btnSaveProgram')?.addEventListener('click', saveProgram);

    // Slot Actions
    document.getElementById('btnAddSlot')?.addEventListener('click', addSlot);
    document.getElementById('btnUpdateSlot')?.addEventListener('click', updateSlot);
    document.getElementById('btnCancelSlot')?.addEventListener('click', resetSlotForm);

    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => filterPrograms(e.currentTarget.dataset.filter, e.currentTarget));
    });

    // Delegation: Programs Grid
    document.getElementById('programsGrid')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.classList.contains('btn-edit')) {
            editProgram(parseInt(btn.dataset.id));
        } else if (btn.classList.contains('btn-delete')) {
            deleteProgram(parseInt(btn.dataset.id));
        } else if (btn.classList.contains('btn-manage-modules')) {
            window.location.href = `admin-program-modules.html?programId=${btn.dataset.id}`;
        } else if (btn.classList.contains('btn-manage-slots')) {
            manageSlots(parseInt(btn.dataset.id), btn.dataset.title, btn.dataset.type);
        }
    });

    // Delegation: Slots List
    document.getElementById('slotsList')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && btn.classList.contains('btn-delete-slot')) {
            deleteSlot(parseInt(btn.dataset.id));
        }
    });
}

function logout() { localStorage.clear(); window.location.href = "index.html"; }

// --- 1. READ (Fetch) ---
async function loadPrograms() {
    try {
        // Ensure you added this route in app.js: app.use('/api/programs', programRoutes);
        const response = await fetch('/api/programs');
        const data = await response.json();

        if (Array.isArray(data)) {
            allPrograms = data;
            renderPrograms();
        }
    } catch (error) {
        console.error(error);
        document.getElementById('programsGrid').innerHTML = '<p class="text-danger text-center">Failed to load programs.</p>';
    }
}

// --- 2. RENDER (With Filter) ---
function filterPrograms(type, targetBtn) {
    currentFilter = type;

    // Update active tab UI
    document.querySelectorAll('.nav-pills .nav-link').forEach(btn => btn.classList.remove('active'));
    targetBtn.classList.add('active');

    renderPrograms();
}

function renderPrograms() {
    const grid = document.getElementById('programsGrid');
    const filtered = currentFilter === 'all'
        ? allPrograms
        : allPrograms.filter(p => p.Type === currentFilter);

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center text-muted py-5">No programs found in this category.</div>';
        return;
    }

    grid.innerHTML = filtered.map(p => `
        <div class="col-md-4 col-lg-3">
            <div class="program-card position-relative">
                <span class="badge badge-type ${p.Type === 'Education' ? 'badge-edu' : 'badge-trip'}">
                    ${p.Type}
                </span>
                <img src="${p.ImageURL || 'https://via.placeholder.com/300'}" class="card-img-top" alt="Program">
                <div class="card-body">
                    <h5 class="fw-bold mb-2 text-truncate">${p.Title}</h5>
                    <div class="small text-muted mb-2">
                        <i class="fas fa-clock me-1"></i> ${p.Duration} &bull; 
                        <i class="fas fa-map-marker-alt ms-1"></i> ${p.Location || 'Online'}
                    </div>
                    <div class="price-tag">$${p.Price}</div>
                    
                    <div class="mt-3 pt-3 border-top d-flex gap-2">
                        <button class="btn btn-outline-dark btn-sm flex-grow-1 btn-edit" data-id="${p.ProgramID}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-outline-danger btn-sm btn-delete" data-id="${p.ProgramID}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <button class="btn btn-outline-secondary w-100 mt-2 btn-sm btn-manage-modules" data-id="${p.ProgramID}">
                        <i class="fas fa-book me-1"></i> Manage Modules
                    </button>
                    ${(p.Type === 'Education' || p.Type === 'Lesson') ? `
                    <button class="btn btn-outline-primary w-100 mt-2 btn-sm btn-manage-slots" data-id="${p.ProgramID}" data-title="${p.Title.replace(/"/g, "&quot;")}" data-type="${p.Type}">
                        <i class="fas fa-calendar-alt me-1"></i> Manage Sessions
                    </button>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// --- 3. CREATE / EDIT SETUP ---
const modal = new bootstrap.Modal(document.getElementById('programModal'));

function openModal() {
    document.getElementById('programForm').reset();
    document.getElementById('programId').value = '';
    document.getElementById('modalTitle').innerText = 'Add New Program';
    modal.show();
}

function editProgram(id) {
    const p = allPrograms.find(x => x.ProgramID === id);
    if (!p) return;

    document.getElementById('programId').value = p.ProgramID;
    document.getElementById('title').value = p.Title;
    document.getElementById('type').value = p.Type;
    document.getElementById('description').value = p.Description;
    document.getElementById('price').value = p.Price;
    document.getElementById('duration').value = p.Duration;
    document.getElementById('maxParticipants').value = p.MaxParticipants;
    document.getElementById('location').value = p.Location;
    document.getElementById('imageURL').value = p.ImageURL;

    document.getElementById('modalTitle').innerText = 'Edit Program';
    modal.show();
}

// --- 4. CREATE / UPDATE ACTION ---
async function saveProgram() {
    const id = document.getElementById('programId').value;
    const data = {
        title: document.getElementById('title').value,
        type: document.getElementById('type').value,
        description: document.getElementById('description').value,
        price: document.getElementById('price').value,
        duration: document.getElementById('duration').value,
        maxParticipants: document.getElementById('maxParticipants').value,
        location: document.getElementById('location').value,
        imageURL: document.getElementById('imageURL').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/programs/${id}` : '/api/programs/create';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            modal.hide();
            Swal.fire('Success', `Program ${id ? 'Updated' : 'Created'}!`, 'success');
            loadPrograms();
        } else {
            Swal.fire('Error', 'Failed to save program', 'error');
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Network Error', 'error');
    }
}

// --- 5. DELETE ACTION ---
async function deleteProgram(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "This will deactivate the program.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d32f2f',
        confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/programs/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    Swal.fire('Deleted!', 'Program has been deleted.', 'success');
                    loadPrograms();
                } else {
                    Swal.fire('Error', 'Could not delete.', 'error');
                }
            } catch (err) {
                Swal.fire('Error', 'Network error.', 'error');
            }
        }
    })
}

// --- 6. SLOT MANAGEMENT ---
const slotModal = new bootstrap.Modal(document.getElementById('slotsModal'));
let currentProgramIdArgs = null;
let currentProgramType = null;
let editingSlotId = null; // Track if we are editing

function manageSlots(pid, title, type) {
    currentProgramIdArgs = pid;
    currentProgramType = type;
    document.getElementById('slotProgramTitle').innerText = title;

    resetSlotForm();

    // Show/hide Meeting URL field based on program type
    const meetingUrlRow = document.getElementById('meetingUrlRow');
    if (meetingUrlRow) {
        meetingUrlRow.style.display = (type === 'Lesson') ? 'flex' : 'none';
    }

    loadSlots(pid);
    slotModal.show();
}

function resetSlotForm() {
    editingSlotId = null;
    document.getElementById('newSlotStart').value = '';
    document.getElementById('newSlotEnd').value = '';
    document.getElementById('newSlotCapacity').value = '20';
    document.getElementById('newSlotMeetingURL').value = '';

    // Switch Buttons
    document.getElementById('btnAddSlot').classList.remove('d-none');
    document.getElementById('btnUpdateSlot').classList.add('d-none');
    document.getElementById('btnCancelSlot').classList.add('d-none');
}

async function loadSlots(pid) {
    const container = document.getElementById('slotsList');
    container.innerHTML = '<div class="text-center"><div class="spinner-border text-secondary"></div></div>';

    try {
        const res = await fetch(`/api/programs/${pid}/slots`);
        const slots = await res.json();

        if (slots.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No active sessions.</p>';
            return;
        }

        // Table similar to screenshot style
        container.innerHTML = `<table class="table align-middle">
            <thead>
                <tr>
                    <th scope="col">Start</th>
                    <th scope="col">End</th>
                    <th scope="col">Booked/Cap</th>
                    <th scope="col">Meeting Link</th>
                    <th scope="col" class="text-end">Action</th>
                </tr>
            </thead>
            <tbody>
                ${slots.map(s => {
            const start = new Date(s.StartTime).toLocaleString();
            const end = new Date(s.EndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const rawStart = new Date(s.StartTime).toISOString().slice(0, 16);
            const rawEnd = new Date(s.EndTime).toISOString().slice(0, 16);

            const meetingLink = s.MeetingURL
                ? `<a href="${s.MeetingURL}" target="_blank" class="btn btn-sm btn-outline-primary" title="${s.MeetingURL}"><i class="fas fa-video"></i></a>`
                : '<span class="text-muted">-</span>';

            return `
                        <tr>
                            <td>${start}</td>
                            <td>${end}</td>
                            <td>${s.BookedCount} / ${s.Capacity}</td>
                            <td>${meetingLink}</td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-outline-primary btn-edit-slot me-1" 
                                    onclick="editSlot(${s.SlotID}, '${rawStart}', '${rawEnd}', ${s.Capacity}, '${s.MeetingURL || ''}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger btn-delete-slot" data-id="${s.SlotID}"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>`;
        }).join('')}
            </tbody>
        </table>`;

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p class="text-danger">Failed to load slots.</p>';
    }
}

// Make global
window.editSlot = function (id, start, end, cap, url) {
    editingSlotId = id;

    // Populate form
    document.getElementById('newSlotStart').value = start;
    document.getElementById('newSlotEnd').value = end;
    document.getElementById('newSlotCapacity').value = cap;
    document.getElementById('newSlotMeetingURL').value = url;

    // Switch Buttons
    document.getElementById('btnAddSlot').classList.add('d-none');
    document.getElementById('btnUpdateSlot').classList.remove('d-none');
    document.getElementById('btnCancelSlot').classList.remove('d-none');

    // Listener for static buttons (ensure not duplicated or move to setupEventListeners)
    // We'll rely on global onclick or setupEventListeners. 
    // Ideally update setupEventListeners, but updating logic here for now.
};

async function addSlot() {
    await saveSlot(false);
}

// Separate function for Update button logic
async function updateSlot() {
    await saveSlot(true);
}

async function saveSlot(isUpdate) {
    const start = document.getElementById('newSlotStart').value;
    const end = document.getElementById('newSlotEnd').value;
    const cap = document.getElementById('newSlotCapacity').value;
    const meetingURL = document.getElementById('newSlotMeetingURL').value;

    if (!start || !end || !currentProgramIdArgs) {
        Swal.fire('Error', 'Please verify times.', 'error');
        return;
    }

    const payload = { startTime: start, endTime: end, capacity: cap, meetingURL: meetingURL || null };

    try {
        let res;
        if (isUpdate && editingSlotId) {
            res = await fetch(`/api/programs/slots/${editingSlotId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(`/api/programs/${currentProgramIdArgs}/slots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (res.ok) {
            resetSlotForm();
            loadSlots(currentProgramIdArgs);
            Swal.fire('Success', isUpdate ? 'Session updated' : 'Session added', 'success');
        } else {
            Swal.fire('Error', 'Failed to save session', 'error');
        }
    } catch (e) { console.error(e); }
}

async function deleteSlot(slotId) {
    if (!confirm("Delete this session?")) return;

    try {
        const res = await fetch(`/api/programs/slots/${slotId}`, { method: 'DELETE' });
        if (res.ok) {
            loadSlots(currentProgramIdArgs);
        } else {
            Swal.fire('Error', 'Cannot delete (probably booked)', 'error');
        }
    } catch (e) { console.error(e); }
}
