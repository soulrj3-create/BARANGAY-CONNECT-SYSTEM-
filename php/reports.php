<?php
// ============================================================
//  php/reports.php  –  Admin Reports & Settings
// ============================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/config.php';
startSession();

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'dashboard':       handleDashboard();      break;
    case 'monthly':         handleMonthly();        break;
    case 'settings_get':    handleSettingsGet();    break;
    case 'settings_save':   handleSettingsSave();   break;
    case 'fees_save':       handleFeesSave();       break;
    default:                jsonError('Unknown action', 404);
}

// ── DASHBOARD STATS (admin) ───────────────────────────────
function handleDashboard(): void {
    requireAuth('admin');
    $pdo = getDB();

    // Overall stats
    $stats = $pdo->query("
        SELECT
            COUNT(*) AS total,
            SUM(status='pending')    AS pending,
            SUM(status='processing') AS processing,
            SUM(status='ready')      AS ready,
            SUM(status='completed')  AS completed,
            SUM(status='rejected')   AS rejected,
            SUM(CASE WHEN status IN ('ready','completed') THEN fee ELSE 0 END) AS collected
        FROM requests
    ")->fetch();

    // Today's counts
    $today = $pdo->query("
        SELECT COUNT(*) AS today_requests,
               SUM(CASE WHEN status IN ('ready','completed') THEN fee ELSE 0 END) AS today_collected
        FROM requests
        WHERE DATE(created_at) = CURDATE()
    ")->fetch();

    // This week (Mon–Sun)
    $week = $pdo->query("
        SELECT DAYOFWEEK(created_at) AS dow, COUNT(*) AS cnt
        FROM requests
        WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
        GROUP BY dow
    ")->fetchAll();

    // Convert to Mon-indexed array [0..6]
    $weekData = array_fill(0, 7, 0);
    foreach ($week as $w) {
        // MySQL: 1=Sun, 2=Mon … 7=Sat  → remap to 0=Mon
        $idx = ($w['dow'] + 5) % 7;
        $weekData[$idx] = (int)$w['cnt'];
    }

    // By document type
    $byDoc = $pdo->query("
        SELECT dt.name, dt.icon, COUNT(*) AS cnt
        FROM requests r
        JOIN document_types dt ON dt.id = r.doc_type_id
        GROUP BY dt.id
        ORDER BY cnt DESC
    ")->fetchAll();

    // By payment method
    $byPay = $pdo->query("
        SELECT payment_method, COUNT(*) AS cnt
        FROM requests
        GROUP BY payment_method
    ")->fetchAll();

    jsonOk([
        'stats'    => $stats,
        'today'    => $today,
        'week'     => $weekData,
        'by_doc'   => $byDoc,
        'by_pay'   => $byPay,
    ]);
}

// ── MONTHLY REPORT ────────────────────────────────────────
function handleMonthly(): void {
    requireAuth('admin');
    $month = (int)($_GET['month'] ?? date('m'));
    $year  = (int)($_GET['year']  ?? date('Y'));
    $pdo   = getDB();

    $stats = $pdo->prepare("
        SELECT
            COUNT(*) AS total,
            SUM(status='pending')    AS pending,
            SUM(status='processing') AS processing,
            SUM(status='ready')      AS ready,
            SUM(status='completed')  AS completed,
            SUM(status='rejected')   AS rejected,
            SUM(CASE WHEN status IN ('ready','completed') THEN fee ELSE 0 END) AS collected,
            AVG(TIMESTAMPDIFF(HOUR, created_at, COALESCE(processed_at, NOW()))) AS avg_hours
        FROM requests
        WHERE MONTH(created_at)=? AND YEAR(created_at)=?
    ");
    $stats->execute([$month, $year]);

    $daily = $pdo->prepare("
        SELECT DAY(created_at) AS day, COUNT(*) AS cnt
        FROM requests
        WHERE MONTH(created_at)=? AND YEAR(created_at)=?
        GROUP BY DAY(created_at)
        ORDER BY day
    ");
    $daily->execute([$month, $year]);

    jsonOk(['stats' => $stats->fetch(), 'daily' => $daily->fetchAll()]);
}

// ── GET SETTINGS ──────────────────────────────────────────
function handleSettingsGet(): void {
    requireAuth('admin');
    $pdo  = getDB();
    $stmt = $pdo->query("SELECT setting_key, setting_val FROM settings");
    $rows = $stmt->fetchAll();
    $map  = [];
    foreach ($rows as $r) $map[$r['setting_key']] = $r['setting_val'];
    jsonOk(['settings' => $map]);
}

// ── SAVE SETTINGS ─────────────────────────────────────────
function handleSettingsSave(): void {
    requireAuth('admin');
    $d   = getJson();
    $pdo = getDB();

    $allowed = [
        'barangay_name','municipality','province','captain_name',
        'contact_number','gcash_number','maya_number',
        'gcash_account_name','maya_account_name'
    ];

    $stmt = $pdo->prepare("
        INSERT INTO settings (setting_key, setting_val)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val), updated_at = NOW()
    ");

    foreach ($allowed as $key) {
        if (isset($d[$key])) {
            $stmt->execute([$key, clean($d[$key])]);
        }
    }
    jsonOk([], 'Settings saved successfully.');
}

// ── SAVE DOCUMENT FEES ────────────────────────────────────
function handleFeesSave(): void {
    requireAuth('admin');
    $d   = getJson();   // [{ id: 1, fee: 50 }, …]
    $pdo = getDB();

    if (!is_array($d)) jsonError('Invalid data format.');

    $stmt = $pdo->prepare("UPDATE document_types SET fee = ?, updated_at = NOW() WHERE id = ?");
    foreach ($d as $item) {
        $id  = (int)($item['id']  ?? 0);
        $fee = max(0, (float)($item['fee'] ?? 0));
        if ($id) $stmt->execute([$fee, $id]);
    }
    jsonOk([], 'Document fees updated successfully.');
}