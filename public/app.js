// Frontend logic ported from original single-file dashboard.
// Adjusted to use backend proxy at /api/fetch?u= for CSV fetching

// =========================================================
// DATA (images and reference data)
// =========================================================
const IMG_OIKN = "/images/Kantor OIKN.png";
const IMG_AMPHITHEATER = "/images/Merdeka Run & Nusantara Vaganza.png";
const IMG_TKB = "/images/Taman Kusuma Bangsa.png";
const IMG_LAPANGAN = "/images/Lapangan Plaza Ceremony.png";
const IMG_MFH = "/images/MFH Kemenko.3.png";

const LOCATIONS_ORDER = [
  "Kantor OIKN",
  "Amphitheater Plaza Ceremony",
  "Taman Kusuma Bangsa",
  "Lapangan Plaza Ceremony",
  "MFH Kemenko.3"
];

const REFERENCE_DATA = {
  "Kantor OIKN": { tag: "LOKASI 01 · GD OIKN", image: IMG_OIKN, kegiatan: "Pengukuhan Paskibraka", jadwal: "Jumat, 14 Agt 2026 · 19.00–20.00 WITA", penyulangUtama: "NST.03", penyulangBackup: "NST.02 GH.01", genset: "Genset Pelanggan 500 kW", ups: "20 kVA (Sound, Videotron & Lighting)", cos: null, personilTotal: 15, roles: [["Standby GHS",3,""] , ["Standby UPS",3,""] , ["Standby GD OIKN",3,""] , ["Standby GH.01",3,""] , ["Standby GD Sumbu Timur",3,"Open OG PLTS"] ] },
  "Amphitheater Plaza Ceremony": { tag: "LOKASI 02 · GD PLAZA CEREMONY", image: IMG_AMPHITHEATER, kegiatan: "Merdeka Run & Nusantara Vaganza", jadwal: "Sabtu, 15 Agt 2026 · 19.00–selesai WITA", penyulangUtama: "NST.06", penyulangBackup: "NST.03 GH.1", genset: "Genset Pel 500 kVA", ups: "20 kVA (Amphitheater)", cos: null, personilTotal: 12, roles: [["Standby UPS",3,""] ,["Standby GD Plaza Ceremony",3,""] ,["Standby GH.01",3,""] ,["GHS",3,""]] },
  "Taman Kusuma Bangsa": { tag: "LOKASI 03 · GD TKB", image: IMG_TKB, kegiatan: "Renungan Suci", jadwal: "Minggu, 16 Agt 2026 · 21.00–22.00 WITA", penyulangUtama: "NST.03 GD TKB", penyulangBackup: "NST.02 GH.1", genset: "Genset Pelanggan 250 kVA", ups: "20 kVA", cos: "1 (Satu) Bh", personilTotal: 15, roles: [["Standby UPS",3,""] ,["Standby GD TKB",3,""] ,["Standby GH.01",3,""] ,["GHS",3,""] ,["Standby GD Sumbu Timur",3,"Open OG PLTS"] ] },
  "Lapangan Plaza Ceremony": { tag: "LOKASI 04 · GARDU KEMENKO.1", image: IMG_LAPANGAN, kegiatan: "Pengibaran & Penurunan Bendera", jadwal: "Senin, 17 Agt 2026 · 06.30–09.30 & 16.00–17.30 WITA", penyulangUtama: "NST.06", penyulangBackup: "NST.03 GH.1", genset: "Genset PLN 200 kVA + Genset EO 200 kVA", ups: "200 kVA (Sound & Videotron)", cos: "1 (Satu) Bh", personilTotal: 15, roles: [["Standby COS",3,""] ,["Standby UPS",3,""] ,["Standby Gardu Kemenko.1",3,""] ,["Standby GH.01",3,""] ,["GHS",3,""]] },
  "MFH Kemenko.3": { tag: "LOKASI 05 · GARDU KEMENKO.3", image: IMG_MFH, kegiatan: "Detik-Detik Proklamasi (Online)", jadwal: "Senin, 17 Agt 2026 · 11.00–selesai WITA", penyulangUtama: "NST.06", penyulangBackup: "NST.03 GH.1", genset: "Genset Pelanggan 350 kVA", ups: "100 kVA (Sound & Videotron)", cos: null, personilTotal: 12, roles: [["Standby UPS",3,""] ,["Standby Gardu Kemenko.3",3,""] ,["Standby GH.01",3,""] ,["GHS",3,""]] }
};

const AGENDA = [
  { nama:"Pengukuhan Paskibraka", lokasi:"Kantor OIKN", mulai:"2026-08-14T19:00:00+08:00", selesai:"2026-08-14T20:00:00+08:00" },
  { nama:"Merdeka Run & Nusantara Vaganza", lokasi:"Amphitheater Plaza Ceremony", mulai:"2026-08-15T19:00:00+08:00", selesai:"2026-08-15T23:00:00+08:00" },
  { nama:"Renungan Suci", lokasi:"Taman Kusuma Bangsa", mulai:"2026-08-16T21:00:00+08:00", selesai:"2026-08-16T22:00:00+08:00" },
  { nama:"Pengibaran Bendera", lokasi:"Lapangan Plaza Ceremony", mulai:"2026-08-17T06:30:00+08:00", selesai:"2026-08-17T09:30:00+08:00" },
  { nama:"Detik-Detik Proklamasi", lokasi:"MFH Kemenko.3", mulai:"2026-08-17T11:00:00+08:00", selesai:"2026-08-17T12:30:00+08:00" },
  { nama:"Penurunan Bendera", lokasi:"Lapangan Plaza Ceremony", mulai:"2026-08-17T16:00:00+08:00", selesai:"2026-08-17T17:30:00+08:00" }
];

// Terhubung otomatis ke spreadsheet menggunakan gviz endpoint (cache fresh)
// Format: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/gviz/tq?tqx=out:csv&gid=TAB_ID
// Pastikan sheet di-share "Anyone with the link → Viewer" (tidak perlu "Publish to web")
const SPREADSHEET_ID = "1s_h8zBXKELoppqKSaSccK4jWhyZpBER4zL96PU-O7f4";
const STATUS_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=1897496511`;
const RIGATA_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=2087410650`;
const LOAD_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=1021438315`;
const DEFAULT_SHEET_URL = STATUS_SHEET_URL;

// =========================================================
// STATE
// =========================================================
let sheetUrl = DEFAULT_SHEET_URL || null;
let refreshMs = 5000;  // Update every 5 seconds untuk responsif lebih cepat
let refreshTimer = null;
let liveData = {};
let isConnected = false;
let lastSync = null;
const expandedRoles = new Set();
let lastDataHash = null; // for smart polling
let unchangedPolls = 0; // counter untuk aggressive refresh
const MAX_UNCHANGED_POLLS = 2; // reduce to 2 for faster refresh detection

// CACHE CONFIG
const CACHE_KEY = 'siaga_cache_data';
const CACHE_HASH_KEY = 'siaga_cache_hash';
const CACHE_EXPIRY_KEY = 'siaga_cache_expiry';
const CACHE_TTL = 120000; // 2 minutes client cache

// Load cached data on init
function loadCachedData() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const cachedHash = localStorage.getItem(CACHE_HASH_KEY);
    const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
    if (cached && expiry && Date.now() < parseInt(expiry, 10)) {
      lastDataHash = cachedHash;
      return { data: JSON.parse(cached), hash: cachedHash };
    }
  } catch (e) {}
  return null;
}

// Save data to cache
function saveCacheData(data, hash) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_HASH_KEY, hash);
    localStorage.setItem(CACHE_EXPIRY_KEY, String(Date.now() + CACHE_TTL));
    console.log('[CACHE] Saved to localStorage, TTL:', CACHE_TTL/1000, 'sec');
  } catch (e) { console.warn('[CACHE] Save failed:', e.message); }
}

// Force clear cache
function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_HASH_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);
    lastDataHash = null;
    unchangedPolls = 0;
    console.log('[CACHE] Cleared');
  } catch (e) {}
}

// =========================================================
// INIT
// =========================================================
async function init(){
  tickClock(); setInterval(tickClock, 1000);
  renderSequencer(); setInterval(renderSequencer, 30000);

  // Auto-connect ke DEFAULT_SHEET_URL (hardcoded)
  sheetUrl = DEFAULT_SHEET_URL;

  // Always render reference data first
  renderAll();

  if (sheetUrl){
    console.log('[INIT] Fetching fresh data from spreadsheet...');
    await sync(); // Always fetch fresh on init
  } else {
    console.log('[INIT] No spreadsheet URL configured');
  }
  armRefresh();

  // Lightbox events untuk image zoom
  document.getElementById('locationsGrid').addEventListener('click', e=>{
    const img = e.target.closest('.card-map');
    if (!img) return;
    openLightbox(img.src, img.dataset.name);
  });
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightbox').addEventListener('click', e=>{ if (e.target.id === 'lightbox') closeLightbox(); });
  document.addEventListener('keydown', e=>{ if (e.key === 'Escape') closeLightbox(); });
}

function openLightbox(src, name){ document.getElementById('lightboxImg').src = src; document.getElementById('lightboxCaption').textContent = name; const lb = document.getElementById('lightbox'); lb.classList.add('open'); lb.setAttribute('aria-hidden','false'); }
function closeLightbox(){ const lb = document.getElementById('lightbox'); lb.classList.remove('open'); lb.setAttribute('aria-hidden','true'); }
function toggleConfig(){ const p = document.getElementById('configPanel'); p.hidden = !p.hidden; if (!p.hidden) p.scrollIntoView({behavior:'smooth', block:'nearest'}); }

function tickClock(){ const now = new Date(); const wita = now.toLocaleTimeString('id-ID', { timeZone:'Asia/Makassar', hour12:false }); document.getElementById('clockTime').textContent = wita; }

// storage: prefer localStorage fallback
async function loadConfig(){ try{ const raw = localStorage.getItem('siaga_sheet_config'); return raw ? JSON.parse(raw) : null; }catch(e){ return null; } }
async function saveConfig(url){ try{ localStorage.setItem('siaga_sheet_config', JSON.stringify({url})); }catch(e){} }

async function onSaveConfig(){ 
  const url = document.getElementById('sheetUrlInput').value.trim(); 
  const status = document.getElementById('configStatus'); 
  
  // Validate URL format
  if (!url){ 
    status.textContent = 'Tempel tautan CSV terlebih dahulu.'; 
    status.className='config-status err'; 
    return; 
  }
  
  // Terima link CSV Google Sheets dalam beberapa bentuk:
  //  - Publish to web : ...&output=csv
  //  - export         : .../export?format=csv&gid=...
  //  - gviz           : .../gviz/tq?tqx=out:csv&gid=...
  const isValid = url.includes('docs.google.com/spreadsheets') &&
    (url.includes('output=csv') || url.includes('format=csv') || url.includes('out:csv'));

  if (!isValid) {
    status.textContent = 'URL tidak valid. Gunakan link CSV Google Sheets (output=csv, format=csv, atau gviz out:csv).'; 
    status.className='config-status err'; 
    console.warn('Invalid URL format:', url);
    return;
  }
  
  sheetUrl = url; 
  await saveConfig(url); 
  console.log('Saved spreadsheet URL:', url);
  await sync(true); 
  armRefresh(); 
}

function readCell(row, ...keys) {
  for (const key of keys) {
    const value = row && row[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function toNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? '').replace(/[^0-9.,-]/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildLocationMap(rows, sheetName) {
  const map = {};
  const matched = new Set();

  rows.forEach((row) => {
    const lokasi = readCell(row, 'lokasi', 'location', 'namalokasi', 'nama lokasi');
    const key = normKey(lokasi);
    if (!key) return;
    map[key] = row;
    matched.add(key);
  });

  console.log(`[${sheetName}] ${matched.size} lokasi cocok`);
  if (matched.size === 0) {
    console.warn(`[${sheetName}] Tidak ada lokasi cocok. Periksa header "Lokasi" dan nama lokasi di sheet.`);
  }

  return map;
}

function applyStatusFields(target, row) {
  target.statusPenyulang = readCell(row, 'statuspenyulang', 'status penyulang', 'status_penyulang') || '';
  target.statusGenset = readCell(row, 'statusgenset', 'status genset', 'status_genset') || '';
  target.statusUPS = readCell(row, 'statusups', 'status ups', 'status_ups') || '';
  target.statusCOS = readCell(row, 'statuscos', 'status cos', 'status_cos') || '';
  target.personilHadir = readCell(row, 'personilhadir', 'personil hadir', 'personil_hadir') || '';
  target.catatan = readCell(row, 'catatan') || '';
  target.updateTerakhir = readCell(row, 'updateterakhir', 'update terakhir', 'update_terakhir') || '';
}

function applyRigataFields(target, row) {
  target.teganganR = toNumber(readCell(row, 'teganganr', 'tegangan r', 'tegangan_r'));
  target.teganganS = toNumber(readCell(row, 'tegangans', 'tegangan s', 'tegangan_s'));
  target.teganganT = toNumber(readCell(row, 'tegangant', 'tegangan t', 'tegangan_t'));
  target.teganganN = toNumber(readCell(row, 'tegangann', 'tegangan n', 'tegangan_n'));
  target.arusR = toNumber(readCell(row, 'arusr', 'arus r', 'arus_r'));
  target.arusS = toNumber(readCell(row, 'aruss', 'arus s', 'arus_s'));
  target.arusT = toNumber(readCell(row, 'arust', 'arus t', 'arus_t'));
  target.arusN = toNumber(readCell(row, 'arusn', 'arus n', 'arus_n'));
  target.temperature = toNumber(readCell(row, 'temperature', 'temperatur'));
  target.frekuensi = toNumber(readCell(row, 'frekuensi', 'frekuensihz', 'frekuensi hz', 'frekuensi_hz'));
  target.powerFactor = toNumber(readCell(row, 'powerfactor', 'power factor', 'power_factor'));
}

function applyLoadFields(target, row) {
  target.dayaBeban = toNumber(readCell(row, 'dayabeban', 'daya beban', 'daya_beban'));
  target.daya = toNumber(readCell(row, 'daya', 'dayaw', 'daya w', 'daya_w'));
}

async function sync(manual){ setConn('loading'); if (!sheetUrl){ setConn('demo'); renderAll(); return; }
  try{
    const forceBypassCache = unchangedPolls >= MAX_UNCHANGED_POLLS || manual;
    const cacheBypass = (forceBypassCache || manual) ? '&t=' + Date.now() : '';
    const sheetRequests = [
      { name: 'STATUS', url: STATUS_SHEET_URL },
      { name: 'RIGATA', url: RIGATA_SHEET_URL },
      { name: 'LOAD', url: LOAD_SHEET_URL }
    ];

    const syncType = manual ? 'MANUAL' : (forceBypassCache ? 'FORCE' : 'AUTO');
    console.log('[SYNC]', syncType, 'refresh, polls:', unchangedPolls, 'sheets:', sheetRequests.map(s => s.name).join(', '));

    const responses = await Promise.all(sheetRequests.map(async ({ name, url }) => {
      const proxy = '/api/fetch?u=' + encodeURIComponent(url) + cacheBypass;
      console.log(`[${name}] Fetching ${proxy}`);
      const res = await fetch(proxy, { cache:'no-store' });
      if (!res.ok) throw new Error(`${name} HTTP ${res.status}`);

      const dataHash = res.headers.get('X-Data-Hash');
      const fromCache = res.headers.get('X-From-Cache') === '1';
      const text = await res.text();

      if (!text || text.trim().length === 0) throw new Error(`${name} CSV kosong`);
      const rows = parseCSV(text);
      console.log(`[${name}] hash=${dataHash ? dataHash.substring(0,8) : 'n/a'} cache=${fromCache ? 'yes' : 'no'} bytes=${text.length} rows=${rows.length}`);

      return { name, dataHash, fromCache, rows };
    }));

    const combinedHash = responses.map(r => r.dataHash || '').join('|');
    console.log('[SYNC] Combined hash:', combinedHash ? combinedHash.substring(0, 40) : 'EMPTY');

    if (combinedHash && lastDataHash && combinedHash === lastDataHash && !manual && !forceBypassCache) {
      unchangedPolls++;
      setConn(isConnected ? 'live' : 'nomatch');
      console.log('[SKIP] Hash unchanged, polls:', unchangedPolls);
      return;
    }

    console.log('[UPDATE] Hash changed or manual refresh');
    unchangedPolls = 0;

    const statusRows = responses.find(r => r.name === 'STATUS')?.rows || [];
    const rigataRows = responses.find(r => r.name === 'RIGATA')?.rows || [];
    const loadRows = responses.find(r => r.name === 'LOAD')?.rows || [];

    const statusMap = buildLocationMap(statusRows, 'STATUS');
    const rigataMap = buildLocationMap(rigataRows, 'RIGATA');
    const loadMap = buildLocationMap(loadRows, 'LOAD');

    let matched = 0;
    const newData = {};
    LOCATIONS_ORDER.forEach((loc) => {
      const key = normKey(loc);
      const row = {};
      const statusRow = statusMap[key];
      const rigataRow = rigataMap[key];
      const loadRow = loadMap[key];

      if (statusRow) {
        applyStatusFields(row, statusRow);
      }
      if (rigataRow) {
        applyRigataFields(row, rigataRow);
      }
      if (loadRow) {
        applyLoadFields(row, loadRow);
      }

      if (Object.keys(row).length > 0) {
        matched++;
        newData[loc] = row;
      }
    });

    liveData = newData;
    lastDataHash = combinedHash;

    if (matched > 0) {
      saveCacheData(newData, combinedHash);
      console.log('[CACHE] Saved', matched, 'locations from combined sheets');
    }

    isConnected = matched > 0;
    lastSync = new Date();
    setConn(isConnected ? 'live' : 'nomatch');

    const sourceLabel = responses.some(r => r.fromCache) ? 'cache' : 'fresh';

    if (isConnected) {
      console.log('[SUCCESS] Synced', matched, '/5 locations from', sourceLabel, '— RENDERING UI');
    } else {
      console.error('[ERROR] No locations matched! Check Lokasi column across STATUS/RIGATA/LOAD sheets');
    }
  }catch(err){ 
    isConnected = false; 
    setConn('error'); 
    console.error('[ERROR] Sync failed:', err.message);
  }
  finally{ 
    console.log('[FINAL] Calling renderAll()...');
    renderAll(); 
  }
}

function armRefresh(){ 
  if (refreshTimer) clearInterval(refreshTimer); 
  if (sheetUrl && refreshMs > 0){ 
    console.log('[TIMER] Starting auto-refresh every', refreshMs/1000, 'seconds');
    refreshTimer = setInterval(()=>{
      console.log('[TIMER] Auto-refresh triggered');
      sync(false);
    }, refreshMs); 
  }
}

function setConn(state){ const dot = document.getElementById('connDot'); const label = document.getElementById('connLabel'); const badge = document.getElementById('connBadge'); dot.className = 'lamp-dot'; if (state === 'live'){ dot.classList.add('s-ok','live'); label.textContent='TERHUBUNG · LANGSUNG'; } else if (state === 'loading'){ label.textContent='MENYINKRONKAN…'; } else if (state === 'demo'){ label.textContent='DATA REFERENSI'; } else if (state === 'nomatch'){ dot.classList.add('s-warn'); label.textContent='TERHUBUNG · 0 COCOK'; } else if (state === 'error'){ dot.classList.add('s-crit'); label.textContent='GAGAL SINKRON'; } badge.title = lastSync ? ('Sinkron terakhir: ' + lastSync.toLocaleTimeString('id-ID',{timeZone:'Asia/Makassar'}) + ' WITA') : ''; }

function parseCSV(text){ const lines = text.replace(/\r/g,'').split('\n').filter(l=>l.trim().length); if (!lines.length) return []; const headers = splitCSVLine(lines[0]).map(h=>normKey(h)); return lines.slice(1).map(line=>{ const cols = splitCSVLine(line); const obj = {}; headers.forEach((h,i)=> obj[h] = (cols[i]||'').trim()); return obj; }); }
function splitCSVLine(line){ const out=[]; let cur=''; let q=false; for (let i=0;i<line.length;i++){ const c = line[i]; if (q){ if (c === '"'){ if (line[i+1] === '"'){ cur+='"'; i++; } else q=false; } else cur += c; } else { if (c === '"') q = true; else if (c === ','){ out.push(cur); cur=''; } else cur += c; } } out.push(cur); return out; }
function normKey(s){ return (s||'').toString().trim().toLowerCase().replace(/[^a-z0-9]/g,''); }

function statusClass(v){ const n = normKey(v); if (n === 'normal') return 's-ok'; if (n === 'siaga') return 's-warn'; if (n === 'gangguan') return 's-crit'; return ''; }
function overallStatus(loc){ const live = liveData[loc]; if (!isConnected || !live) return ''; const ref = REFERENCE_DATA[loc]; const vals = [live.statusPenyulang, live.statusGenset, live.statusUPS]; if (ref.cos) vals.push(live.statusCOS); const norm = vals.map(normKey); if (norm.includes('gangguan')) return 's-crit'; if (norm.some(v=>v==='siaga'||v==='')) return 's-warn'; if (norm.length && norm.every(v=>v==='normal')) return 's-ok'; return ''; }
function escapeHtml(s){ return (s==null?'':s.toString()).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function renderAll(){ renderMeters(); renderBusbar(); renderCards(); renderRigata(); renderLoad(); }

function renderMeters(){ const totalPersonil = LOCATIONS_ORDER.reduce((a,l)=>a+REFERENCE_DATA[l].personilTotal,0); let hadir = 0, hasAnyHadir = false; LOCATIONS_ORDER.forEach(l=>{ const v = liveData[l] && liveData[l].personilHadir; if (v !== undefined && v !== null && v !== '' && !isNaN(v)){ hadir += parseInt(v,10); hasAnyHadir = true; } }); let ok=0,warn=0,crit=0,off=0; LOCATIONS_ORDER.forEach(l=>{ const s = overallStatus(l); if (s==='s-ok') ok++; else if (s==='s-warn') warn++; else if (s==='s-crit') crit++; else off++; });
  const meters = [ { label:'Lokasi Siaga', value:'5', unit:'titik' }, { label:'Personil (5 lokasi)', value: (isConnected && hasAnyHadir ? hadir+' / '+totalPersonil : totalPersonil), unit:'orang', title:'Dijumlahkan dari rincian 5 lokasi pada Slide 6–10. Ringkasan Eksekutif (Slide 3) mencatat 35 orang — mohon verifikasi ke tim lapangan.' }, { label:'Unit UPS', value:'5', unit:'unit', title:'200 kVA×1, 100 kVA×1, 20 kVA×3 (Slide 3)' }, { label:'Genset PLN', value:'1', unit:'× 200 kVA', title:'Genset cadangan milik PLN di Lapangan Plaza Ceremony (Slide 3 & 9)' } ];

  const html = meters.map(m=>`\n    <div class="meter" ${m.title?`title="${escapeHtml(m.title)}"`:''}>\n      <div class="meter-value">${m.value}<span class="unit">${m.unit}</span></div>\n      <div class="meter-label">${m.label}</div>\n    </div>\n  `).join('') + `\n    <div class="meter" title="Dihitung dari status penyulang, genset, UPS & COS tiap lokasi setelah spreadsheet terhubung.">\n      <div class="meter-value" style="font-size:18px;letter-spacing:.02em;">STATUS</div>\n      <div class="meter-lamps">\n        <span class="lamp-dot s-ok"></span><span class="meter-label" style="margin:0;">${ok} normal</span>\n      </div>\n      <div class="meter-lamps">\n        <span class="lamp-dot s-warn"></span><span class="meter-label" style="margin:0;">${warn} siaga</span>\n      </div>\n      <div class="meter-lamps">\n        <span class="lamp-dot s-crit"></span><span class="meter-label" style="margin:0;">${crit} gangguan</span>\n      </div>\n    </div>\n  `;
  document.getElementById('meterStrip').innerHTML = html;
}

function renderSequencer(){ const now = new Date(); let currentIdx = -1, nextIdx = -1; AGENDA.forEach((ev,i)=>{ const s=new Date(ev.mulai), e=new Date(ev.selesai); if (now>=s && now<=e) currentIdx = i; if (now < s && (nextIdx===-1 || s < new Date(AGENDA[nextIdx].mulai))) nextIdx = i; }); const html = AGENDA.map((ev,i)=>{ const s = new Date(ev.mulai), e = new Date(ev.selesai); const opt = {timeZone:'Asia/Makassar', hour:'2-digit', minute:'2-digit', hour12:false}; const dOpt = {timeZone:'Asia/Makassar', weekday:'short', day:'2-digit', month:'short'}; const jam = s.toLocaleTimeString('id-ID', opt) + '–' + e.toLocaleTimeString('id-ID', opt) + ' WITA'; const tgl = s.toLocaleDateString('id-ID', dOpt); let cls = 'seq-chip', tag = tgl.toUpperCase(); if (i===currentIdx){ cls += ' is-now'; tag = '● BERLANGSUNG'; } else if (i===nextIdx){ cls += ' is-next'; tag = '→ BERIKUTNYA'; } else if (now > e){ cls += ' is-past'; } return `<div class="${cls}">\n      <div class="seq-chip-tag">${tag}</div>\n      <div class="seq-chip-name">${escapeHtml(ev.nama)}</div>\n      <div class="seq-chip-meta">${jam}</div>\n    </div>`; }).join(''); document.getElementById('seqTrack').innerHTML = html; }

function renderBusbar(){ const ticks = LOCATIONS_ORDER.map(l=>{ const s = overallStatus(l) || ''; return `<div class="bus-tick ${s}" title="${escapeHtml(l)}"></div>`; }).join(''); document.getElementById('busRow').innerHTML = ticks; document.getElementById('busDrops').innerHTML = LOCATIONS_ORDER.map(()=>'<div class="bus-drop"></div>').join(''); }

function renderCards(){ document.getElementById('locationsGrid').innerHTML = LOCATIONS_ORDER.map(renderCard).join(''); document.querySelectorAll('details.roles').forEach(d=>{ const loc = d.dataset.loc; d.open = expandedRoles.has(loc); d.addEventListener('toggle', ()=>{ if (d.open) expandedRoles.add(loc); else expandedRoles.delete(loc); }); }); }

function renderCard(loc){ const ref = REFERENCE_DATA[loc]; const live = liveData[loc]; const overall = overallStatus(loc); const overallLabel = !isConnected ? 'REFERENSI' : (live ? (overall==='s-ok'?'NORMAL':overall==='s-warn'?'SIAGA':overall==='s-crit'?'GANGGUAN':'—') : 'BELUM ADA DATA');
  const lampField = (label, val) => `\n    <div class="lamp-item">\n      <span class="lamp-dot ${live ? statusClass(val) : ''}"></span>\n      <div class="lamp-text">\n        <span class="lamp-label">${label}</span>\n        <span class="lamp-value">${live ? (escapeHtml(val)||'—') : '—'}</span>\n      </div>\n    </div>`;

  let lamps = lampField('Penyulang', live && live.statusPenyulang) + lampField('Genset', live && live.statusGenset) + lampField('UPS', live && live.statusUPS);
  if (ref.cos) lamps += lampField('COS', live && live.statusCOS);

  const hadir = live && live.personilHadir !== undefined && live.personilHadir !== '' && !isNaN(live.personilHadir) ? parseInt(live.personilHadir,10) : null;
  const pct = hadir!==null ? Math.min(100, Math.round((hadir/ref.personilTotal)*100)) : 0;

  const rolesHtml = ref.roles.map(([nama,jml,ket])=>`<div><span>${escapeHtml(nama)}${ket?` <span class="roles-note">(${escapeHtml(ket)})</span>`:''}</span><span class="v">${jml} org</span></div>`).join('');

  const noteHtml = (isConnected && live && live.catatan) ? `<div class="note-line"><span class="k">Catatan lapangan:</span> ${escapeHtml(live.catatan)}</div>` : '';
  const syncHtml = (isConnected && live && live.updateTerakhir) ? `<div class="sync-line">Update oleh petugas: ${escapeHtml(live.updateTerakhir)}</div>` : '';

  return `\n  <div class="card ${overall}">\n    <div class="card-head">\n      <div>\n        <div class="card-tag">${ref.tag}</div>\n        <div class="card-name">${escapeHtml(loc)}</div>\n        <div class="card-kegiatan">Kegiatan: <strong>${escapeHtml(ref.kegiatan)}</strong></div>\n        <div class="card-kegiatan">${escapeHtml(ref.jadwal)}</div>\n      </div>\n      <span class="card-badge ${overall}">${overallLabel}</span>\n    </div>\n\n    <div class="card-map-wrap">\n      <img class="card-map" src="${ref.image}" data-name="${escapeHtml(loc)}" alt="Lay out lokasi kegiatan ${escapeHtml(loc)}" loading="lazy">\n      <span class="card-map-tag">Lay Out Lokasi</span>\n      <span class="card-map-zoom">⤢</span>\n    </div>\n\n    <div class="lamp-row">${lamps}</div>\n\n    <div class="spec-grid">\n      <div class="spec-item"><span class="k">Penyulang Utama</span><span class="v">${escapeHtml(ref.penyulangUtama)}</span></div>\n      <div class="spec-item"><span class="k">Penyulang Backup</span><span class="v">${escapeHtml(ref.penyulangBackup)}</span></div>\n      <div class="spec-item"><span class="k">Genset Backup</span><span class="v">${escapeHtml(ref.genset)}</span></div>\n      <div class="spec-item"><span class="k">UPS Backup</span><span class="v">${escapeHtml(ref.ups)}</span></div>\n      ${ref.cos ? `<div class="spec-item"><span class="k">COS</span><span class="v">${escapeHtml(ref.cos)}</span></div>` : ''}\n    </div>\n\n    <div class="gauge-wrap">\n      <div class="gauge-top"><span>Personil hadir</span><span class="num">${hadir!==null ? hadir : '—'} / ${ref.personilTotal}</span></div>\n      <div class="gauge-track"><div class="gauge-fill ${hadir===null?'unknown':''}" style="width:${hadir!==null?pct:100}%"></div></div>\n    </div>\n\n    <details class="roles" data-loc="${escapeHtml(loc)}">\n      <summary>Rincian personil siaga (${ref.personilTotal} orang)</summary>\n      <div class="roles-list">${rolesHtml}</div>\n    </details>\n\n    ${noteHtml}\n    ${syncHtml}\n  </div>`;
}

// RIGATA Panel: 3-Phase Electrical Monitoring
function renderRigata(){
  const panel = document.getElementById('rigataPanelContent');
  if (!panel) return;
  
  if (!isConnected) {
    panel.innerHTML = '<div class="rigata-layout-container"><div class="rigata-bg" style="background-image:url(/images/Lapangan%20Plaza%20Ceremony.png)"></div><p style="color:var(--text-gray);font-size:12px;padding:20px;text-align:center;position:relative;z-index:10;">Menunggu data RIGATA dari spreadsheet...</p></div>';
    return;
  }
  
  // Positioning 5 lokasi di atas layout Lapangan Plaza Ceremony
  const positions = {
    "Kantor OIKN": { top: '8%', left: '5%' },
    "Amphitheater Plaza Ceremony": { top: '8%', right: '5%' },
    "Taman Kusuma Bangsa": { top: '48%', right: '6%' },
    "Lapangan Plaza Ceremony": { top: '50%', left: '50%', transform: 'translateX(-50%)' },
    "MFH Kemenko.3": { bottom: '8%', left: '6%' }
  };
  
  let html = '<div class="rigata-layout-container">';
  html += '<div class="rigata-bg" style="background-image:url(/images/Lapangan%20Plaza%20Ceremony.png)"></div>';
  html += '<div class="rigata-overlay">';
  
  LOCATIONS_ORDER.forEach(loc => {
    const live = liveData[loc];
    if (!live) return;
    
    const vr = live.teganganR || 0, vs = live.teganganS || 0, vt = live.teganganT || 0;
    const ir = live.arusR || 0, is = live.arusS || 0, it = live.arusT || 0;
    const temp = live.temperature || 0, freq = live.frekuensi || 50, pf = live.powerFactor || 0;
    const pos = positions[loc] || { top: '50%', left: '50%' };
    const posStyle = Object.entries(pos).map(([k, v]) => `${k}:${v}`).join(';');
    const locName = REFERENCE_DATA[loc].tag.split(' · ')[1] || loc.split(' ')[0];
    
    html += `<div class="rigata-card" style="${posStyle}">
      <div class="rigata-head">
        <div class="rigata-name">${locName}</div>
        <div class="rigata-badge">LIVE</div>
      </div>
      <div class="rigata-metrics">
        <div><span>VR</span><strong>${vr.toFixed(1)}</strong></div>
        <div><span>VS</span><strong>${vs.toFixed(1)}</strong></div>
        <div><span>VT</span><strong>${vt.toFixed(1)}</strong></div>
        <div><span>IR</span><strong>${ir.toFixed(1)}</strong></div>
        <div><span>IS</span><strong>${is.toFixed(1)}</strong></div>
        <div><span>IT</span><strong>${it.toFixed(1)}</strong></div>
        <div><span>Hz</span><strong>${freq.toFixed(1)}</strong></div>
        <div><span>PF</span><strong>${pf.toFixed(2)}</strong></div>
        <div><span>T°C</span><strong>${temp.toFixed(0)}</strong></div>
      </div>
    </div>`;
  });
  
  html += '</div></div>';
  panel.innerHTML = html;
}

// Load Panel: Power Monitoring & Trends
function renderLoad(){
  const panel = document.getElementById('loadPanelContent');
  if (!panel) return;
  
  if (!isConnected) {
    panel.innerHTML = '<p style="color:var(--text-gray);font-size:12px;padding:10px;">Menunggu data Load dari spreadsheet...</p>';
    return;
  }
  
  let totalBeban = 0, totalDaya = 0;
  const locData = [];
  
  LOCATIONS_ORDER.forEach(loc => {
    const live = liveData[loc];
    if (live) {
      const daya = live.daya || 0;
      totalBeban += live.dayaBeban || 0;
      totalDaya += daya;
      locData.push({ loc: loc.split(' ')[0], daya: daya });
    }
  });
  
  // Simple bar chart dengan SVG
  const maxDaya = Math.max(...locData.map(d => d.daya), 1);
  const chartWidth = 280, chartHeight = 120, barWidth = chartWidth / locData.length;
  
  let svgBars = locData.map((d, i) => {
    const barHeight = (d.daya / maxDaya) * chartHeight;
    const x = i * barWidth;
    const y = chartHeight - barHeight;
    return `
      <rect x="${x}" y="${y}" width="${barWidth - 4}" height="${barHeight}" fill="rgba(14,124,193,.7)" rx="3"/>
      <text x="${x + (barWidth-4)/2}" y="${chartHeight + 15}" text-anchor="middle" font-size="10" fill="var(--text-gray)">${d.loc}</text>
      <text x="${x + (barWidth-4)/2}" y="${y - 3}" text-anchor="middle" font-size="9" fill="var(--primary)" font-weight="700">${d.daya.toFixed(0)}</text>
    `;
  }).join('');
  
  const html = `
    <div class="load-stats">
      <div class="stat-card">
        <span class="stat-label">Total Beban</span>
        <span class="stat-value">${totalBeban.toFixed(0)} <span class="unit">kW</span></span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Total Daya</span>
        <span class="stat-value">${(totalDaya/1000).toFixed(1)} <span class="unit">kW</span></span>
      </div>
    </div>
    <div class="load-chart">
      <div class="chart-title">Daya Konsumsi Per Lokasi (Watt)</div>
      <svg width="100%" height="180" viewBox="0 0 ${chartWidth} ${chartHeight + 25}" style="max-width:100%;">
        <defs>
          <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#0E7CC1;stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:#0A5A8F;stop-opacity:0.6" />
          </linearGradient>
        </defs>
        ${svgBars}
      </svg>
    </div>
    <div class="load-info">
      <small>📊 Update: ${lastSync ? lastSync.toLocaleTimeString('id-ID', {timeZone:'Asia/Makassar'}) + ' WITA' : '—'}</small>
    </div>
  `;
  
  panel.innerHTML = html;
}

init();
