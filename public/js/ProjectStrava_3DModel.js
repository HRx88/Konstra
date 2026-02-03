(function(){
  const bigModel = document.getElementById("bigModel");
  const bigImg = document.getElementById("bigImg");
  const thumbs = document.querySelectorAll(".HomeThumb");

  function setActive(btn){
    thumbs.forEach(t => t.classList.remove("is-active"));
    btn.classList.add("is-active");
  }

  function showModel(activeBtn){
    bigImg.hidden = true;
    bigImg.style.display = "none";

    bigModel.style.display = "block";
    setActive(activeBtn);
  }

  function showImage(src, activeBtn){
    bigImg.src = src;

    bigModel.style.display = "none";

    bigImg.hidden = false;
    bigImg.style.display = "block";
    setActive(activeBtn);
  }

  // Default state: show model
  const modelBtn = document.querySelector('.HomeThumb[data-view="model"]');
  if(modelBtn) showModel(modelBtn);

  thumbs.forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.getAttribute("data-view");

      if(view === "model"){
        showModel(btn);
        return;
      }

      if(view === "img"){
        const src = btn.getAttribute("data-src");
        showImage(src, btn);
      }
    });
  });
})();