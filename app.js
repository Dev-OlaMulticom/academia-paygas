// ═══════════════════════════════════════════════════════════
// Academia PayGas - cPanel Entry Point (Phusion Passenger)
// ═══════════════════════════════════════════════════════════
// Desde la migración a Fastify (fase5), dist/server/index.js es
// un servidor autocontenido: levanta Fastify en process.env.PORT
// y sirve el SPA él mismo (estáticos + fallback index.html).
// Este archivo solo lo carga; NO exporta una app Express.
// ═══════════════════════════════════════════════════════════

// Set production environment
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Load environment variables from .env if present
try { require('dotenv/config'); } catch { /* dotenv not installed */ }

try {
  require('./dist/server/index.js');
} catch (err) {
  console.error('FATAL: No se pudo cargar dist/server/index.js')
  console.error('Ejecutar: npx prisma generate && npm run cpanel:build')
  console.error(err)
  process.exit(1)
}
