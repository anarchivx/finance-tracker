/* ==========================================================================
   FINCATAT AUTO - MAIN APPLICATION CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial State & DOM Elements
    const storage = window.storageEngine;
    const parser = window.SmartParser;
    const charts = window.chartEngine;

    let currentTxType = 'expense'; // 'expense' or 'income'
    let filters = {
        keyword: '',
        category: 'ALL',
        type: 'ALL',
        method: 'ALL'
    };

    // DOM References
    const liveDateText = document.getElementById('liveDateText');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const btnExportData = document.getElementById('btnExportData');
    const btnLoadSample = document.getElementById('btnLoadSample');

    // Stat Values
    const valNetBalance = document.getElementById('valNetBalance');
    const badgeNetRatio = document.getElementById('badgeNetRatio');
    const valTotalIncome = document.getElementById('valTotalIncome');
    const countIncomeTx = document.getElementById('countIncomeTx');
    const valTotalExpense = document.getElementById('valTotalExpense');
    const countExpenseTx = document.getElementById('countExpenseTx');
    const valDailyBudget = document.getElementById('valDailyBudget');
    const valTodayExpense = document.getElementById('valTodayExpense');
    const dailyBudgetProgress = document.getElementById('dailyBudgetProgress');
    const budgetStatusText = document.getElementById('budgetStatusText');
    const budgetRemainingText = document.getElementById('budgetRemainingText');
    const btnSetBudget = document.getElementById('btnSetBudget');

    // Smart Parser
    const smartParserForm = document.getElementById('smartParserForm');
    const smartInputText = document.getElementById('smartInputText');

    // Manual Form
    const manualTxForm = document.getElementById('manualTxForm');
    const btnToggleExpense = document.getElementById('btnToggleExpense');
    const btnToggleIncome = document.getElementById('btnToggleIncome');
    const txTypeInput = document.getElementById('txType');
    const txAmountInput = document.getElementById('txAmount');
    const txCategorySelect = document.getElementById('txCategory');
    const txTitleInput = document.getElementById('txTitle');
    const txMethodSelect = document.getElementById('txMethod');
    const txDateInput = document.getElementById('txDate');

    // Breakdown Table & Filters
    const searchKeyword = document.getElementById('searchKeyword');
    const filterCategory = document.getElementById('filterCategory');
    const filterType = document.getElementById('filterType');
    const filterMethod = document.getElementById('filterMethod');
    const btnResetFilters = document.getElementById('btnResetFilters');
    const dailyBreakdownList = document.getElementById('dailyBreakdownList');

    // Modal
    const budgetModal = document.getElementById('budgetModal');
    const btnCloseBudgetModal = document.getElementById('btnCloseBudgetModal');
    const btnCancelBudget = document.getElementById('btnCancelBudget');
    const btnSaveBudgetLimit = document.getElementById('btnSaveBudgetLimit');
    const inputDailyBudgetLimit = document.getElementById('inputDailyBudgetLimit');

    // 2. Initialize Application
    initApp();

    function initApp() {
        setLiveDate();
        applyTheme(storage.getSettings().theme || 'dark');
        populateCategoryDropdowns();
        setDefaultFormDate();
        renderDashboard();
        setupEventListeners();

        // Listen for real-time data updates from Socket.IO
        window.addEventListener('finora_data_updated', () => {
            renderDashboard();
        });
    }

    // 3. Date & Time Formatter
    function setLiveDate() {
        const now = new Date();
        const options = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' };
        if (liveDateText) {
            liveDateText.textContent = now.toLocaleDateString('id-ID', options);
        }
    }

    function setDefaultFormDate() {
        const now = new Date();
        // Format to YYYY-MM-THH:mm for datetime-local input
        const nowIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        if (txDateInput) txDateInput.value = nowIso;
    }

    // 4. Format Money Utility
    function formatMoney(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    }

    // 5. Theme Switching
    function applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun text-amber"></i>';
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    }

    // 6. Category Select Population
    function populateCategoryDropdowns() {
        if (!txCategorySelect) return;
        txCategorySelect.innerHTML = '';
        const list = CATEGORIES[currentTxType] || [];
        list.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.name;
            opt.textContent = cat.name;
            txCategorySelect.appendChild(opt);
        });

        // Also populate filter category select
        if (filterCategory) {
            filterCategory.innerHTML = '<option value="ALL">Semua Kategori</option>';
            const allCats = [...CATEGORIES.expense, ...CATEGORIES.income];
            const uniqueCatNames = [...new Set(allCats.map(c => c.name))];
            uniqueCatNames.forEach(catName => {
                const opt = document.createElement('option');
                opt.value = catName;
                opt.textContent = catName;
                filterCategory.appendChild(opt);
            });
        }
    }

    // 7. Core Dashboard Render Engine
    function renderDashboard() {
        const transactions = storage.getTransactions();
        const settings = storage.getSettings();

        // Calculate Totals
        let totalIncome = 0;
        let totalExpense = 0;
        let countInc = 0;
        let countExp = 0;

        const todayStr = new Date().toISOString().split('T')[0];
        let todayExpense = 0;

        transactions.forEach(t => {
            const amount = parseFloat(t.amount) || 0;
            if (t.type === 'income') {
                totalIncome += amount;
                countInc++;
            } else {
                totalExpense += amount;
                countExp++;
                const tDateStr = new Date(t.date).toISOString().split('T')[0];
                if (tDateStr === todayStr) {
                    todayExpense += amount;
                }
            }
        });

        const netBalance = totalIncome - totalExpense;
        const savingsRatio = totalIncome > 0 ? Math.max(0, Math.round((netBalance / totalIncome) * 100)) : 0;

        // Render Overview Stat Cards
        valNetBalance.textContent = formatMoney(netBalance);
        badgeNetRatio.textContent = `+${savingsRatio}% rasio tabungan`;
        valTotalIncome.textContent = formatMoney(totalIncome);
        countIncomeTx.textContent = `${countInc} transaksi`;
        valTotalExpense.textContent = formatMoney(totalExpense);
        countExpenseTx.textContent = `${countExp} transaksi`;

        // Render Daily Budget Stats
        const dailyBudget = settings.dailyBudgetLimit || 150000;
        valDailyBudget.textContent = formatMoney(dailyBudget);
        valTodayExpense.textContent = `Hari ini: ${formatMoney(todayExpense)}`;

        const pctUsed = Math.min(100, Math.round((todayExpense / dailyBudget) * 100));
        dailyBudgetProgress.style.width = `${pctUsed}%`;

        const remaining = dailyBudget - todayExpense;
        if (remaining >= 0) {
            dailyBudgetProgress.classList.remove('danger');
            budgetStatusText.textContent = `Aman (${pctUsed}% terpakai)`;
            budgetRemainingText.textContent = `Sisa ${formatMoney(remaining)}`;
            budgetRemainingText.className = 'sub-text font-bold text-success';
        } else {
            dailyBudgetProgress.classList.add('danger');
            budgetStatusText.textContent = `Melebihi Limit (${pctUsed}% terpakai)`;
            budgetRemainingText.textContent = `Over ${formatMoney(Math.abs(remaining))}`;
            budgetRemainingText.className = 'sub-text font-bold text-danger';
        }

        // Render Charts
        const isDark = document.body.classList.contains('dark-theme');
        charts.updateCategoryChart(transactions, isDark);
        charts.updateTrendChart(transactions, isDark);

        // Render Breakdown List
        renderDailyBreakdown(transactions);
    }

    // 8. Auto Daily Breakdown Grouping & Table Render
    function renderDailyBreakdown(allTransactions) {
        if (!dailyBreakdownList) return;

        // Apply Active Filters
        let filtered = allTransactions.filter(t => {
            if (filters.keyword) {
                const kw = filters.keyword.toLowerCase();
                const matchTitle = t.title.toLowerCase().includes(kw);
                const matchCat = t.category.toLowerCase().includes(kw);
                const matchMethod = t.method.toLowerCase().includes(kw);
                const matchAmount = t.amount.toString().includes(kw);
                if (!matchTitle && !matchCat && !matchMethod && !matchAmount) return false;
            }
            if (filters.category !== 'ALL' && t.category !== filters.category) return false;
            if (filters.type !== 'ALL' && t.type !== filters.type) return false;
            if (filters.method !== 'ALL' && t.method !== filters.method) return false;
            return true;
        });

        if (filtered.length === 0) {
            dailyBreakdownList.innerHTML = `
                <div class="empty-chart-notice" style="display: flex; padding: 40px 20px;">
                    <i class="fa-solid fa-folder-open"></i>
                    <p>Tidak ada transaksi yang cocok dengan filter atau belum ada pencatatan.</p>
                </div>
            `;
            return;
        }

        // Group transactions by date string (YYYY-MM-DD)
        const groups = {};
        filtered.forEach(t => {
            const dateObj = new Date(t.date);
            const dateKey = dateObj.toISOString().split('T')[0];
            if (!groups[dateKey]) {
                groups[dateKey] = {
                    dateObj: dateObj,
                    dateKey: dateKey,
                    items: [],
                    subtotalIncome: 0,
                    subtotalExpense: 0
                };
            }
            groups[dateKey].items.push(t);
            if (t.type === 'income') {
                groups[dateKey].subtotalIncome += parseFloat(t.amount);
            } else {
                groups[dateKey].subtotalExpense += parseFloat(t.amount);
            }
        });

        // Sort date keys descending (newest day first)
        const sortedDateKeys = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

        let html = '';
        sortedDateKeys.forEach(dateKey => {
            const group = groups[dateKey];
            const displayDateStr = group.dateObj.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            // Check if today
            const isToday = dateKey === new Date().toISOString().split('T')[0];
            const dateBadgeHtml = isToday ? `<span class="badge badge-primary" style="margin-left: 8px;">Hari Ini</span>` : '';

            html += `
                <div class="daily-group">
                    <div class="daily-group-header">
                        <div class="daily-date-title">
                            <i class="fa-regular fa-calendar text-primary"></i>
                            <span>${displayDateStr}</span> ${dateBadgeHtml}
                        </div>
                        <div class="daily-subtotals">
                            ${group.subtotalIncome > 0 ? `<span class="text-success">+${formatMoney(group.subtotalIncome)}</span>` : ''}
                            ${group.subtotalExpense > 0 ? `<span class="text-danger">-${formatMoney(group.subtotalExpense)}</span>` : ''}
                        </div>
                    </div>
                    <table class="daily-tx-table">
                        <thead>
                            <tr>
                                <th>Jam</th>
                                <th>Keterangan Item</th>
                                <th>Kategori</th>
                                <th>Metode</th>
                                <th style="text-align: right;">Jumlah</th>
                                <th style="width: 40px;"></th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            group.items.forEach(item => {
                const timeStr = new Date(item.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                const isInc = item.type === 'income';

                html += `
                    <tr>
                        <td style="color: var(--text-muted); font-size: 12px;">${timeStr}</td>
                        <td style="font-weight: 600;">${escapeHtml(item.title)}</td>
                        <td>
                            <span class="cat-pill">
                                <i class="fa-solid ${getCategoryIcon(item.category)}"></i>
                                ${escapeHtml(item.category)}
                            </span>
                        </td>
                        <td><span class="method-pill">${escapeHtml(item.method)}</span></td>
                        <td style="text-align: right;" class="${isInc ? 'amount-income' : 'amount-expense'}">
                            ${isInc ? '+' : '-'}${formatMoney(item.amount)}
                        </td>
                        <td style="text-align: center;">
                            <button class="action-btn-del" data-id="${item.id}" title="Hapus Transaksi">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });

        dailyBreakdownList.innerHTML = html;
    }

    // Utility: Category Icon Lookup
    function getCategoryIcon(catName) {
        const all = [...CATEGORIES.expense, ...CATEGORIES.income];
        const found = all.find(c => c.name === catName);
        return found ? found.icon : 'fa-tag';
    }

    function escapeHtml(str) {
        return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    // 9. Toast Notification Handler
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'warning') icon = 'fa-triangle-exclamation';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 10. Event Listeners Wiring
    function setupEventListeners() {

        // Theme Toggle
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                const current = document.body.classList.contains('light-theme') ? 'light' : 'dark';
                const nextTheme = current === 'dark' ? 'light' : 'dark';
                applyTheme(nextTheme);
                storage.saveSettings({ theme: nextTheme });
                renderDashboard();
            });
        }

        // Toggle Manual Form Type (Expense / Income)
        if (btnToggleExpense && btnToggleIncome) {
            btnToggleExpense.addEventListener('click', () => {
                currentTxType = 'expense';
                txTypeInput.value = 'expense';
                btnToggleExpense.className = 'toggle-btn active-expense';
                btnToggleIncome.className = 'toggle-btn';
                populateCategoryDropdowns();
            });
            btnToggleIncome.addEventListener('click', () => {
                currentTxType = 'income';
                txTypeInput.value = 'income';
                btnToggleIncome.className = 'toggle-btn active-income';
                btnToggleExpense.className = 'toggle-btn';
                populateCategoryDropdowns();
            });
        }

        // Smart Natural Text Parser Submission
        if (smartParserForm) {
            smartParserForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const text = smartInputText.value;
                if (!text) return;

                const parsed = parser.parse(text);
                if (parsed && parsed.amount > 0) {
                    storage.addTransaction(parsed);
                    smartInputText.value = '';
                    renderDashboard();
                    showToast(`Otomatis dicatat: ${parsed.title} (${formatMoney(parsed.amount)})`, 'success');
                } else {
                    showToast('Harap sertakan jumlah nominal uang (misal: 25rb atau 50000)', 'warning');
                }
            });
        }

        // Clickable Smart Hints
        document.querySelectorAll('.chip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const hint = btn.getAttribute('data-hint');
                if (smartInputText && hint) {
                    smartInputText.value = hint;
                    smartInputText.focus();
                }
            });
        });

        // Quick Payment Simulator Buttons
        document.querySelectorAll('.sim-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const title = btn.getAttribute('data-title');
                const amount = parseFloat(btn.getAttribute('data-amount'));
                const category = btn.getAttribute('data-cat');
                const method = btn.getAttribute('data-method');
                const type = btn.getAttribute('data-type');

                const newTx = storage.addTransaction({
                    title,
                    amount,
                    category,
                    method,
                    type,
                    date: new Date().toISOString()
                });

                renderDashboard();
                showToast(`Pembayaran Otomatis: ${title} (${formatMoney(amount)})`, 'success');
            });
        });

        // Manual Transaction Form Submit
        if (manualTxForm) {
            manualTxForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const amount = parseFloat(txAmountInput.value);
                const title = txTitleInput.value;
                const category = txCategorySelect.value;
                const method = txMethodSelect.value;
                const type = txTypeInput.value;
                const date = txDateInput.value ? new Date(txDateInput.value).toISOString() : new Date().toISOString();

                if (!amount || amount <= 0) {
                    showToast('Jumlah nominal harus lebih dari 0', 'warning');
                    return;
                }

                storage.addTransaction({
                    title,
                    amount,
                    category,
                    method,
                    type,
                    date
                });

                // Reset title and amount
                txAmountInput.value = '';
                txTitleInput.value = '';
                setDefaultFormDate();

                renderDashboard();
                showToast('Transaksi berhasil disimpan ke perincian!', 'success');
            });
        }

        // Delete Transaction Event Delegation
        if (dailyBreakdownList) {
            dailyBreakdownList.addEventListener('click', (e) => {
                const delBtn = e.target.closest('.action-btn-del');
                if (delBtn) {
                    const id = delBtn.getAttribute('data-id');
                    if (id && confirm('Apakah Anda yakin ingin menghapus transaksi ini dari perincian?')) {
                        storage.deleteTransaction(id);
                        renderDashboard();
                        showToast('Transaksi telah dihapus.', 'info');
                    }
                }
            });
        }

        // Filter Event Controls
        if (searchKeyword) {
            searchKeyword.addEventListener('input', (e) => {
                filters.keyword = e.target.value;
                renderDashboard();
            });
        }

        if (filterCategory) {
            filterCategory.addEventListener('change', (e) => {
                filters.category = e.target.value;
                renderDashboard();
            });
        }

        if (filterType) {
            filterType.addEventListener('change', (e) => {
                filters.type = e.target.value;
                renderDashboard();
            });
        }

        if (filterMethod) {
            filterMethod.addEventListener('change', (e) => {
                filters.method = e.target.value;
                renderDashboard();
            });
        }

        if (btnResetFilters) {
            btnResetFilters.addEventListener('click', () => {
                filters = { keyword: '', category: 'ALL', type: 'ALL', method: 'ALL' };
                if (searchKeyword) searchKeyword.value = '';
                if (filterCategory) filterCategory.value = 'ALL';
                if (filterType) filterType.value = 'ALL';
                if (filterMethod) filterMethod.value = 'ALL';
                renderDashboard();
            });
        }

        // Sample Data Button
        if (btnLoadSample) {
            btnLoadSample.addEventListener('click', () => {
                storage.loadSampleData();
                renderDashboard();
                showToast('Data sampel transaksi berhasil dimuat!', 'success');
            });
        }

        // CSV Export Button
        if (btnExportData) {
            btnExportData.addEventListener('click', () => {
                const csvData = storage.exportToCSV();
                if (!csvData) {
                    showToast('Belum ada transaksi untuk diekspor.', 'warning');
                    return;
                }
                const link = document.createElement('a');
                link.setAttribute('href', csvData);
                link.setAttribute('download', `Finora_Laporan_Keuangan_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                showToast('Laporan CSV berhasil diunduh!', 'success');
            });
        }

        // Budget Settings Modal Event
        if (btnSetBudget && budgetModal) {
            btnSetBudget.addEventListener('click', () => {
                const settings = storage.getSettings();
                inputDailyBudgetLimit.value = settings.dailyBudgetLimit || 150000;
                budgetModal.classList.add('active');
            });
        }

        const closeModal = () => {
            if (budgetModal) budgetModal.classList.remove('active');
        };

        if (btnCloseBudgetModal) btnCloseBudgetModal.addEventListener('click', closeModal);
        if (btnCancelBudget) btnCancelBudget.addEventListener('click', closeModal);

        if (btnSaveBudgetLimit) {
            btnSaveBudgetLimit.addEventListener('click', () => {
                const limit = parseFloat(inputDailyBudgetLimit.value);
                if (limit && limit > 0) {
                    storage.saveSettings({ dailyBudgetLimit: limit });
                    closeModal();
                    renderDashboard();
                    showToast(`Batas harian diperbarui: ${formatMoney(limit)}`, 'success');
                } else {
                    showToast('Harap masukkan angka batas yang valid.', 'warning');
                }
            });
        }

        // Lock App Header Button
        const btnLockApp = document.getElementById('btnLockApp');
        if (btnLockApp) {
            btnLockApp.addEventListener('click', () => {
                if (window.authManager) {
                    window.authManager.lockApp();
                }
            });
        }

        // Change PIN Modal Handlers
        const btnOpenChangePin = document.getElementById('btnOpenChangePin');
        const changePinModal = document.getElementById('changePinModal');
        const btnCloseChangePinModal = document.getElementById('btnCloseChangePinModal');
        const btnCancelChangePin = document.getElementById('btnCancelChangePin');
        const btnSaveNewPin = document.getElementById('btnSaveNewPin');
        const inputOldPin = document.getElementById('inputOldPin');
        const inputNewPin = document.getElementById('inputNewPin');
        const inputConfirmNewPin = document.getElementById('inputConfirmNewPin');

        if (btnOpenChangePin && changePinModal) {
            btnOpenChangePin.addEventListener('click', () => {
                if (inputOldPin) inputOldPin.value = '';
                if (inputNewPin) inputNewPin.value = '';
                if (inputConfirmNewPin) inputConfirmNewPin.value = '';
                changePinModal.classList.add('active');
            });
        }

        const closeChangePinModal = () => {
            if (changePinModal) changePinModal.classList.remove('active');
        };

        if (btnCloseChangePinModal) btnCloseChangePinModal.addEventListener('click', closeChangePinModal);
        if (btnCancelChangePin) btnCancelChangePin.addEventListener('click', closeChangePinModal);

        if (btnSaveNewPin) {
            btnSaveNewPin.addEventListener('click', async () => {
                const oldPin = inputOldPin.value.trim();
                const newPin = inputNewPin.value.trim();
                const confirmNewPin = inputConfirmNewPin.value.trim();

                if (!oldPin) {
                    showToast('Please enter your current passcode.', 'warning');
                    return;
                }
                if (newPin.length < 4) {
                    showToast('New passcode must be at least 4 characters.', 'warning');
                    return;
                }
                if (newPin !== confirmNewPin) {
                    showToast('New passcode confirmation does not match.', 'warning');
                    return;
                }

                try {
                    if (window.authManager) {
                        await window.authManager.changePin(oldPin, newPin);
                        closeChangePinModal();
                        showToast('Security passcode updated successfully!', 'success');
                    }
                } catch (err) {
                    showToast(err.message || 'Failed to update passcode.', 'warning');
                }
            });
        }
    }
});
