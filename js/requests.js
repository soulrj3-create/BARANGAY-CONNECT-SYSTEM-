// ============================================================
//  js/requests.js  –  Request Form (3-step wizard)
// ============================================================

let selectedDocType   = null;
let currentStep       = 1;
let selectedPayMethod = null;

// ── INIT REQUEST FORM ─────────────────────────────────────
async function initRequestForm() {
  selectedDocType   = null;
  selectedPayMethod = null;
  currentStep       = 1;

  // Reset steps UI
  goStepUI(1);

  // Hide continue button if leftover from previous visit
  const cb = document.getElementById('step1-continue-btn');
  if (cb) cb.style.display = 'none';

  // Clear fields
  ['rf-name','rf-dob','rf-phone','rf-addr','rf-purpose','pay-ref'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const civil = document.getElementById('rf-civil');
  if (civil) civil.value = 'Single';

  // Prefill from current user
  if (currentUser) {
    const nm = document.getElementById('rf-name');
    const ph = document.getElementById('rf-phone');
    const ad = document.getElementById('rf-addr');
    if (nm) nm.value = ((currentUser.first_name || '') + ' ' + (currentUser.last_name || '')).trim();
    if (ph) ph.value = currentUser.phone   || '';
    if (ad) ad.value = currentUser.address || '';
  }

  // Load document types
  const grid = document.getElementById('doc-type-grid');
  if (grid) grid.innerHTML = '<div style="color:var(--muted);font-size:13.5px">Loading…</div>';

  const res = await GET('requests', 'doc_types');
  if (!res.success || !res.doc_types) {
    if (grid) grid.innerHTML = '<div style="color:var(--danger);font-size:13.5px">Failed to load document types. Please refresh.</div>';
    return;
  }

  window._docTypes = res.doc_types;

  if (grid) {
    grid.innerHTML = res.doc_types.map(dt => `
      <div class="doc-card" id="dc-${dt.id}" onclick="selectDocType(${dt.id})">
        <div class="di">${dt.icon}</div>
        <div class="dn">${dt.name}</div>
        <div class="df">${parseFloat(dt.fee) === 0 ? '🆓 FREE' : '₱' + parseFloat(dt.fee).toFixed(2)}</div>
        <div class="dd">${dt.description || ''} · ${dt.processing_days} day${dt.processing_days > 1 ? 's' : ''}</div>
      </div>`).join('');
  }
}

// ── SELECT DOCUMENT TYPE ──────────────────────────────────
function selectDocType(id) {
  selectedDocType = (window._docTypes || []).find(d => d.id == id);
  if (!selectedDocType) return;

  // Highlight selected card
  document.querySelectorAll('.doc-card').forEach(c => c.classList.remove('sel'));
  const card = document.getElementById('dc-' + id);
  if (card) card.classList.add('sel');

  // Show / update the Continue button below the grid
  let btn = document.getElementById('step1-continue-btn');
  if (!btn) {
    btn = document.createElement('div');
    btn.id = 'step1-continue-btn';
    btn.style.cssText = 'margin-top:18px;display:flex;justify-content:flex-end;';
    btn.innerHTML = `<button class="btn btn-primary" style="min-width:220px;padding:13px 24px;font-size:15px;" onclick="goStep(2)">
      Continue to Personal Details →
    </button>`;
    const s1 = document.getElementById('req-s1');
    if (s1) s1.appendChild(btn);
  }
  btn.style.display = 'flex';
}

// ── STEP NAVIGATION ───────────────────────────────────────
function goStep(step) {
  if (step > currentStep) {
    if (!validateStep(currentStep)) return;
  }
  currentStep = step;
  goStepUI(step);
  if (step === 3) buildPaymentUI();
}

function validateStep(step) {
  if (step === 1) {
    if (!selectedDocType) { toast('Please select a document type.', 'error'); return false; }
  }
  if (step === 2) {
    const name    = (document.getElementById('rf-name')    || {value:''}).value.trim();
    const dob     = (document.getElementById('rf-dob')     || {value:''}).value.trim();
    const phone   = (document.getElementById('rf-phone')   || {value:''}).value.trim();
    const address = (document.getElementById('rf-addr')    || {value:''}).value.trim();
    const purpose = (document.getElementById('rf-purpose') || {value:''}).value.trim();
    if (!name)    { toast('Full name is required.',      'error'); return false; }
    if (!dob)     { toast('Date of birth is required.',  'error'); return false; }
    if (!phone)   { toast('Contact number is required.', 'error'); return false; }
    if (!address) { toast('Address is required.',        'error'); return false; }
    if (!purpose) { toast('Purpose is required.',        'error'); return false; }
  }
  return true;
}

function goStepUI(step) {
  // Show/hide step panels
  ['req-s1','req-s2','req-s3'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.display = (i + 1 === step) ? 'block' : 'none';
  });

  // Step number circles
  for (let i = 1; i <= 3; i++) {
    const sn = document.getElementById('sn' + i);
    if (!sn) continue;
    sn.classList.remove('active', 'done');
    if (i < step)  sn.classList.add('done');
    if (i === step) sn.classList.add('active');
  }

  // Step connectors
  for (let i = 1; i <= 2; i++) {
    const sc = document.getElementById('sc' + i);
    if (sc) sc.classList.toggle('done', step > i);
  }

  // Step 2: show selected doc summary banner
  if (step === 2 && selectedDocType) {
    const box = document.getElementById('req-selected-doc');
    if (box) {
      box.innerHTML = `<div class="alert alert-success" style="margin-bottom:14px">
        ${selectedDocType.icon} <strong>${selectedDocType.name}</strong> —
        ${parseFloat(selectedDocType.fee) === 0
          ? '<strong>FREE</strong>'
          : '₱' + parseFloat(selectedDocType.fee).toFixed(2)}
        · ${selectedDocType.processing_days} day processing
      </div>`;
    }
  }

  // Scroll to top of form
  const card = document.querySelector('#panel-res-request .card');
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── BUILD PAYMENT UI (step 3) ─────────────────────────────
async function buildPaymentUI() {
  if (!selectedDocType) return;

  const fee    = parseFloat(selectedDocType.fee);
  const isFree = fee === 0;

  // Fee display box
  const feeBox = document.getElementById('pay-fee-box');
  if (feeBox) {
    feeBox.innerHTML = `<div class="alert alert-info" style="margin-bottom:14px">
      ${selectedDocType.icon} <strong>${selectedDocType.name}</strong> —
      Fee: <strong style="color:var(--accent)">${isFree ? 'FREE' : '₱' + fee.toFixed(2)}</strong>
    </div>`;
  }

  const freeMsg    = document.getElementById('pay-free-msg');
  const paySection = document.getElementById('pay-method-section');

  if (isFree) {
    if (freeMsg)    freeMsg.style.display    = 'block';
    if (paySection) paySection.style.display = 'none';
  } else {
    if (freeMsg)    freeMsg.style.display    = 'none';
    if (paySection) paySection.style.display = 'block';
    selectedPayMethod = null;
    document.querySelectorAll('.pay-card').forEach(c => c.classList.remove('sel'));
    const qrSec = document.getElementById('pay-qr-section');
    if (qrSec) qrSec.style.display = 'none';
  }

  // Load GCash/Maya account numbers from settings
  const res = await GET('reports', 'settings_get');
  if (res.success && res.settings) window._paySettings = res.settings;
}

// ── SELECT PAYMENT METHOD ─────────────────────────────────
function selectPay(method) {
  selectedPayMethod = method;
  document.querySelectorAll('.pay-card').forEach(c => c.classList.remove('sel'));
  const card = document.getElementById('pc-' + method);
  if (card) card.classList.add('sel');

  const qrSec = document.getElementById('pay-qr-section');
  if (qrSec) qrSec.style.display = 'block';

  const settings = window._paySettings || {};
  const fee      = parseFloat(selectedDocType?.fee || 0);

  const amtEl = document.getElementById('pay-amount-text');
  if (amtEl) amtEl.textContent = '₱' + fee.toFixed(2);

  const qrIcon    = document.getElementById('pay-qr-icon');
  const infoText  = document.getElementById('pay-info-text');
  const acctText  = document.getElementById('pay-account-text');
  const payRefIn  = document.getElementById('pay-ref');

  if (method === 'gcash') {
    const num = settings.gcash_number || '0917-123-4567';
    if (qrIcon) qrIcon.innerHTML = `
      <svg width="90" height="36" viewBox="0 0 110 38" xmlns="http://www.w3.org/2000/svg">
        <rect width="110" height="38" rx="8" fill="#0076FE"/>
        <circle cx="22" cy="19" r="13" fill="white"/>
        <text x="22" y="24.5" text-anchor="middle" font-size="16" font-weight="900" fill="#0076FE" font-family="Arial Black,Arial,sans-serif">G</text>
        <text x="68" y="25" text-anchor="middle" font-size="16" font-weight="800" fill="white" font-family="Arial Black,Arial,sans-serif">GCash</text>
      </svg>`;
    if (infoText) infoText.textContent = 'Send via GCash Send Money';
    if (acctText) acctText.textContent = num;
    if (payRefIn) payRefIn.placeholder = 'Enter GCash reference number';
  } else {
    const num = settings.maya_number || '0998-765-4321';
    if (qrIcon) qrIcon.innerHTML = `
      <svg width="90" height="36" viewBox="0 0 110 38" xmlns="http://www.w3.org/2000/svg"><rect width="110" height="38" rx="8" fill="#00BFA5"/><text x="55" y="26" text-anchor="middle" font-size="18" font-weight="900" fill="white" font-family="Helvetica Neue,Helvetica,Arial,sans-serif" letter-spacing="2">maya</text></svg>`;
    if (infoText) infoText.textContent = 'Send via Maya Send Money';
    if (acctText) acctText.textContent = num;
    if (payRefIn) payRefIn.placeholder = 'Enter Maya reference number';
  }
}

// ── SUBMIT REQUEST ────────────────────────────────────────
async function submitRequest() {
  if (!selectedDocType) { toast('No document type selected.', 'error'); return; }

  const fee    = parseFloat(selectedDocType.fee);
  const isFree = fee === 0;

  if (!isFree) {
    if (!selectedPayMethod) {
      toast('Please select a payment method.', 'error'); return;
    }
    const payRef = (document.getElementById('pay-ref') || {value:''}).value.trim();
    if (!payRef) {
      toast('Please enter your payment reference number.', 'error'); return;
    }
  }

  const payload = {
    doc_type_id:    selectedDocType.id,
    full_name:      (document.getElementById('rf-name')    || {value:''}).value.trim(),
    date_of_birth:  (document.getElementById('rf-dob')     || {value:''}).value.trim(),
    phone:          (document.getElementById('rf-phone')   || {value:''}).value.trim(),
    civil_status:   (document.getElementById('rf-civil')   || {value:'Single'}).value,
    address:        (document.getElementById('rf-addr')    || {value:''}).value.trim(),
    purpose:        (document.getElementById('rf-purpose') || {value:''}).value.trim(),
    payment_method: isFree ? 'FREE' : (selectedPayMethod === 'gcash' ? 'GCash' : 'Maya'),
    payment_ref:    isFree ? 'FREE' : (document.getElementById('pay-ref') || {value:''}).value.trim(),
  };

  const btn = document.getElementById('btn-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  showLoader();
  const res = await POST('requests', 'submit', payload);
  hideLoader();

  if (btn) { btn.disabled = false; btn.textContent = 'Submit Request ✓'; }

  if (!res.success) { toast(res.message || 'Submission failed.', 'error'); return; }

  // Show success modal with reference number
  const refEl = document.getElementById('success-ref');
  if (refEl) refEl.textContent = res.reference_no;
  openModal('modal-success');

  // Reset form for next use
  selectedDocType   = null;
  selectedPayMethod = null;
  currentStep       = 1;
}