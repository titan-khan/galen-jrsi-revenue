-- Script untuk testing notifikasi
-- Ganti 'YOUR_USER_ID' dengan user ID Anda dari auth.users

-- 1. Cek user ID Anda
SELECT id, email FROM auth.users LIMIT 5;

-- 2. Buat beberapa notifikasi test dengan berbagai tipe
-- Ganti 'YOUR_USER_ID' di bawah dengan ID dari query di atas

-- Agent Alert
INSERT INTO notifications (user_id, notification_type, title, message, link)
VALUES (
  'YOUR_USER_ID',
  'agent_alert',
  'Revenue Alert',
  'Revenue Specialist detected a 15% drop in daily revenue',
  '/specialists'
);

-- Report Ready
INSERT INTO notifications (user_id, notification_type, title, message, link)
VALUES (
  'YOUR_USER_ID',
  'report_ready',
  'Monthly Report Ready',
  'Your monthly performance report is ready to view',
  '/reports'
);

-- Metric Threshold
INSERT INTO notifications (user_id, notification_type, title, message, link)
VALUES (
  'YOUR_USER_ID',
  'metric_threshold',
  'Customer Churn Alert',
  'Customer churn rate exceeded 5% threshold',
  '/metrics'
);

-- Data Quality Issue
INSERT INTO notifications (user_id, notification_type, title, message, link)
VALUES (
  'YOUR_USER_ID',
  'data_quality',
  'Data Quality Issue Detected',
  'Missing values found in revenue data for the last 3 days',
  '/data-connector'
);

-- System Notification
INSERT INTO notifications (user_id, notification_type, title, message, link)
VALUES (
  'YOUR_USER_ID',
  'system',
  'Welcome to Galen!',
  'Your notification system is now active and ready to use',
  '/'
);

-- Recommendation
INSERT INTO notifications (user_id, notification_type, title, message, link)
VALUES (
  'YOUR_USER_ID',
  'recommendation',
  'New Insight Available',
  'AI Assistant has generated new recommendations based on recent data',
  '/assistant'
);

-- 3. Verifikasi notifikasi sudah dibuat
SELECT 
  id,
  notification_type,
  title,
  message,
  read,
  created_at
FROM notifications
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;

-- 4. Mark beberapa notifikasi sebagai read (untuk testing filter)
UPDATE notifications
SET read = true
WHERE user_id = 'YOUR_USER_ID'
AND notification_type IN ('system', 'recommendation')
LIMIT 2;

-- 5. Cek statistik notifikasi
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE read = false) as unread,
  COUNT(*) FILTER (WHERE read = true) as read
FROM notifications
WHERE user_id = 'YOUR_USER_ID';

-- 6. Hapus semua notifikasi test (jika perlu)
-- DELETE FROM notifications WHERE user_id = 'YOUR_USER_ID';
