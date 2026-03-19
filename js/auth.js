// ============================================================
//  js/auth.js  –  Login / Register / Logout / Session
// ============================================================

let currentUser = null;

// ── CHECK SESSION ON LOAD ─────────────────────────────────
async function checkSession() {
  const res = await GET('auth', 'me');
  if (res.success && res.user) {
    currentUser = res.user;
    bootApp(currentUser);
  } else {
    showPage('landing');
  }
}

// ── SHOW PAGE (landing / login / register / app) ──────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-' + name);
  if (pg) pg.classList.add('active');
  window.scrollTo(0, 0);
}

// ── BOOT APP AFTER LOGIN ──────────────────────────────────
function bootApp(user) {
  showPage('app');

  // Nav bar
  const av   = document.getElementById('nav-av');
  const nm   = document.getElementById('nav-name');
  const role = document.getElementById('nav-role');
  if (av)   av.textContent   = user.first_name ? user.first_name[0].toUpperCase() : '?';
  if (nm)   nm.textContent   = user.first_name || 'User';
  if (role) role.textContent = user.role === 'admin' ? 'Admin' : 'Resident';

  // Show correct sidebar
  const resNav = document.getElementById('res-nav');
  const admNav = document.getElementById('adm-nav');
  if (user.role === 'admin') {
    if (resNav) resNav.style.display = 'none';
    if (admNav) admNav.style.display = 'block';
    showPanel('adm-home');
  } else {
    if (resNav) resNav.style.display = 'block';
    if (admNav) admNav.style.display = 'none';
    showPanel('res-home');
  }

  loadNotifCount();
}

// ── LOAD NOTIFICATION COUNT ───────────────────────────────
async function loadNotifCount() {
  const res = await GET('users', 'notifications');
  if (res.success) {
    const dot = document.getElementById('notif-dot');
    if (dot) {
      if (res.unread_count > 0) {
        dot.style.display = 'flex';
        dot.textContent   = res.unread_count;
      } else {
        dot.style.display = 'none';
      }
    }
  }
}

// ── LOGIN ─────────────────────────────────────────────────
async function doLogin() {
  const email = (document.getElementById('li-email') || {value:''}).value.trim().toLowerCase();
  const pass  = (document.getElementById('li-pass')  || {value:''}).value;

  if (!email || !pass) { toast('Please enter your email and password.', 'error'); return; }

  const btn = document.getElementById('btn-login');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

  const res = await POST('auth', 'login', { email, password: pass });

  if (btn) { btn.disabled = false; btn.textContent = 'Sign In →'; }

  if (!res.success) { toast(res.message || 'Invalid email or password.', 'error'); return; }

  currentUser = res.user;
  bootApp(currentUser);
}

// ── REGISTER ─────────────────────────────────────────────
async function doRegister() {
  const payload = {
    first_name:       (document.getElementById('rg-fn') || {value:''}).value.trim(),
    last_name:        (document.getElementById('rg-ln') || {value:''}).value.trim(),
    email:            (document.getElementById('rg-em') || {value:''}).value.trim().toLowerCase(),
    phone:            (document.getElementById('rg-ph') || {value:''}).value.trim(),
    purok:            (document.getElementById('rg-pu') || {value:''}).value,
    address:          (document.getElementById('rg-ad') || {value:''}).value.trim(),
    password:         (document.getElementById('rg-pw') || {value:''}).value,
    confirm_password: (document.getElementById('rg-cp') || {value:''}).value,
  };

  if (!payload.first_name || !payload.last_name || !payload.email || !payload.phone || !payload.purok || !payload.password) {
    toast('Please fill in all required fields.', 'error'); return;
  }
  if (payload.password.length < 8) {
    toast('Password must be at least 8 characters.', 'error'); return;
  }
  if (payload.password !== payload.confirm_password) {
    toast('Passwords do not match.', 'error'); return;
  }

  const btn = document.getElementById('btn-register');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }

  const res = await POST('auth', 'register', payload);

  if (btn) { btn.disabled = false; btn.textContent = 'Create Account →'; }

  if (!res.success) { toast(res.message || 'Registration failed.', 'error'); return; }

  toast('Account created! You may now sign in.', 'success');
  showPage('login');
}

// ── LOGOUT → back to landing ──────────────────────────────
async function doLogout() {
  await POST('auth', 'logout', {});
  currentUser = null;

  // Clear login form
  const em = document.getElementById('li-email');
  const pw = document.getElementById('li-pass');
  if (em) em.value = '';
  if (pw) pw.value = '';

  showPage('landing');
}

// ── PROFILE PREFILL ───────────────────────────────────────
function prefillProfile(user) {
  const map = {
    'pf-fn': 'first_name',
    'pf-ln': 'last_name',
    'pf-em': 'email',
    'pf-ph': 'phone',
    'pf-ad': 'address',
  };
  Object.entries(map).forEach(([elId, key]) => {
    const el = document.getElementById(elId);
    if (el) el.value = user[key] || '';
  });
  const purokSel = document.getElementById('pf-pu');
  if (purokSel && user.purok) purokSel.value = user.purok;

  const nd = document.getElementById('prof-name-disp');
  const ed = document.getElementById('prof-email-disp');
  const av = document.getElementById('prof-av-big');
  if (nd) nd.textContent = ((user.first_name || '') + ' ' + (user.last_name || '')).trim();
  if (ed) ed.textContent = user.email || '';
  if (av) av.textContent = user.first_name ? user.first_name[0].toUpperCase() : '?';
}