const amountInput = document.getElementById("donationAmount");
  const presetButtons = Array.from(document.querySelectorAll(".preset"));
  const donateBtn = document.getElementById("donateBtn");
  const errorText = document.getElementById("amountError");

  function clearPresetActive() {
    presetButtons.forEach(btn => btn.classList.remove("active"));
  }

  function setAmount(value) {
    amountInput.value = String(value);
    errorText.style.display = "none";
  }

  // Click preset -> set input value
  presetButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      clearPresetActive();
      btn.classList.add("active");
      setAmount(btn.dataset.amount);
    });
  });

  // Typing custom amount -> unselect presets and clean input
    amountInput.addEventListener("input", () => {
    clearPresetActive();

    // allow only digits + 1 decimal point
    let v = amountInput.value;
    v = v.replace(/[^\d.]/g, "");
    const parts = v.split(".");
    if (parts.length > 2) {
      v = parts[0] + "." + parts.slice(1).join("");
    }
    amountInput.value = v;
    errorText.style.display = "none";
  });

  // Validate and proceed
    donateBtn.addEventListener("click", () => {
    const amount = Number(amountInput.value);

    if (!amount || amount <= 0) {
      errorText.textContent = "Please enter a valid amount greater than 0.";
      errorText.style.display = "block";
      amountInput.focus();
      return;
    }

    // Optional: minimum donation
    if (amount < 1) {
      errorText.textContent = "Minimum donation is $1.";
      errorText.style.display = "block";
      amountInput.focus();
      return;
    }

    // Here is where you redirect to your existing payment.html
    // You said item will be hard coded for donation:
    const item = "Donation";
    const image = "null";

    const url =
      `payment.html?price=${encodeURIComponent(amount.toFixed(2))}` +
      `&item=${encodeURIComponent(item)}` +
      `&image=${encodeURIComponent(image)}`;

    window.location.href = url;
  });