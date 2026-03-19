// ============================================================
//  js/admin.js  –  Admin Dashboard, Requests, Residents, Reports, Settings
// ============================================================

let admFilter      = 'all';
let pendingRejectId = null;

// ── ADMIN HOME ────────────────────────────────────────────
async function renderAdmHome() {
  g('adm-date-chip').textContent = '📅 ' + todayFormatted();

  showLoader();
  const res = await GET('reports', 'dashboard');
  hideLoader();

  if (!res.success) { toast('Failed to load dashboard.', 'error'); return; }

  const { stats, today, week, by_doc, by_pay } = res;

  // Stats
  g('adm-stats').innerHTML = `
    <div class="stat">
      <div class="stat-label">Total Requests</div>
      <div class="stat-num">${stats.total}</div>
      <div class="stat-sub">All time</div>
    </div>
    <div class="stat">
      <div class="stat-label">Pending Review</div>
      <div class="stat-num" style="color:var(--warning)">${stats.pending}</div>
      <div class="stat-sub">Needs action</div>
    </div>
    <div class="stat">
      <div class="stat-label">Ready to Claim</div>
      <div class="stat-num" style="color:var(--success)">${stats.ready}</div>
      <div class="stat-sub">Awaiting pickup</div>
    </div>
    <div class="stat">
      <div class="stat-label">Fees Collected</div>
      <div class="stat-num" style="color:var(--accent)">₱${parseFloat(stats.collected||0).toFixed(0)}</div>
      <div class="stat-sub">From paid requests</div>
    </div>`;

  // Week bar chart
  const maxVal = Math.max(...week, 1);
  g('week-chart').innerHTML = week.map(n =>
    `<div class="bar" style="height:${Math.max(4, Math.round(n/maxVal*100))}%" title="${n} requests"></div>`
  ).join('');

  // Doc breakdown
  const total = by_doc.reduce((s, d) => s + parseInt(d.cnt), 0) || 1;
  g('doc-breakdown').innerHTML = by_doc.map(d => {
    const pct = Math.round(parseInt(d.cnt) / total * 100);
    return `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px">
        <span>${d.icon} ${d.name}</span>
        <span style="color:var(--accent);font-weight:700">${pct}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join('') || '<div style="color:var(--muted);font-size:13px">No data yet.</div>';

  // Latest requests table
  const listRes = await GET('requests', 'list');
  if (listRes.success) {
    const latest = listRes.requests.slice(0, 6);
    g('adm-recent-tb').innerHTML = latest.length
      ? latest.map(r => admRow(r, true)).join('')
      : emptyRow(8, 'No requests yet.');
  }
}

// ── ADMIN ALL REQUESTS ────────────────────────────────────
async function renderAdmRequests() {
  const q      = v('adm-search').toLowerCase();
  const params = { search: q };
  if (admFilter !== 'all') params.status = admFilter;

  const res = await GET('requests', 'list', params);
  if (!res.success) { toast('Failed to load requests.', 'error'); return; }

  g('adm-all-tb').innerHTML = res.requests.length
    ? res.requests.map(r => admRow(r, true)).join('')
    : emptyRow(8, 'No requests found.');
}

function admRow(r, showActions = false) {
  const actions = showActions ? `
    ${r.status==='pending'?`
      <button class="btn btn-success btn-xs" onclick="changeStatus(${r.id},'processing')">Approve</button>
      <button class="btn btn-danger btn-xs"  onclick="openRejectModal(${r.id})">Reject</button>`:''}
    ${r.status==='processing'?`
      <button class="btn btn-warning btn-xs" onclick="changeStatus(${r.id},'ready')">Mark Ready</button>`:''}
    ${r.status==='ready'?`
      <button class="btn btn-primary btn-xs" onclick="changeStatus(${r.id},'completed')">Complete</button>`:''}
    <button class="btn btn-outline btn-xs" onclick="viewRequest(${r.id})">View</button>
  ` : `<button class="btn btn-outline btn-xs" onclick="viewRequest(${r.id})">View</button>`;

  return `<tr>
    <td><span style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent);cursor:pointer"
      onclick="viewRequest(${r.id})">${r.reference_no}</span></td>
    <td style="font-weight:500">${r.resident_name || r.full_name}</td>
    <td>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        ${r.doc_name}
        ${r.processing_type === 'urgent'
          ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#fef9c3;color:#a16207;border:1px solid #fde68a;border-radius:99px;padding:2px 8px;font-size:11px;font-weight:700;white-space:nowrap">⚡ Urgent</span>`
          : `<span style="display:inline-flex;align-items:center;gap:3px;background:var(--surface3);color:var(--muted2);border:1px solid var(--border);border-radius:99px;padding:2px 8px;font-size:11px;font-weight:600;white-space:nowrap">📋 Normal</span>`}
      </div>
    </td>
    <td style="color:var(--muted2)">${r.date}</td>
    <td>${fmt(r.fee)}</td>
    <td>${payBadge(r.payment_method)}</td>
    <td>${badge(r.status)}</td>
    <td style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">${actions}</td>
  </tr>`;
}

// ── SET FILTER ────────────────────────────────────────────
function setFilter(f, btn) {
  admFilter = f;
  document.querySelectorAll('.adm-fil').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAdmRequests();
}

// ── CHANGE STATUS ─────────────────────────────────────────
async function changeStatus(id, status) {
  const payload = { id, status };
  const res = await POST('requests', 'status', payload);
  if (!res.success) { toast(res.message, 'error'); return; }
  toast('Request updated → ' + cap(status), 'success');
  closeModal('modal-detail');
  refreshActivePanel();
}

// ── REJECT MODAL ──────────────────────────────────────────
function openRejectModal(id) {
  pendingRejectId = id;
  if (g('reject-reason')) g('reject-reason').value = '';
  closeModal('modal-detail');
  openModal('modal-reject');
}

async function confirmReject() {
  const reason = v('reject-reason').trim();
  if (!reason) { toast('Rejection reason is required.', 'error'); return; }

  const res = await POST('requests', 'status', {
    id: pendingRejectId, status: 'rejected', reject_reason: reason
  });

  if (!res.success) { toast(res.message, 'error'); return; }
  toast('Request rejected.', 'error');
  closeModal('modal-reject');
  pendingRejectId = null;
  refreshActivePanel();
}

// ── ADMIN ACTIONS (injected into request detail modal) ────
function buildAdminActions(r) {
  let html = '';
  if (r.status === 'pending') html += `
    <button class="btn btn-success btn-sm" onclick="changeStatus(${r.id},'processing')">✅ Approve</button>
    <button class="btn btn-danger btn-sm"  onclick="openRejectModal(${r.id})">❌ Reject</button>`;
  if (r.status === 'processing') html +=
    `<button class="btn btn-warning btn-sm" onclick="changeStatus(${r.id},'ready')">📦 Mark Ready</button>`;
  if (r.status === 'ready') html +=
    `<button class="btn btn-primary btn-sm" onclick="changeStatus(${r.id},'completed')">🏁 Mark Completed</button>`;
  return html;
}

// ── ADMIN RESIDENTS ───────────────────────────────────────
async function renderResidents() {
  const q   = v('res-search');
  const res = await GET('users', 'residents', { search: q });
  if (!res.success) { toast('Failed to load residents.', 'error'); return; }

  g('res-count').textContent = res.residents.length;

  g('residents-tb').innerHTML = res.residents.length
    ? res.residents.map(u => `
      <tr>
        <td style="font-weight:600">${u.first_name} ${u.last_name}</td>
        <td style="color:var(--muted2)">${u.email}</td>
        <td style="color:var(--muted2)">${u.phone || '—'}</td>
        <td><span class="chip">${u.purok || '—'}</span></td>
        <td style="color:var(--muted2)">${u.registered}</td>
        <td><span class="badge b-processing">${u.request_count} requests</span></td>
      </tr>`).join('')
    : emptyRow(6, 'No residents found.');
}

// ── ADMIN REPORTS ─────────────────────────────────────────
async function renderReports() {
  const month = v('rpt-month') || new Date().getMonth() + 1;
  const year  = new Date().getFullYear();

  const res = await GET('reports', 'monthly', { month, year });
  if (!res.success) { toast('Failed to load report.', 'error'); return; }

  const s = res.stats;
  g('report-stats').innerHTML = `
    <div class="report-stat">
      <div class="report-icon" style="background:rgba(59,130,246,.15)">📄</div>
      <div>
        <div style="font-size:11px;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.5px">Total Requests</div>
        <div style="font-family:'Sora',sans-serif;font-size:32px;font-weight:800;color:var(--accent2)">${s.total||0}</div>
      </div>
    </div>
    <div class="report-stat">
      <div class="report-icon" style="background:rgba(34,197,94,.15)">💰</div>
      <div>
        <div style="font-size:11px;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.5px">Fees Collected</div>
        <div style="font-family:'Sora',sans-serif;font-size:32px;font-weight:800;color:var(--success)">₱${parseFloat(s.collected||0).toFixed(0)}</div>
      </div>
    </div>
    <div class="report-stat">
      <div class="report-icon" style="background:rgba(245,158,11,.15)">⏱️</div>
      <div>
        <div style="font-size:11px;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.5px">Avg. Processing</div>
        <div style="font-family:'Sora',sans-serif;font-size:32px;font-weight:800;color:var(--warning)">${parseFloat(s.avg_hours||0).toFixed(1)}h</div>
      </div>
    </div>
    <div class="report-stat">
      <div class="report-icon" style="background:rgba(45,212,191,.15)">🏁</div>
      <div>
        <div style="font-size:11px;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.5px">Completed</div>
        <div style="font-family:'Sora',sans-serif;font-size:32px;font-weight:800;color:var(--accent)">${s.completed||0}</div>
      </div>
    </div>`;

  // By doc type & by payment (reuse dashboard data)
  const dash = await GET('reports', 'dashboard');
  if (dash.success) {
    const totalD = dash.by_doc.reduce((s, d) => s + parseInt(d.cnt), 0) || 1;
    g('rpt-by-doc').innerHTML = dash.by_doc.map(d => {
      const pct = Math.round(parseInt(d.cnt)/totalD*100);
      return `<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px">
          <span>${d.icon} ${d.name}</span>
          <span style="color:var(--accent);font-weight:700">${d.cnt} (${pct}%)</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>`;}).join('');

    const totalP = dash.by_pay.reduce((s, p) => s + parseInt(p.cnt), 0) || 1;
    const payColors = { GCash:'#0076FE', Maya:'#00D26A', FREE:'var(--muted2)' };
    g('rpt-by-pay').innerHTML = dash.by_pay.map(p => {
      const pct = Math.round(parseInt(p.cnt)/totalP*100);
      return `<div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <span>${payBadge(p.payment_method)}</span>
          <span style="font-weight:700">${p.cnt} (${pct}%)</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${payColors[p.payment_method]||'var(--accent)'}"></div></div>
      </div>`;}).join('');
  }
}

// ── ADMIN SETTINGS ────────────────────────────────────────
async function renderSettings() {
  // Load settings
  const res = await GET('reports', 'settings_get');
  if (res.success && res.settings) {
    const s = res.settings;
    const map = {
      'cfg-bgy':'barangay_name','cfg-mun':'municipality','cfg-prov':'province',
      'cfg-capt':'captain_name','cfg-tel':'contact_number',
      'cfg-gcash':'gcash_number','cfg-maya':'maya_number',
    };
    Object.entries(map).forEach(([elId, key]) => {
      const el = g(elId);
      if (el && s[key]) el.value = s[key];
    });
  }

  // Load doc types for fee editor
  const dtRes = await GET('requests', 'doc_types');
  if (dtRes.success) {
    g('fee-settings-list').innerHTML = dtRes.doc_types.map(d => `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:13px;gap:12px">
        <div style="display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:500;flex:1">
          <span style="font-size:18px">${d.icon}</span> ${d.name}
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="color:var(--muted2);font-size:13px">₱</span>
          <input id="fee-${d.id}" type="number" value="${parseFloat(d.fee).toFixed(2)}" min="0"
            style="width:90px;background:var(--surface2);border:1.5px solid var(--border2);
                   border-radius:8px;padding:7px 10px;color:var(--text);font-size:14px;
                   outline:none;font-family:inherit"/>
        </div>
      </div>`).join('');

    // Store doc ids for save
    window._docTypeIds = dtRes.doc_types.map(d => d.id);
  }
}

async function saveSettings() {
  const payload = {
    barangay_name:     v('cfg-bgy'),
    municipality:      v('cfg-mun'),
    province:          v('cfg-prov'),
    captain_name:      v('cfg-capt'),
    contact_number:    v('cfg-tel'),
    gcash_number:      v('cfg-gcash'),
    maya_number:       v('cfg-maya'),
  };

  const res = await POST('reports', 'settings_save', payload);
  if (!res.success) { toast(res.message, 'error'); return; }
  toast('Settings saved!', 'success');
}

async function saveFees() {
  const ids  = window._docTypeIds || [];
  const data = ids.map(id => ({ id, fee: parseFloat(v('fee-' + id)) || 0 }));

  const res = await POST('reports', 'fees_save', data);
  if (!res.success) { toast(res.message, 'error'); return; }
  toast('Document fees updated!', 'success');
}

// ── NOTIFICATIONS ─────────────────────────────────────────
async function openNotifModal() {
  const res = await GET('users', 'notifications');
  if (!res.success) { toast('Failed to load notifications.', 'error'); return; }

  g('notif-body').innerHTML = res.notifications.length
    ? res.notifications.map(n => `
      <div style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--border);opacity:${n.is_read?'.55':'1'}">
        <span style="font-size:22px;flex-shrink:0">${n.icon}</span>
        <div>
          <div style="font-size:13.5px;font-weight:${n.is_read?'400':'600'}">${n.message}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">${n.created_at}</div>
        </div>
      </div>`).join('')
    : '<div class="empty-state"><div class="empty-icon">🔔</div><div>No notifications yet.</div></div>';

  openModal('modal-notif');

  // Mark all read
  await POST('users', 'mark_read', { ids: [] });
  const dot = g('notif-dot');
  if (dot) dot.style.display = 'none';
}

// ── HELPER: refresh active panel ─────────────────────────
function refreshActivePanel() {
  const active = document.querySelector('.panel.active');
  if (!active) return;
  const id = active.id.replace('panel-', '');
  if (id === 'adm-home')     renderAdmHome();
  if (id === 'adm-requests') renderAdmRequests();
  if (id === 'res-home')     renderResHome();
  if (id === 'res-history')  renderResHistory();
}