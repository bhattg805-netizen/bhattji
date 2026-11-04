-- ====================================================================
-- YOUTHSMM DATABASE SCHEMA (STANDARD POSTGRESQL)
-- Run this SQL in your PostgreSQL Database / SQL Editor
-- ====================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  balance DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'active',
  custom_rate DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  custom_provider_url TEXT,
  custom_provider_key TEXT,
  api_key TEXT,
  password TEXT,
  last_login_at TIMESTAMP,
  last_ip TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Providers Table (External SMM Provider APIs)
CREATE TABLE IF NOT EXISTS providers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  balance DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. Services Table
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_per_thousand DOUBLE PRECISION NOT NULL,
  min_amount INTEGER NOT NULL DEFAULT 10,
  max_amount INTEGER NOT NULL DEFAULT 10000,
  status TEXT NOT NULL DEFAULT 'active',
  provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
  provider_service_id TEXT,
  icon TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

-- 5. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  service_name TEXT,
  link TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  charge DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  start_count INTEGER NOT NULL DEFAULT 0,
  remains INTEGER NOT NULL DEFAULT 0,
  provider_order_id TEXT,
  refill_status TEXT NOT NULL DEFAULT 'none',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 6. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 7. Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL,
  max_usage INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 8. Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 9. Ticket Messages Table
CREATE TABLE IF NOT EXISTS ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 10. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 11. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 12. Affiliates Table
CREATE TABLE IF NOT EXISTS affiliates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  earnings DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  visits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 13. Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 14. Favorite Services Table
CREATE TABLE IF NOT EXISTS favorite_services (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 15. Child Panels Table
CREATE TABLE IF NOT EXISTS child_panels (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  admin_username TEXT NOT NULL,
  admin_password TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL DEFAULT 10.0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 16. Refill Requests Table
CREATE TABLE IF NOT EXISTS refill_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 17. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 18. Blogs Table
CREATE TABLE IF NOT EXISTS blogs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'published',
  cover_image TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 19. Appointments Table (Supabase Connected)
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  service_type TEXT DEFAULT 'General Consultation',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS) on appointments for Supabase (allowing public inserts & admin access)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public inserts into appointments"
  ON appointments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public select for appointments"
  ON appointments FOR SELECT
  USING (true);

CREATE POLICY "Allow public update for appointments"
  ON appointments FOR UPDATE
  USING (true);

-- 20. Initial Admin User Setup (bhattg805@gmail.com)
INSERT INTO users (uid, email, name, role, balance, status, created_at)
VALUES ('admin-bhattg805', 'bhattg805@gmail.com', 'Bhatt Admin', 'admin', 100.0, 'active', NOW())
ON CONFLICT (email) DO UPDATE SET role = 'admin', status = 'active';

-- Initial System Settings
INSERT INTO settings (key, value) VALUES
  ('websiteName', 'YouthSMM'),
  ('defaultLanguage', 'en'),
  ('whatsappNumber', '8795005604'),
  ('activeTheme', 'candid'),
  ('allUpiStatus', 'enabled'),
  ('googleLoginStatus', 'enabled')
ON CONFLICT (key) DO NOTHING;
