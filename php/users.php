<?php
// ============================================================
//  php/users.php  –  Profile, Residents List, Notifications
// ============================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, GET, PUT, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/config.php';
startSession();

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'profile':          handleProfile();          break;
    case 'update_profile':   handleUpdateProfile();    break;
    case 'change_password':  handleChangePassword();   break;
    case 'residents':        handleResidents();        break;
    case 'notifications':    handleNotifications();    break;
    case 'mark_read':        handleMarkRead();         break;
    default:                 jsonError('Unknown action', 404);
}

// ── MY PROFILE ────────────────────────────────────────────
function handleProfile() {
    $user = requireAuth();
    $pdo  = getDB();
    $stmt = $pdo->prepare("
        SELECT id, first_name, last_name, email, phone, purok, address, role, gcash_number, maya_number, created_at
        FROM users WHERE id = ? LIMIT 1
    ");
    $stmt->execute([$user['id']]);
    $u = $stmt->fetch();
    if (!$u) jsonError('User not found.', 404);
    jsonOk(['user' => $u]);
}

// ── UPDATE PROFILE ────────────────────────────────────────
function handleUpdateProfile() {
    $user = requireAuth();
    $d    = getJson();

    $first   = clean($d['first_name']    ?? '');
    $last    = clean($d['last_name']     ?? '');
    $phone   = clean($d['phone']         ?? '');
    $purok   = clean($d['purok']         ?? '');
    $address = clean($d['address']       ?? '');
    $email   = strtolower(clean($d['email'] ?? ''));
    $gcash   = clean($d['gcash_number']  ?? '');
    $maya    = clean($d['maya_number']   ?? '');

    if (!$first || !$last)  jsonError('Name is required.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonError('Invalid email.');

    $pdo = getDB();

    // Check email uniqueness (exclude self)
    $chk = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1");
    $chk->execute([$email, $user['id']]);
    if ($chk->fetch()) jsonError('Email is already in use by another account.');

    $pdo->prepare("
        UPDATE users SET first_name=?, last_name=?, email=?, phone=?, purok=?, address=?,
                         gcash_number=?, maya_number=?, updated_at=NOW()
        WHERE id=?
    ")->execute([$first, $last, $email, $phone, $purok, $address, $gcash, $maya, $user['id']]);

    // Refresh session
    $_SESSION['user']['first_name']   = $first;
    $_SESSION['user']['last_name']    = $last;
    $_SESSION['user']['name']         = $first . ' ' . $last;
    $_SESSION['user']['email']        = $email;
    $_SESSION['user']['phone']        = $phone;
    $_SESSION['user']['purok']        = $purok;
    $_SESSION['user']['address']      = $address;
    $_SESSION['user']['gcash_number'] = $gcash;
    $_SESSION['user']['maya_number']  = $maya;

    jsonOk(['user' => $_SESSION['user']], 'Profile updated successfully.');
}

// ── CHANGE PASSWORD ───────────────────────────────────────
function handleChangePassword() {
    $user = requireAuth();
    $d    = getJson();

    $current = $d['current_password'] ?? '';
    $new     = $d['new_password']     ?? '';
    $confirm = $d['confirm_password'] ?? '';

    if (!$current || !$new || !$confirm) jsonError('All password fields are required.');
    if (strlen($new) < 8)               jsonError('New password must be at least 8 characters.');
    if ($new !== $confirm)              jsonError('New passwords do not match.');

    $pdo  = getDB();
    $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$user['id']]);
    $row  = $stmt->fetch();

    if (!$row || !password_verify($current, $row['password_hash'])) {
        jsonError('Current password is incorrect.');
    }

    $hash = password_hash($new, PASSWORD_BCRYPT);
    $pdo->prepare("UPDATE users SET password_hash=?, updated_at=NOW() WHERE id=?")
        ->execute([$hash, $user['id']]);

    jsonOk([], 'Password changed successfully.');
}

// ── RESIDENTS (admin) ─────────────────────────────────────
function handleResidents() {
    requireAuth('admin');
    $pdo    = getDB();
    $search = clean($_GET['search'] ?? '');
    $params = [];
    $where  = "WHERE role = 'resident'";

    if ($search) {
        $where   .= ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR purok LIKE ?)';
        $like     = '%' . $search . '%';
        array_push($params, $like, $like, $like, $like);
    }

    $stmt = $pdo->prepare("
        SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.purok, u.is_active,
               DATE_FORMAT(u.created_at,'%Y-%m-%d') AS registered,
               (SELECT COUNT(*) FROM requests r WHERE r.user_id = u.id) AS request_count
        FROM users u
        {$where}
        ORDER BY u.created_at DESC
    ");
    $stmt->execute($params);
    jsonOk(['residents' => $stmt->fetchAll()]);
}

// ── NOTIFICATIONS ─────────────────────────────────────────
function handleNotifications() {
    $user = requireAuth();
    $pdo  = getDB();
    $stmt = $pdo->prepare("
        SELECT id, title, message, icon, is_read,
               DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at
        FROM notifications WHERE user_id = ?
        ORDER BY created_at DESC LIMIT 30
    ");
    $stmt->execute([$user['id']]);
    $notifs = $stmt->fetchAll();

    $unread = array_sum(array_column($notifs, 'is_read') === array_map(fn($n)=>!$n['is_read'], $notifs)
        ? [] : array_filter($notifs, fn($n)=>!$n['is_read']));

    // Count properly
    $unreadCount = count(array_filter($notifs, fn($n)=>!(bool)$n['is_read']));

    jsonOk(['notifications' => $notifs, 'unread_count' => $unreadCount]);
}

// ── MARK NOTIFICATIONS READ ───────────────────────────────
function handleMarkRead() {
    $user = requireAuth();
    $pdo  = getDB();
    $d    = getJson();
    $ids  = $d['ids'] ?? [];   // empty = mark all

    if ($ids) {
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $params       = array_merge($ids, [$user['id']]);
        $pdo->prepare("UPDATE notifications SET is_read=1 WHERE id IN ({$placeholders}) AND user_id=?")
            ->execute($params);
    } else {
        $pdo->prepare("UPDATE notifications SET is_read=1 WHERE user_id=?")
            ->execute([$user['id']]);
    }
    jsonOk([], 'Notifications marked as read.');
}