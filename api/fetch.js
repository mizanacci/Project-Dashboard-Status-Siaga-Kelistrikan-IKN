export default async function handler(req, res) {
  try {
    const { u } = req.query || {};
    if (!u) {
      res.status(400).send('missing url param `u`');
      return;
    }
    // Basic allowlist check could be added here if desired
    const target = Array.isArray(u) ? u[0] : u;
    const r = await fetch(target);
    if (!r.ok) {
      res.status(502).send('upstream error: ' + r.status);
      return;
    }
    const text = await r.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(text);
  } catch (err) {
    res.status(502).send(err.message || String(err));
  }
}
