// ============================================================
//  js/api.js  –  API calls & shared utilities
// ============================================================

// FIX: PHP files are at the project root, not inside a php/ subfolder.
// Change this to './php' only if you reorganize into subfolders.
const API_BASE = '.';

// ── Core fetch wrapper ────────────────────────────────────
async function api(file, action, method = 'GET', body = null) {
  const url = `${API_BASE}/${file}.php?action=${action}`;
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  try {
    const res  = await fetch(url, opts);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('API error:', err);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

// Shorthand helpers
const GET  = (file, action, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE}/${file}.php?action=${action}${qs ? '&' + qs : ''}`;
  return fetch(url, { credentials: 'include' }).then(r => r.json());
};
const POST = (file, action, body) => api(file, action, 'POST', body);
const PUT  = (file, action, body) => api(file, action, 'PUT',  body);

// ── Toast notifications ───────────────────────────────────
function toast(msg, type = 'info') {
  const w    = document.getElementById('toasts');
  const t    = document.createElement('div');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };
  t.className = 'toast t-' + (type === 'warn' ? 'info' : type === 'error' ? 'error' : type);
  t.innerHTML = `<span>${icons[type] || '💬'}</span><span>${msg}</span>`;
  w.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 450); }, 3500);
}

// ── Loader ────────────────────────────────────────────────
function showLoader()  { document.getElementById('loader').classList.add('show'); }
function hideLoader()  { document.getElementById('loader').classList.remove('show'); }

// ── Modals ────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
  });
});

// ── DOM helpers ───────────────────────────────────────────
const g = id => document.getElementById(id);
const v = id => g(id) ? g(id).value : '';

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function fmt(fee) {
  return parseFloat(fee) === 0
    ? '<span style="color:var(--success);font-weight:700">FREE</span>'
    : '₱' + parseFloat(fee).toFixed(2);
}

// ── Badges ────────────────────────────────────────────────
function badge(status) {
  const map = {
    pending:    ['b-pending',    '⏳'],
    processing: ['b-processing', '🔄'],
    ready:      ['b-ready',      '✅'],
    rejected:   ['b-rejected',   '❌'],
    completed:  ['b-completed',  '🏁'],
  };
  const [cls, icon] = map[status] || ['b-pending', '⏳'];
  return `<span class="badge ${cls}">${icon} ${cap(status)}</span>`;
}

function payBadge(method) {
  const gcashSvg = `
    <svg width="52" height="18" viewBox="0 0 110 38" xmlns="http://www.w3.org/2000/svg">
      <rect width="110" height="38" rx="7" fill="#0076FE"/>
      <circle cx="22" cy="19" r="13" fill="white"/>
      <text x="22" y="24.5" text-anchor="middle" font-size="16" font-weight="900"
        fill="#0076FE" font-family="Arial Black,Arial,sans-serif">G</text>
      <text x="68" y="25" text-anchor="middle" font-size="16" font-weight="800"
        fill="white" font-family="Arial Black,Arial,sans-serif">GCash</text>
    </svg>`;

  const mayaSvg = `
    <svg width="52" height="18" viewBox="0 0 110 38" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="mb" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#00D26A"/><stop offset="100%" stop-color="#00AEEF"/>
      </linearGradient></defs>
      <rect width="110" height="38" rx="7" fill="url(#mb)"/>
      <polygon points="10,30 17,10 24,30 17,23" fill="white" opacity="1"/>
      <polygon points="17,30 24,10 31,30 24,23" fill="white" opacity="0.6"/>
      <text x="68" y="25" text-anchor="middle" font-size="16" font-weight="800"
        fill="white" font-family="Arial Black,Arial,sans-serif">maya</text>
    </svg>`;

  if (method === 'GCash') return `<span style="display:inline-flex;align-items:center">${gcashSvg}</span>`;
  if (method === 'Maya')  return `<span style="display:inline-flex;align-items:center">${mayaSvg}</span>`;
  return `<span class="badge" style="background:rgba(100,116,139,.15);color:var(--muted2)">🆓 FREE</span>`;
}

// ── Date helpers ──────────────────────────────────────────
function timeGreet() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function todayFormatted() {
  return new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ── Table empty row ───────────────────────────────────────
function emptyRow(cols, message = 'No records found.') {
  return `<tr><td colspan="${cols}" style="text-align:center;padding:32px 20px;color:var(--muted)">${message}</td></tr>`;
}