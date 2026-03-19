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
    showPage('login');
  }
}

// ── SHOW PAGE (login / register / app) ────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-' + name);
  if (pg) pg.classList.add('active');
}

// ── BOOT APP AFTER LOGIN ──────────────────────────────────
function bootApp(user) {
  showPage('app');

  // Nav bar
  g('nav-av').textContent   = user.first_name ? user.first_name[0].toUpperCase() : '?';
  g('nav-name').textContent = user.first_name || 'User';
  g('nav-role').textContent = user.role === 'admin' ? 'Admin' : 'Resident';

  // Show correct sidebar
  const resNav = g('res-nav');
  const admNav = g('adm-nav');
  if (user.role === 'admin') {
    if (resNav) resNav.style.display = 'none';
    if (admNav) admNav.style.display = 'block';
    showPanel('adm-home');
  } else {
    if (resNav) resNav.style.display = 'block';
    if (admNav) admNav.style.display = 'none';
    showPanel('res-home');
  }

  // Load notification dot
  loadNotifCount();
}

// ── LOAD NOTIFICATION COUNT ───────────────────────────────
async function loadNotifCount() {
  const res = await GET('users', 'notifications');
  if (res.success) {
    const dot = g('notif-dot');
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

// ── DEMO LOGIN ────────────────────────────────────────────
async function demoLogin(role) {
  const creds = {
    resident: { email: 'juan@email.com',   password: 'password123' },
    admin:    { email: 'admin@barangay.ph', password: 'admin123'   },
  };
  const c = creds[role];
  if (!c) return;

  const btn = role === 'admin'
    ? document.querySelector('[onclick="demoLogin(\'admin\')"]')
    : document.querySelector('[onclick="demoLogin(\'resident\')"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

  const res = await POST('auth', 'login', c);

  if (btn) { btn.disabled = false; btn.textContent = role === 'admin' ? '🛡️ Admin Demo' : '👤 Resident Demo'; }

  if (!res.success) { toast(res.message || 'Login failed.', 'error'); return; }

  currentUser = res.user;
  bootApp(currentUser);
}

// ── LOGIN ─────────────────────────────────────────────────
async function doLogin() {
  const email = v('li-email').trim().toLowerCase();
  const pass  = v('li-pass').trim();

  if (!email || !pass) { toast('Please enter your email and password.', 'error'); return; }

  const btn = g('btn-login');
  btn.disabled = true; btn.textContent = 'Signing in…';

  const res = await POST('auth', 'login', { email, password: pass });

  btn.disabled = false; btn.textContent = 'Sign In →';

  if (!res.success) { toast(res.message || 'Login failed.', 'error'); return; }

  currentUser = res.user;
  bootApp(currentUser);
}

// ── REGISTER ─────────────────────────────────────────────
async function doRegister() {
  const payload = {
    first_name:       v('rg-fn').trim(),
    last_name:        v('rg-ln').trim(),
    email:            v('rg-em').trim().toLowerCase(),
    phone:            v('rg-ph').trim(),
    purok:            v('rg-pu'),
    address:          v('rg-ad').trim(),
    password:         v('rg-pw'),
    confirm_password: v('rg-cp'),
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

  const btn = g('btn-register');
  btn.disabled = true; btn.textContent = 'Creating account…';

  const res = await POST('auth', 'register', payload);

  btn.disabled = false; btn.textContent = 'Create Account →';

  if (!res.success) { toast(res.message || 'Registration failed.', 'error'); return; }

  toast(res.message || 'Account created! You may now sign in.', 'success');
  showPage('login');
}

// ── LOGOUT ────────────────────────────────────────────────
async function doLogout() {
  await POST('auth', 'logout', {});
  currentUser = null;
  showPage('login');
  // Clear login fields
  if (g('li-email')) g('li-email').value = '';
  if (g('li-pass'))  g('li-pass').value  = '';
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
    const el = g(elId);
    if (el) el.value = user[key] || '';
  });
  // Purok select
  const purokSel = g('pf-pu');
  if (purokSel && user.purok) purokSel.value = user.purok;

  // Profile display
  if (g('prof-name-disp'))  g('prof-name-disp').textContent  = (user.first_name || '') + ' ' + (user.last_name || '');
  if (g('prof-email-disp')) g('prof-email-disp').textContent = user.email || '';
  if (g('prof-av-big'))     g('prof-av-big').textContent     = user.first_name ? user.first_name[0].toUpperCase() : '?';
}
