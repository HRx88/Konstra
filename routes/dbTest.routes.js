const express = require("express");
const router = express.Router();

const sql = require("mssql");
const dbConfig = require("../dbConfig"); // <-- adjust if dbConfig is elsewhere

router.get("/db", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query("SELECT TOP 10 * FROM Users");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
