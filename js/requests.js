// ============================================================
//  js/requests.js  –  Request Form (3-step wizard)
// ============================================================

let selectedDocType = null;
let currentStep     = 1;
let selectedPayMethod = null;

// ── INIT REQUEST FORM ─────────────────────────────────────
async function initRequestForm() {
  selectedDocType   = null;
  selectedPayMethod = null;
  currentStep       = 1;

  // Reset steps UI
  goStepUI(1);

  // Clear fields
  ['rf-name','rf-dob','rf-phone','rf-addr','rf-purpose','pay-ref'].forEach(id => {
    const el = g(id); if (el) el.value = '';
  });
  if (g('rf-civil')) g('rf-civil').value = 'Single';

  // Prefill from current user
  if (currentUser) {
    if (g('rf-name'))  g('rf-name').value  = (currentUser.first_name || '') + ' ' + (currentUser.last_name || '');
    if (g('rf-phone')) g('rf-phone').value = currentUser.phone || '';
    if (g('rf-addr'))  g('rf-addr').value  = currentUser.address || '';
  }

  // Load document types
  const grid = g('doc-type-grid');
  if (grid) grid.innerHTML = '<div style="color:var(--muted);font-size:13.5px">Loading…</div>';

  const res = await GET('requests', 'doc_types');
  if (!res.success || !res.doc_types) {
    if (grid) grid.innerHTML = '<div style="color:var(--danger);font-size:13.5px">Failed to load document types.</div>';
    return;
  }

  if (grid) {
    grid.innerHTML = res.doc_types.map(dt => `
      <div class="doc-card" id="dc-${dt.id}" onclick="selectDocType(${dt.id})">
        <div class="di">${dt.icon}</div>
        <div class="dn">${dt.name}</div>
        <div class="df">${parseFloat(dt.fee) === 0 ? '🆓 FREE' : '₱' + parseFloat(dt.fee).toFixed(2)}</div>
        <div class="dd">${dt.description || ''} · ${dt.processing_days} day${dt.processing_days > 1 ? 's' : ''}</div>
      </div>`).join('');
    // Store doc types on window for later use
    window._docTypes = res.doc_types;
  }
}

// ── SELECT DOCUMENT TYPE ──────────────────────────────────
function selectDocType(id) {
  selectedDocType = (window._docTypes || []).find(d => d.id == id);
  if (!selectedDocType) return;

  // Highlight selected card
  document.querySelectorAll('.doc-card').forEach(c => c.classList.remove('sel'));
  const card = g('dc-' + id);
  if (card) card.classList.add('sel');
}

// ── STEP NAVIGATION ───────────────────────────────────────
function goStep(step) {
  // Validate current step before advancing
  if (step > currentStep) {
    if (!validateStep(currentStep)) return;
  }
  currentStep = step;
  goStepUI(step);

  // When reaching step 3, build payment UI
  if (step === 3) buildPaymentUI();
}

function validateStep(step) {
  if (step === 1) {
    if (!selectedDocType) { toast('Please select a document type.', 'error'); return false; }
  }
  if (step === 2) {
    const name    = v('rf-name').trim();
    const dob     = v('rf-dob').trim();
    const phone   = v('rf-phone').trim();
    const address = v('rf-addr').trim();
    const purpose = v('rf-purpose').trim();
    if (!name)    { toast('Full name is required.',     'error'); return false; }
    if (!dob)     { toast('Date of birth is required.', 'error'); return false; }
    if (!phone)   { toast('Contact number is required.','error'); return false; }
    if (!address) { toast('Address is required.',       'error'); return false; }
    if (!purpose) { toast('Purpose is required.',       'error'); return false; }
  }
  return true;
}

function goStepUI(step) {
  // Show/hide step panels
  ['req-s1','req-s2','req-s3'].forEach((id, i) => {
    const el = g(id);
    if (el) el.style.display = (i + 1 === step) ? 'block' : 'none';
  });

  // Step numbers styling
  for (let i = 1; i <= 3; i++) {
    const sn = g('sn' + i);
    if (!sn) continue;
    sn.classList.remove('active','done');
    if (i < step)  sn.classList.add('done');
    if (i === step) sn.classList.add('active');
  }

  // Step connectors
  for (let i = 1; i <= 2; i++) {
    const sc = g('sc' + i);
    if (!sc) continue;
    sc.classList.toggle('done', step > i);
  }

  // If step 2: show selected doc summary
  if (step === 2 && selectedDocType) {
    const box = g('req-selected-doc');
    if (box) {
      box.innerHTML = `<div class="alert alert-success" style="margin-bottom:14px">
        ${selectedDocType.icon} <strong>${selectedDocType.name}</strong> —
        ${parseFloat(selectedDocType.fee) === 0 ? '<strong>FREE</strong>' : '₱' + parseFloat(selectedDocType.fee).toFixed(2)}
        · ${selectedDocType.processing_days} day processing
      </div>`;
    }
  }
}

// ── BUILD PAYMENT UI (step 3) ─────────────────────────────
async function buildPaymentUI() {
  if (!selectedDocType) return;

  const fee    = parseFloat(selectedDocType.fee);
  const isFree = fee === 0;

  // Fee display
  const feeBox = g('pay-fee-box');
  if (feeBox) {
    feeBox.innerHTML = `<div class="alert alert-info" style="margin-bottom:14px">
      ${selectedDocType.icon} <strong>${selectedDocType.name}</strong> —
      Fee: <strong>${isFree ? 'FREE' : '₱' + fee.toFixed(2)}</strong>
    </div>`;
  }

  if (isFree) {
    const freeMsg = g('pay-free-msg');
    const paySection = g('pay-method-section');
    if (freeMsg) freeMsg.style.display = 'block';
    if (paySection) paySection.style.display = 'none';
  } else {
    const freeMsg = g('pay-free-msg');
    const paySection = g('pay-method-section');
    if (freeMsg) freeMsg.style.display = 'none';
    if (paySection) paySection.style.display = 'block';
    // Reset payment selection
    selectedPayMethod = null;
    document.querySelectorAll('.pay-card').forEach(c => c.classList.remove('sel'));
    const qrSec = g('pay-qr-section');
    if (qrSec) qrSec.style.display = 'none';
  }

  // Load GCash/Maya numbers from settings
  const res = await GET('reports', 'settings_get');
  if (res.success && res.settings) {
    window._paySettings = res.settings;
  }
}

// ── SELECT PAYMENT METHOD ─────────────────────────────────
function selectPay(method) {
  selectedPayMethod = method;
  document.querySelectorAll('.pay-card').forEach(c => c.classList.remove('sel'));
  const card = g('pc-' + method);
  if (card) card.classList.add('sel');

  const qrSec = g('pay-qr-section');
  if (qrSec) qrSec.style.display = 'block';

  const settings = window._paySettings || {};
  const fee = parseFloat(selectedDocType?.fee || 0);

  if (g('pay-amount-text')) g('pay-amount-text').textContent = '₱' + fee.toFixed(2);

  if (method === 'gcash') {
    const num  = settings.gcash_number || '0917-123-4567';
    const name = settings.gcash_account_name || 'Barangay Pusok';
    if (g('pay-qr-icon')) g('pay-qr-icon').innerHTML = `
      <svg width="90" height="90" viewBox="0 0 110 38" xmlns="http://www.w3.org/2000/svg">
        <rect width="110" height="38" rx="8" fill="#0076FE"/>
        <circle cx="22" cy="19" r="13" fill="white"/>
        <text x="22" y="24.5" text-anchor="middle" font-size="16" font-weight="900" fill="#0076FE" font-family="Arial Black,Arial,sans-serif">G</text>
        <text x="68" y="25" text-anchor="middle" font-size="16" font-weight="800" fill="white" font-family="Arial Black,Arial,sans-serif">GCash</text>
      </svg>`;
    if (g('pay-info-text'))    g('pay-info-text').textContent    = 'Send via GCash Send Money';
    if (g('pay-account-text')) g('pay-account-text').textContent = num;
  } else {
    const num  = settings.maya_number || '0998-765-4321';
    const name = settings.maya_account_name || 'Barangay Pusok';
    if (g('pay-qr-icon')) g('pay-qr-icon').innerHTML = `
      <svg width="90" height="90" viewBox="0 0 110 38" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="mg3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#00D26A"/><stop offset="100%" stop-color="#00AEEF"/>
        </linearGradient></defs>
        <rect width="110" height="38" rx="8" fill="url(#mg3)"/>
        <polygon points="10,30 17,10 24,30 17,23" fill="white"/>
        <polygon points="17,30 24,10 31,30 24,23" fill="white" opacity="0.6"/>
        <text x="68" y="25" text-anchor="middle" font-size="16" font-weight="800" fill="white" font-family="Arial Black,Arial,sans-serif">maya</text>
      </svg>`;
    if (g('pay-info-text'))    g('pay-info-text').textContent    = 'Send via Maya Send Money';
    if (g('pay-account-text')) g('pay-account-text').textContent = num;
  }
}

// ── SUBMIT REQUEST ────────────────────────────────────────
async function submitRequest() {
  if (!selectedDocType) { toast('No document type selected.', 'error'); return; }

  const fee    = parseFloat(selectedDocType.fee);
  const isFree = fee === 0;

  // Validate payment for paid docs
  if (!isFree) {
    if (!selectedPayMethod) { toast('Please select a payment method.', 'error'); return; }
    const payRef = v('pay-ref').trim();
    if (!payRef) { toast('Please enter your payment reference number.', 'error'); return; }
  }

  const payload = {
    doc_type_id:    selectedDocType.id,
    full_name:      v('rf-name').trim(),
    date_of_birth:  v('rf-dob').trim(),
    phone:          v('rf-phone').trim(),
    civil_status:   v('rf-civil'),
    address:        v('rf-addr').trim(),
    purpose:        v('rf-purpose').trim(),
    payment_method: isFree ? 'FREE' : (selectedPayMethod === 'gcash' ? 'GCash' : 'Maya'),
    payment_ref:    isFree ? 'FREE' : v('pay-ref').trim(),
  };

  const btn = g('btn-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  showLoader();
  const res = await POST('requests', 'submit', payload);
  hideLoader();

  if (btn) { btn.disabled = false; btn.textContent = 'Submit Request ✓'; }

  if (!res.success) { toast(res.message || 'Submission failed.', 'error'); return; }

  // Show success modal
  const refEl = g('success-ref');
  if (refEl) refEl.textContent = res.reference_no;
  openModal('modal-success');

  // Reset form state
  selectedDocType   = null;
  selectedPayMethod = null;
  currentStep       = 1;
}
