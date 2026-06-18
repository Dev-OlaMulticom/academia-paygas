let app;
let loadError;

try {
  app = require('../server-build/index').default;
} catch (e) {
  loadError = e;
  console.error('[API BOOT] Failed to load server module:', e);
}

module.exports = async function handler(req, res) {
  if (!app) {
    return res.status(500).json({
      error: 'Server module failed to load',
      detail: String(loadError),
      stack: loadError?.stack,
    });
  }
  return app(req, res);
};
