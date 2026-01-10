fetch("/api/health/db")
    .then(r => r.json())
    .then(data => document.getElementById("out").textContent = JSON.stringify(data, null, 2))
    .catch(err => document.getElementById("out").textContent = err.toString());
