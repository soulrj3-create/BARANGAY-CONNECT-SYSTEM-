<?php
// ============================================================
//  php/auth.php  –  Login / Register / Logout / Me
// ============================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/config.php';
startSession();

$action = $_GET['action'] ?? '';
$data   = getJson();

// ── ROUTER ────────────────────────────────────────────────
switch ($action) {
    case 'login':    handleLogin($data);    break;
    case 'register': handleRegister($data); break;
    case 'logout':   handleLogout();        break;
    case 'me':       handleMe();            break;
    default:         jsonError('Unknown action', 404);
}

// ── LOGIN ─────────────────────────────────────────────────
function handleLogin(array $d): void {
    $email = strtolower(clean($d['email'] ?? ''));
    $pass  = $d['password'] ?? '';

    if (!$email || !$pass) {
        jsonError('Email and password are required.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError('Invalid email address.');
    }

    $pdo  = getDB();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($pass, $user['password_hash'])) {
        jsonError('Invalid email or password.');
    }

    // Store session
    $_SESSION['user'] = [
        'id'         => $user['id'],
        'email'      => $user['email'],
        'first_name' => $user['first_name'],
        'last_name'  => $user['last_name'],
        'name'       => $user['first_name'] . ' ' . $user['last_name'],
        'role'       => $user['role'],
        'phone'      => $user['phone'],
        'purok'      => $user['purok'],
        'address'    => $user['address'],
    ];

    jsonOk(['user' => $_SESSION['user']], 'Login successful.');
}

// ── REGISTER ──────────────────────────────────────────────
function handleRegister(array $d): void {
    $first   = clean($d['first_name'] ?? '');
    $last    = clean($d['last_name']  ?? '');
    $email   = strtolower(clean($d['email']    ?? ''));
    $phone   = clean($d['phone']   ?? '');
    $purok   = clean($d['purok']   ?? '');
    $address = clean($d['address'] ?? '');
    $pass    = $d['password']         ?? '';
    $confirm = $d['confirm_password'] ?? '';

    if (!$first || !$last || !$email || !$phone || !$purok || !$pass) {
        jsonError('All fields are required.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError('Invalid email address.');
    }
    if (strlen($pass) < 8) {
        jsonError('Password must be at least 8 characters.');
    }
    if ($pass !== $confirm) {
        jsonError('Passwords do not match.');
    }

    $pdo  = getDB();
    $check = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
    $check->execute([$email]);
    if ($check->fetch()) {
        jsonError('Email is already registered.');
    }

    $hash = password_hash($pass, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare(
        "INSERT INTO users (first_name, last_name, email, password_hash, phone, purok, address, role)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'resident')"
    );
    $stmt->execute([$first, $last, $email, $hash, $phone, $purok, $address]);

    jsonOk([], 'Account created successfully. You may now sign in.');
}

// ── LOGOUT ────────────────────────────────────────────────
function handleLogout(): void {
    $_SESSION = [];
    session_destroy();
    jsonOk([], 'Logged out successfully.');
}

// ── ME (current user) ─────────────────────────────────────
function handleMe(): void {
    $user = getSessionUser();
    if (!$user) {
        jsonError('Not authenticated.', 401);
    }
    jsonOk(['user' => $user]);
}