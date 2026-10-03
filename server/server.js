import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const svelteDist = path.join(__dirname, '../finora-svelte/build');
const legacyDist = path.join(__dirname, '../');
import {
  getDatabaseData,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  resetTransactions,
  updateBudget,
  deleteBudget,
  updateGoalDeposit,
  addGoal,
  updateGoal,
  deleteGoal,
  hasSecurityPin,
  verifySecurityPin,
  setSecurityPin,
  resetSecurityPin
} from './database.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

// ==============================================================================
// PIN SECURITY ENDPOINTS (SINGLE MASTER PIN FOR ALL DEVICES)
// ==============================================================================

let lastGlobalLockTimestamp = 0;

app.get('/api/auth/status', (req, res) => {
  try {
    const hasPin = hasSecurityPin();
    res.json({ hasPin, lastGlobalLockTimestamp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/lock-all', (req, res) => {
  try {
    const timestamp = req.body?.timestamp || Date.now();
    lastGlobalLockTimestamp = timestamp;
    io.emit('security:lock_all', { timestamp });
    res.json({ success: true, timestamp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/verify', (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ success: false, error: 'PIN wajib diisi' });
    const isValid = verifySecurityPin(String(pin));
    res.json({ success: isValid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/set-pin', (req, res) => {
  try {
    const { newPin, currentPin } = req.body;
    if (!newPin || String(newPin).length < 4) {
      return res.status(400).json({ success: false, error: 'PIN minimal 4 digit' });
    }

    const exists = hasSecurityPin();
    if (exists) {
      if (!currentPin || !verifySecurityPin(String(currentPin))) {
        return res.status(403).json({ success: false, error: 'PIN lama salah' });
      }
    }

    setSecurityPin(String(newPin));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

let currentAdminMasterKey = process.env.ADMIN_MASTER_KEY || 'FINORA-ADMIN-2026';

app.post('/api/auth/reset', (req, res) => {
  try {
    const { adminKey } = req.body || {};
    if (!adminKey || String(adminKey).trim().toUpperCase() !== currentAdminMasterKey.toUpperCase()) {
      return res.status(403).json({ success: false, error: 'Otorisasi Gagal: Kode Kunci Administrator tidak valid.' });
    }
    resetSecurityPin();
    res.json({ success: true, message: 'Master PIN berhasil diatur ulang oleh Administrator.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/set-admin-key', (req, res) => {
  try {
    const { newAdminKey } = req.body || {};
    if (!newAdminKey || String(newAdminKey).trim().length < 4) {
      return res.status(400).json({ success: false, error: 'Kode Admin minimal 4 karakter.' });
    }
    currentAdminMasterKey = String(newAdminKey).trim();
    res.json({ success: true, message: 'Kode Otorisasi Administrator berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// REST API Endpoints
app.get('/api/sync', (req, res) => {
  try {
    const data = getDatabaseData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', (req, res) => {
  try {
    const tx = addTransaction(req.body);
    io.emit('transaction:created', tx);
    res.status(201).json(tx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/transactions/:id', (req, res) => {
  try {
    const tx = updateTransaction(req.params.id, req.body);
    io.emit('transaction:updated', tx);
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transactions/:id', (req, res) => {
  try {
    const result = deleteTransaction(req.params.id);
    io.emit('transaction:deleted', result.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions/reset', (req, res) => {
  try {
    const freshList = resetTransactions();
    io.emit('transaction:reset', freshList);
    res.json({ success: true, transactions: freshList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/budgets', (req, res) => {
  try {
    const { category, limit } = req.body;
    const budget = updateBudget(category, limit);
    io.emit('budget:updated', budget);
    res.json(budget);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/budgets/:category', (req, res) => {
  try {
    const result = deleteBudget(req.params.category);
    io.emit('budget:deleted', req.params.category);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/goals', (req, res) => {
  try {
    const goal = addGoal(req.body);
    io.emit('goal:created', goal);
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/goals/:id', (req, res) => {
  try {
    const goal = updateGoal(req.params.id, req.body);
    io.emit('goal:updated', goal);
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/goals/:id', (req, res) => {
  try {
    const result = deleteGoal(req.params.id);
    io.emit('goal:deleted', req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/goals/:id/deposit', (req, res) => {
  try {
    const { amount } = req.body;
    const goal = updateGoalDeposit(req.params.id, amount);
    io.emit('goal:updated', goal);
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Socket.IO real-time event management
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Send initial data to client
  try {
    const initialData = getDatabaseData();
    socket.emit('sync:initial', initialData);
  } catch (err) {
    console.error('Error sending initial sync:', err);
  }

  // Handle global security lock broadcast
  socket.on('security:lock_all', (payload) => {
    const ts = payload?.timestamp || Date.now();
    lastGlobalLockTimestamp = ts;
    socket.broadcast.emit('security:lock_all', { timestamp: ts });
  });

  // Handle transaction creation via socket
  socket.on('transaction:add', (txData, callback) => {
    try {
      const created = addTransaction(txData);
      io.emit('transaction:created', created);
      if (typeof callback === 'function') callback({ success: true, data: created });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Handle transaction deletion via socket
  socket.on('transaction:remove', (id, callback) => {
    try {
      deleteTransaction(id);
      io.emit('transaction:deleted', id);
      if (typeof callback === 'function') callback({ success: true });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Handle transaction update via socket
  socket.on('transaction:update', ({ id, txData }, callback) => {
    try {
      const updated = updateTransaction(id, txData);
      io.emit('transaction:updated', updated);
      if (typeof callback === 'function') callback({ success: true, data: updated });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Handle transaction reset via socket
  socket.on('transaction:reset', (callback) => {
    try {
      const freshList = resetTransactions();
      io.emit('transaction:reset', freshList);
      if (typeof callback === 'function') callback({ success: true, data: freshList });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Handle budget updates
  socket.on('budget:set', ({ category, limit }, callback) => {
    try {
      const updated = updateBudget(category, limit);
      io.emit('budget:updated', updated);
      if (typeof callback === 'function') callback({ success: true, data: updated });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Handle budget delete
  socket.on('budget:remove', (category, callback) => {
    try {
      deleteBudget(category);
      io.emit('budget:deleted', category);
      if (typeof callback === 'function') callback({ success: true, category });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Handle goal add
  socket.on('goal:add', (goalData, callback) => {
    try {
      const created = addGoal(goalData);
      io.emit('goal:created', created);
      if (typeof callback === 'function') callback({ success: true, data: created });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Handle goal update
  socket.on('goal:update', ({ id, goalData }, callback) => {
    try {
      const updated = updateGoal(id, goalData);
      io.emit('goal:updated', updated);
      if (typeof callback === 'function') callback({ success: true, data: updated });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Handle goal delete
  socket.on('goal:remove', (id, callback) => {
    try {
      deleteGoal(id);
      io.emit('goal:deleted', id);
      if (typeof callback === 'function') callback({ success: true, id });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Handle goal deposits
  socket.on('goal:deposit', ({ id, amount }, callback) => {
    try {
      const updated = updateGoalDeposit(id, amount);
      io.emit('goal:updated', updated);
      if (typeof callback === 'function') callback({ success: true, data: updated });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Serve frontend static build directly
if (fs.existsSync(svelteDist)) {
  app.use(express.static(svelteDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(svelteDist, 'index.html'));
  });
} else {
  app.use(express.static(legacyDist));
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Finora Fullstack App running at http://localhost:${PORT}`);
});
