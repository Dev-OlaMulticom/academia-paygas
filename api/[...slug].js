const path = require('path');

let app;
let loadError;

try {
  const serverPath = path.join(process.cwd(), 'dist', 'server', 'server', 'index');
  app = require(serverPath).default;
} catch (e) {
  loadError = e;
  console.error('[API BOOT] Failed to load server module:', e);
}

module.exports = (req, res) => {
  // Vercel serverless functions provide 'res.set()' but not 'res.setHeader()'
  // Express middleware expects 'res.setHeader()'. Add it as an alias.
  if (typeof res.set === 'function' && !res.setHeader) {
    const originalSet = res.set;
    res.setHeader = function(name, value) {
      originalSet(name, value);
    };
  }

  if (!app) {
    return res.status(500).json({
      error: 'Server module failed to load',
      detail: String(loadError),
    });
  }

  try {
    return app(req, res);
  } catch (e) {
    console.error('[API HANDLER] Error:', e.message);
    try {
      res.status(500).json({ error: 'Server error', detail: e.message });
    } catch {
      res.end(JSON.stringify({ error: 'Server error' }));
    }
  }
};

module.exports.config = {
  runtime: 'nodejs18.x',
  api: {
    bodyParser: false,
  },
};