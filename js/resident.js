// ============================================================
//  js/resident.js  –  Resident Dashboard, History, Track, Profile
// ============================================================

// ── RESIDENT HOME ─────────────────────────────────────────
async function renderResHome() {
  g('greet-text').textContent = timeGreet() + ', ' + currentUser.first_name + '! 👋';

  const res = await GET('requests', 'list');
  if (!res.success) { toast('Failed to load requests.', 'error'); return; }

  const reqs    = res.requests;
  const total   = reqs.length;
  const pending = reqs.filter(r => r.status === 'pending').length;
  const ready   = reqs.filter(r => r.status === 'ready').length;
  const done    = reqs.filter(r => r.status === 'completed').length;

  g('res-stats').innerHTML = `
    <div class="stat">
      <div class="stat-label">Total Requests</div>
      <div class="stat-num">${total}</div>
      <div class="stat-sub">All time</div>
    </div>
    <div class="stat">
      <div class="stat-label">Pending</div>
      <div class="stat-num" style="color:var(--warning)">${pending}</div>
      <div class="stat-sub">Awaiting review</div>
    </div>
    <div class="stat">
      <div class="stat-label">Ready to Claim</div>
      <div class="stat-num" style="color:var(--success)">${ready}</div>
      <div class="stat-sub">Visit the hall</div>
    </div>
    <div class="stat">
      <div class="stat-label">Completed</div>
      <div class="stat-num" style="color:var(--accent)">${done}</div>
      <div class="stat-sub">Claimed</div>
    </div>`;

  // Ready alerts
  const readyReqs = reqs.filter(r => r.status === 'ready');
  g('res-alert-ready').innerHTML = readyReqs.map(r => `
    <div class="alert alert-success">
      ✅ <div><strong>Ready to Claim:</strong> Your <strong>${r.doc_name}</strong>
      (${r.reference_no}) is ready! Visit the barangay hall with a valid ID.</div>
    </div>`).join('');

  // Recent table (last 5)
  const recent = reqs.slice(0, 5);
  g('res-recent-tb').innerHTML = recent.length
    ? recent.map(r => `
      <tr>
        <td>
          <span style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent);cursor:pointer"
            onclick="viewRequest(${r.id})">${r.reference_no}</span>
        </td>
        <td>${r.doc_name}</td>
        <td style="color:var(--muted2)">${r.date}</td>
        <td>${payBadge(r.payment_method)}</td>
        <td>${badge(r.status)}</td>
        <td><button class="btn btn-outline btn-xs" onclick="viewRequest(${r.id})">View</button></td>
      </tr>`).join('')
    : emptyRow(6, 'No requests yet. <a style="color:var(--accent);cursor:pointer" onclick="showPanel(\'res-request\')">Make your first request →</a>');
}

// ── RESIDENT HISTORY ──────────────────────────────────────
async function renderResHistory() {
  const q      = v('hist-search').toLowerCase();
  const params = {};
  if (q) params.search = q;

  const res = await GET('requests', 'list', params);
  if (!res.success) { toast('Failed to load history.', 'error'); return; }

  g('hist-tb').innerHTML = res.requests.length
    ? res.requests.map(r => `
      <tr>
        <td>
          <span style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent);cursor:pointer"
            onclick="viewRequest(${r.id})">${r.reference_no}</span>
        </td>
        <td>${r.doc_name}</td>
        <td style="color:var(--muted2)">${r.date}</td>
        <td style="color:var(--muted2)">${r.purpose}</td>
        <td>${fmt(r.fee)}</td>
        <td>${payBadge(r.payment_method)}</td>
        <td>${badge(r.status)}</td>
        <td><button class="btn btn-outline btn-xs" onclick="viewRequest(${r.id})">View</button></td>
      </tr>`).join('')
    : emptyRow(8, 'No requests found.');
}

// ── TRACK STATUS ──────────────────────────────────────────
async function doTrack() {
  const refNo = v('track-in').trim().toUpperCase();
  if (!refNo) { toast('Please enter a reference number.', 'error'); return; }

  const res = await GET('requests', 'track', { ref: refNo });
  const el  = g('track-result');

  if (!res.success) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div>No request found for <strong style="color:var(--text)">${refNo}</strong></div>
        <div style="font-size:13px;margin-top:6px">Check the reference number and try again.</div>
      </div>`;
    return;
  }

  const r = res.request;
  const statusFlow = ['pending','processing','ready','completed'];
  const idx = statusFlow.indexOf(r.status);

  const steps = [
    { label:'Submitted',      sub:'Request received by the barangay',          done:true,     current:false },
    { label:'Under Review',   sub:'Staff is reviewing your request',           done:idx>=1,   current:r.status==='processing' },
    { label:'Ready to Claim', sub:'Document is ready at the barangay hall',    done:idx>=2,   current:r.status==='ready' },
    { label:'Completed',      sub:'Document has been claimed',                 done:idx>=3,   current:false },
  ];

  el.innerHTML = `
    <div style="background:var(--surface2);border-radius:13px;padding:22px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:800;color:var(--accent)">${r.reference_no}</div>
          <div style="font-size:14px;font-weight:600;margin-top:2px">${r.doc_icon} ${r.doc_name}</div>
          <div style="font-size:13px;color:var(--muted2);margin-top:2px">Submitted: ${r.date} &nbsp;·&nbsp; ${r.purpose}</div>
        </div>
        ${badge(r.status)}
      </div>
      ${r.status==='rejected' && r.reject_reason ? `<div class="alert alert-warn">⚠️ Rejected: ${r.reject_reason}</div>` : ''}
      ${r.status==='ready' ? `<div class="alert alert-success">✅ Your document is ready! Visit the barangay hall with a valid ID to claim it.</div>` : ''}
      <div class="timeline" style="margin-top:16px">
        ${steps.map((s, i) => `
          <div class="tl">
            <div class="tl-col">
              <div class="tl-dot ${s.done?'done':''} ${s.current?'current':''}"></div>
              ${i < steps.length - 1 ? `<div class="tl-line ${s.done?'done':''}"></div>` : ''}
            </div>
            <div class="tl-text" style="padding-bottom:${i < steps.length-1 ? '22px' : '0'}">
              <div class="tl-label ${s.done?'done':''} ${s.current?'current':''}">${s.label}</div>
              <div class="tl-sub">${s.sub}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

// ── PROFILE ───────────────────────────────────────────────
async function saveProfile() {
  const payload = {
    first_name: v('pf-fn').trim(),
    last_name:  v('pf-ln').trim(),
    email:      v('pf-em').trim().toLowerCase(),
    phone:      v('pf-ph').trim(),
    purok:      v('pf-pu'),
    address:    v('pf-ad').trim(),
  };

  if (!payload.first_name || !payload.last_name) {
    toast('Name fields are required.', 'error'); return;
  }

  const btn = g('btn-save-profile');
  btn.disabled = true; btn.textContent = 'Saving…';

  const res = await POST('users', 'update_profile', payload);

  btn.disabled = false; btn.textContent = 'Save Changes';

  if (!res.success) { toast(res.message, 'error'); return; }

  // Update nav
  currentUser = res.user;
  g('nav-av').textContent   = res.user.first_name[0].toUpperCase();
  g('nav-name').textContent = res.user.first_name;
  g('prof-name-disp').textContent  = res.user.first_name + ' ' + res.user.last_name;
  g('prof-email-disp').textContent = res.user.email;
  g('prof-av-big').textContent     = res.user.first_name[0].toUpperCase();

  toast('Profile updated successfully!', 'success');
}

async function savePassword() {
  const payload = {
    current_password: v('pf-op'),
    new_password:     v('pf-np'),
    confirm_password: v('pf-cp'),
  };
  if (!payload.current_password || !payload.new_password) {
    toast('Please fill in all password fields.', 'error'); return;
  }

  const btn = g('btn-save-pass');
  btn.disabled = true; btn.textContent = 'Saving…';

  const res = await POST('users', 'change_password', payload);

  btn.disabled = false; btn.textContent = 'Change Password';

  if (!res.success) { toast(res.message, 'error'); return; }

  g('pf-op').value = '';
  g('pf-np').value = '';
  g('pf-cp').value = '';
  toast('Password changed successfully!', 'success');
}

// ── VIEW REQUEST DETAIL (resident) ────────────────────────
async function viewRequest(id) {
  showLoader();
  const res = await GET('requests', 'get', { id });
  hideLoader();

  if (!res.success) { toast(res.message, 'error'); return; }
  const r = res.request;

  const statusFlow = ['pending','processing','ready','completed'];
  const idx = statusFlow.indexOf(r.status);
  const steps = [
    { label:'Submitted',      done:true,    current:false },
    { label:'Under Review',   done:idx>=1,  current:r.status==='processing' },
    { label:'Ready to Claim', done:idx>=2,  current:r.status==='ready' },
    { label:'Completed',      done:idx>=3,  current:false },
  ];

  g('modal-detail-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:13px;margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid var(--border)">
      <span style="font-size:38px">${r.doc_icon || '📄'}</span>
      <div style="flex:1">
        <div style="font-family:'Sora',sans-serif;font-weight:700;font-size:16px">${r.doc_name}</div>
        <div style="color:var(--accent);font-size:13px;font-family:'Sora',sans-serif;margin-top:2px">${r.reference_no}</div>
      </div>
      ${badge(r.status)}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-bottom:20px;font-size:13.5px">
      ${detailRow('Resident',       r.resident_name || (r.full_name))}
      ${detailRow('Date Submitted', r.date || r.created_at?.slice(0,10))}
      ${detailRow('Purpose',        r.purpose)}
      ${detailRow('Fee',            parseFloat(r.fee)===0?'<span style="color:var(--success);font-weight:700">FREE</span>':'<span style="color:var(--accent);font-weight:700">₱'+parseFloat(r.fee).toFixed(2)+'</span>')}
      ${detailRow('Payment',        payBadge(r.payment_method))}
      ${detailRow('Reference #',    `<span style="font-size:12.5px">${r.payment_ref||'N/A'}</span>`)}
    </div>
    ${r.reject_reason ? `<div class="alert alert-warn">⚠️ Rejection Reason: ${r.reject_reason}</div>` : ''}
    <div style="font-family:'Sora',sans-serif;font-size:11.5px;font-weight:700;color:var(--muted2);letter-spacing:.7px;text-transform:uppercase;margin-bottom:13px">Progress</div>
    <div class="timeline">
      ${steps.map((s, i) => `
        <div class="tl">
          <div class="tl-col">
            <div class="tl-dot ${s.done?'done':''} ${s.current?'current':''}"></div>
            ${i < steps.length - 1 ? `<div class="tl-line ${s.done?'done':''}"></div>` : ''}
          </div>
          <div class="tl-text" style="padding-bottom:${i < steps.length-1 ? '22px' : '0'}">
            <div class="tl-label ${s.done?'done':''} ${s.current?'current':''}">${s.label}</div>
          </div>
        </div>`).join('')}
    </div>`;

  // Footer: admin actions if admin, close if resident
  let foot = `<button class="btn btn-outline btn-sm" onclick="closeModal('modal-detail')">Close</button>`;
  if (currentUser?.role === 'admin') {
    foot = buildAdminActions(r) + foot;
  }
  g('modal-detail-foot').innerHTML = foot;

  openModal('modal-detail');
}

function detailRow(label, value) {
  return `<div>
    <div style="color:var(--muted2);font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:3px">${label}</div>
    <div style="font-weight:600">${value}</div>
  </div>`;
}