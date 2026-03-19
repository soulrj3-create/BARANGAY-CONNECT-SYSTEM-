-- ============================================================
--  BarangayConnect - MySQL Database Schema
--  Database: barangay_connect
--  Version:  1.0
-- ============================================================

CREATE DATABASE IF NOT EXISTS barangay_connect
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE barangay_connect;

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    first_name    VARCHAR(80)     NOT NULL,
    last_name     VARCHAR(80)     NOT NULL,
    email         VARCHAR(150)    NOT NULL UNIQUE,
    password_hash VARCHAR(255)    NOT NULL,
    phone         VARCHAR(20)     DEFAULT NULL,
    purok         VARCHAR(60)     DEFAULT NULL,
    address       TEXT            DEFAULT NULL,
    role          ENUM('resident','admin') NOT NULL DEFAULT 'resident',
    is_active     TINYINT(1)      NOT NULL DEFAULT 1,
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: document_types
-- ============================================================
CREATE TABLE IF NOT EXISTS document_types (
    id              INT UNSIGNED     AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(120)     NOT NULL,
    icon            VARCHAR(10)      NOT NULL DEFAULT '📄',
    fee             DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
    processing_days TINYINT UNSIGNED NOT NULL DEFAULT 1,
    description     VARCHAR(255)     DEFAULT NULL,
    is_active       TINYINT(1)       NOT NULL DEFAULT 1,
    created_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: requests
-- ============================================================
CREATE TABLE IF NOT EXISTS requests (
    id               INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    reference_no     VARCHAR(30)     NOT NULL UNIQUE,
    user_id          INT UNSIGNED    NOT NULL,
    doc_type_id      INT UNSIGNED    NOT NULL,
    full_name        VARCHAR(180)    NOT NULL,
    date_of_birth    DATE            DEFAULT NULL,
    phone            VARCHAR(20)     DEFAULT NULL,
    civil_status     ENUM('Single','Married','Widowed','Separated') DEFAULT 'Single',
    address          TEXT            NOT NULL,
    purpose          VARCHAR(255)    NOT NULL,
    fee              DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    payment_method   ENUM('GCash','Maya','FREE') NOT NULL DEFAULT 'FREE',
    payment_ref      VARCHAR(100)    DEFAULT NULL,
    payment_verified TINYINT(1)      NOT NULL DEFAULT 0,
    status           ENUM('pending','processing','ready','completed','rejected') NOT NULL DEFAULT 'pending',
    reject_reason    TEXT            DEFAULT NULL,
    processed_by     INT UNSIGNED    DEFAULT NULL,
    processed_at     TIMESTAMP       NULL DEFAULT NULL,
    created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)      REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doc_type_id)  REFERENCES document_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id    (user_id),
    INDEX idx_status     (status),
    INDEX idx_reference  (reference_no),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id         INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED  NOT NULL,
    title      VARCHAR(180)  NOT NULL,
    message    TEXT          NOT NULL,
    icon       VARCHAR(10)   DEFAULT '🔔',
    is_read    TINYINT(1)    NOT NULL DEFAULT 0,
    created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: settings
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(80)  NOT NULL UNIQUE,
    setting_val TEXT         DEFAULT NULL,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Admin user  (password: admin123)
INSERT INTO users (first_name, last_name, email, password_hash, phone, purok, address, role) VALUES
('Maria', 'Sta. Ana', 'admin@barangay.ph', '$2y$10$RybjA.VsxQoeJnYF2JF4x.MEM7./dOSk/uPO3mYgliE8bVtQXDmt6', '09171111111', 'Staff', 'Barangay Hall, Pusok', 'admin');

-- Resident users  (password: password123)
INSERT INTO users (first_name, last_name, email, password_hash, phone, purok, address, role) VALUES
('Juan',  'dela Cruz', 'juan@email.com',  '$2y$10$UHSfKDK3POp1zqcspd9ok.hE7Ym.N36yB6zbYPnRSS4Fy6Yf/nbT6', '09171234567', 'Pusok',  '123 Sampaguita St., Pusok', 'resident'),
('Maria', 'Santos',    'maria@email.com', '$2y$10$UHSfKDK3POp1zqcspd9ok.hE7Ym.N36yB6zbYPnRSS4Fy6Yf/nbT6', '09281234567', 'Babag',  '45 Mabini St., Babag',      'resident'),
('Pedro', 'Reyes',     'pedro@email.com', '$2y$10$UHSfKDK3POp1zqcspd9ok.hE7Ym.N36yB6zbYPnRSS4Fy6Yf/nbT6', '09091234567', 'Payo',   '88 Rizal Ave., Payo',       'resident'),
('Ana',   'Gomez',     'ana@email.com',   '$2y$10$UHSfKDK3POp1zqcspd9ok.hE7Ym.N36yB6zbYPnRSS4Fy6Yf/nbT6', '09451234567', 'Gun-ob', '12 Quezon St., Gun-ob',     'resident'),
('Carlo', 'Tan',       'carlo@email.com', '$2y$10$UHSfKDK3POp1zqcspd9ok.hE7Ym.N36yB6zbYPnRSS4Fy6Yf/nbT6', '09321234567', 'Pusok',  '67 Magsaysay St., Pusok',   'resident');

-- Document types
INSERT INTO document_types (name, icon, fee, processing_days, description) VALUES
('Barangay Clearance',       '📋', 50.00,  1, 'For employment, travel, or general purposes'),
('Certificate of Residency', '🏠', 50.00,  1, 'Proof that you reside in the barangay'),
('Indigency Certificate',    '📜',  0.00,  1, 'For financial assistance or scholarship'),
('Business Clearance',       '🏪', 150.00, 2, 'For opening or renewing a business permit'),
('Good Moral Certificate',   '⭐', 50.00,  1, 'Character reference for school or employment'),
('Cohabitation Certificate', '👫', 75.00,  1, 'Proof of living together as a couple');

-- Sample requests
INSERT INTO requests (reference_no, user_id, doc_type_id, full_name, date_of_birth, phone, civil_status, address, purpose, fee, payment_method, payment_ref, payment_verified, status) VALUES
('REQ-2024-001', 2, 1, 'Juan dela Cruz', '1995-03-15', '09171234567', 'Single',  '123 Sampaguita St., Pusok', 'Employment',        50.00, 'GCash', 'GCX-456789', 1, 'completed'),
('REQ-2024-002', 2, 3, 'Juan dela Cruz', '1995-03-15', '09171234567', 'Single',  '123 Sampaguita St., Pusok', 'Scholarship',        0.00, 'FREE',  'FREE',       1, 'completed'),
('REQ-2024-003', 2, 1, 'Juan dela Cruz', '1995-03-15', '09171234567', 'Single',  '123 Sampaguita St., Pusok', 'Bank loan',         50.00, 'GCash', 'GCX-789012', 1, 'ready'),
('REQ-2024-004', 2, 2, 'Juan dela Cruz', '1995-03-15', '09171234567', 'Single',  '123 Sampaguita St., Pusok', 'School enrollment', 50.00, 'Maya',  'MYA-321654', 1, 'pending'),
('REQ-2024-005', 3, 4, 'Maria Santos',   '1990-07-22', '09281234567', 'Married', '45 Mabini St., Babag',       'Business permit',  150.00, 'GCash', 'GCX-111222', 1, 'processing'),
('REQ-2024-006', 4, 5, 'Pedro Reyes',    '1988-11-10', '09091234567', 'Single',  '88 Rizal Ave., Payo',        'Employment',        50.00, 'GCash', 'GCX-333444', 1, 'pending'),
('REQ-2024-007', 5, 1, 'Ana Gomez',      '1997-05-30', '09451234567', 'Single',  '12 Quezon St., Gun-ob',      'Travel',            50.00, 'Maya',  'MYA-555666', 1, 'ready'),
('REQ-2024-008', 6, 6, 'Carlo Tan',      '1993-09-18', '09321234567', 'Married', '67 Magsaysay St., Pusok',    'Bank application',  75.00, 'GCash', 'GCX-777888', 0, 'rejected');

UPDATE requests SET reject_reason = 'Invalid home address provided. Please update your profile and resubmit.' WHERE reference_no = 'REQ-2024-008';

-- Sample notifications for juan (user_id=2)
INSERT INTO notifications (user_id, title, message, icon, is_read) VALUES
(2, 'Document Ready',      'Your Barangay Clearance (REQ-2024-003) is ready to claim at the barangay hall.', '✅', 0),
(2, 'Request Processing',  'Your Certificate of Residency (REQ-2024-004) is now being processed.',           '🔄', 0),
(2, 'Reminder',            'Please bring a valid government-issued ID when claiming your document.',          'ℹ️', 1);

-- System settings
INSERT INTO settings (setting_key, setting_val) VALUES
('barangay_name',      'Barangay Pusok'),
('municipality',       'Lapu-Lapu City'),
('province',           'Cebu'),
('captain_name',       'Hon. Roberto Santos'),
('contact_number',     '(032) 234-5678'),
('gcash_number',       '0917-123-4567'),
('maya_number',        '0998-765-4321'),
('gcash_account_name', 'Barangay Pusok'),
('maya_account_name',  'Barangay Pusok');