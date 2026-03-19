
//  js/resident.js  –  Resident Dashboard, History, Track, Profile


//  RESIDENT HOME 
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

  const readyReqs = reqs.filter(r => r.status === 'ready');
  g('res-alert-ready').innerHTML = readyReqs.map(r => `
    <div class="alert alert-success">
      ✅ <div><strong>Ready to Claim:</strong> Your <strong>${r.doc_name}</strong>
      (${r.reference_no}) is ready! Visit the barangay hall with a valid ID.</div>
    </div>`).join('');

  const recent = reqs.slice(0, 5);
  g('res-recent-tb').innerHTML = recent.length
    ? recent.map(r => `
      <tr>
        <td><span style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent);cursor:pointer"
          onclick="viewRequest(${r.id})">${r.reference_no}</span></td>
        <td>${r.doc_name}</td>
        <td style="color:var(--muted2)">${r.date}</td>
        <td>${payBadge(r.payment_method)}</td>
        <td>${badge(r.status)}</td>
        <td><button class="btn btn-outline btn-xs" onclick="viewRequest(${r.id})">View</button></td>
      </tr>`).join('')
    : emptyRow(6, 'No requests yet. <a style="color:var(--accent);cursor:pointer" onclick="showPanel(\'res-request\')">Make your first request →</a>');
}

//  RESIDENT HISTORY 
async function renderResHistory() {
  const q      = v('hist-search').toLowerCase();
  const params = {};
  if (q) params.search = q;

  const res = await GET('requests', 'list', params);
  if (!res.success) { toast('Failed to load history.', 'error'); return; }

  g('hist-tb').innerHTML = res.requests.length
    ? res.requests.map(r => `
      <tr>
        <td><span style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent);cursor:pointer"
          onclick="viewRequest(${r.id})">${r.reference_no}</span></td>
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

// TRACK STATUS 
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
    { label:'Submitted',      sub:'Request received by the barangay',       done:true,   current:false },
    { label:'Under Review',   sub:'Staff is reviewing your request',        done:idx>=1, current:r.status==='processing' },
    { label:'Ready to Claim', sub:'Document is ready at the barangay hall', done:idx>=2, current:r.status==='ready' },
    { label:'Completed',      sub:'Document has been claimed',              done:idx>=3, current:false },
  ];

  el.innerHTML = `
    <div style="background:var(--surface2);border-radius:13px;padding:22px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:800;color:var(--accent)">${r.reference_no}</div>
          <div style="font-size:14px;font-weight:600;margin-top:2px">${r.doc_icon} ${r.doc_name}</div>
          <div style="font-size:13px;color:var(--muted2);margin-top:2px">Submitted: ${r.date} · ${r.purpose}</div>
        </div>
        ${badge(r.status)}
      </div>
      ${r.status==='rejected' && r.reject_reason ? `<div class="alert alert-warn">⚠️ Rejected: ${r.reject_reason}</div>` : ''}
      ${r.status==='ready' ? `<div class="alert alert-success">✅ Your document is ready! Visit the barangay hall with a valid ID.</div>` : ''}
      <div class="timeline" style="margin-top:16px">
        ${steps.map((s,i) => `
          <div class="tl">
            <div class="tl-col">
              <div class="tl-dot ${s.done?'done':''} ${s.current?'current':''}"></div>
              ${i < steps.length-1 ? `<div class="tl-line ${s.done?'done':''}"></div>` : ''}
            </div>
            <div class="tl-text" style="padding-bottom:${i < steps.length-1 ? '22px' : '0'}">
              <div class="tl-label ${s.done?'done':''} ${s.current?'current':''}">${s.label}</div>
              <div class="tl-sub">${s.sub}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

// PROFILE 
async function saveProfile() {
  const payload = {
    first_name:   v('pf-fn').trim(),
    last_name:    v('pf-ln').trim(),
    email:        v('pf-em').trim().toLowerCase(),
    phone:        v('pf-ph').trim(),
    purok:        v('pf-pu'),
    address:      v('pf-ad').trim(),
    gcash_number: v('pf-gcash').trim(),
    maya_number:  v('pf-maya').trim(),
  };

  if (!payload.first_name || !payload.last_name) {
    toast('Name fields are required.', 'error'); return;
  }

  const btn = g('btn-save-profile');
  btn.disabled = true; btn.textContent = 'Saving…';

  const res = await POST('users', 'update_profile', payload);
  btn.disabled = false; btn.textContent = 'Save Changes';

  if (!res.success) { toast(res.message, 'error'); return; }

  currentUser = res.user;
  g('nav-av').textContent          = res.user.first_name[0].toUpperCase();
  g('nav-name').textContent        = res.user.first_name;
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

  g('pf-op').value = g('pf-np').value = g('pf-cp').value = '';
  toast('Password changed successfully!', 'success');
}

// PREFILL PROFILE 
function prefillProfile(user) {
  const map = {
    'pf-fn':   'first_name',
    'pf-ln':   'last_name',
    'pf-em':   'email',
    'pf-ph':   'phone',
    'pf-ad':   'address',
    'pf-gcash':'gcash_number',
    'pf-maya': 'maya_number',
  };
  Object.entries(map).forEach(([elId, key]) => {
    const el = g(elId);
    if (el) el.value = user[key] || '';
  });
  const purokSel = g('pf-pu');
  if (purokSel && user.purok) purokSel.value = user.purok;

  if (g('prof-name-disp'))  g('prof-name-disp').textContent  = (user.first_name || '') + ' ' + (user.last_name || '');
  if (g('prof-email-disp')) g('prof-email-disp').textContent = user.email || '';
  if (g('prof-av-big'))     g('prof-av-big').textContent     = user.first_name ? user.first_name[0].toUpperCase() : '?';
}

// VIEW REQUEST DETAIL 
async function viewRequest(id) {
  showLoader();
  const res = await GET('requests', 'get', { id });
  hideLoader();

  if (!res.success) { toast(res.message, 'error'); return; }
  const r = res.request;

  const isAdmin    = currentUser?.role === 'admin';
  const feeVal     = parseFloat(r.fee);
  const isFree     = feeVal === 0;
  const isPaid     = !isFree && parseFloat(r.payment_verified) === 1;
  const isRejected = r.status === 'rejected';

  const statusFlow = ['pending','processing','ready','completed'];
  const idx = statusFlow.indexOf(r.status);
  const steps = [
    { label:'Submitted',      done:true,   current:false },
    { label:'Under Review',   done:idx>=1, current:r.status==='processing' },
    { label:'Ready to Claim', done:idx>=2, current:r.status==='ready' },
    { label:'Completed',      done:idx>=3, current:false },
  ];

  // Determine refund account number 
  let refundAccount = '';
  let refundLabel   = '';
  if (r.payment_method === 'GCash') {
    refundAccount = r.resident_gcash || r.resident_phone || '';
    refundLabel   = 'GCash Number';
  } else if (r.payment_method === 'Maya') {
    refundAccount = r.resident_maya || r.resident_phone || '';
    refundLabel   = 'Maya Number';
  }
  const hasRefundNum = refundAccount && refundAccount !== 'N/A';

  // REFUND BOX (admin, paid, rejected) 
  const refundBox = (isAdmin && isPaid && isRejected) ? `
    <div style="background:#fff7ed;border:2px solid #fb923c;border-radius:14px;padding:18px 20px;margin-bottom:18px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <span style="font-size:22px">💸</span>
        <div style="font-family:'Sora',sans-serif;font-size:14px;font-weight:800;color:#c2410c">
          Refund Required — Payment Must Be Returned
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:#fff;border:1.5px solid #fed7aa;border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Amount</div>
          <div style="font-family:'Sora',sans-serif;font-size:22px;font-weight:800;color:#c2410c">₱${feeVal.toFixed(2)}</div>
        </div>
        <div style="background:#fff;border:1.5px solid #fed7aa;border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Paid via</div>
          <div>${payBadge(r.payment_method)}</div>
        </div>
        <div style="background:#fff;border:1.5px solid #fed7aa;border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Their Ref #</div>
          <div style="font-family:monospace;font-weight:700;font-size:13px;color:var(--text)">${r.payment_ref || 'N/A'}</div>
        </div>
      </div>

      <div style="background:#fff;border:1.5px solid #fed7aa;border-radius:10px;padding:14px 16px">
        <div style="font-size:11.5px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">
          📲 Send Refund To
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--muted2);margin-bottom:2px">${r.resident_name}</div>
            ${hasRefundNum ? `
            <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
              <span style="font-size:12px;color:var(--muted2)">${refundLabel}:</span>
              <span style="font-family:'Sora',sans-serif;font-size:18px;font-weight:800;color:#c2410c;letter-spacing:1px">${refundAccount}</span>
              <button onclick="navigator.clipboard.writeText('${refundAccount}').then(()=>toast('Copied!','success'))"
                style="background:#fed7aa;border:none;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;color:#92400e;cursor:pointer">
                Copy
              </button>
            </div>` : `
            <div style="margin-top:6px">
              <span style="font-size:13px;font-weight:600;color:var(--muted2)">📞 Mobile: </span>
              <span style="font-size:14px;font-weight:700;color:var(--text)">${r.resident_phone || r.phone || 'N/A'}</span>
            </div>
            <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;margin-top:8px;font-size:12px;color:#92400e">
              ⚠️ Resident has not set up a ${r.payment_method} number in their profile.
              Contact them via phone or email to arrange the refund.
            </div>`}
          </div>
        </div>
        <div style="border-top:1px solid #fed7aa;margin-top:12px;padding-top:10px;display:flex;gap:20px;flex-wrap:wrap;font-size:13px">
          <span>📞 <a href="tel:${r.resident_phone || r.phone}" style="color:var(--accent);font-weight:700">${r.resident_phone || r.phone || 'N/A'}</a></span>
          <span>✉️ <a href="mailto:${r.resident_email}" style="color:var(--accent);font-weight:700">${r.resident_email || 'N/A'}</a></span>
        </div>
      </div>
    </div>` : '';

  // RESIDENT INFO (admin only) 
  const residentSection = isAdmin ? `
    <div style="background:var(--surface2);border:1.5px solid var(--border);border-radius:12px;padding:16px 18px;margin-bottom:16px">
      <div style="font-family:'Sora',sans-serif;font-size:11px;font-weight:800;color:var(--muted2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:14px">
        👤 Resident Information
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;margin-bottom:12px">
        ${adminDetailRow('Full Name',     `<strong>${r.full_name}</strong>`)}
        ${adminDetailRow('Date of Birth', r.date_of_birth || '—')}
        ${adminDetailRow('Civil Status',  r.civil_status  || '—')}
        ${adminDetailRow('Purok',         r.resident_purok || '—')}
        ${adminDetailRow('Mobile',        `<a href="tel:${r.phone||r.resident_phone}" style="color:var(--accent);font-weight:700">${r.phone || r.resident_phone || '—'}</a>`)}
        ${adminDetailRow('Email',         `<a href="mailto:${r.resident_email}" style="color:var(--accent);font-weight:700;word-break:break-all">${r.resident_email || '—'}</a>`)}
      </div>
      ${adminDetailRow('Home Address', r.address || r.resident_address || '—')}
      ${(r.resident_gcash || r.resident_maya) ? `
      <div style="border-top:1px solid var(--border);margin-top:12px;padding-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${r.resident_gcash ? adminDetailRow('GCash Number', `<span style="font-weight:800;color:#0076FE">${r.resident_gcash}</span>`) : ''}
        ${r.resident_maya  ? adminDetailRow('Maya Number',  `<span style="font-weight:800;color:#00BFA5">${r.resident_maya}</span>`)  : ''}
      </div>` : ''}
    </div>` : '';

  //  REQUEST DETAILS 
  const feeHtml = isFree
    ? '<span style="color:var(--success);font-weight:700">FREE</span>'
    : `<span style="color:var(--accent);font-weight:700">₱${feeVal.toFixed(2)}</span>`;

  const requestSection = `
    <div style="background:var(--surface2);border:1.5px solid var(--border);border-radius:12px;padding:16px 18px;margin-bottom:16px">
      <div style="font-family:'Sora',sans-serif;font-size:11px;font-weight:800;color:var(--muted2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:14px">
        📄 Request Details
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
        ${adminDetailRow('Document',   `${r.doc_icon||'📄'} <strong>${r.doc_name}</strong>`)}
        ${adminDetailRow('Reference #',`<span style="font-family:'Sora',sans-serif;font-weight:800;color:var(--accent)">${r.reference_no}</span>`)}
        ${adminDetailRow('Date Filed', r.date || (r.created_at||'').slice(0,10))}
        ${adminDetailRow('Purpose',    r.purpose)}
        ${adminDetailRow('Fee',        feeHtml)}
        ${adminDetailRow('Payment',    payBadge(r.payment_method))}
        ${!isFree ? adminDetailRow('Payment Ref #', `<span style="font-family:monospace;font-weight:700">${r.payment_ref||'N/A'}</span>`) : ''}
        ${adminDetailRow('Verified',   r.payment_verified ? '<span style="color:var(--success);font-weight:700">✅ Verified</span>' : '<span style="color:var(--warning);font-weight:700">⏳ Pending</span>')}
      </div>
    </div>`;

  //TIMELINE 
  const timeline = `
    <div style="background:var(--surface2);border:1.5px solid var(--border);border-radius:12px;padding:16px 18px">
      <div style="font-family:'Sora',sans-serif;font-size:11px;font-weight:800;color:var(--muted2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:14px">Progress</div>
      <div class="timeline">
        ${steps.map((s,i) => `
          <div class="tl">
            <div class="tl-col">
              <div class="tl-dot ${s.done?'done':''} ${s.current?'current':''}"></div>
              ${i < steps.length-1 ? `<div class="tl-line ${s.done?'done':''}"></div>` : ''}
            </div>
            <div class="tl-text" style="padding-bottom:${i < steps.length-1 ? '18px' : '0'}">
              <div class="tl-label ${s.done?'done':''} ${s.current?'current':''}">${s.label}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;

  // BUILD MODAL 
  g('modal-detail-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;padding-bottom:16px;border-bottom:1.5px solid var(--border)">
      <span style="font-size:36px">${r.doc_icon||'📄'}</span>
      <div style="flex:1">
        <div style="font-family:'Sora',sans-serif;font-weight:800;font-size:17px">${r.doc_name}</div>
        <div style="color:var(--accent);font-size:12px;font-family:'Sora',sans-serif;margin-top:2px">${r.reference_no}</div>
      </div>
      ${badge(r.status)}
    </div>
    ${isRejected && r.reject_reason ? `<div class="alert alert-warn" style="margin-bottom:16px">⚠️ <strong>Rejected:</strong> ${r.reject_reason}</div>` : ''}
    ${r.status==='ready' ? `<div class="alert alert-success" style="margin-bottom:16px">✅ Document is ready for pickup at the barangay hall.</div>` : ''}
    ${refundBox}
    ${residentSection}
    ${requestSection}
    ${timeline}`;

  let foot = `<button class="btn btn-outline btn-sm" onclick="closeModal('modal-detail')">Close</button>`;
  if (isAdmin) foot = buildAdminActions(r) + foot;
  g('modal-detail-foot').innerHTML = foot;

  openModal('modal-detail');
}

//  DETAIL ROW HELPERS 
function adminDetailRow(label, value) {
  return `<div>
    <div style="color:var(--muted2);font-size:10.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:3px">${label}</div>
    <div style="font-weight:600;font-size:13.5px;line-height:1.4">${value}</div>
  </div>`;
}

function detailRow(label, value) {
  return adminDetailRow(label, value);
}