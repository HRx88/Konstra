// STATE
let allPrograms = [];
let currentCategory = 'Education';
let searchQuery = '';

// INIT
document.addEventListener('DOMContentLoaded', () => {
    const member = JSON.parse(localStorage.getItem('memberDetails'));
    if (!member) { window.location.href = 'login.html'; return; }

    setupEventListeners();
    loadCatalog();
});

function setupEventListeners() {
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });

    // Search logic
    document.getElementById('catalogSearch')?.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderCatalog();
    });
}

function filterCategory(category) {
    currentCategory = category;

    // Update active tab UI
    document.querySelectorAll('#catalogTabs .nav-link').forEach(btn => {
        btn.classList.remove('active');
    });
    const id = category === 'Education' ? 'tab-program' : (category === 'Trip' ? 'tab-trip' : 'tab-lesson');
    document.getElementById(id)?.classList.add('active');

    renderCatalog();
}

async function loadCatalog() {
    const loader = document.getElementById('loader');
    const grid = document.getElementById('catalogGrid');

    try {
        const res = await fetch('/api/programs');
        if (!res.ok) throw new Error('Failed to load catalog');

        allPrograms = await res.json();

        loader.style.display = 'none';
        grid.style.display = 'flex';

        renderCatalog();
    } catch (err) {
        console.error("Catalog Load Error:", err);
        loader.innerHTML = `<p class="text-danger">Failed to load opportunities. Please try again.</p>`;
    }
}

function renderCatalog() {
    const grid = document.getElementById('catalogGrid');
    const emptyState = document.getElementById('emptyState');

    // Filter by category and search query
    let filtered = allPrograms.filter(p => {
        const matchesCategory = p.Type === currentCategory;
        const matchesSearch = p.Title.toLowerCase().includes(searchQuery) ||
            (p.Description && p.Description.toLowerCase().includes(searchQuery));
        return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    grid.style.display = 'flex';
    emptyState.style.display = 'none';

    grid.innerHTML = filtered.map((p, index) => {
        const isTrip = p.Type === 'Trip';
        const image = p.ImageURL || 'https://images.unsplash.com/photo-1581092921461-eab6245b0262';
        const enrolled = p.EnrolledCount || 0;
        const max = p.MaxParticipants || 20;
        const spotsLeft = max - enrolled;

        return `
        <div class="col-md-6 col-lg-4 fade-in" style="animation-delay: ${index * 0.1}s">
            <div class="card h-100 shadow-sm border-0 catalog-card">
                <div class="position-relative">
                    <img src="${image}" class="card-img-top" alt="${p.Title}" style="height: 200px; object-fit: cover;">
                    <div class="position-absolute top-0 end-0 m-3">
                        <span class="badge ${spotsLeft > 5 ? 'bg-success' : 'bg-danger'} shadow-sm">
                            ${spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}
                        </span>
                    </div>
                </div>
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title fw-bold mb-0">${p.Title}</h5>
                        <span class="text-primary fw-bold">$${p.Price}</span>
                    </div>
                    
                    <p class="card-text text-muted small mb-3">
                        ${p.Description ? p.Description.substring(0, 100) + '...' : 'Unlock your potential with this Konstra session.'}
                    </p>

                    ${isTrip ? `
                    <div class="mb-3 p-2 bg-light rounded small">
                        <div class="mb-1"><i class="fas fa-map-marker-alt text-danger me-2"></i>${p.Location || 'TBA'}</div>
                        <div><i class="fas fa-calendar-day text-danger me-2"></i>${p.Duration || 'TBA'}</div>
                    </div>
                    ` : ''}

                    <div class="mt-auto pt-3 border-top d-flex gap-2">
                        <button onclick="goToEnrollment('${p.ProgramID}', '${p.Title}', '${p.Type}', '${p.Price}', '${image}')" 
                                class="btn btn-dark flex-grow-1" ${spotsLeft <= 0 ? 'disabled' : ''}>
                            ${isTrip ? 'Book Trip' : 'Enroll Now'}
                        </button>
                        <a href="printadobe-details.html?id=${p.ProgramID}" class="btn btn-outline-dark">
                            <i class="fas fa-info-circle"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function goToEnrollment(id, item, type, price, imageUrl) {
    const url = `enrollment.html?id=${id}&item=${encodeURIComponent(item)}&type=${encodeURIComponent(type)}&price=${price}&image=${encodeURIComponent(imageUrl)}`;
    window.location.href = url;
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
