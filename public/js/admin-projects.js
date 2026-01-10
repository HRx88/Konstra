document.addEventListener('DOMContentLoaded', () => {
    fetchNGOs();
    setupLiveUpdates();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });

    document.getElementById('progress')?.addEventListener('input', (e) => updateProgressBar(e.target.value));

    document.getElementById('btnResetChanges')?.addEventListener('click', () => {
        const id = document.getElementById('selectedNgoId').value;
        if (id) loadNGOStats(id);
    });

    document.getElementById('ngoStatsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('selectedNgoId').value;

        const apiData = {
            totalFunding: document.getElementById('totalFunding').value,
            progress: document.getElementById('progress').value,
            housesBuilt: document.getElementById('housesBuilt').value,
            homesCompleted: document.getElementById('homesCompleted').value,
            constructionInProgress: document.getElementById('constructionInProgress').value,
            impactedFamilies: document.getElementById('impactedFamilies').value,
            co2Saved: document.getElementById('co2Saved').value
        };

        try {
            const response = await fetch(`/api/ngo-stats/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiData)
            });

            if (response.ok) {
                showStatus('Statistics updated successfully', 'success');
            } else {
                throw new Error('Update failed');
            }
        } catch (error) {
            showStatus('Network error during synchronization', 'danger');
        }
    });
}

async function fetchNGOs() {
    try {
        const response = await fetch('/api/ngo-stats/ngos');
        const ngos = await response.json();

        const list = document.getElementById('ngoCardList');
        list.innerHTML = '';

        if (ngos.length === 0) {
            list.innerHTML = '<div class="alert alert-info w-100">No NGOs available.</div>';
            return;
        }

        ngos.forEach(ngo => {
            const card = document.createElement('div');
            card.className = 'ngo-item-card';
            card.id = `ngo-card-${ngo.ID}`;
            // Refactored to use standard addEventListener in loop or delegation if preferred, 
            // but for now keeping direct attachment in JS creation or move to delegation if list re-renders often.
            // Since it's dynamic, direct property or delegation is ok. Let's use listener.
            card.addEventListener('click', () => selectNGO(ngo.ID));

            // Image logic: Use ProfilePicture if available, else use Icon
            let avatarHtml = '';
            if (ngo.ProfilePicture) {
                avatarHtml = `<img src="${ngo.ProfilePicture}" alt="Profile" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">`;
            } else {
                avatarHtml = `
                    <div class="ngo-avatar">
                        <i class="fas fa-building"></i>
                    </div>`;
            }

            card.innerHTML = `
                ${avatarHtml}
                <div class="ngo-info">
                    <h6>${ngo.Username}</h6>
                    <p>${ngo.Email}</p>
                </div>
            `;
            list.appendChild(card);
        });
    } catch (error) {
        showStatus('Error synchronizing with NGO records', 'danger');
    }
}

function selectNGO(userId) {
    const cards = document.querySelectorAll('.ngo-item-card');
    cards.forEach(c => c.classList.remove('active'));

    const selectedCard = document.getElementById(`ngo-card-${userId}`);
    if (selectedCard) {
        selectedCard.classList.add('active');
    }

    loadNGOStats(userId);
}

async function loadNGOStats(userId) {
    if (!userId) return;

    try {
        const response = await fetch(`/api/ngo-stats/${userId}`);
        const stats = await response.json();

        document.getElementById('selectedNgoId').value = userId;
        document.getElementById('statsFormContainer').style.display = 'block';
        document.getElementById('placeholderState').style.display = 'none';

        // Fill form
        document.getElementById('totalFunding').value = stats.TotalFunding || 0;
        document.getElementById('progress').value = stats.Progress || 0;
        document.getElementById('housesBuilt').value = stats.HousesBuilt || 0;
        document.getElementById('homesCompleted').value = stats.HomesCompleted || 0;
        document.getElementById('constructionInProgress').value = stats.ConstructionInProgress || 0;
        document.getElementById('impactedFamilies').value = stats.ImpactedFamilies || 0;
        document.getElementById('co2Saved').value = stats.CO2Saved || 0;

        updateProgressBar(stats.Progress || 0);

        // Render Charts with new data
        initCharts(stats);

    } catch (error) {
        showStatus('Error fetching NGO statistics', 'danger');
    }
}

function updateProgressBar(value) {
    const bar = document.getElementById('progressBar');
    bar.style.width = Math.min(Math.max(value, 0), 100) + '%';
}

// --- Chart.js Integration & Logic ---
let statusChartInstance = null;
let impactChartInstance = null;

function getFormData() {
    return {
        HomesCompleted: document.getElementById('homesCompleted').value,
        ConstructionInProgress: document.getElementById('constructionInProgress').value,
        HousesBuilt: document.getElementById('housesBuilt').value,
        ImpactedFamilies: document.getElementById('impactedFamilies').value
    };
}

function setupLiveUpdates() {
    const inputs = ['homesCompleted', 'constructionInProgress', 'housesBuilt', 'impactedFamilies'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            const data = getFormData();
            initCharts(data); // Re-render/update charts on input
        });
    });
}

function initCharts(stats) {
    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    const ctxImpact = document.getElementById('impactChart').getContext('2d');

    // Data prep
    const completed = parseInt(stats.HomesCompleted) || 0;
    const inProgress = parseInt(stats.ConstructionInProgress) || 0;
    const target = parseInt(stats.HousesBuilt) || 0;
    const remaining = Math.max(0, target - completed - inProgress);
    const families = parseInt(stats.ImpactedFamilies) || 0;

    // 1. Doughnut Chart (Status)
    if (statusChartInstance) {
        // Update existing
        statusChartInstance.data.datasets[0].data = [completed, inProgress, remaining];
        statusChartInstance.update();
    } else {
        // Create new
        statusChartInstance = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'In Progress', 'Remaining'],
                datasets: [{
                    data: [completed, inProgress, remaining],
                    backgroundColor: ['#198754', '#ffc107', '#e9ecef'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } }
                },
                cutout: '70%',
                animation: { duration: 500 } // Faster animation for live typing
            }
        });
    }

    // 2. Bar Chart (Impact)
    if (impactChartInstance) {
        // Update existing
        impactChartInstance.data.datasets[0].data = [target, completed, families];
        impactChartInstance.update();
    } else {
        // Create new
        impactChartInstance = new Chart(ctxImpact, {
            type: 'bar',
            data: {
                labels: ['Target Homes', 'Built Homes', 'Families Impacted'],
                datasets: [{
                    label: 'Count',
                    data: [target, completed, families],
                    backgroundColor: ['#d32f2f', '#198754', '#0d6efd'],
                    borderRadius: 4,
                    barThickness: 30
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { drawBorder: false } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } },
                animation: { duration: 500 }
            }
        });
    }
}

function showStatus(text, type) {
    const msg = document.getElementById('statusMessage');
    msg.className = `alert alert-${type} shadow-sm`;
    msg.innerText = text;
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 2500);
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}
