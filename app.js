// ═══════════════════════════════════════════════════════════
// Academia PayGas - cPanel Entry Point (Phusion Passenger)
// ═══════════════════════════════════════════════════════════
// This file is the entry point for Phusion Passenger on cPanel.
// It imports the compiled Express server and adds static file
// serving + SPA fallback for the React frontend.
// ═══════════════════════════════════════════════════════════

const path = require('path');
const express = require('express');

// Set production environment
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Load environment variables from .env if present
try { require('dotenv/config'); } catch { /* dotenv not installed */ }

// Import compiled Express app from dist/server/
let app
try {
  app = require('./dist/server/index.js').default || require('./dist/server/index.js')
} catch (err) {
  console.error('FATAL: No se pudo cargar dist/server/index.js')
  console.error('Ejecutar: npx prisma generate && npx tsc --project tsconfig.server.json')
  console.error(err)
  process.exit(1)
}

// ─── Static files (frontend build) ───────────────────────
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath, {
  maxAge: '1y',                    // Cache static assets for 1 year
  immutable: true,
  index: false                     // Don't serve index.html for directory
}));

// ─── SPA fallback ─────────────────────────────────────────
// Express 5 syntax: use {0,} or regex instead of * for catch-all
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── Error handler ────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Export for Passenger ─────────────────────────────────
// Passenger will call app.listen() automatically
module.exports = app;
