const tabs = document.querySelectorAll(".tab-btn");
const panels = document.querySelectorAll(".tab-panel");

function activateTab(panelId){
  tabs.forEach(t => {
    const isActive = t.dataset.tab === panelId;
    t.classList.toggle("active", isActive);
    t.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  panels.forEach(p => {
    const isActive = p.id === panelId;
    p.classList.toggle("active", isActive);
    if (isActive) p.removeAttribute("hidden");
    else p.setAttribute("hidden", "");
  });
}

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    activateTab(tab.dataset.tab);

    // optional: scroll to content container so user sees change
    // document.getElementById("FloatingContent").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

// Make the FloatingBar rise in on load
const bar = document.getElementById("FloatingBarBox");
const trigger = document.getElementById("InfoBar-Trigger");

if (bar && trigger) {
  // Ensure bar starts hidden (your CSS already does this)
  bar.classList.remove("is-active", "is-sticky");

  const obs = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        bar.classList.add("is-active", "is-sticky");
        obs.disconnect(); // play once only
      }
    },
    {
      root: null,
      threshold: 1.0
    }
  );

  obs.observe(trigger);
}

