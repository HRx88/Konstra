// Navbar Trigger behavior to switch to alternate mode
const navbar = document.getElementById("navbarID");

function getTriggerPointPx() {
  return window.innerHeight * 0.8; // 110% of viewport height
}

let triggerPoint = getTriggerPointPx();

window.addEventListener("resize", () => {
  triggerPoint = getTriggerPointPx();
});

window.addEventListener("scroll", () => {
  if (window.scrollY > triggerPoint) navbar.classList.add("scrolled");
  else navbar.classList.remove("scrolled");
});