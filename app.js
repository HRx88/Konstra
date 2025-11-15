// ========== Packages ==========
// Initialising dotenv
require("dotenv").config();
// Initialising express
const express = require("express");
// Initialising path
const path = require("path");
// ========== Set-Up ==========
// Initiating app
const app = express();
const PORT = process.env.PORT || 8000;

// Using Static Public
app.use(express.static(path.join(__dirname, "public")));

// ========== Routes ==========


// ========== Initialise Server ==========
// Server Listening at port 8000
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
