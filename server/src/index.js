const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('./db'); // initialises schema + seed on first run

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'rentigo-api' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));

// Unknown API route → JSON 404 (never the SPA shell).
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found' }));

// In production, serve the built client from the same process (single-service deploy).
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// Central error handler — malformed JSON, unexpected throws, etc.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  console.error('[server]', err);
  res.status(500).json({ error: 'Something went wrong on our side' });
});

app.listen(PORT, () => {
  console.log(`[server] RentiGo API running on http://localhost:${PORT}`);
});
