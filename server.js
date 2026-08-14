const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const CACHE_TTL = 2000; // 2 seconds - very short to catch spreadsheet changes quickly

const mime = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.txt': 'text/plain'
};

// Simple in-memory cache with TTL + hit counter
const cache = new Map();
function getCacheKey(u) { return crypto.createHash('md5').update(u).digest('hex'); }
function getCachedData(u) { const key = getCacheKey(u); const entry = cache.get(key); if (entry && Date.now() - entry.timestamp < CACHE_TTL) { entry.hits++; return entry.data; } cache.delete(key); return null; }
function setCacheData(u, data) { const key = getCacheKey(u); cache.set(key, { data, timestamp: Date.now(), hits: 0 }); }
function invalidateCache(u) { const key = getCacheKey(u); cache.delete(key); }

function splitCsvLine(line) {
  const out = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.map(v => v.trim());
}

function parseStructuredSheet(text) {
  const rows = String(text || '').replace(/\r/g, '').split('\n').filter(line => line.trim().length > 0).map(splitCsvLine);
  if (!rows.length) return { locations: {}, rigata: [], loadSeries: [] };

  const locations = {};
  const rigata = [];
  const loadSeries = [];

  rows.slice(1).forEach((row) => {
    const lokasi = (row[0] || '').trim();
    const hasStatusCell = [1, 2, 3, 4].some(index => (row[index] || '').trim());

    if (lokasi && hasStatusCell) {
      const entry = {
        lokasi,
        statusPenyulang: (row[1] || '').trim(),
        statusGenset: (row[2] || '').trim(),
        statusUPS: (row[3] || '').trim(),
        statusCOS: (row[4] || '').trim(),
        personilHadir: (row[5] || '').trim(),
        catatan: (row[6] || '').trim(),
        updateTerakhir: (row[7] || '').trim(),
        dayaBeban: (row[8] || '').trim()
      };

      if (!['RINGKASAN', 'Total Personil Hadir', 'Total Personil Dibutuhkan', '% Kehadiran'].includes(lokasi)) {
        locations[lokasi] = entry;
        if (entry.dayaBeban) {
          const loadValue = Number.parseFloat(String(entry.dayaBeban).replace(/[A-Za-z%\s]/g, '').replace(',', '.')) || 0;
          loadSeries.push({ location: lokasi, value: loadValue, label: entry.dayaBeban });
        }
      }
    }

    for (let i = 0; i < row.length; i += 1) {
      const cell = (row[i] || '').trim();
      if (!cell || !cell.toLowerCase().includes('rigata')) continue;

      const locationCandidate = (row[i - 1] || row[10] || '').trim() || 'Lapangan Plaza Ceremony';
      const item = {
        location: locationCandidate,
        name: cell,
        tegangan: [row[i + 1], row[i + 2], row[i + 3], row[i + 4]].map(v => (v || '').trim()).filter(Boolean),
        arus: [row[i + 5], row[i + 6], row[i + 7], row[i + 8]].map(v => (v || '').trim()).filter(Boolean),
        temperature: (row[i + 9] || '').trim()
      };
      if (item.tegangan.length || item.arus.length || item.temperature) {
        rigata.push(item);
      }
    }
  });

  return { locations, rigata, loadSeries };
}

const server = http.createServer(async (req, res) => {
  try{
    const parsed = url.parse(req.url, true);
    if (parsed.pathname === '/api/fetch'){
      const u = parsed.query.u;
      if (!u){ res.writeHead(400, {'Content-Type':'text/plain'}); res.end('missing url param `u`'); return; }
      const format = String(parsed.query.format || '').toLowerCase();
      try{
        let text = getCachedData(u);
        let fromCache = false;
        if (!text) {
          const r = await fetch(u);
          if (!r.ok){ res.writeHead(502, {'Content-Type':'text/plain'}); res.end('upstream error: ' + r.status); return; }
          text = await r.text();
          setCacheData(u, text);
        } else {
          fromCache = true;
        }
        const hash = crypto.createHash('md5').update(text).digest('hex');
        const cacheEntry = cache.get(getCacheKey(u));
        const cacheHits = cacheEntry ? cacheEntry.hits : 0;
        res.writeHead(200, {'Content-Type': format === 'json' ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin':'*','X-Data-Hash':hash,'X-From-Cache':fromCache?'1':'0','X-Cache-Hits':String(cacheHits)});
        if (format === 'json') {
          res.end(JSON.stringify(parseStructuredSheet(text)));
          return;
        }
        res.end(text);
        return;
      }catch(e){ res.writeHead(502, {'Content-Type':'text/plain'}); res.end(e.message); return; }
    }

    // serve static files from public
    let filePath = parsed.pathname === '/' ? '/index.html' : decodeURIComponent(parsed.pathname);
    // prevent path traversal
    if (filePath.includes('..')){ res.writeHead(400); res.end('Bad request'); return; }
    const full = path.join(PUBLIC, filePath);
    if (!fs.existsSync(full) || fs.statSync(full).isDirectory()){
      res.writeHead(404, {'Content-Type':'text/plain'}); res.end('Not found'); return;
    }
    const ext = path.extname(full).toLowerCase();
    const ct = mime[ext] || 'application/octet-stream';
    res.writeHead(200, {'Content-Type': ct});
    fs.createReadStream(full).pipe(res);

  }catch(err){ res.writeHead(500, {'Content-Type':'text/plain'}); res.end(err.message); }
});

server.listen(PORT, ()=> console.log('Server listening on port', PORT));

