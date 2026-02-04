document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileDashToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });

    document.getElementById('announcementForm')?.addEventListener('submit', handleAnnouncementSubmit);

    // Fetch and Load Stats
    loadAdminStats();
});

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

// Pre-fill Admin Name
const admin = JSON.parse(localStorage.getItem('adminDetails'));
if (admin) {
    document.getElementById('adminWelcome').innerText = `Welcome back, ${admin.username || admin.Username}`;
}

async function handleAnnouncementSubmit(e) {
    e.preventDefault();
    if (!admin) return alert('Admin session not found');

    const title = document.getElementById('annTitle').value;
    const content = document.getElementById('annContent').value;
    const priority = document.getElementById('annPriority').value;

    try {
        const res = await fetch('/api/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                content,
                priority,
                createdBy: admin.adminID || admin.AdminID // Ensure ID exists
            })
        });

        if (res.ok) {
            // Close Modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createAnnouncementModal'));
            modal.hide();

            // Show Success Toast
            const toast = new bootstrap.Toast(document.getElementById('liveToast'));
            toast.show();

            // Reset Form
            document.getElementById('announcementForm').reset();
        } else {
            console.error('Failed to post announcement');
            const toast = new bootstrap.Toast(document.getElementById('errorToast'));
            toast.show();
        }
    } catch (err) {
        console.error(err);
        const toast = new bootstrap.Toast(document.getElementById('errorToast'));
        toast.show();
    }
}

async function loadAdminStats() {
    try {
        const res = await fetch('/api/admin/stats/dashboard');

        if (res.ok) {
            const data = await res.json();

            if (data.kpis) {
                document.getElementById('totalUsersVal').innerText = data.kpis.TotalUsers?.toLocaleString() || '0';
                document.getElementById('revenueVal').innerText = '$' + (data.kpis.Revenue?.toLocaleString() || '0');
                document.getElementById('programsVal').innerText = data.kpis.ActivePrograms?.toLocaleString() || '0';
                document.getElementById('pendingVal').innerText = data.kpis.PendingRequests?.toLocaleString() || '0';
            }

            if (data.activity) {
                const tableBody = document.querySelector('tbody');
                if (data.activity.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No recent activity</td></tr>';
                } else {
                    tableBody.innerHTML = data.activity.map(item => {
                        const initial = item.Username ? item.Username.charAt(0).toUpperCase() : 'U';
                        return `
                        <tr>
                            <td class="ps-4">
                                <div class="d-flex align-items-center gap-3">
                                    ${item.ProfilePicture
                                ? `<img src="${item.ProfilePicture}" class="avatar-img">`
                                : `<div class="avatar-initial">${initial}</div>`
                            }
                                    <div class="fw-semibold text-dark">${item.Username || 'Unknown User'}</div>
                                </div>
                            </td>
                            <td><span class="fw-medium">${item.Action}</span></td>
                            <td class="text-muted small fw-medium">${new Date(item.Date).toLocaleDateString()}</td>
                            <td><span class="badge badge-custom ${getStatusBadgeClass(item.Status)}">${item.Status || 'Unknown'}</span></td>
                        </tr>
                    `}).join('');
                }
            }

            // Charts
            if (data.trends || data.demographics) {
                initCharts(data.trends || [], data.demographics || []);
            }

        } else {
            console.error('Failed to load stats');
            const toast = new bootstrap.Toast(document.getElementById('errorToast'));
            toast.show();
        }

    } catch (err) {
        console.error('Error loading admin stats:', err);
        const toast = new bootstrap.Toast(document.getElementById('errorToast'));
        toast.show();
    }
}

function getStatusBadgeClass(status) {
    if (status === 'Completed' || status === 'Paid' || status === 'Verified') return 'badge-success-soft';
    if (status === 'Pending' || status === 'Waiting') return 'badge-warning-soft';
    return 'badge-info-soft';
}

function initCharts(trendsData, demographicsData) {
    // Shared Options
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#64748B';

    // 1. Enrollment/Revenue Trend Chart
    const ctx1 = document.getElementById('mainTrendChart').getContext('2d');

    // Gradient for fill
    const gradient = ctx1.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.2)'); // Primary Color
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');

    new Chart(ctx1, {
        type: 'line',
        data: {
            labels: trendsData.map(t => t.Month),
            datasets: [{
                label: 'Revenue ($)',
                data: trendsData.map(t => t.Revenue),
                borderColor: '#4F46E5', // Primary
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                borderWidth: 2
            }, {
                label: 'Enrollments',
                data: trendsData.map(t => t.Enrollments),
                borderColor: '#94A3B8', // Gray-400
                backgroundColor: 'transparent',
                borderDash: [5, 5],
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                borderWidth: 2,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: { usePointStyle: true, boxWidth: 8 }
                },
                tooltip: {
                    backgroundColor: '#1E293B',
                    padding: 12,
                    titleFont: { size: 13, weight: 600 },
                    bodyFont: { size: 12 },
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: '#F1F5F9', borderDash: [5, 5] },
                    border: { display: false },
                    ticks: { callback: (value) => '$' + value }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { display: false },
                    border: { display: false }
                },
            }
        }
    });

    // 2. Program Enrollments Pie Chart
    const labels = demographicsData.map(d => d.Label);
    const counts = demographicsData.map(d => d.Count);

    const ctx2 = document.getElementById('userPieChart').getContext('2d');
    new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['No Data'],
            datasets: [{
                data: counts.length ? counts : [1],
                backgroundColor: [
                    '#4F46E5', // Primary
                    '#10B981', // Success
                    '#F59E0B', // Warning
                    '#EF4444', // Danger
                    '#6366F1'  // Indigo
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        padding: 15,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return ` ${context.label}: ${context.raw} enrollments`;
                        }
                    }
                }
            }
        }
    });
}
