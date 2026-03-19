// ============================================================
//  js/nav.js  –  Panel navigation, sidebar, init
// ============================================================

// ── SHOW PANEL ────────────────────────────────────────────
function showPanel(id) {
  // Hide all panels
  document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
  // Deactivate all sidebar links
  document.querySelectorAll('.slink').forEach(x => x.classList.remove('active'));

  // Show target panel
  const panel = g('panel-' + id);
  if (panel) panel.classList.add('active');

  // Activate matching sidebar link
  const sl = g('sl-' + id);
  if (sl) sl.classList.add('active');

  // Render panel content
  switch (id) {
    case 'res-home':      renderResHome();      break;
    case 'res-history':   renderResHistory();   break;
    case 'res-request':   initRequestForm();    break;
    case 'res-track':
      // reset track result
      const tr = g('track-result');
      if (tr) tr.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div>Enter a reference number above to track your request.</div>
        </div>`;
      break;
    case 'res-profile':
      if (currentUser) prefillProfile(currentUser);
      break;
    case 'adm-home':      renderAdmHome();      break;
    case 'adm-requests':  renderAdmRequests();  break;
    case 'adm-residents': renderResidents();    break;
    case 'adm-reports':   renderReports();      break;
    case 'adm-settings':  renderSettings();     break;
  }
}

// ── BRAND CLICK → go home ─────────────────────────────────
function goHome() {
  if (!currentUser) return;
  showPanel(currentUser.role === 'admin' ? 'adm-home' : 'res-home');
}

// ── TRACK: enter key ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const ti = g('track-in');
  if (ti) ti.addEventListener('keydown', e => { if (e.key === 'Enter') doTrack(); });

  // Search debounce
  const hs = g('hist-search');
  if (hs) hs.addEventListener('input', debounce(() => renderResHistory(), 350));

  const as = g('adm-search');
  if (as) as.addEventListener('input', debounce(() => renderAdmRequests(), 350));

  const rs = g('res-search');
  if (rs) rs.addEventListener('input', debounce(() => renderResidents(), 350));

  // Check session on load
  checkSession();
});

// ── DEBOUNCE ──────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}