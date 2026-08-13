const crypto = require('crypto');

const CACHE_TTL = 2000; // 2 seconds - very short to catch spreadsheet changes quickly
const cache = new Map();

function getCacheKey(u) { return crypto.createHash('md5').update(u).digest('hex'); }
function getCachedData(u) { const key = getCacheKey(u); const entry = cache.get(key); if (entry && Date.now() - entry.timestamp < CACHE_TTL) { entry.hits++; return entry.data; } cache.delete(key); return null; }
function setCacheData(u, data) { const key = getCacheKey(u); cache.set(key, { data, timestamp: Date.now(), hits: 0 }); }
function invalidateCache(u) { const key = getCacheKey(u); cache.delete(key); }

module.exports = async function handler(req, res) {
  try {
    const u = req.query && req.query.u;
    if (!u) {
      res.statusCode = 400; res.end('missing url param `u`'); return;
    }
    const target = Array.isArray(u) ? u[0] : u;
    
    // Check cache first
    let text = getCachedData(target);
    let fromCache = false;
    if (!text) {
      const r = await fetch(target);
      if (!r.ok) { res.statusCode = 502; res.end('upstream error: ' + r.status); return; }
      text = await r.text();
      setCacheData(target, text);
    } else {
      fromCache = true;
    }
    
    const hash = crypto.createHash('md5').update(text).digest('hex');
    const cacheEntry = cache.get(getCacheKey(target));
    const cacheHits = cacheEntry ? cacheEntry.hits : 0;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('X-Data-Hash', hash);
    res.setHeader('X-From-Cache', fromCache ? '1' : '0');
    res.setHeader('X-Cache-Hits', String(cacheHits));
    res.statusCode = 200; res.end(text);
  } catch (err) {
    res.statusCode = 502; res.end(err.message || String(err));
  }
};
