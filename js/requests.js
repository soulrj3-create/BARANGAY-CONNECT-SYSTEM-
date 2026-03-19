// ============================================================
//  js/requests.js  –  Document Request Form (3-step wizard)
// ============================================================

let allDocTypes    = [];
let selectedDoc    = null;
let selectedPay    = null;   // 'gcash' | 'maya' | null
let currentStep    = 1;
let gcashNumber    = '0917-123-4567';
let mayaNumber     = '0998-765-4321';

// ── INIT REQUEST PANEL ────────────────────────────────────
async function initRequestForm() {
  selectedDoc = null;
  selectedPay = null;
  currentStep = 1;
  resetFormFields();
  goStep(1);

  // Show loading state
  const grid = g('doc-type-grid');
  if (grid) grid.innerHTML = '<div style="color:var(--muted);font-size:13.5px;grid-column:1/-1">Loading document types…</div>';

  // Load doc types from API
  const res = await GET('requests', 'doc_types');
  if (res.success && res.doc_types) {
    allDocTypes = res.doc_types;
    buildDocGrid();
  } else {
    if (grid) grid.innerHTML = '<div style="color:var(--danger);font-size:13.5px;grid-column:1/-1">⚠️ Failed to load document types. Please refresh.</div>';
    toast('Failed to load document types.', 'error');
  }

  // Load payment numbers from settings (non-blocking, best-effort)
  loadPaymentNumbers();
}

async function loadPaymentNumbers() {
  try {
    // FIX: settings_get now only requires any authenticated user (not admin-only)
    const res = await GET('reports', 'settings_get');
    if (res.success && res.settings) {
      gcashNumber = res.settings.gcash_number || gcashNumber;
      mayaNumber  = res.settings.maya_number  || mayaNumber;
    }
  } catch (e) {
    // silently fall back to hardcoded defaults
  }
}

// ── BUILD DOC GRID ────────────────────────────────────────
function buildDocGrid() {
  const grid = g('doc-type-grid');
  if (!grid) return;

  if (!allDocTypes || allDocTypes.length === 0) {
    grid.innerHTML = '<div style="color:var(--muted);font-size:13.5px;grid-column:1/-1">No document types available.</div>';
    return;
  }

  grid.innerHTML = allDocTypes.map(d => `
    <div class="doc-card" id="dc-${d.id}" onclick="pickDoc(${d.id})">
      <div class="di">${d.icon}</div>
      <div class="dn">${d.name}</div>
      <div class="df">${parseFloat(d.fee) === 0 ? 'FREE' : '₱' + parseFloat(d.fee).toFixed(2)}</div>
      <div class="dd">⏱ ${d.processing_days} day${d.processing_days > 1 ? 's' : ''} · ${d.description || ''}</div>
    </div>`).join('');
}

// ── PICK DOC TYPE ─────────────────────────────────────────
function pickDoc(id) {
  selectedDoc = allDocTypes.find(d => parseInt(d.id) === parseInt(id));
  if (!selectedDoc) return;

  document.querySelectorAll('.doc-card').forEach(c => c.classList.remove('sel'));
  const el = g('dc-' + id);
  if (el) el.classList.add('sel');

  setTimeout(() => goStep(2), 200);
}

// ── STEP NAVIGATION ───────────────────────────────────────
function goStep(n) {
  currentStep = n;

  // Step indicators
  [1, 2, 3].forEach(i => {
    const sn = g('sn' + i);
    if (!sn) return;
    sn.classList.remove('done', 'active');
    if (i < n)        sn.classList.add('done');
    else if (i === n) sn.classList.add('active');
  });
  [1, 2].forEach(i => {
    const sc = g('sc' + i);
    if (sc) { sc.classList.remove('done'); if (i < n) sc.classList.add('done'); }
  });

  const s1 = g('req-s1'); if (s1) s1.style.display = n === 1 ? '' : 'none';
  const s2 = g('req-s2'); if (s2) s2.style.display = n === 2 ? '' : 'none';
  const s3 = g('req-s3'); if (s3) s3.style.display = n === 3 ? '' : 'none';

  if (n === 2 && selectedDoc) populateStep2();
  if (n === 3 && selectedDoc) populateStep3();
}

function populateStep2() {
  // Pre-fill name/phone/address from session
  if (currentUser) {
    const nameEl = g('rf-name');
    if (nameEl && !nameEl.value) {
      nameEl.value = (currentUser.first_name + ' ' + currentUser.last_name).trim();
    }
    const phoneEl = g('rf-phone');
    if (phoneEl && !phoneEl.value && currentUser.phone) {
      phoneEl.value = currentUser.phone;
    }
    const addrEl = g('rf-addr');
    if (addrEl && !addrEl.value && currentUser.address) {
      addrEl.value = currentUser.address;
    }
  }

  // Show selected doc summary
  const box = g('req-selected-doc');
  if (box && selectedDoc) {
    const fee = parseFloat(selectedDoc.fee);
    box.innerHTML = `
      <div style="background:var(--surface2);border-radius:11px;padding:14px;display:flex;align-items:center;gap:12px;margin-bottom:18px">
        <span style="font-size:28px">${selectedDoc.icon}</span>
        <div>
          <div style="font-family:'Sora',sans-serif;font-weight:700;font-size:15px">${selectedDoc.name}</div>
          <div style="font-size:13px;color:var(--accent);font-weight:600;margin-top:2px">
            ${fee === 0 ? 'FREE' : '₱' + fee.toFixed(2)}
            &nbsp;·&nbsp; ⏱ ${selectedDoc.processing_days} day${selectedDoc.processing_days > 1 ? 's' : ''} processing
          </div>
        </div>
      </div>`;
  }
}

function populateStep3() {
  const isFree = parseFloat(selectedDoc.fee) === 0;

  // Fee summary
  const feeBox = g('pay-fee-box');
  if (feeBox) {
    feeBox.innerHTML = `
      <div style="background:var(--surface2);border-radius:11px;padding:14px 18px;
        display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="color:var(--muted2);font-size:13.5px">Document Fee</div>
        <div style="font-family:'Sora',sans-serif;font-size:24px;font-weight:800;color:var(--accent)">
          ${isFree ? 'FREE' : '₱' + parseFloat(selectedDoc.fee).toFixed(2)}
        </div>
      </div>`;
  }

  const freeMsg   = g('pay-free-msg');
  const payMethod = g('pay-method-section');
  const qrSec     = g('pay-qr-section');

  if (freeMsg)   freeMsg.style.display   = isFree ? '' : 'none';
  if (payMethod) payMethod.style.display = isFree ? 'none' : '';
  if (qrSec)     qrSec.style.display     = 'none';

  // Reset payment selection
  selectedPay = isFree ? 'free' : null;
  document.querySelectorAll('.pay-card').forEach(c => c.classList.remove('sel'));
  const payRef = g('pay-ref');
  if (payRef) payRef.value = '';
}

// ── SELECT PAYMENT METHOD ─────────────────────────────────
function selectPay(method) {
  selectedPay = method;
  document.querySelectorAll('.pay-card').forEach(c => c.classList.remove('sel'));
  const card = g('pc-' + method);
  if (card) card.classList.add('sel');

  const fee = parseFloat(selectedDoc?.fee || 0);
  const amountEl = g('pay-amount-text');
  if (amountEl) amountEl.textContent = '₱' + fee.toFixed(2);

  const qrSec = g('pay-qr-section');
  if (qrSec) qrSec.style.display = '';

  const payRef = g('pay-ref');
  if (payRef) payRef.value = '';

  const qrIcon      = g('pay-qr-icon');
  const infoText    = g('pay-info-text');
  const accountText = g('pay-account-text');

  if (method === 'gcash') {
    if (qrIcon)      qrIcon.innerHTML       = gcashQR();
    if (infoText)    infoText.textContent    = 'Scan QR Code or send to the number below via GCash';
    if (accountText) accountText.textContent = 'GCash Number: ' + gcashNumber;
  } else {
    if (qrIcon)      qrIcon.innerHTML       = mayaQR();
    if (infoText)    infoText.textContent    = 'Scan QR Code or send to the number below via Maya';
    if (accountText) accountText.textContent = 'Maya Number: ' + mayaNumber;
  }
}

function gcashQR() {
  return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#0076FE"/>
    <circle cx="50" cy="50" r="34" fill="white"/>
    <text x="50" y="64" text-anchor="middle" font-size="40" font-weight="900"
      fill="#0076FE" font-family="Arial Black,Arial,sans-serif">G</text>
  </svg>`;
}

function mayaQR() {
  return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="mqr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00D26A"/>
      <stop offset="100%" stop-color="#00AEEF"/>
    </linearGradient></defs>
    <rect width="100" height="100" fill="url(#mqr)"/>
    <polygon points="20,80 36,25 52,80 36,65" fill="white" opacity="0.95"/>
    <polygon points="36,80 52,25 68,80 52,65" fill="white" opacity="0.65"/>
  </svg>`;
}

// ── SUBMIT REQUEST ────────────────────────────────────────
async function submitRequest() {
  if (!selectedDoc) { toast('Please select a document type.', 'error'); return; }

  const name    = v('rf-name').trim();
  const dob     = v('rf-dob').trim();
  const phone   = v('rf-phone').trim();
  const civil   = v('rf-civil');
  const addr    = v('rf-addr').trim();
  const purpose = v('rf-purpose').trim();

  if (!name)    { toast('Full name is required.',         'error'); return; }
  if (!dob)     { toast('Date of birth is required.',     'error'); return; }
  if (!phone)   { toast('Contact number is required.',    'error'); return; }
  if (!addr)    { toast('Home address is required.',      'error'); return; }
  if (!purpose) { toast('Purpose / reason is required.', 'error'); return; }

  const isFree = parseFloat(selectedDoc.fee) === 0;

  if (!isFree) {
    if (!selectedPay) { toast('Please select GCash or Maya.', 'error'); return; }
    const ref = v('pay-ref').trim();
    if (!ref) { toast('Please enter your payment reference number.', 'error'); return; }
  }

  const payload = {
    doc_type_id:    selectedDoc.id,
    full_name:      name,
    date_of_birth:  dob,
    phone,
    civil_status:   civil,
    address:        addr,
    purpose,
    payment_method: isFree ? 'FREE' : (selectedPay === 'gcash' ? 'GCash' : 'Maya'),
    payment_ref:    isFree ? 'FREE' : v('pay-ref').trim(),
  };

  const btn = g('btn-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  const res = await POST('requests', 'submit', payload);

  if (btn) { btn.disabled = false; btn.textContent = 'Submit Request ✓'; }

  if (!res.success) { toast(res.message, 'error'); return; }

  // Show success modal
  const refEl = g('success-ref');
  if (refEl) refEl.textContent = res.reference_no;
  openModal('modal-success');

  // Reset form state
  selectedDoc = null;
  selectedPay = null;
  currentStep = 1;
  resetFormFields();
}

function resetFormFields() {
  ['rf-name','rf-dob','rf-phone','rf-addr','rf-purpose','pay-ref'].forEach(id => {
    const el = g(id); if (el) el.value = '';
  });
  document.querySelectorAll('.pay-card').forEach(c => c.classList.remove('sel'));
  document.querySelectorAll('.doc-card').forEach(c => c.classList.remove('sel'));
  const qrSec     = g('pay-qr-section');     if (qrSec)     qrSec.style.display     = 'none';
  const freeMsg   = g('pay-free-msg');       if (freeMsg)   freeMsg.style.display   = 'none';
  const payMethod = g('pay-method-section'); if (payMethod) payMethod.style.display = 'none';
}