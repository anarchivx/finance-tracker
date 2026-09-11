/* ==========================================================================
   FINCATAT AUTO - LOCAL STORAGE & SOCKET.IO REALTIME ENGINE
   ========================================================================== */

const STORAGE_KEY_TX = 'finora_transactions_v1';
const STORAGE_KEY_SETTINGS = 'finora_settings_v1';

// Default Categories with Icons and Colors
const CATEGORIES = {
    expense: [
        { id: 'cat_food', name: 'Makanan & Minuman', icon: 'fa-utensils', color: '#f59e0b' },
        { id: 'cat_transport', name: 'Transportasi & Bensin', icon: 'fa-car', color: '#3b82f6' },
        { id: 'cat_shopping', name: 'Belanja & Groceries', icon: 'fa-bag-shopping', color: '#ec4899' },
        { id: 'cat_bills', name: 'Tagihan, Listrik & Wi-Fi', icon: 'fa-file-invoice-dollar', color: '#ef4444' },
        { id: 'cat_entertainment', name: 'Hiburan & Hobi', icon: 'fa-gamepad', color: '#8b5cf6' },
        { id: 'cat_health', name: 'Kesehatan & Medis', icon: 'fa-notes-medical', color: '#06b6d4' },
        { id: 'cat_education', name: 'Pendidikan & Kursus', icon: 'fa-graduation-cap', color: '#10b981' },
        { id: 'cat_other_exp', name: 'Pengeluaran Lainnya', icon: 'fa-receipt', color: '#64748b' }
    ],
    income: [
        { id: 'cat_salary', name: 'Gaji & Uang Masuk', icon: 'fa-money-bill-wave', color: '#10b981' },
        { id: 'cat_freelance', name: 'Freelance & Proyek', icon: 'fa-laptop-code', color: '#3b82f6' },
        { id: 'cat_business', name: 'Bisnis & Penjualan', icon: 'fa-store', color: '#f59e0b' },
        { id: 'cat_investment', name: 'Investasi & Dividen', icon: 'fa-chart-line', color: '#8b5cf6' },
        { id: 'cat_gift', name: 'Hadiah & Bonus', icon: 'fa-gift', color: '#ec4899' },
        { id: 'cat_other_inc', name: 'Pemasukan Lainnya', icon: 'fa-vault', color: '#64748b' }
    ]
};

// Default Settings
const DEFAULT_SETTINGS = {
    dailyBudgetLimit: 150000,
    theme: 'dark'
};

class StorageEngine {
    constructor() {
        this.socket = null;
        this.isOnline = false;
        this.init();
        this.initSocket();
    }

    init() {
        if (!localStorage.getItem(STORAGE_KEY_TX)) {
            localStorage.setItem(STORAGE_KEY_TX, JSON.stringify([]));
        }
        if (!localStorage.getItem(STORAGE_KEY_SETTINGS)) {
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        }
    }

    initSocket() {
        if (typeof io !== 'undefined') {
            // Attempt to connect to local Node.js server
            this.socket = io('http://localhost:3000');
            
            this.socket.on('connect', () => {
                console.log('Connected to real-time server');
                this.isOnline = true;
                this.updateConnectionStatus(true);
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from real-time server, falling back to local');
                this.isOnline = false;
                this.updateConnectionStatus(false);
            });

            // Initial Sync
            this.socket.on('sync_initial_transactions', (data) => {
                if (data && Array.isArray(data)) {
                    this.saveTransactionsLocal(data);
                    window.dispatchEvent(new Event('finora_data_updated'));
                }
            });

            this.socket.on('sync_initial_settings', (data) => {
                if (data) {
                    this.saveSettingsLocal(data);
                    window.dispatchEvent(new Event('finora_data_updated'));
                }
            });

            // Real-time Event Listeners
            this.socket.on('new_transaction_added', (tx) => {
                const current = this.getTransactions();
                current.unshift(tx);
                this.saveTransactionsLocal(current);
                window.dispatchEvent(new Event('finora_data_updated'));
            });

            this.socket.on('transaction_deleted', (id) => {
                let current = this.getTransactions();
                current = current.filter(t => t.id !== id);
                this.saveTransactionsLocal(current);
                window.dispatchEvent(new Event('finora_data_updated'));
            });
        }
    }

    updateConnectionStatus(isOnline) {
        const badge = document.getElementById('currentDateBadge');
        if (badge) {
            if (isOnline) {
                badge.style.border = '1px solid #10b981';
                badge.title = 'Real-time Sync Active';
            } else {
                badge.style.border = '';
                badge.title = 'Offline Mode (Local Storage)';
            }
        }
    }

    getTransactions() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY_TX)) || [];
        } catch (e) {
            return [];
        }
    }

    saveTransactionsLocal(transactions) {
        localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(transactions));
    }

    addTransaction(tx) {
        const transactions = this.getTransactions();
        const newTx = {
            id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            title: tx.title || 'Transaksi Baru',
            amount: parseFloat(tx.amount) || 0,
            type: tx.type || 'expense', // 'expense' or 'income'
            category: tx.category || (tx.type === 'income' ? 'Gaji & Uang Masuk' : 'Pengeluaran Lainnya'),
            method: tx.method || 'QRIS',
            date: tx.date || new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
        transactions.unshift(newTx);
        this.saveTransactionsLocal(transactions);

        // Sync to server if online
        if (this.isOnline && this.socket) {
            this.socket.emit('add_transaction', newTx);
        }

        return newTx;
    }

    deleteTransaction(id) {
        let transactions = this.getTransactions();
        transactions = transactions.filter(t => t.id !== id);
        this.saveTransactionsLocal(transactions);

        // Sync to server if online
        if (this.isOnline && this.socket) {
            this.socket.emit('delete_transaction', id);
        }

        return transactions;
    }

    getSettings() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS)) || DEFAULT_SETTINGS;
        } catch (e) {
            return DEFAULT_SETTINGS;
        }
    }

    saveSettingsLocal(settings) {
        const current = this.getSettings();
        const updated = { ...current, ...settings };
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(updated));
        return updated;
    }

    saveSettings(settings) {
        const updated = this.saveSettingsLocal(settings);
        
        // Sync to server if online
        if (this.isOnline && this.socket) {
            this.socket.emit('update_settings', updated);
        }
        
        return updated;
    }

    loadSampleData() {
        const now = new Date();
        const formatDateStr = (offsetDays, hours, mins) => {
            const d = new Date(now);
            d.setDate(d.getDate() - offsetDays);
            d.setHours(hours, mins, 0, 0);
            return d.toISOString();
        };

        const sampleData = [
            { id: 'sample_1', title: 'Gaji Bulanan', amount: 6500000, type: 'income', category: 'Gaji & Uang Masuk', method: 'Bank Transfer', date: formatDateStr(0, 8, 30), createdAt: new Date().toISOString() },
            { id: 'sample_2', title: 'Kopi Espresso Pagi', amount: 25000, type: 'expense', category: 'Makanan & Minuman', method: 'QRIS', date: formatDateStr(0, 9, 15), createdAt: new Date().toISOString() },
            { id: 'sample_3', title: 'Makan Siang Nasi Padang', amount: 35000, type: 'expense', category: 'Makanan & Minuman', method: 'Tunai', date: formatDateStr(0, 12, 30), createdAt: new Date().toISOString() },
            { id: 'sample_4', title: 'Isi Bensin Motor', amount: 45000, type: 'expense', category: 'Transportasi & Bensin', method: 'QRIS', date: formatDateStr(0, 17, 10), createdAt: new Date().toISOString() },
            { id: 'sample_5', title: 'Makan Malam Sushi', amount: 78000, type: 'expense', category: 'Makanan & Minuman', method: 'GoPay', date: formatDateStr(1, 19, 45), createdAt: new Date().toISOString() }
        ];

        this.saveTransactionsLocal(sampleData);
        
        if (this.isOnline && this.socket) {
            sampleData.forEach(tx => this.socket.emit('add_transaction', tx));
        }
        
        return sampleData;
    }

    exportToCSV() {
        const transactions = this.getTransactions();
        if (transactions.length === 0) return null;

        const headers = ['ID Finora', 'Tanggal', 'Jenis', 'Kategori', 'Keterangan Item', 'Metode Pembayaran', 'Jumlah (IDR)'];
        const rows = transactions.map(t => [
            t.id,
            new Date(t.date).toLocaleString('id-ID'),
            t.type === 'expense' ? 'Pengeluaran' : 'Pemasukan',
            `"${t.category}"`,
            `"${t.title.replace(/"/g, '""')}"`,
            t.method,
            t.amount
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
            [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        return encodeURI(csvContent);
    }
}

window.storageEngine = new StorageEngine();
