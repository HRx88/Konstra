function goToEnrollment(item, type, price, imageUrl) {
    const url = `enrollment.html?item=${encodeURIComponent(item)}&type=${encodeURIComponent(type)}&price=${price}&image=${encodeURIComponent(imageUrl)}`;
    window.location.href = url;
}

async function fetchProgramDetails() {
    try {
        // Get ID from URL query params, default to 1
        const urlParams = new URLSearchParams(window.location.search);
        const programId = urlParams.get('id') || 1;

        const response = await fetch(`/api/programs/${programId}`);
        if (!response.ok) throw new Error('Program not found');

        const data = await response.json();

        // Hydrate DOM
        const getVal = (key) => data[key] || data[key.toLowerCase()] || data[key.charAt(0).toUpperCase() + key.slice(1)];

        const title = getVal('Title') || "Unavailable";
        const desc = getVal('Description') || "No description available.";
        const duration = getVal('Duration') || "TBA";
        const location = getVal('Location') || "Online";
        const maxParts = getVal('MaxParticipants') || 0;
        const price = getVal('Price') || 0;
        const image = getVal('ImageURL') || 'https://images.unsplash.com/photo-1581092921461-eab6245b0262';
        const type = getVal('Type') || 'Program';

        document.getElementById('program-title').textContent = title;
        document.getElementById('program-description').textContent = desc;
        document.getElementById('program-duration').textContent = duration;
        document.getElementById('program-location').textContent = location;
        document.getElementById('program-spots').textContent = `${maxParts} Spots`;

        // Update Button
        const btn = document.getElementById('enroll-btn');
        btn.textContent = `Enroll Now - $${price}`;
        // Remove old listeners by cloning or just assume fresh page load
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', () => goToEnrollment(title, type, price, image));

        document.title = `${title} | Konstra`;

    } catch (error) {
        console.error("Error fetching program:", error);
        document.getElementById('program-title').textContent = "Program Not Found";
        document.getElementById('program-description').textContent = "We couldn't load the program details. Please try again later or check your connection.";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchProgramDetails();
});
