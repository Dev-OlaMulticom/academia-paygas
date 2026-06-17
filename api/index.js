const app = require('../dist/server/index').default;

module.exports = async function handler(req, res) {
  return app(req, res);
};
