const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const CACHE_TTL = 30000; // 30 seconds cache

const mime = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.txt': 'text/plain'
};

// Simple in-memory cache with TTL
const cache = new Map();
function getCacheKey(u) { return crypto.createHash('md5').update(u).digest('hex'); }
function getCachedData(u) { const key = getCacheKey(u); const entry = cache.get(key); if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data; cache.delete(key); return null; }
function setCacheData(u, data) { const key = getCacheKey(u); cache.set(key, { data, timestamp: Date.now() }); }

const server = http.createServer(async (req, res) => {
  try{
    const parsed = url.parse(req.url, true);
    if (parsed.pathname === '/api/fetch'){
      const u = parsed.query.u;
      if (!u){ res.writeHead(400, {'Content-Type':'text/plain'}); res.end('missing url param `u`'); return; }
      try{
        // Check cache first
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
        res.writeHead(200, {'Content-Type':'text/plain','Access-Control-Allow-Origin':'*','X-Data-Hash':hash,'X-From-Cache':fromCache?'1':'0'});
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

