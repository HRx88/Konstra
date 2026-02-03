document.addEventListener("DOMContentLoaded", () => {
  const thumbs = document.getElementById("thumbs");
  const mainImg = document.getElementById("mainImg");
  const viewer = document.querySelector(".main model-viewer");

  if (!thumbs || !mainImg || !viewer) return;

  thumbs.addEventListener("click", (e) => {
    const btn = e.target.closest(".thumb");
    if (!btn) return;

    // active state
    thumbs.querySelectorAll(".thumb").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");

    const type = btn.dataset.type; // "model" or "image"
    const src  = btn.dataset.src;

    if (type === "model") {
      mainImg.style.display = "none";
      viewer.style.display = "block";

      // optional: if you want clicking model thumb to swap model
      if (src) viewer.src = src;
    } else {
      viewer.style.display = "none";
      mainImg.style.display = "block";
      mainImg.src = src;
    }
  });
});