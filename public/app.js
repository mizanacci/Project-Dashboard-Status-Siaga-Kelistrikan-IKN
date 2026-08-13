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

const DEFAULT_SHEET_URL = "";

// =========================================================
// STATE
// =========================================================
let sheetUrl = DEFAULT_SHEET_URL || null;
let refreshMs = 10000;
let refreshTimer = null;
let liveData = {};
let isConnected = false;
let lastSync = null;
const expandedRoles = new Set();
let lastDataHash = null; // for smart polling
let unchangedPolls = 0; // counter untuk aggressive refresh
const MAX_UNCHANGED_POLLS = 3; // force fresh fetch setelah 3 poll tidak berubah

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
  } catch (e) {}
}

// =========================================================
// INIT
// =========================================================
async function init(){
  tickClock(); setInterval(tickClock, 1000);
  renderSequencer(); setInterval(renderSequencer, 30000);
  
  const saved = await loadConfig();
  if (saved && saved.url) sheetUrl = saved.url;
  
  // Load from cache if available
  const cached = loadCachedData();
  if (cached && cached.data) {
    liveData = cached.data;
    isConnected = true;
    renderAll();
  } else {
    renderAll();
  }

  if (sheetUrl){
    document.getElementById('sheetUrlInput').value = sheetUrl;
    await sync();
  }
  armRefresh();

  document.getElementById('settingsBtn').addEventListener('click', toggleConfig);
  document.getElementById('toggleConfigBtn').addEventListener('click', toggleConfig);
  document.getElementById('saveConfigBtn').addEventListener('click', onSaveConfig);

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
  
  if (!url.includes('docs.google.com/spreadsheets') || !url.includes('output=csv')) {
    status.textContent = 'URL tidak valid. Pastikan format: https://docs.google.com/spreadsheets/d/e/…/pub?output=csv'; 
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

async function sync(manual){ setConn('loading'); if (!sheetUrl){ setConn('demo'); renderAll(); return; }
  try{
    const forceBypassCache = unchangedPolls >= MAX_UNCHANGED_POLLS;
    const cacheBypass = forceBypassCache ? '&nocache=' + Date.now() : '';
    const proxy = '/api/fetch?u=' + encodeURIComponent(sheetUrl) + cacheBypass;
    console.log('[SYNC] Fetching from:', sheetUrl.substring(0, 80) + '...');
    
    const res = await fetch(proxy, { cache:'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    
    const dataHash = res.headers.get('X-Data-Hash');
    const fromCache = res.headers.get('X-From-Cache') === '1';
    
    if (dataHash && lastDataHash === dataHash && !manual) {
      unchangedPolls++;
      if (forceBypassCache) unchangedPolls = 0;
      setConn(isConnected ? 'live' : 'nomatch');
      console.log('[SYNC] Data unchanged, skipped');
      return;
    }
    
    unchangedPolls = 0;
    const text = await res.text();
    console.log('[CSV] Size:', text.length, 'bytes, Lines:', text.split('\n').length);
    
    if (!text || text.trim().length === 0) throw new Error('CSV kosong');
    
    const rows = parseCSV(text);
    console.log('[CSV] Parsed', rows.length, 'data rows');
    
    if (rows.length === 0) throw new Error('Tidak ada data di spreadsheet');
    
    // Show first row structure
    if (rows.length > 0) console.log('[CSV] Headers:', Object.keys(rows[0]).join(', '));
    
    const map = {};
    rows.forEach(r=>{ const lok = normKey(r['lokasi']||''); if (lok) map[lok] = r; });
    console.log('[MATCH] Found in CSV:', Object.keys(map).join(', '));

    let matched = 0;
    const newData = {};
    LOCATIONS_ORDER.forEach(loc=>{ 
      const normLoc = normKey(loc); 
      const row = map[normLoc]; 
      if (row){ 
        matched++; 
        newData[loc] = { statusPenyulang: row['statuspenyulang'] || '', statusGenset: row['statusgenset'] || '', statusUPS: row['statusups'] || '', statusCOS: row['statuscos'] || '', personilHadir: row['personilhadir'], catatan: row['catatan'] || '', updateTerakhir: row['updateterakhir'] || '' }; 
      } else {
        console.warn('[MATCH] Tidak cocok:', loc, '(norm:', normLoc + ')');
      }
    });

    liveData = newData;
    lastDataHash = dataHash;
    if (matched > 0) saveCacheData(newData, dataHash);
    
    isConnected = matched > 0; lastSync = new Date(); setConn(isConnected ? 'live' : 'nomatch');
    const status = document.getElementById('configStatus'); 
    const cacheLabel = fromCache ? ' (cache)' : ' (fresh)';
    if (isConnected) {
      status.textContent = '✓ Terhubung — ' + matched + ' dari 5 lokasi' + cacheLabel;
      status.className = 'config-status ok';
      console.log('[SUCCESS] Sinkron OK!', matched, 'lokasi');
    } else {
      status.textContent = '✗ URL OK tapi 0 lokasi cocok. Expected: ' + LOCATIONS_ORDER.slice(0,2).join(', ') + ' ...';
      status.className = 'config-status err';
      console.error('[ERROR] No matching locations!');
    }
  }catch(err){ 
    isConnected = false; setConn('error'); 
    const status = document.getElementById('configStatus'); 
    status.textContent = '✗ Error: ' + err.message; 
    status.className = 'config-status err';
    console.error('[ERROR]', err.message);
  }
  finally{ renderAll(); }
}

function armRefresh(){ if (refreshTimer) clearInterval(refreshTimer); if (sheetUrl && refreshMs > 0){ refreshTimer = setInterval(()=>sync(false), refreshMs); } }

function setConn(state){ const dot = document.getElementById('connDot'); const label = document.getElementById('connLabel'); const badge = document.getElementById('connBadge'); dot.className = 'lamp-dot'; if (state === 'live'){ dot.classList.add('s-ok','live'); label.textContent='TERHUBUNG · LANGSUNG'; } else if (state === 'loading'){ label.textContent='MENYINKRONKAN…'; } else if (state === 'demo'){ label.textContent='DATA REFERENSI'; } else if (state === 'nomatch'){ dot.classList.add('s-warn'); label.textContent='TERHUBUNG · 0 COCOK'; } else if (state === 'error'){ dot.classList.add('s-crit'); label.textContent='GAGAL SINKRON'; } badge.title = lastSync ? ('Sinkron terakhir: ' + lastSync.toLocaleTimeString('id-ID',{timeZone:'Asia/Makassar'}) + ' WITA') : ''; }

function parseCSV(text){ const lines = text.replace(/\r/g,'').split('\n').filter(l=>l.trim().length); if (!lines.length) return []; const headers = splitCSVLine(lines[0]).map(h=>normKey(h)); return lines.slice(1).map(line=>{ const cols = splitCSVLine(line); const obj = {}; headers.forEach((h,i)=> obj[h] = (cols[i]||'').trim()); return obj; }); }
function splitCSVLine(line){ const out=[]; let cur=''; let q=false; for (let i=0;i<line.length;i++){ const c = line[i]; if (q){ if (c === '"'){ if (line[i+1] === '"'){ cur+='"'; i++; } else q=false; } else cur += c; } else { if (c === '"') q = true; else if (c === ','){ out.push(cur); cur=''; } else cur += c; } } out.push(cur); return out; }
function normKey(s){ return (s||'').toString().trim().toLowerCase().replace(/[^a-z0-9]/g,''); }

function statusClass(v){ const n = normKey(v); if (n === 'normal') return 's-ok'; if (n === 'siaga') return 's-warn'; if (n === 'gangguan') return 's-crit'; return ''; }
function overallStatus(loc){ const live = liveData[loc]; if (!isConnected || !live) return ''; const ref = REFERENCE_DATA[loc]; const vals = [live.statusPenyulang, live.statusGenset, live.statusUPS]; if (ref.cos) vals.push(live.statusCOS); const norm = vals.map(normKey); if (norm.includes('gangguan')) return 's-crit'; if (norm.some(v=>v==='siaga'||v==='')) return 's-warn'; if (norm.length && norm.every(v=>v==='normal')) return 's-ok'; return ''; }
function escapeHtml(s){ return (s==null?'':s.toString()).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function renderAll(){ renderMeters(); renderBusbar(); renderCards(); }

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

init();
