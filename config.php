<?php
// ============================================================
//  php/config.php  –  Database & App Configuration
// ============================================================

define('DB_HOST',     'localhost');
define('DB_PORT',     '3306');
define('DB_NAME',     'barangay_connect');
define('DB_USER',     'root');          // Change to your MySQL username
define('DB_PASS',     '');              // Change to your MySQL password
define('DB_CHARSET',  'utf8mb4');

define('APP_NAME',    'BarangayConnect');
define('APP_URL',     'http://localhost/barangay-connect');
define('APP_VERSION', '1.0.0');

// Session config
define('SESSION_LIFETIME', 7200); // 2 hours

// ── PDO singleton ──────────────────────────────────────────
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
        );
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]));
        }
    }
    return $pdo;
}

// ── Session helpers ────────────────────────────────────────
function startSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        ini_set('session.cookie_httponly', '1');
        ini_set('session.use_strict_mode', '1');
        session_set_cookie_params([
            'lifetime' => SESSION_LIFETIME,
            'path'     => '/',
            'secure'   => false,   // Set true in production with HTTPS
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        session_start();
    }
}

function getSessionUser(): ?array {
    startSession();
    return $_SESSION['user'] ?? null;
}

function requireAuth(string $role = ''): array {
    $user = getSessionUser();
    if (!$user) {
        http_response_code(401);
        die(json_encode(['success' => false, 'message' => 'Unauthorized. Please log in.']));
    }
    if ($role && $user['role'] !== $role) {
        http_response_code(403);
        die(json_encode(['success' => false, 'message' => 'Forbidden. Insufficient permissions.']));
    }
    return $user;
}

// ── JSON response helpers ──────────────────────────────────
function jsonOk(array $data = [], string $message = 'Success'): void {
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'message' => $message] + $data);
    exit;
}

function jsonError(string $message, int $code = 400): void {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

// ── Input sanitizer ────────────────────────────────────────
function clean(string $val): string {
    return htmlspecialchars(strip_tags(trim($val)), ENT_QUOTES, 'UTF-8');
}

function getJson(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

// ── Reference number generator ────────────────────────────
function generateRefNo(): string {
    $pdo  = getDB();
    $year = date('Y');
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM requests WHERE YEAR(created_at) = ?");
    $stmt->execute([$year]);
    $count = (int) $stmt->fetchColumn();
    return 'REQ-' . $year . '-' . str_pad($count + 1, 3, '0', STR_PAD_LEFT);
}