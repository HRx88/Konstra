const overlay = document.getElementById("donationOverlay");
const openBtn = document.getElementById("openPopupBtn");
const closeBtn = document.getElementById("closePopupBtn");

function openModal() {
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
}

function closeModal() {
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
}

openBtn.addEventListener("click", openModal);
closeBtn.addEventListener("click", closeModal);

// Close when clicking outside the popup
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal();
});

// Close on ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && overlay.classList.contains("show")) {
    closeModal();
  }
});