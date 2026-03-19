// 
//  js/auth.js  –  Login, Register, Logout, Session
// 

let currentUser = null;

// PAGE SWITCHER 
function showPage(p) {
  document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
  const pg = document.getElementById('page-' + p);
  if (pg) pg.classList.add('active');
}

//  LOGIN 
async function doLogin() {
  const email = v('li-email').trim().toLowerCase();
  const pass  = v('li-pass');
  if (!email || !pass) { toast('Please enter your email and password.', 'error'); return; }

  const btn = g('btn-login');
  btn.disabled = true; btn.textContent = 'Signing in…';

  const res = await POST('auth', 'login', { email, password: pass });

  btn.disabled = false; btn.textContent = 'Sign In →';

  if (!res.success) { toast(res.message, 'error'); return; }
  applySession(res.user);
}

// REGISTER 
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

  if (!payload.first_name || !payload.last_name || !payload.email ||
      !payload.phone || !payload.purok || !payload.password) {
    toast('Please fill in all required fields.', 'error'); return;
  }

  const btn = g('btn-register');
  btn.disabled = true; btn.textContent = 'Creating account…';

  const res = await POST('auth', 'register', payload);

  btn.disabled = false; btn.textContent = 'Create Account →';

  if (!res.success) { toast(res.message, 'error'); return; }

  toast(res.message, 'success');
  setTimeout(() => showPage('login'), 1400);
}

// LOGOUT 
async function doLogout() {
  await POST('auth', 'logout');
  currentUser = null;
  showPage('login');
  g('li-email').value = '';
  g('li-pass').value  = '';
  toast('Signed out successfully.', 'info');
}

// DEMO LOGINS 
function demoLogin(role) {
  if (role === 'admin') {
    g('li-email').value = 'admin@barangay.ph';
    g('li-pass').value  = 'password123';
  } else {
    g('li-email').value = 'juan@email.com';
    g('li-pass').value  = 'password123';
  }
  doLogin();
}

// APPLY SESSION 
function applySession(user) {
  currentUser = user;

  // Top nav
  g('nav-av').textContent   = user.first_name[0].toUpperCase();
  g('nav-name').textContent = user.first_name;
  g('nav-role').textContent = user.role === 'admin' ? 'Admin' : 'Resident';

  // Show correct sidebar
  g('res-nav').style.display = user.role === 'resident' ? '' : 'none';
  g('adm-nav').style.display = user.role === 'admin'    ? '' : 'none';

  showPage('app');
  loadNotifCount();

  if (user.role === 'admin') {
    showPanel('adm-home');
  } else {
    prefillProfile(user);
    showPanel('res-home');
  }

  toast('Welcome back, ' + user.first_name + '!', 'success');
}

//  CHECK SESSION ON LOAD 
async function checkSession() {
  const res = await GET('auth', 'me');
  if (res.success && res.user) {
    applySession(res.user);
  }
  // else stay on login page
}

//  NOTIFICATION COUNT 
async function loadNotifCount() {
  if (!currentUser) return;
  const res = await GET('users', 'notifications');
  if (res.success) {
    const dot = g('notif-dot');
    if (dot) {
      dot.textContent = res.unread_count;
      dot.style.display = res.unread_count > 0 ? 'flex' : 'none';
    }
  }
}

//  PREFILL PROFILE FORM 
function prefillProfile(user) {
  if (g('pf-fn')) g('pf-fn').value = user.first_name || '';
  if (g('pf-ln')) g('pf-ln').value = user.last_name  || '';
  if (g('pf-em')) g('pf-em').value = user.email      || '';
  if (g('pf-ph')) g('pf-ph').value = user.phone      || '';
  if (g('pf-ad')) g('pf-ad').value = user.address    || '';

  if (g('prof-name-disp'))  g('prof-name-disp').textContent  = (user.first_name + ' ' + user.last_name).trim();
  if (g('prof-email-disp')) g('prof-email-disp').textContent = user.email;
  if (g('prof-av-big'))     g('prof-av-big').textContent     = user.first_name[0].toUpperCase();

  // Set purok select
  const purokSel = g('pf-pu');
  if (purokSel && user.purok) {
    [...purokSel.options].forEach(o => { o.selected = (o.value === user.purok); });
  }
}

// Enter key on login
document.addEventListener('DOMContentLoaded', () => {
  ['li-email','li-pass'].forEach(id => {
    const el = g(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  });
});