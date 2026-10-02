-- ==============================================================================
-- FINORA CLOUD DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- Salin seluruh isi skrip ini dan jalankan di:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Tabel Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL, -- 'income' atau 'expense'
    payment_method TEXT DEFAULT 'QRIS',
    date TEXT NOT NULL,
    time TEXT DEFAULT '12:00',
    notes TEXT DEFAULT '',
    wallet_id TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel Wallets (Rekening & E-Wallet)
CREATE TABLE IF NOT EXISTS public.wallets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'bank', 'ewallet', 'cash', 'investment'
    balance NUMERIC DEFAULT 0 NOT NULL,
    account_number TEXT DEFAULT '',
    gradient TEXT DEFAULT '',
    icon TEXT DEFAULT 'fa-wallet',
    badge TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel Budgets (Anggaran Kategori)
CREATE TABLE IF NOT EXISTS public.budgets (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL UNIQUE,
    monthly_limit NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabel Goals (Target Tabungan Finansial)
CREATE TABLE IF NOT EXISTS public.goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_amount NUMERIC NOT NULL,
    current_amount NUMERIC DEFAULT 0,
    deadline TEXT,
    icon TEXT DEFAULT '🎯',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabel Subscriptions (Langganan Rutin)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    cycle TEXT DEFAULT 'monthly',
    billing_day INTEGER DEFAULT 1,
    category TEXT DEFAULT 'Hiburan',
    wallet_id TEXT DEFAULT '',
    icon TEXT DEFAULT 'fa-film',
    color TEXT DEFAULT '#2563eb',
    next_due TEXT,
    is_paid_this_month BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabel Debts (Catatan Hutang & Piutang)
CREATE TABLE IF NOT EXISTS public.debts (
    id TEXT PRIMARY KEY,
    person_name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'payable' (hutang kita) atau 'receivable' (piutang ke orang lain)
    amount NUMERIC NOT NULL,
    paid_amount NUMERIC DEFAULT 0,
    due_date TEXT,
    phone TEXT DEFAULT '',
    note TEXT DEFAULT '',
    status TEXT DEFAULT 'unpaid', -- 'unpaid', 'partial', 'paid'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- AKTIFKAN AKSES PUBLIK (ANON ACCESS) UNTUK APLIKASI
-- ==============================================================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write wallets" ON public.wallets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write budgets" ON public.budgets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write goals" ON public.goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write subscriptions" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write debts" ON public.debts FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- AKTIFKAN SUPABASE REALTIME REPLICATION (SEKETIKA SINKRON ANTAR PERANGKAT)
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debts;
