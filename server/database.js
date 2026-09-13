import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'finora.db');

export const db = new DatabaseSync(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL, -- 'income' or 'expense'
    date TEXT NOT NULL,
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL UNIQUE,
    monthly_limit REAL NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    deadline TEXT,
    icon TEXT DEFAULT '🎯',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Safe migration for payment_method and time columns if upgrading existing db
try {
  db.exec("ALTER TABLE transactions ADD COLUMN payment_method TEXT DEFAULT 'QRIS'");
} catch (e) {
  // Column already exists, safe to ignore
}

try {
  db.exec("ALTER TABLE transactions ADD COLUMN time TEXT DEFAULT '00:00'");
  db.exec("UPDATE transactions SET time = COALESCE(strftime('%H:%M', created_at), '10:00') WHERE time IS NULL OR time = '00:00'");
} catch (e) {
  // Column already exists, safe to ignore
}

// Seed default categories for budgets if empty
const countBudgets = db.prepare('SELECT COUNT(*) as count FROM budgets').get();
if (countBudgets.count === 0) {
  const insertBudget = db.prepare('INSERT INTO budgets (id, category, monthly_limit) VALUES (?, ?, ?)');
  insertBudget.run('b-1', 'Makanan & Minuman', 2500000);
  insertBudget.run('b-2', 'Transportasi', 1000000);
  insertBudget.run('b-3', 'Belanja', 1500000);
  insertBudget.run('b-4', 'Hiburan', 750000);
  insertBudget.run('b-5', 'Tagihan & Utilitas', 1200000);
}

// Seed default goals if empty
const countGoals = db.prepare('SELECT COUNT(*) as count FROM goals').get();
if (countGoals.count === 0) {
  const insertGoal = db.prepare('INSERT INTO goals (id, name, target_amount, current_amount, deadline, icon) VALUES (?, ?, ?, ?, ?, ?)');
  insertGoal.run('g-1', 'Dana Darurat 6 Bulan', 30000000, 12500000, '2026-12-31', '🛡️');
  insertGoal.run('g-2', 'Liburan Akhir Tahun', 10000000, 4200000, '2026-11-30', '✈️');
  insertGoal.run('g-3', 'Gadget Baru / Laptop', 18000000, 9000000, '2026-10-15', '💻');
}

// Seed initial transactions if empty
const countTx = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
if (countTx.count === 0) {
  const insertTx = db.prepare(`
    INSERT INTO transactions (id, description, amount, category, type, payment_method, date, time, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const today = new Date().toISOString().split('T')[0];
  insertTx.run('tx-init-1', 'Gaji Bulanan', 12000000, 'Gaji', 'income', 'Bank Transfer', today, '09:00', 'Gaji Pokok');
  insertTx.run('tx-init-2', 'Belanja Bulanan Supermarket', 850000, 'Makanan & Minuman', 'expense', 'QRIS', today, '10:30', 'Bahan masakan mingguan');
  insertTx.run('tx-init-3', 'Bensin & Tol', 250000, 'Transportasi', 'expense', 'Tunai', today, '12:15', 'Operasional kerja');
  insertTx.run('tx-init-4', 'Langganan Internet & Wifi', 450000, 'Tagihan & Utilitas', 'expense', 'Bank Transfer', today, '14:00', 'Paket Fiber 100Mbps');
}

// Query Helpers
export const getDatabaseData = () => {
  const transactions = db.prepare('SELECT * FROM transactions ORDER BY date DESC, time DESC, created_at DESC').all();
  const budgets = db.prepare('SELECT * FROM budgets').all();
  const goals = db.prepare('SELECT * FROM goals').all();
  return { transactions, budgets, goals };
};

export const addTransaction = (tx) => {
  const id = tx.id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const time = tx.time || now.toTimeString().slice(0, 5);
  const date = tx.date || now.toISOString().split('T')[0];
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO transactions (id, description, amount, category, type, payment_method, date, time, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    tx.description,
    Number(tx.amount),
    tx.category,
    tx.type,
    tx.payment_method || tx.method || 'QRIS',
    date,
    time,
    tx.notes || ''
  );
  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
};

export const deleteTransaction = (id) => {
  const stmt = db.prepare('DELETE FROM transactions WHERE id = ?');
  stmt.run(id);
  return { success: true, id };
};

export const updateTransaction = (id, tx) => {
  const stmt = db.prepare(`
    UPDATE transactions 
    SET description = ?, amount = ?, category = ?, type = ?, payment_method = ?, date = ?, time = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(
    tx.description,
    Number(tx.amount),
    tx.category,
    tx.type,
    tx.payment_method || tx.method || 'QRIS',
    tx.date,
    tx.time,
    tx.notes || '',
    id
  );
  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
};

export const resetTransactions = () => {
  db.exec('DELETE FROM transactions');
  const insertTx = db.prepare(`
    INSERT INTO transactions (id, description, amount, category, type, payment_method, date, time, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const today = new Date().toISOString().split('T')[0];
  insertTx.run('tx-init-1', 'Gaji Bulanan', 12000000, 'Gaji', 'income', 'Bank Transfer', today, '09:00', 'Gaji Pokok');
  insertTx.run('tx-init-2', 'Belanja Bulanan Supermarket', 850000, 'Makanan & Minuman', 'expense', 'QRIS', today, '10:30', 'Bahan masakan mingguan');
  insertTx.run('tx-init-3', 'Bensin & Tol', 250000, 'Transportasi', 'expense', 'Tunai', today, '12:15', 'Operasional kerja');
  insertTx.run('tx-init-4', 'Langganan Internet & Wifi', 450000, 'Tagihan & Utilitas', 'expense', 'Bank Transfer', today, '14:00', 'Paket Fiber 100Mbps');
  return db.prepare('SELECT * FROM transactions ORDER BY date DESC, time DESC, created_at DESC').all();
};

export const updateBudget = (category, limit) => {
  const existing = db.prepare('SELECT id FROM budgets WHERE category = ?').get(category);
  if (existing) {
    db.prepare('UPDATE budgets SET monthly_limit = ?, updated_at = CURRENT_TIMESTAMP WHERE category = ?').run(Number(limit), category);
  } else {
    const id = `b-${Date.now()}`;
    db.prepare('INSERT INTO budgets (id, category, monthly_limit) VALUES (?, ?, ?)').run(id, category, Number(limit));
  }
  return db.prepare('SELECT * FROM budgets WHERE category = ?').get(category);
};

export const deleteBudget = (category) => {
  db.prepare('DELETE FROM budgets WHERE category = ?').run(category);
  return { success: true, category };
};

export const updateGoalDeposit = (id, addAmount) => {
  db.prepare('UPDATE goals SET current_amount = current_amount + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(Number(addAmount), id);
  return db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
};

export const addGoal = (g) => {
  const id = g.id || `g-${Date.now()}`;
  db.prepare(`
    INSERT OR REPLACE INTO goals (id, name, target_amount, current_amount, deadline, icon)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    g.name,
    Number(g.target_amount) || 0,
    Number(g.current_amount) || 0,
    g.deadline || '',
    g.icon || '🎯'
  );
  return db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
};

export const updateGoal = (id, g) => {
  db.prepare(`
    UPDATE goals
    SET name = ?, target_amount = ?, deadline = ?, icon = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    g.name,
    Number(g.target_amount) || 0,
    g.deadline || '',
    g.icon || '🎯',
    id
  );
  return db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
};

export const deleteGoal = (id) => {
  db.prepare('DELETE FROM goals WHERE id = ?').run(id);
  return { success: true, id };
};
