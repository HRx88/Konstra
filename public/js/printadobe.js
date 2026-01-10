// Helper function (internal)
function goToEnrollment(id, item, type, price, imageUrl) {
    const url = `enrollment.html?id=${id}&item=${encodeURIComponent(item)}&type=${encodeURIComponent(type)}&price=${price}&image=${encodeURIComponent(imageUrl)}`;
    window.location.href = url;
}

document.addEventListener('DOMContentLoaded', () => {
    loadPrograms();
    setupEventListeners();
});

function setupEventListeners() {
    // Delegation for Education List
    document.getElementById('education-list')?.addEventListener('click', handleEnrollClick);
    // Delegation for Trip List
    document.getElementById('trip-list')?.addEventListener('click', handleEnrollClick);
}

function handleEnrollClick(e) {
    const btn = e.target.closest('.btn-custom');
    if (btn) {
        goToEnrollment(
            btn.dataset.id,
            btn.dataset.title,
            btn.dataset.type,
            btn.dataset.price,
            btn.dataset.image
        );
    }
}

async function loadPrograms() {
    try {
        const response = await fetch('/api/programs');
        if (!response.ok) throw new Error('Failed to load programs');

        const programs = await response.json();

        const eduContainer = document.getElementById('education-list');
        const tripContainer = document.getElementById('trip-list');

        // Clear Loaders
        eduContainer.innerHTML = '';
        tripContainer.innerHTML = '';

        if (programs.length === 0) {
            eduContainer.innerHTML = '<p class="text-center">No active programs found.</p>';
        }

        programs.forEach(program => {
            const isTrip = program.Type === 'Trip';
            const container = isTrip ? tripContainer : eduContainer;

            const enrolled = program.EnrolledCount || 0;
            const max = program.MaxParticipants || 20;

            // Logic for badges
            let badge = '';
            if (enrolled >= max) {
                badge = `<span class="spots-badge full"><i class="fas fa-ban me-1"></i> Full</span>`;
            } else if (enrolled >= max * 0.8) {
                badge = `<span class="spots-badge full"><i class="fas fa-fire me-1"></i> ${enrolled}/${max} Filling Fast</span>`;
            } else {
                badge = `<span class="spots-badge"><i class="fas fa-user-check me-1"></i> ${enrolled}/${max} Enrolled</span>`;
            }

            // Fallback Image
            const image = program.ImageURL || 'https://images.unsplash.com/photo-1581092921461-eab6245b0262';

            const html = `
            <div class="${isTrip ? 'col-md-4' : 'col-md-6 col-lg-3'}">
                <div class="program-card">
                    <div style="position: relative;">
                        <img src="${image}" class="card-img-top" alt="${program.Title}" style="height: 200px; object-fit: cover;">
                        <div style="position:absolute; top:10px; right:10px;">${badge}</div>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">${program.Title}</h5>

                        ${isTrip ? `
                        <div class="trip-meta">
                            <span><i class="fas fa-map-marker-alt text-danger"></i> ${program.Location || 'TBA'}</span>
                            <span><i class="fas fa-clock text-danger"></i> ${program.Duration || 'TBA'}</span>
                        </div>
                        ` : ''}

                        <p class="card-text">${program.Description ? program.Description.substring(0, 80) + '...' : 'Create the future with us.'}</p>
                        <div class="price-tag">$${program.Price} <span class="price-sub">/ ${isTrip ? 'person' : 'course'}</span></div>
                        <button class="btn btn-custom"
                            data-id="${program.ProgramID}" 
                            data-title="${program.Title.replace(/"/g, "&quot;")}" 
                            data-type="${program.Type}" 
                            data-price="${program.Price}" 
                            data-image="${image}">
                            ${isTrip ? 'Book Trip' : 'Enroll Now'}
                        </button>
                        
                        ${!isTrip ? `<a href="printadobe-details.html?id=${program.ProgramID}" class="btn btn-link w-100 text-decoration-none mt-2" style="color:#555;">View Details</a>` : ''}
                    </div>
                </div>
            </div>
            `;

            container.innerHTML += html;
        });

    } catch (err) {
        console.error("Fetch Error:", err);
    }
}
