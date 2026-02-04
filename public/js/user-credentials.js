document.addEventListener('DOMContentLoaded', () => {
    // FIX: Updated Authentication Logic
    const member = JSON.parse(localStorage.getItem("memberDetails"));
    const userType = member ? 'User' : null;

    if (!userType) {
        window.location.href = 'login.html';
        return;
    }

    // Note: Assuming member object has 'memberID' or 'userID'.
    // Adjust property name based on your exact object structure (e.g. member.memberID)
    const userId = member.userID || member.memberID;
    loadMyCredentials(userId);
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('credentialGrid')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-credential');
        if (btn) {
            openViewer(btn.dataset.embed, btn.dataset.public, btn.dataset.pdf);
        }
    });
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

async function loadMyCredentials(userId) {
    const grid = document.getElementById('credentialGrid');
    const loader = document.getElementById('loader');
    const emptyState = document.getElementById('emptyState');

    try {
        const res = await fetch(`/api/credentials/my-credentials?userID=${userId}`);
        const credentials = await res.json();

        loader.style.display = 'none';

        if (!res.ok || credentials.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        grid.style.display = 'flex';

        grid.innerHTML = credentials.map(c => {
            // 1. IMAGE LOGIC: 
            // Try to use the generated Badge Image first (c.ImageURL).
            // If not available, use the generic Program Image (c.ProgramImage).
            // Fallback to a placeholder if both are missing.
            const displayImage = c.ImageURL || c.ProgramImage || 'https://via.placeholder.com/400x200?text=Badge';

            // 2. MODAL LOGIC:
            // We want the modal/iframe to load the Public URL (Credsverse link)
            // or the PDF if you prefer. Here we use PublicURL as the primary view.
            const viewUrl = c.PublicURL;

            return `
            <div class="col-md-6 col-lg-4 col-xl-3">
                <div class="credential-card shadow-sm h-100">
                    <img src="${displayImage}" class="card-img-top" alt="${c.ProgramTitle}" 
                         style="height: 200px; object-fit: contain; background: #f8f9fa; padding: 10px;">
                    
                    <div class="card-body d-flex flex-column">
                        <div class="program-type">${c.ProgramType || 'Certification'}</div>
                        <h5 class="card-title fw-bold mb-2">${c.ProgramTitle}</h5>
                        <div class="issue-date">
                            <i class="far fa-calendar-alt me-1"></i> Issued: ${new Date(c.IssuedAt).toLocaleDateString()}
                        </div>
                        
                        <div class="mt-auto">
                            <button class="btn btn-dark btn-credential" data-embed="${viewUrl}" data-public="${c.PublicURL}" data-pdf="${c.PdfURL || ''}">
                                <i class="fas fa-eye me-2"></i>View Credential
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        }).join('');

    } catch (error) {
        console.error("Error:", error);
        loader.style.display = 'none';
        emptyState.style.display = 'block';
    }
}

// Keep your existing openViewer function
function openViewer(embedUrl, publicUrl, pdfUrl) {
    const iframe = document.getElementById('certFrame');
    const downloadBtn = document.getElementById('downloadBtn');
    const externalBtn = document.getElementById('externalLinkBtn');

    iframe.src = embedUrl;

    if (pdfUrl) {
        downloadBtn.href = pdfUrl;
        downloadBtn.style.display = 'inline-block';
    } else {
        downloadBtn.style.display = 'none';
    }

    externalBtn.href = publicUrl;

    const modal = new bootstrap.Modal(document.getElementById('viewModal'));
    modal.show();

    document.getElementById('viewModal').addEventListener('hidden.bs.modal', () => {
        iframe.src = "";
    });
}
