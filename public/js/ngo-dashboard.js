document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Check with robust ID fallback
    const user = JSON.parse(localStorage.getItem('currentUser')) ||
        JSON.parse(localStorage.getItem('memberDetails')) ||
        JSON.parse(localStorage.getItem('adminDetails'));

    if (!user) {
        console.warn('No user logged in - Dashboard may be empty');
        document.getElementById('welcomeMsg').innerText = "Welcome, Guest";
    } else {
        document.getElementById('welcomeMsg').innerText = `Welcome, ${user.username}`;
    }

    document.getElementById('dateDisplay').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // 2. Load Stats & Setup Dynamic Polling
    const userId = user?.memberID || user?.adminID || user?.id;

    if (userId) {
        await loadMyStats(userId);

        // Poll for changes every 3 seconds to keep dashboard live
        setInterval(() => loadMyStats(userId, true), 3000);
    } else {
        console.error("User ID could not be determined from session.");
    }

    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });
});

// Store last known stats to avoid redundant updates
let lastStatsHash = "";

async function loadMyStats(userId, isUpdate = false) {
    try {
        const response = await fetch(`/api/ngo-stats/${userId}`);
        const stats = await response.json();

        // Create a simple hash of the values to check for changes
        // Using JSON.stringify is sufficient for this data shape
        const currentStatsHash = JSON.stringify(stats);

        // If this is a background update and data hasn't changed, do nothing
        if (isUpdate && currentStatsHash === lastStatsHash) {
            return;
        }

        // Update the hash store
        lastStatsHash = currentStatsHash;

        // Update Cards
        document.getElementById('dispFunding').innerText = '$' + (stats.TotalFunding || 0).toLocaleString();
        document.getElementById('dispHomes').innerText = stats.HomesCompleted || 0;
        document.getElementById('dispFamilies').innerText = stats.ImpactedFamilies || 0;
        document.getElementById('dispCO2').innerText = (stats.CO2Saved || 0).toLocaleString() + ' kg';
        document.getElementById('progressPercentage').innerText = (stats.Progress || 0) + '%';

        // Initialize or Update Charts
        initCharts(stats);

    } catch (error) {
        if (!isUpdate) console.error('Error loading stats:', error);
    }
}

// Keep chart references
let barChartInstance = null;
let doughnutChartInstance = null;

function initCharts(stats) {
    const ctxBar = document.getElementById('mainBarChart').getContext('2d');
    const ctxDoughnut = document.getElementById('progressDoughnutChart').getContext('2d');

    const completed = parseInt(stats.HomesCompleted) || 0;
    const inProgress = parseInt(stats.ConstructionInProgress) || 0;
    const target = parseInt(stats.HousesBuilt) || 0;
    const remaining = Math.max(0, 100 - (stats.Progress || 0));

    // 1. Handle Bar Chart
    if (barChartInstance) {
        // Update existing
        barChartInstance.data.datasets[0].data = [target, completed, inProgress];
        barChartInstance.update();
    } else {
        // Create new
        const gradientPrimary = ctxBar.createLinearGradient(0, 0, 0, 400);
        gradientPrimary.addColorStop(0, '#4834d4');
        gradientPrimary.addColorStop(1, '#686de0');

        const gradientSuccess = ctxBar.createLinearGradient(0, 0, 0, 400);
        gradientSuccess.addColorStop(0, '#20bf6b');
        gradientSuccess.addColorStop(1, '#0eb87f');

        const gradientWarning = ctxBar.createLinearGradient(0, 0, 0, 400);
        gradientWarning.addColorStop(0, '#f7b731');
        gradientWarning.addColorStop(1, '#fed330');

        barChartInstance = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Target Goal', 'Completed Homes', 'In Progress'],
                datasets: [{
                    label: 'Units',
                    data: [target, completed, inProgress],
                    backgroundColor: [gradientPrimary, gradientSuccess, gradientWarning],
                    borderRadius: 8,
                    barThickness: 60,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.05)',
                            borderDash: [5, 5]
                        },
                        ticks: { font: { family: "'Segoe UI', sans-serif" } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { family: "'Segoe UI', sans-serif", weight: 'bold' },
                            color: '#636e72'
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#2d3436',
                        padding: 12,
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 },
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    // 2. Handle Doughnut Chart
    if (doughnutChartInstance) {
        // Update existing
        doughnutChartInstance.data.datasets[0].data = [stats.Progress || 0, remaining];
        doughnutChartInstance.update();
    } else {
        // Create new
        doughnutChartInstance = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: ['Complete', 'Remaining'],
                datasets: [{
                    data: [stats.Progress || 0, remaining],
                    backgroundColor: ['#d32f2f', '#ecf0f1'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '85%',
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true,
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
