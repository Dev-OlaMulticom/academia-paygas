const path = require('path');

let app;
let loadError;

try {
  const serverPath = path.join(process.cwd(), 'dist', 'server', 'index');
  app = require(serverPath).default;
} catch (e) {
  loadError = e;
  console.error('[API BOOT] Failed to load server module:', e);
}

module.exports = (req, res) => {
  if (!app) {
    return res.status(500).json({
      error: 'Server module failed to load',
      detail: String(loadError),
    });
  }
  return app(req, res);
};

module.exports.config = {
  runtime: 'nodejs18.x',
  api: {
    bodyParser: false,
  },
};
