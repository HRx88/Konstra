const scroller = document.querySelector(".OIPRight-Scroller");

if (scroller) {
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  scroller.addEventListener("mousedown", (e) => {
    isDown = true;
    scroller.classList.add("is-dragging");
    startX = e.pageX - scroller.offsetLeft;
    scrollLeft = scroller.scrollLeft;
  });

  window.addEventListener("mouseup", () => {
    isDown = false;
    scroller.classList.remove("is-dragging");
  });

  scroller.addEventListener("mouseleave", () => {
    isDown = false;
    scroller.classList.remove("is-dragging");
  });

  scroller.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - scroller.offsetLeft;
    const walk = (x - startX) * 0.9;   /* sensitivity */
    scroller.scrollLeft = scrollLeft - walk;
  });
}
