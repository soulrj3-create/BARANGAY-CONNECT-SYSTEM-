// ============================================================
//  js/requests.js  –  Request Form (3-step wizard)
// ============================================================

let selectedDocType      = null;
let currentStep          = 1;
let selectedPayMethod    = null;
let selectedProcessingType = 'normal'; // 'normal' or 'urgent'

// ── INIT REQUEST FORM ─────────────────────────────────────
async function initRequestForm() {
  selectedDocType        = null;
  selectedPayMethod      = null;
  selectedProcessingType = 'normal';
  currentStep            = 1;

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

// ── SELECT PROCESSING TYPE ────────────────────────────────
function selectProcessingType(type) {
  selectedProcessingType = type;

  const normal = document.getElementById('proc-normal');
  const urgent = document.getElementById('proc-urgent');
  const dt     = selectedDocType;
  if (!normal || !urgent || !dt) return;

  if (type === 'normal') {
    normal.style.border     = '2px solid var(--accent)';
    normal.style.background = 'var(--accent-lt)';
    urgent.style.border     = '2px solid var(--border)';
    urgent.style.background = 'var(--white)';
  } else {
    urgent.style.border     = '2px solid var(--warning)';
    urgent.style.background = '#fefce8';
    normal.style.border     = '2px solid var(--border)';
    normal.style.background = 'var(--white)';
  }
}
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

  // Step 2: show selected doc summary banner + processing type selector
  if (step === 2 && selectedDocType) {
    const box = document.getElementById('req-selected-doc');
    const dt  = selectedDocType;
    const urgentFee = parseFloat(dt.urgent_fee || 50);
    if (box) {
      box.innerHTML = `
        <div class="alert alert-success" style="margin-bottom:14px">
          ${dt.icon} <strong>${dt.name}</strong> —
          ${parseFloat(dt.fee) === 0 ? '<strong>FREE</strong>' : '₱' + parseFloat(dt.fee).toFixed(2)}
          · ${dt.processing_days} day processing
        </div>
        <div style="margin-bottom:20px">
          <div style="font-size:11.5px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:10px">
            Processing Type <span style="color:var(--danger)">*</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="proc-card sel" id="proc-normal" onclick="selectProcessingType('normal')" style="border:2px solid var(--accent);border-radius:13px;padding:16px 14px;cursor:pointer;transition:.18s;background:var(--accent-lt);">
              <div style="font-size:24px;margin-bottom:6px">📋</div>
              <div style="font-family:'Sora',sans-serif;font-size:14px;font-weight:700;color:var(--text)">Normal</div>
              <div style="font-size:12px;color:var(--muted2);margin-top:3px">${dt.processing_days} day${dt.processing_days > 1 ? 's' : ''} processing</div>
              <div style="font-size:13px;font-weight:700;color:var(--accent2);margin-top:6px">
                ${parseFloat(dt.fee) === 0 ? '🆓 FREE' : '₱' + parseFloat(dt.fee).toFixed(2)}
              </div>
            </div>
            <div class="proc-card" id="proc-urgent" onclick="selectProcessingType('urgent')" style="border:2px solid var(--border);border-radius:13px;padding:16px 14px;cursor:pointer;transition:.18s;background:var(--white);">
              <div style="font-size:24px;margin-bottom:6px">⚡</div>
              <div style="font-family:'Sora',sans-serif;font-size:14px;font-weight:700;color:var(--text)">Urgent</div>
              <div style="font-size:12px;color:var(--muted2);margin-top:3px">Same-day / priority</div>
              <div style="font-size:13px;font-weight:700;color:var(--warning);margin-top:6px">
                ${parseFloat(dt.fee) === 0
                  ? '₱' + urgentFee.toFixed(2) + ' <span style="font-weight:400;color:var(--muted)">(urgent fee)</span>'
                  : '₱' + (parseFloat(dt.fee) + urgentFee).toFixed(2) + ' <span style="font-weight:400;color:var(--muted);font-size:11px">(+₱' + urgentFee.toFixed(2) + ' urgent)</span>'}
              </div>
            </div>
          </div>
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

  const baseFee   = parseFloat(selectedDocType.fee);
  const urgentFee = selectedProcessingType === 'urgent' ? parseFloat(selectedDocType.urgent_fee || 50) : 0;
  const fee       = baseFee + urgentFee;
  const isFree    = fee === 0;

  // Fee display box
  const feeBox = document.getElementById('pay-fee-box');
  if (feeBox) {
    feeBox.innerHTML = `<div class="alert alert-info" style="margin-bottom:14px">
      ${selectedDocType.icon} <strong>${selectedDocType.name}</strong> —
      ${selectedProcessingType === 'urgent'
        ? `⚡ <strong style="color:var(--warning)">Urgent Processing</strong> &nbsp;·&nbsp;
           Base: ₱${baseFee.toFixed(2)} + Urgent: ₱${urgentFee.toFixed(2)} = `
        : '📋 Normal Processing &nbsp;·&nbsp; Fee: '}
      <strong style="color:var(--accent)">${isFree ? 'FREE' : '₱' + fee.toFixed(2)}</strong>
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

  const settings  = window._paySettings || {};
  const baseFee   = parseFloat(selectedDocType?.fee || 0);
  const urgentFee = selectedProcessingType === 'urgent' ? parseFloat(selectedDocType?.urgent_fee || 50) : 0;
  const fee       = baseFee + urgentFee;

  const amtEl = document.getElementById('pay-amount-text');
  if (amtEl) amtEl.textContent = '₱' + fee.toFixed(2);

  const qrIcon    = document.getElementById('pay-qr-icon');
  const infoText  = document.getElementById('pay-info-text');
  const acctText  = document.getElementById('pay-account-text');
  const payRefIn  = document.getElementById('pay-ref');

  if (method === 'gcash') {
    if (qrIcon) qrIcon.innerHTML = `<img src="/BARANGAY-CONNECT-SYSTEM-/images/gcash-qr.png" alt="GCash QR Code" style="width:100%;height:100%;object-fit:contain;border-radius:8px;"/>`;
    if (infoText) infoText.textContent = 'Scan QR or send via GCash Send Money';
    if (acctText) acctText.textContent = settings.gcash_number || '0917-123-4567';
    if (payRefIn) payRefIn.placeholder = 'Enter GCash reference number';
  } else {
    if (qrIcon) qrIcon.innerHTML = `<img src="/BARANGAY-CONNECT-SYSTEM-/images/maya-qr.png" alt="Maya QR Code" style="width:100%;height:100%;object-fit:contain;border-radius:8px;"/>`;
    if (infoText) infoText.textContent = 'Scan QR or send via Maya Send Money';
    if (acctText) acctText.textContent = settings.maya_number || '0998-765-4321';
    if (payRefIn) payRefIn.placeholder = 'Enter Maya reference number';
  }
}

// ── SUBMIT REQUEST ────────────────────────────────────────
async function submitRequest() {
  if (!selectedDocType) { toast('No document type selected.', 'error'); return; }

  const baseFee   = parseFloat(selectedDocType.fee);
  const urgentFee = selectedProcessingType === 'urgent' ? parseFloat(selectedDocType.urgent_fee || 50) : 0;
  const fee       = baseFee + urgentFee;
  const isFree    = fee === 0;

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
    doc_type_id:     selectedDocType.id,
    full_name:       (document.getElementById('rf-name')    || {value:''}).value.trim(),
    date_of_birth:   (document.getElementById('rf-dob')     || {value:''}).value.trim(),
    phone:           (document.getElementById('rf-phone')   || {value:''}).value.trim(),
    civil_status:    (document.getElementById('rf-civil')   || {value:'Single'}).value,
    address:         (document.getElementById('rf-addr')    || {value:''}).value.trim(),
    purpose:         (document.getElementById('rf-purpose') || {value:''}).value.trim(),
    processing_type: selectedProcessingType,
    payment_method:  isFree ? 'FREE' : (selectedPayMethod === 'gcash' ? 'GCash' : 'Maya'),
    payment_ref:     isFree ? 'FREE' : (document.getElementById('pay-ref') || {value:''}).value.trim(),
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
  selectedDocType        = null;
  selectedPayMethod      = null;
  selectedProcessingType = 'normal';
  currentStep            = 1;
}