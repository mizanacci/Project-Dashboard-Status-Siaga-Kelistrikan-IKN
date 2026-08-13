module.exports = async function handler(req, res) {
  try {
    const u = req.query && req.query.u;
    if (!u) {
      res.statusCode = 400; res.end('missing url param `u`'); return;
    }
    const target = Array.isArray(u) ? u[0] : u;
    const r = await fetch(target);
    if (!r.ok) { res.statusCode = 502; res.end('upstream error: ' + r.status); return; }
    const text = await r.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.statusCode = 200; res.end(text);
  } catch (err) {
    res.statusCode = 502; res.end(err.message || String(err));
  }
};
