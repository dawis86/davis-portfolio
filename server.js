/**
 * File: server.js
 * Purpose: Simple static server for local development and portfolio preview.
 * (Mērķis: Vienkāršs statisko failu serveris lokālai izstrādei un portfolio apskatei.)
 */
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the root directory
app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`🚀 Serveris darbojas! Atver pārlūkā: http://localhost:${PORT}`);
});