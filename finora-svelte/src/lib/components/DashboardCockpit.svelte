<script>
  import {
    transactions,
    wallets,
    walletMetrics,
    budgets,
    goals,
    subscriptions,
    debts,
    summaryMetrics,
    categoryBreakdown,
    activeTab,
    currency,
    formatCurrency,
    isPrivacyMode
  } from '../stores.js';
  import AiSmartInput from './AiSmartInput.svelte';

  export let onQuickAdd = (type) => {};
  export let onEditTransaction = (tx) => {};

  let activityFilter = 'all'; // 'all' | 'expense' | 'income'
  let selectedWalletId = 'all'; // 'all' | specific wallet id

  // Category Icon & Color Mapping
  const categoryMeta = {
    'Makanan & Minuman': { icon: 'fa-utensils', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
    'Transportasi': { icon: 'fa-car', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
    'Belanja': { icon: 'fa-bag-shopping', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
    'Hiburan': { icon: 'fa-gamepad', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
    'Tagihan & Utilitas': { icon: 'fa-bolt', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    'Kesehatan': { icon: 'fa-heart-pulse', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    'Pendidikan': { icon: 'fa-graduation-cap', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    'Gaji': { icon: 'fa-money-bill-wave', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    'Investasi': { icon: 'fa-chart-line', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
    'Freelance & Bisnis': { icon: 'fa-laptop-code', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
    'Bonus & Hadiah': { icon: 'fa-gift', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    'Pelunasan Piutang': { icon: 'fa-handshake-angle', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    'Pembayaran Hutang': { icon: 'fa-handshake', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.15)' },
    'Transfer Saldo': { icon: 'fa-arrow-right-arrow-left', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' }
  };

  function getCatMeta(cat) {
    return categoryMeta[cat] || { icon: 'fa-wallet', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
  }

  // Monthly Cash Flow
  $: income = $summaryMetrics.totalIncome;
  $: expense = $summaryMetrics.totalExpense;
  $: savingsRate = $summaryMetrics.savingsRate;

  // Real Multi-Wallet Total Balance (Seluruh Saldo Riil)
  $: totalWalletsBalance = $walletMetrics.totalBalance;

  // Active selected wallet
  $: activeWallet = selectedWalletId === 'all'
    ? null
    : ($wallets || []).find((w) => w.id === selectedWalletId);

  // Dynamic balance displayed in the card
  $: displayedBalance = selectedWalletId === 'all'
    ? totalWalletsBalance
    : (activeWallet ? Number(activeWallet.balance) || 0 : totalWalletsBalance);

  // Smart wallet classifier for asset breakdown mix
  function getWalletCategory(w) {
    const t = (w.type || '').toLowerCase();
    const name = (w.name || '').toLowerCase();
    const badge = (w.badge || '').toLowerCase();

    if (
      t === 'ewallet' ||
      t === 'e-wallet' ||
      t === 'digital' ||
      name.includes('gopay') ||
      name.includes('shopee') ||
      name.includes('ovo') ||
      name.includes('dana') ||
      name.includes('linkaja') ||
      badge.includes('gopay') ||
      badge.includes('spay')
    ) {
      return 'ewallet';
    }
    if (
      t === 'cash' ||
      t === 'tunai' ||
      name.includes('tunai') ||
      name.includes('cash') ||
      name.includes('saku') ||
      badge.includes('tunai')
    ) {
      return 'cash';
    }
    return 'bank';
  }

  // Group balances by type with smart fallback
  $: bankTotal = ($wallets || []).filter((w) => getWalletCategory(w) === 'bank').reduce((sum, w) => sum + (Number(w.balance) || 0), 0);
  $: ewalletTotal = ($wallets || []).filter((w) => getWalletCategory(w) === 'ewallet').reduce((sum, w) => sum + (Number(w.balance) || 0), 0);
  $: cashTotal = ($wallets || []).filter((w) => getWalletCategory(w) === 'cash').reduce((sum, w) => sum + (Number(w.balance) || 0), 0);

  // Filtered recent transactions (max 5)
  $: filteredRecent = $transactions
    .filter((t) => (activityFilter === 'all' ? true : t.type === activityFilter))
    .slice(0, 5);

  // Wallets
  $: displayWallets = $wallets.slice(0, 3);

  // Budget calculations
  $: rawBudgetLimit = $budgets.reduce((sum, b) => sum + (Number(b.monthly_limit) || 0), 0);
  // If user hasn't set budgets yet, provide intelligent dynamic estimation based on income
  $: totalBudgetLimit = rawBudgetLimit > 0 ? rawBudgetLimit : Math.max(income * 0.75, 20000000);
  $: isCustomBudget = rawBudgetLimit > 0;
  $: budgetPercent = totalBudgetLimit > 0 ? Math.min(100, Math.round((expense / totalBudgetLimit) * 100)) : 0;
  $: budgetRemaining = Math.max(0, totalBudgetLimit - expense);

  // Top spending categories (fixed array access)
  $: topCategories = ($categoryBreakdown && Array.isArray($categoryBreakdown) && $categoryBreakdown.length > 0)
    ? $categoryBreakdown.slice(0, 4)
    : [];

  // Top Goal
  $: activeGoal = ($goals && $goals.length > 0)
    ? $goals[0]
    : { name: 'Dana Darurat 6 Bulan', current_amount: 12500000, target_amount: 30000000, icon: '🛡️' };
  $: goalPercent = activeGoal
    ? Math.min(100, Math.round(((Number(activeGoal.current_amount) || 0) / (Number(activeGoal.target_amount) || 1)) * 100))
    : 0;

  // Upcoming Bills (Unpaid subscriptions)
  $: unpaidSubs = ($subscriptions && $subscriptions.length > 0)
    ? $subscriptions.filter((s) => !s.isPaidThisMonth).slice(0, 2)
    : [];

  // Financial Health Score simulation (0-100)
  $: healthScore = Math.min(100, Math.max(20, Math.round((savingsRate * 0.5) + (Math.max(0, 100 - budgetPercent) * 0.5))));

  // Today's greeting formatted
  const todayDateStr = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  function togglePrivacy() {
    isPrivacyMode.update((v) => !v);
  }
</script>

<div class="cockpit-wrapper">
  <!-- Multi-layered Ambient Aurora Halos -->
  <div class="ambient-glow glow-1"></div>
  <div class="ambient-glow glow-2"></div>
  <div class="ambient-glow glow-3"></div>

  <!-- ========================================================================= -->
  <!-- TOP WELCOME & REALTIME TELEMETRY BAR                                      -->
  <!-- ========================================================================= -->
  <div class="cockpit-top-bar">
    <div class="welcome-badge-group">
      <div class="avatar-finora">
        <i class="fa-solid fa-gem"></i>
      </div>
      <div class="welcome-text-wrap">
        <h2 class="welcome-title">
          Halo, Selamat Datang Kembali <span class="wave-emoji">👋</span>
        </h2>
        <p class="welcome-subtitle">
          Ringkasan Finansial Realtime &bull; {todayDateStr}
        </p>
      </div>
    </div>

    <div class="telemetry-pill-group">
      <button
        class="telemetry-pill privacy-btn"
        on:click={togglePrivacy}
        title={$isPrivacyMode ? 'Tampilkan Nominal Saldo' : 'Sembunyikan Saldo (Mode Privasi)'}
      >
        <i class="fa-solid {$isPrivacyMode ? 'fa-eye' : 'fa-eye-slash'}"></i>
        <span class="pill-text">{$isPrivacyMode ? 'Buka Saldo' : 'Sembunyikan'}</span>
      </button>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- 1. HERO MULTI-WALLET COCKPIT & TELEMETRY FLOW CARDS                       -->
  <!-- ========================================================================= -->
  <section class="hero-section">
    <!-- Left Column: Multi-Wallet Interactive Hub -->
    <div class="wealth-hub-column">
      
      <!-- Interactive Wallet Filter / Account Selector Track -->
      <div class="wallet-nav-scroller">
        <!-- Tab: Semua Saldo (Grand Total) -->
        <button
          class="wallet-tab-pill"
          class:active={selectedWalletId === 'all'}
          on:click={() => (selectedWalletId = 'all')}
          title="Tampilkan total seluruh saldo yang Anda miliki"
        >
          <div class="pill-icon-dot gold">
            <i class="fa-solid fa-layer-group"></i>
          </div>
          <div class="pill-text-block">
            <span class="pill-title">Semua Saldo</span>
            <span class="pill-amount">
              {$isPrivacyMode ? '••••••' : formatCurrency(totalWalletsBalance, $currency)}
            </span>
          </div>
        </button>

        <!-- Individual Wallet Tabs -->
        {#each $wallets as w}
          <button
            class="wallet-tab-pill"
            class:active={selectedWalletId === w.id}
            on:click={() => (selectedWalletId = w.id)}
            title="Klik untuk melihat saldo spesifik {w.name}"
          >
            <div class="pill-icon-dot" style="background: {w.gradient || '#2563eb'};">
              <i class="fa-solid {w.icon || 'fa-wallet'}"></i>
            </div>
            <div class="pill-text-block">
              <span class="pill-title">{w.name}</span>
              <span class="pill-amount">
                {$isPrivacyMode ? '••••••' : formatCurrency(w.balance, $currency)}
              </span>
            </div>
          </button>
        {/each}

        <!-- Quick CTA: Tambah/Kelola Akun -->
        <button class="wallet-tab-pill add-btn" on:click={() => ($activeTab = 'wallets')} title="Buka manajemen dompet & rekening">
          <i class="fa-solid fa-plus"></i>
          <span>Kelola Akun</span>
        </button>
      </div>

      <!-- Main Titanium Wealth Card (Dynamic per Wallet or Grand Total) -->
      <div
        class="luxury-titanium-card"
        style={activeWallet && activeWallet.gradient ? `background: ${activeWallet.gradient};` : ''}
      >
        <div class="card-sheen-layer"></div>
        <div class="card-hologram-mesh"></div>

        <!-- Card Top: EMV Chip, NFC & Emblems -->
        <div class="card-header-row">
          <div class="chip-nfc-wrap">
            <!-- Photorealistic EMV Gold Chip -->
            <div class="emv-gold-chip" title="Finora Secure EMV Chip">
              <svg viewBox="0 0 52 40" fill="none" class="chip-svg" xmlns="http://www.w3.org/2000/svg">
                <rect width="52" height="40" rx="7" fill="url(#goldGradient)" />
                <rect x="2" y="2" width="48" height="36" rx="5" stroke="#78350f" stroke-width="0.8" opacity="0.6"/>
                <path d="M0 20H52M26 0V40M13 0V20M39 0V20M13 20V40M39 20V40" stroke="#78350f" stroke-width="1.2" opacity="0.75"/>
                <rect x="20" y="14" width="12" height="12" rx="3" fill="#fef08a" stroke="#b45309" stroke-width="1"/>
                <defs>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="52" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#fef08a" />
                    <stop offset="0.3" stop-color="#f59e0b" />
                    <stop offset="0.7" stop-color="#d97706" />
                    <stop offset="1" stop-color="#78350f" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <!-- Contactless NFC Wave Icon -->
            <svg class="nfc-waves" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <path d="M8.5 16.5a5 5 0 0 1 0-9"/>
              <path d="M12 19a8.5 8.5 0 0 1 0-14"/>
              <path d="M15.5 21.5a12 12 0 0 1 0-19"/>
            </svg>

            <span class="card-tier-text">
              {#if activeWallet}
                {activeWallet.name.toUpperCase()} &bull; {activeWallet.badge || activeWallet.type.toUpperCase()}
              {:else}
                FINORA TITANIUM MULTI-WALLET HUB
              {/if}
            </span>
          </div>
        </div>

        <!-- Card Center: Big Balance (Grand Total or Selected Wallet) -->
        <div class="card-balance-center">
          <span class="balance-sub-label">
            {#if activeWallet}
              SALDO TERSEDIA DI {activeWallet.name.toUpperCase()}
            {:else}
              TOTAL SELURUH SALDO (SEMUA REKENING & DOMPET)
            {/if}
          </span>
          <div class="balance-display-row">
            {#if $isPrivacyMode}
              <span class="balance-amount masked">Rp &bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</span>
            {:else}
              <span class="balance-amount {displayedBalance < 0 ? 'negative' : ''}">
                {formatCurrency(displayedBalance, $currency)}
              </span>
            {/if}

            <button class="peek-eye-btn" on:click={togglePrivacy} title="Klik untuk mengintip/sembunyikan nominal">
              <i class="fa-solid {$isPrivacyMode ? 'fa-eye' : 'fa-eye-slash'}"></i>
            </button>
          </div>

          <!-- If viewing ALL wallets, display breakdown pills (Bank, E-Wallet, Tunai) -->
          {#if selectedWalletId === 'all'}
            <div class="wallet-asset-mix-row">
              <div class="asset-mix-pill" title="Total Saldo di Seluruh Rekening Bank">
                <div class="mix-header">
                  <i class="fa-solid fa-building-columns icon-blue"></i>
                  <span class="mix-label">Bank</span>
                </div>
                <strong class="mix-val">{$isPrivacyMode ? '••••' : formatCurrency(bankTotal, $currency)}</strong>
              </div>
              <div class="asset-mix-pill" title="Total Saldo di E-Wallet & QRIS">
                <div class="mix-header">
                  <i class="fa-solid fa-wallet icon-emerald"></i>
                  <span class="mix-label">E-Wallet</span>
                </div>
                <strong class="mix-val">{$isPrivacyMode ? '••••' : formatCurrency(ewalletTotal, $currency)}</strong>
              </div>
              <div class="asset-mix-pill" title="Uang Tunai Fisik">
                <div class="mix-header">
                  <i class="fa-solid fa-money-bill-wave icon-amber"></i>
                  <span class="mix-label">Tunai</span>
                </div>
                <strong class="mix-val">{$isPrivacyMode ? '••••' : formatCurrency(cashTotal, $currency)}</strong>
              </div>
            </div>
          {/if}
        </div>

        <!-- Card Details: Card Number / Account Number & Cardholder -->
        <div class="card-embossed-details">
          <div class="card-number-embossed">
            {#if activeWallet && activeWallet.accountNumber}
              <span>{activeWallet.accountNumber}</span>
            {:else}
              <span>4219</span>
              <span>&bull;&bull;&bull;&bull;</span>
              <span>&bull;&bull;&bull;&bull;</span>
              <span>8892</span>
            {/if}
          </div>

          <div class="cardholder-group">
            <!-- Dual Intersecting Hologram Rings -->
            <div class="hologram-circles">
              <div class="holo-ring ring-violet"></div>
              <div class="holo-ring ring-cyan"></div>
            </div>
          </div>
        </div>

        <!-- Card Bottom: Savings Meter & Quick Action Buttons -->
        <div class="card-footer-action-row">
          <div class="savings-telemetry">
            <div class="meter-text-row">
              <span class="meter-desc">Rasio Tabungan Bulan Ini</span>
              <span class="meter-pct-badge">{savingsRate}%</span>
            </div>
            <div class="meter-progress-track">
              <div class="meter-progress-fill" style="width: {Math.max(5, savingsRate)}%;"></div>
            </div>
          </div>

          <!-- Indestructible 2-tier Action Buttons (Pemasukan & Pengeluaran 50/50, Transfer Full) -->
          <div class="card-cta-group">
            <div class="cta-primary-row">
              <button class="cta-pill-btn income" on:click={() => onQuickAdd('income')}>
                <div class="btn-icon-wrap"><i class="fa-solid fa-arrow-down"></i></div>
                <span>Pemasukan</span>
              </button>
              <button class="cta-pill-btn expense" on:click={() => onQuickAdd('expense')}>
                <div class="btn-icon-wrap"><i class="fa-solid fa-arrow-up"></i></div>
                <span>Pengeluaran</span>
              </button>
            </div>
            <button class="cta-pill-btn transfer full-width" on:click={() => ($activeTab = 'wallets')}>
              <div class="btn-icon-wrap"><i class="fa-solid fa-arrow-right-arrow-left"></i></div>
              <span>Transfer Antar Rekening & Dompet</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Column: Pemasukan & Pengeluaran Telemetry Flow Cards -->
    <div class="side-flow-container">
      <!-- Income Flow Card -->
      <div class="telemetry-flow-card income-side-card">
        <div class="flow-card-sheen"></div>
        <div class="flow-card-header">
          <div class="flow-icon-circle success">
            <i class="fa-solid fa-arrow-trend-up"></i>
          </div>
          <div class="flow-badge success">
            <span class="flow-dot success"></span>
            <span>+ Arus Masuk</span>
          </div>
        </div>

        <div class="flow-card-body">
          <span class="flow-card-label">Pemasukan Bulan Ini</span>
          <div class="flow-card-amount success">
            {$isPrivacyMode ? '••••••••' : `+${formatCurrency(income, $currency)}`}
          </div>
        </div>

        <!-- Decorative upward momentum wave -->
        <svg class="flow-sparkline-svg" viewBox="0 0 160 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 32C30 30 50 18 80 16C110 14 130 5 160 2" stroke="url(#greenWave)" stroke-width="2.5" stroke-linecap="round"/>
          <defs>
            <linearGradient id="greenWave" x1="0" y1="0" x2="160" y2="0" gradientUnits="userSpaceOnUse">
              <stop stop-color="#10b981" stop-opacity="0.3"/>
              <stop offset="0.5" stop-color="#10b981" stop-opacity="0.8"/>
              <stop offset="1" stop-color="#34d399"/>
            </linearGradient>
          </defs>
        </svg>

        <div class="flow-card-footer">
          <div class="flow-caption-block">
            <span class="caption-label">Arus Kas</span>
            <span class="caption-desc">Gaji, freelance & bisnis</span>
          </div>
        </div>
      </div>

      <!-- Expense Flow Card -->
      <div class="telemetry-flow-card expense-side-card">
        <div class="flow-card-sheen"></div>
        <div class="flow-card-header">
          <div class="flow-icon-circle danger">
            <i class="fa-solid fa-arrow-trend-down"></i>
          </div>
          <div class="flow-badge danger">
            <span class="flow-dot danger"></span>
            <span>- Arus Keluar</span>
          </div>
        </div>

        <div class="flow-card-body">
          <span class="flow-card-label">Pengeluaran Bulan Ini</span>
          <div class="flow-card-amount danger">
            {$isPrivacyMode ? '••••••••' : `-${formatCurrency(expense, $currency)}`}
          </div>
        </div>

        <!-- Decorative expense wave -->
        <svg class="flow-sparkline-svg" viewBox="0 0 160 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 8C30 12 50 20 80 24C110 28 130 32 160 34" stroke="url(#redWave)" stroke-width="2.5" stroke-linecap="round"/>
          <defs>
            <linearGradient id="redWave" x1="0" y1="0" x2="160" y2="0" gradientUnits="userSpaceOnUse">
              <stop stop-color="#f43f5e" stop-opacity="0.3"/>
              <stop offset="0.5" stop-color="#f43f5e" stop-opacity="0.8"/>
              <stop offset="1" stop-color="#fb7185"/>
            </linearGradient>
          </defs>
        </svg>

        <div class="flow-card-footer">
          <div class="flow-caption-block">
            <span class="caption-label">Sisa Kuota Belanja</span>
            <span class="caption-val">{$isPrivacyMode ? '••••••' : formatCurrency(budgetRemaining, $currency)}</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ========================================================================= -->
  <!-- 2. FLOATING QUICK LAUNCHER DOCK (6 PINTASAN INTERAKTIF APPLE-STYLE)        -->
  <!-- ========================================================================= -->
  <section class="launcher-dock-container">
    <div class="dock-glass-capsule">
      <!-- 1. Scan Struk AI -->
      <button class="dock-app-item" on:click={() => ($activeTab = 'scanner')} title="Buka Kamera Scan Struk OCR">
        <div class="app-icon-squircle cyan">
          <i class="fa-solid fa-camera-viewfinder"></i>
          <span class="app-glow-reflection"></span>
        </div>
        <div class="app-meta">
          <span class="app-name">Scan Struk AI</span>
          <span class="app-desc">Auto OCR Kertas</span>
        </div>
      </button>

      <!-- 2. Split Bill -->
      <button class="dock-app-item" on:click={() => ($activeTab = 'splitbill')} title="Kalkulator Patungan Teman & Pajak">
        <div class="app-icon-squircle amber">
          <i class="fa-solid fa-receipt"></i>
          <span class="app-glow-reflection"></span>
        </div>
        <div class="app-meta">
          <span class="app-name">Split Bill</span>
          <span class="app-desc">Patungan & Pajak</span>
        </div>
      </button>

      <!-- 3. Multi-Dompet -->
      <button class="dock-app-item" on:click={() => ($activeTab = 'wallets')} title="Kelola Rekening Bank, E-Wallet & Tunai">
        <div class="app-icon-squircle indigo">
          <i class="fa-solid fa-wallet"></i>
          <span class="app-glow-reflection"></span>
        </div>
        <div class="app-meta">
          <span class="app-name">Multi-Dompet</span>
          <span class="app-desc">{$wallets.length} Akun Terdaftar</span>
        </div>
      </button>

      <!-- 4. Langganan -->
      <button class="dock-app-item" on:click={() => ($activeTab = 'subscriptions')} title="Pengingat Tagihan & Langganan Rutin">
        <div class="app-icon-squircle pink">
          <i class="fa-solid fa-arrows-rotate"></i>
          <span class="app-glow-reflection"></span>
        </div>
        <div class="app-meta">
          <span class="app-name">Langganan</span>
          <span class="app-desc">Tagihan Rutin</span>
        </div>
      </button>

      <!-- 5. Hutang & Pinjaman -->
      <button class="dock-app-item" on:click={() => ($activeTab = 'debts')} title="Catatan Piutang Teman & Pinjaman">
        <div class="app-icon-squircle emerald">
          <i class="fa-solid fa-handshake"></i>
          <span class="app-glow-reflection"></span>
        </div>
        <div class="app-meta">
          <span class="app-name">Hutang Piutang</span>
          <span class="app-desc">Jatuh Tempo</span>
        </div>
      </button>

      <!-- 6. Slip & PDF -->
      <button class="dock-app-item" on:click={() => ($activeTab = 'report')} title="Cetak Slip & Laporan Keuangan PDF Resmi">
        <div class="app-icon-squircle purple">
          <i class="fa-solid fa-file-invoice-dollar"></i>
          <span class="app-glow-reflection"></span>
        </div>
        <div class="app-meta">
          <span class="app-name">Slip & PDF</span>
          <span class="app-desc">Laporan Resmi</span>
        </div>
      </button>
    </div>
  </section>

  <!-- ========================================================================= -->
  <!-- 3. FINORA AI NATURAL LANGUAGE COPILOT BAR                                 -->
  <!-- ========================================================================= -->
  <section class="ai-copilot-section">
    <AiSmartInput />
  </section>

  <!-- ========================================================================= -->
  <!-- 4. EXECUTIVE BENTO MATRIX (4 KARTU BERBOBOT TINGGI & SEIMBANG)             -->
  <!-- ========================================================================= -->
  <section class="bento-matrix-grid">
    
    <!-- BENTO 1: Pos Belanja Terbesar (Top Spending) -->
    <div class="bento-glass-tile">
      <div class="tile-top-row">
        <div class="tile-header-left">
          <div class="tile-category-icon orange">
            <i class="fa-solid fa-chart-pie"></i>
          </div>
          <div>
            <h4 class="tile-main-title">Distribusi Pengeluaran</h4>
            <p class="tile-sub-title">Pos paling dominan menyerap anggaran</p>
          </div>
        </div>
        <button class="tile-action-link" on:click={() => ($activeTab = 'breakdown')}>
          <span>Detail</span> <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      <div class="tile-body-content">
        {#if topCategories.length === 0}
          <div class="empty-state-wrap">
            <div class="empty-icon-box">
              <i class="fa-solid fa-receipt"></i>
            </div>
            <p class="empty-label">Belum ada pengeluaran yang tercatat bulan ini</p>
            <button class="btn-micro-action" on:click={() => onQuickAdd('expense')}>
              + Catat Pengeluaran Pertama
            </button>
          </div>
        {:else}
          <div class="category-breakdown-list">
            {#each topCategories as item}
              {@const meta = getCatMeta(item.category)}
              <div class="cat-stat-row">
                <div class="cat-stat-header">
                  <div class="cat-name-box">
                    <span class="cat-color-dot" style="background: {item.color || meta.color}; box-shadow: 0 0 10px {item.color || meta.color};"></span>
                    <i class="fa-solid {meta.icon} cat-inline-icon" style="color: {item.color || meta.color};"></i>
                    <span class="cat-name-text">{item.category}</span>
                  </div>
                  <div class="cat-val-box">
                    <span class="cat-val-amount">
                      {$isPrivacyMode ? '••••••' : formatCurrency(item.amount, $currency)}
                    </span>
                    <span class="cat-val-percentage" style="background: {item.color || meta.color}22; color: {item.color || meta.color}; border: 1px solid {item.color || meta.color}55;">
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                <div class="cat-progress-track">
                  <div
                    class="cat-progress-fill"
                    style="width: {item.percentage}%; background: linear-gradient(90deg, {item.color || meta.color}88 0%, {item.color || meta.color} 100%); box-shadow: 0 0 8px {item.color || meta.color}66;"
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- BENTO 2: Rekening & Dompet Aktif (Live Balances) -->
    <div class="bento-glass-tile">
      <div class="tile-top-row">
        <div class="tile-header-left">
          <div class="tile-category-icon blue">
            <i class="fa-solid fa-building-columns"></i>
          </div>
          <div>
            <h4 class="tile-main-title">Dompet & Rekening</h4>
            <p class="tile-sub-title">Saldo aktif di dompet pilihan Anda</p>
          </div>
        </div>
        <button class="tile-action-link" on:click={() => ($activeTab = 'wallets')}>
          <span>Semua ({$wallets.length})</span> <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      <div class="tile-body-content">
        <div class="wallets-compact-stream">
          {#each displayWallets as w}
            <div
              class="wallet-row-item"
              on:click={() => {
                selectedWalletId = w.id;
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              role="button"
              tabindex="0"
              title="Pilih {w.name} di Kartu Utama"
            >
              <div class="wallet-left-info">
                <div class="wallet-icon-squircle" style="background: {w.gradient || '#2563eb'};">
                  <i class="fa-solid {w.icon || 'fa-wallet'}"></i>
                </div>
                <div class="wallet-name-wrap">
                  <span class="wallet-name-title">{w.name}</span>
                  <span class="wallet-type-badge">{w.badge || w.type.toUpperCase()}</span>
                </div>
              </div>

              <div class="wallet-right-balance">
                <span class="wallet-balance-num">
                  {$isPrivacyMode ? '••••••' : formatCurrency(w.balance, $currency)}
                </span>
                <i class="fa-solid fa-chevron-right wallet-arrow"></i>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- BENTO 3: Budget Guard & Health Status -->
    <div class="bento-glass-tile">
      <div class="tile-top-row">
        <div class="tile-header-left">
          <div class="tile-category-icon emerald">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <h4 class="tile-main-title">Status Limit Anggaran</h4>
            <p class="tile-sub-title">Pengeluaran belanja vs plafon aman bulanan</p>
          </div>
        </div>
        <button class="tile-action-link" on:click={() => ($activeTab = 'budgets')}>
          <span>Kelola</span> <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      <div class="tile-body-content budget-content-wrap">
        <div class="budget-stat-grid">
          <div class="stat-col">
            <span class="stat-col-label">Terpakai Bulan Ini</span>
            <span class="stat-col-val danger">
              {$isPrivacyMode ? '••••••' : formatCurrency(expense, $currency)}
            </span>
          </div>
          <div class="stat-col text-right">
            <span class="stat-col-label">
              Batas Plafon {#if !isCustomBudget}<em class="dynamic-tag">(Est. 75%)</em>{/if}
            </span>
            <span class="stat-col-val info">
              {$isPrivacyMode ? '••••••' : formatCurrency(totalBudgetLimit, $currency)}
            </span>
          </div>
        </div>

        <!-- Neon Progress Bar -->
        <div class="budget-progress-track">
          <div
            class="budget-progress-fill"
            class:danger={budgetPercent >= 90}
            class:warning={budgetPercent >= 75 && budgetPercent < 90}
            style="width: {budgetPercent}%;"
          ></div>
        </div>

        <!-- AI Budget Guard Status Banner -->
        <div class="budget-advisor-pill {budgetPercent >= 90 ? 'alert-danger' : budgetPercent >= 75 ? 'alert-warning' : 'alert-success'}">
          <div class="adv-icon">
            <i class="fa-solid {budgetPercent >= 90 ? 'fa-triangle-exclamation' : budgetPercent >= 75 ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i>
          </div>
          <div class="adv-text">
            <strong>{budgetPercent >= 100 ? 'Overbudget!' : budgetPercent >= 75 ? 'Peringatan Kuota Anggaran' : 'Kondisi Finansial Prima'}</strong>
            <p>
              {budgetPercent >= 100 
                ? 'Pengeluaran telah melebihi plafon. Tunda transaksi impulsif!' 
                : budgetPercent >= 75 
                ? `Tersisa ${100 - budgetPercent}% kuota anggaran untuk sisa hari bulan ini.` 
                : `Baru terpakai ${budgetPercent}% dari plafon. Tabungan surplus terjaga optimal!`}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- BENTO 4: Target Impian & Tagihan Terdekat (Never Blank) -->
    <div class="bento-glass-tile">
      <div class="tile-top-row">
        <div class="tile-header-left">
          <div class="tile-category-icon purple">
            <i class="fa-solid fa-bullseye"></i>
          </div>
          <div>
            <h4 class="tile-main-title">Target & Tagihan Mendatang</h4>
            <p class="tile-sub-title">Progres tabungan impian & jadwal bayar</p>
          </div>
        </div>
        <button class="tile-action-link" on:click={() => ($activeTab = 'goals')}>
          <span>Target</span> <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      <div class="tile-body-content goals-tile-wrap">
        <!-- Target Tabungan Utama -->
        <div class="active-goal-card" on:click={() => ($activeTab = 'goals')} role="button" tabindex="0">
          <div class="goal-header-top">
            <div class="goal-name-badge">
              <span class="goal-emoji">{activeGoal.icon || '🎯'}</span>
              <span class="goal-title-txt">{activeGoal.name}</span>
            </div>
            <span class="goal-pct-pill">{goalPercent}%</span>
          </div>

          <div class="goal-track-line">
            <div class="goal-track-fill" style="width: {goalPercent}%;"></div>
          </div>

          <div class="goal-footer-nums">
            <span>Terkumpul: <strong>{$isPrivacyMode ? '••••••' : formatCurrency(activeGoal.current_amount, $currency)}</strong></span>
            <span>Target: <strong>{$isPrivacyMode ? '••••••' : formatCurrency(activeGoal.target_amount, $currency)}</strong></span>
          </div>
        </div>

        <!-- Tagihan Terdekat / Subscription Reminders -->
        {#if unpaidSubs.length > 0}
          <div class="bills-stack">
            {#each unpaidSubs as sub}
              <div class="bill-row-item" on:click={() => ($activeTab = 'subscriptions')} role="button" tabindex="0">
                <div class="bill-info-left">
                  <div class="bill-bell-icon">
                    <i class="fa-solid fa-calendar-check"></i>
                  </div>
                  <div>
                    <span class="bill-title-text">{sub.name}</span>
                    <span class="bill-due-date">Jatuh tempo tgl {sub.billingDay || 25}</span>
                  </div>
                </div>
                <div class="bill-amount-right">
                  <span class="bill-amount-val">
                    {$isPrivacyMode ? '••••••' : formatCurrency(sub.amount, $currency)}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="all-paid-clean-badge">
            <i class="fa-solid fa-circle-check text-emerald"></i>
            <span>Semua tagihan langganan telah lunas tercatat bulan ini 🎉</span>
          </div>
        {/if}
      </div>
    </div>

  </section>

  <!-- ========================================================================= -->
  <!-- 5. RECENT ACTIVITY STREAM (5 TRANSAKSI TERKINI MODERN FINTECH FEED)        -->
  <!-- ========================================================================= -->
  <section class="activity-stream-card">
    <div class="stream-header-bar">
      <div class="stream-title-group">
        <div class="stream-lightning-icon">
          <i class="fa-solid fa-bolt-lightning"></i>
        </div>
        <div>
          <h3 class="stream-main-heading">Aktivitas Transaksi Terkini</h3>
          <p class="stream-sub-heading">5 mutasi terakhir yang tercatat di akun Anda</p>
        </div>
      </div>

      <!-- Segmented Filter Control -->
      <div class="stream-filter-segmented">
        <button
          class="filter-seg-btn"
          class:active={activityFilter === 'all'}
          on:click={() => (activityFilter = 'all')}
        >
          Semua
        </button>
        <button
          class="filter-seg-btn"
          class:active={activityFilter === 'expense'}
          on:click={() => (activityFilter = 'expense')}
        >
          Pengeluaran
        </button>
        <button
          class="filter-seg-btn"
          class:active={activityFilter === 'income'}
          on:click={() => (activityFilter = 'income')}
        >
          Pemasukan
        </button>
      </div>
    </div>

    <!-- Transaction List Items -->
    <div class="stream-items-list">
      {#if filteredRecent.length === 0}
        <div class="stream-empty-state">
          <i class="fa-solid fa-money-bill-transfer"></i>
          <span>Belum ada riwayat transaksi pada filter ini</span>
        </div>
      {:else}
        {#each filteredRecent as tx (tx.id)}
          {@const meta = getCatMeta(tx.category)}
          <div
            class="stream-tx-row"
            on:click={() => onEditTransaction(tx)}
            role="button"
            tabindex="0"
            title="Klik untuk melihat atau mengedit transaksi ini"
          >
            <div class="tx-left-block">
              <div class="tx-avatar-box" style="background: {meta.bg}; color: {meta.color}; border: 1px solid {meta.color}44;">
                <i class="fa-solid {meta.icon}"></i>
              </div>

              <div class="tx-meta-content">
                <span class="tx-desc-title">{tx.description}</span>
                <div class="tx-tags-row">
                  <span class="tx-tag-cat">{tx.category}</span>
                  <span class="tx-tag-dot">&bull;</span>
                  <span class="tx-tag-date">{tx.date}</span>
                  {#if tx.payment_method}
                    <span class="tx-tag-method">
                      <i class="fa-solid fa-credit-card"></i> {tx.payment_method}
                    </span>
                  {/if}
                </div>
              </div>
            </div>

            <div class="tx-right-block">
              <span class="tx-amount-pill {tx.type === 'income' ? 'income' : 'expense'}">
                {tx.type === 'income' ? '+' : '-'}
                {$isPrivacyMode ? '••••••' : formatCurrency(tx.amount, $currency)}
              </span>
              <i class="fa-solid fa-chevron-right tx-chevron"></i>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Full History Direct Button -->
    <div class="stream-bottom-navigator">
      <button class="nav-history-full-btn" on:click={() => ($activeTab = 'transactions')}>
        <div class="btn-left-txt">
          <i class="fa-solid fa-receipt"></i>
          <span>Buka Riwayat Transaksi Lengkap, Pencarian & Ekspor CSV ({$transactions.length} Transaksi)</span>
        </div>
        <i class="fa-solid fa-arrow-right"></i>
      </button>
    </div>
  </section>
</div>

<style>
  /* ========================================================================= */
  /* ROOT LAYOUT & AMBIENT AURORA GLOWS                                        */
  /* ========================================================================= */
  .cockpit-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    width: 100%;
  }

  .ambient-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(140px);
    pointer-events: none;
    z-index: 0;
  }

  .glow-1 {
    top: -50px;
    right: 15%;
    width: 420px;
    height: 420px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, transparent 70%);
  }

  .glow-2 {
    top: 350px;
    left: 2%;
    width: 480px;
    height: 480px;
    background: radial-gradient(circle, rgba(6, 182, 212, 0.18) 0%, transparent 70%);
  }

  .glow-3 {
    bottom: 100px;
    right: 5%;
    width: 380px;
    height: 380px;
    background: radial-gradient(circle, rgba(236, 72, 153, 0.12) 0%, transparent 70%);
  }

  /* ========================================================================= */
  /* TOP WELCOME & TELEMETRY BAR                                               */
  /* ========================================================================= */
  .cockpit-top-bar {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0.25rem 0.25rem 0.5rem 0.25rem;
  }

  .welcome-badge-group {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .avatar-finora {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.2rem;
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.4);
  }

  .welcome-title {
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: var(--text-main);
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .wave-emoji {
    display: inline-block;
    animation: waveBounce 2.5s infinite;
    transform-origin: 70% 70%;
  }

  @keyframes waveBounce {
    0%, 100% { transform: rotate(0deg); }
    10%, 30% { transform: rotate(14deg); }
    20% { transform: rotate(-8deg); }
    40% { transform: rotate(10deg); }
    50% { transform: rotate(0deg); }
  }

  .welcome-subtitle {
    font-size: 0.825rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  .telemetry-pill-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .telemetry-pill {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.85rem;
    border-radius: 99px;
    font-size: 0.775rem;
    font-weight: 700;
    backdrop-filter: blur(12px);
    transition: all 0.2s ease;
  }

  .telemetry-pill.cloud-active {
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10b981;
  }

  .live-dot-pulse {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 10px #10b981;
    animation: liveGlow 1.8s infinite;
  }

  @keyframes liveGlow {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(1.3); }
  }

  .telemetry-pill.privacy-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--text-main);
    cursor: pointer;
  }

  .telemetry-pill.privacy-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-1px);
  }

  /* ========================================================================= */
  /* 1. HERO SECTION & MULTI-WALLET HUB                                        */
  /* ========================================================================= */
  .hero-section {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1.6fr 1fr;
    gap: 1.5rem;
    align-items: stretch;
  }

  .wealth-hub-column {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* Interactive Wallet Scroller Tabs */
  .wallet-nav-scroller {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
  }

  .wallet-nav-scroller::-webkit-scrollbar {
    display: none;
  }

  .wallet-tab-pill {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 0.45rem 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    color: var(--text-main);
    text-align: left;
    flex-shrink: 0;
  }

  .wallet-tab-pill:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateY(-2px);
  }

  .wallet-tab-pill.active {
    background: rgba(99, 102, 241, 0.18);
    border-color: #6366f1;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.25);
  }

  .pill-icon-dot {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    color: white;
    flex-shrink: 0;
  }

  .pill-icon-dot.gold {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  }

  .pill-text-block {
    display: flex;
    flex-direction: column;
    line-height: 1.15;
  }

  .pill-title {
    font-size: 0.725rem;
    font-weight: 700;
  }

  .pill-amount {
    font-size: 0.675rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  .wallet-tab-pill.active .pill-amount {
    color: #38bdf8;
  }

  .wallet-tab-pill.add-btn {
    border-style: dashed;
    border-color: rgba(255, 255, 255, 0.18);
    color: #818cf8;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .wallet-tab-pill.add-btn:hover {
    border-color: #818cf8;
    background: rgba(99, 102, 241, 0.12);
  }

  /* Main Luxury Titanium Card */
  .luxury-titanium-card {
    position: relative;
    border-radius: 26px;
    padding: 2rem 2.2rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    background: linear-gradient(135deg, #131b2e 0%, #0a0e1a 50%, #151e30 100%);
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: 
      0 25px 50px -12px rgba(0, 0, 0, 0.7),
      inset 0 1px 1px rgba(255, 255, 255, 0.25),
      inset 0 -1px 2px rgba(0, 0, 0, 0.5),
      0 0 40px -8px rgba(99, 102, 241, 0.25);
    min-height: 330px;
    color: #ffffff !important;
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, background 0.35s ease;
  }

  .luxury-titanium-card:hover {
    transform: translateY(-2px);
    box-shadow: 
      0 30px 60px -15px rgba(0, 0, 0, 0.8),
      inset 0 1px 1px rgba(255, 255, 255, 0.35),
      0 0 50px -5px rgba(99, 102, 241, 0.35);
  }

  .card-sheen-layer {
    position: absolute;
    inset: 0;
    background: linear-gradient(115deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.02) 28%, rgba(0,0,0,0.35) 55%, rgba(255,255,255,0.08) 75%, rgba(0,0,0,0.5) 100%);
    pointer-events: none;
  }

  .card-hologram-mesh {
    position: absolute;
    top: -50%;
    right: -20%;
    width: 450px;
    height: 450px;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, rgba(168, 85, 247, 0.18) 40%, transparent 70%);
    pointer-events: none;
  }

  .card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 2;
  }

  .chip-nfc-wrap {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .emv-gold-chip {
    width: 42px;
    height: 32px;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
  }

  .chip-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .nfc-waves {
    width: 20px;
    height: 20px;
    color: rgba(255, 255, 255, 0.75);
    transform: rotate(90deg);
  }

  .card-tier-text {
    font-size: 0.725rem;
    font-weight: 800;
    letter-spacing: 2px;
    color: #cbd5e1 !important;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .health-indicator-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(16, 185, 129, 0.16);
    border: 1px solid rgba(16, 185, 129, 0.4);
    color: #10b981;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.35rem 0.8rem;
    border-radius: 99px;
    backdrop-filter: blur(8px);
  }

  .health-pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 10px #10b981;
  }

  /* Card Center: Balance */
  .card-balance-center {
    margin: 1rem 0;
    position: relative;
    z-index: 2;
  }

  .balance-sub-label {
    display: block;
    font-size: 0.725rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: #94a3b8 !important;
    margin-bottom: 0.35rem;
  }

  .balance-display-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .balance-amount {
    font-size: 2.75rem;
    font-weight: 800;
    letter-spacing: -1.2px;
    background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 50%, #94a3b8 100%) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    line-height: 1.1;
    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  }

  .balance-amount.negative {
    background: linear-gradient(135deg, #f43f5e 0%, #fb7185 100%) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
  }

  .balance-amount.masked {
    letter-spacing: 4px;
  }

  .peek-eye-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #cbd5e1 !important;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .peek-eye-btn:hover {
    background: rgba(255, 255, 255, 0.22);
    transform: scale(1.05);
  }

  /* Multi-Wallet Asset Mix Pills (3-box Grid) */
  .wallet-asset-mix-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.65rem;
    margin-top: 0.85rem;
    width: 100%;
    box-sizing: border-box;
  }

  .asset-mix-pill {
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 0.45rem 0.65rem;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    overflow: hidden;
  }

  .mix-header {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.7rem;
    color: #94a3b8;
  }

  .mix-label {
    font-weight: 600;
  }

  .mix-val {
    color: #ffffff !important;
    font-weight: 700;
    font-size: 0.82rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .icon-blue { color: #38bdf8; }
  .icon-emerald { color: #34d399; }
  .icon-amber { color: #fbbf24; }

  /* Card Embossed Details */
  .card-embossed-details {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 1.15rem;
    position: relative;
    z-index: 2;
  }

  .card-number-embossed {
    display: flex;
    gap: 0.85rem;
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: 2.5px;
    color: #e2e8f0 !important;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
    font-family: 'Courier New', Courier, monospace;
  }

  .cardholder-group {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .micro-label {
    display: block;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 1px;
    color: #94a3b8 !important;
  }

  .owner-text {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 1.2px;
    color: #ffffff !important;
  }

  .hologram-circles {
    position: relative;
    width: 38px;
    height: 24px;
  }

  .holo-ring {
    position: absolute;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    opacity: 0.85;
    mix-blend-mode: screen;
  }

  .ring-violet {
    left: 0;
    background: radial-gradient(circle, #8b5cf6 0%, rgba(139, 92, 246, 0.2) 100%);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
  }

  .ring-cyan {
    right: 0;
    background: radial-gradient(circle, #06b6d4 0%, rgba(6, 182, 212, 0.2) 100%);
    box-shadow: 0 0 12px rgba(6, 182, 212, 0.5);
  }

  /* Card Bottom: Meter & Action Buttons */
  .card-footer-action-row {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    padding-top: 0.85rem;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
  }

  .savings-telemetry {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .meter-text-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.775rem;
    color: #cbd5e1 !important;
    font-weight: 600;
  }

  .meter-pct-badge {
    background: linear-gradient(90deg, #38bdf8, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 800;
  }

  .meter-progress-track {
    height: 6px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 99px;
    overflow: hidden;
  }

  .meter-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #38bdf8 0%, #818cf8 50%, #ec4899 100%);
    border-radius: 99px;
    box-shadow: 0 0 12px rgba(56, 189, 248, 0.5);
    transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .card-cta-group {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    width: 100%;
  }

  .cta-primary-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.65rem;
    width: 100%;
  }

  .cta-pill-btn {
    padding: 0.72rem 1rem;
    border-radius: 13px;
    font-weight: 700;
    font-size: 0.84rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    border: none;
  }

  .btn-icon-wrap {
    width: 22px;
    height: 22px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.25);
    font-size: 0.75rem;
  }

  .cta-pill-btn.income {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35);
  }

  .cta-pill-btn.income:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.45);
  }

  .cta-pill-btn.expense {
    background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
    color: white;
    box-shadow: 0 6px 18px rgba(244, 63, 94, 0.35);
  }

  .cta-pill-btn.expense:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(244, 63, 94, 0.45);
  }

  .cta-pill-btn.transfer.full-width {
    width: 100%;
    padding: 0.65rem 1rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.16);
    color: #e2e8f0;
    font-size: 0.8rem;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  }

  .cta-pill-btn.transfer.full-width:hover {
    background: rgba(255, 255, 255, 0.16);
    border-color: rgba(255, 255, 255, 0.28);
    color: #ffffff;
    transform: translateY(-1px);
  }

  .flow-caption-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .caption-label {
    font-size: 0.65rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 700;
  }

  .caption-amount,
  .caption-val {
    font-size: 0.82rem;
    font-weight: 800;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .caption-desc {
    font-size: 0.72rem;
    color: var(--text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ========================================================================= */
  /* SIDE FLOW TELEMETRY CARDS (Dual Theme Adaptive)                           */
  /* ========================================================================= */
  .side-flow-container {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .telemetry-flow-card {
    position: relative;
    border-radius: 24px;
    padding: 1.6rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border-glass, rgba(255, 255, 255, 0.1));
    box-shadow: var(--shadow-card, 0 16px 36px -10px rgba(0, 0, 0, 0.4));
    min-height: 155px;
    transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease, border-color 0.25s ease;
  }

  .telemetry-flow-card:hover {
    transform: translateY(-3px);
  }

  /* Dark Theme Flow Cards */
  .income-side-card {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.85) 100%);
  }

  .income-side-card:hover {
    box-shadow: 0 20px 40px -10px rgba(16, 185, 129, 0.25);
  }

  .expense-side-card {
    background: linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(15, 23, 42, 0.85) 100%);
  }

  .expense-side-card:hover {
    box-shadow: 0 20px 40px -10px rgba(244, 63, 94, 0.25);
  }

  .flow-card-sheen {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 90% 10%, rgba(255, 255, 255, 0.05) 0%, transparent 60%);
    pointer-events: none;
  }

  .flow-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 1;
  }

  .flow-icon-circle {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.05rem;
  }

  .flow-icon-circle.success {
    background: rgba(16, 185, 129, 0.18);
    color: #10b981;
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
  }

  .flow-icon-circle.danger {
    background: rgba(244, 63, 94, 0.18);
    color: #f43f5e;
    box-shadow: 0 0 15px rgba(244, 63, 94, 0.3);
  }

  .flow-badge {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.725rem;
    font-weight: 700;
    padding: 0.3rem 0.65rem;
    border-radius: 99px;
  }

  .flow-badge.success {
    background: rgba(16, 185, 129, 0.16);
    border: 1px solid rgba(16, 185, 129, 0.35);
    color: #10b981;
  }

  .flow-badge.danger {
    background: rgba(244, 63, 94, 0.16);
    border: 1px solid rgba(244, 63, 94, 0.35);
    color: #f43f5e;
  }

  .flow-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .flow-dot.success { background: #10b981; box-shadow: 0 0 6px #10b981; }
  .flow-dot.danger { background: #f43f5e; box-shadow: 0 0 6px #f43f5e; }

  .flow-card-body {
    margin: 0.6rem 0;
    position: relative;
    z-index: 1;
  }

  .flow-card-label {
    display: block;
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .flow-card-amount {
    font-size: 1.75rem;
    font-weight: 800;
    letter-spacing: -0.6px;
    line-height: 1.2;
  }

  .flow-card-amount.success {
    color: #10b981;
    text-shadow: 0 2px 14px rgba(16, 185, 129, 0.3);
  }

  .flow-card-amount.danger {
    color: #f43f5e;
    text-shadow: 0 2px 14px rgba(244, 63, 94, 0.3);
  }

  .flow-sparkline-svg {
    position: absolute;
    right: 1.2rem;
    bottom: 2.2rem;
    width: 140px;
    height: 32px;
    opacity: 0.85;
    pointer-events: none;
  }

  .flow-card-footer {
    font-size: 0.75rem;
    color: var(--text-dim);
    font-weight: 500;
    position: relative;
    z-index: 1;
  }

  /* ========================================================================= */
  /* 2. QUICK LAUNCHER DOCK (Dual Theme Adaptive)                              */
  /* ========================================================================= */
  .launcher-dock-container {
    position: relative;
    z-index: 1;
    width: 100%;
  }

  .dock-glass-capsule {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.85rem;
    padding: 0.9rem 1.1rem;
    background: rgba(15, 23, 42, 0.68);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border-radius: 22px;
    border: 1px solid var(--border-glass, rgba(255, 255, 255, 0.12));
    box-shadow: var(--shadow-card, 0 20px 45px -12px rgba(0, 0, 0, 0.5));
    transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  }

  .dock-app-item {
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 16px;
    padding: 0.85rem 0.95rem;
    display: flex;
    align-items: center;
    gap: 0.85rem;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    color: var(--text-main);
    text-align: left;
  }

  .dock-app-item:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.22);
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.4);
  }

  .app-icon-squircle {
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    flex-shrink: 0;
    overflow: hidden;
  }

  .app-glow-reflection {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 45%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, transparent 100%);
    pointer-events: none;
  }

  .app-icon-squircle.cyan {
    background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
    color: white;
    box-shadow: 0 4px 14px rgba(6, 182, 212, 0.45);
  }

  .app-icon-squircle.amber {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    box-shadow: 0 4px 14px rgba(245, 158, 11, 0.45);
  }

  .app-icon-squircle.indigo {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.45);
  }

  .app-icon-squircle.pink {
    background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
    color: white;
    box-shadow: 0 4px 14px rgba(236, 72, 153, 0.45);
  }

  .app-icon-squircle.emerald {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45);
  }

  .app-icon-squircle.purple {
    background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%);
    color: white;
    box-shadow: 0 4px 14px rgba(168, 85, 247, 0.45);
  }

  .app-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .app-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .app-desc {
    font-size: 0.725rem;
    color: var(--text-muted);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ========================================================================= */
  /* 3. FINORA AI COPILOT SECTION                                              */
  /* ========================================================================= */
  .ai-copilot-section {
    position: relative;
    z-index: 1;
  }

  /* ========================================================================= */
  /* 4. EXECUTIVE BENTO MATRIX (Dual Theme Adaptive)                           */
  /* ========================================================================= */
  .bento-matrix-grid {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  .bento-glass-tile {
    border-radius: 24px;
    padding: 1.6rem;
    background: rgba(15, 23, 42, 0.68);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border-glass, rgba(255, 255, 255, 0.1));
    box-shadow: var(--shadow-card, 0 16px 36px -10px rgba(0, 0, 0, 0.4));
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 250px;
    transition: transform 0.25s ease, border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
  }

  .bento-glass-tile:hover {
    border-color: rgba(255, 255, 255, 0.22);
    transform: translateY(-2px);
  }

  .tile-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
  }

  .tile-header-left {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .tile-category-icon {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.05rem;
  }

  .tile-category-icon.orange { background: rgba(249, 115, 22, 0.18); color: #f97316; box-shadow: 0 0 14px rgba(249, 115, 22, 0.25); }
  .tile-category-icon.blue { background: rgba(59, 130, 246, 0.18); color: #3b82f6; box-shadow: 0 0 14px rgba(59, 130, 246, 0.25); }
  .tile-category-icon.emerald { background: rgba(16, 185, 129, 0.18); color: #10b981; box-shadow: 0 0 14px rgba(16, 185, 129, 0.25); }
  .tile-category-icon.purple { background: rgba(168, 85, 247, 0.18); color: #a855f7; box-shadow: 0 0 14px rgba(168, 85, 247, 0.25); }

  .tile-main-title {
    font-size: 1rem;
    font-weight: 800;
    color: var(--text-main);
    letter-spacing: -0.3px;
  }

  .tile-sub-title {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  .tile-action-link {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: var(--text-main);
    font-size: 0.775rem;
    font-weight: 700;
    padding: 0.4rem 0.75rem;
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    transition: all 0.2s ease;
  }

  .tile-action-link:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.25);
    transform: translateX(2px);
  }

  .tile-body-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  /* BENTO 1: Category Bars */
  .category-breakdown-list {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .cat-stat-row {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .cat-stat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.825rem;
  }

  .cat-name-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .cat-color-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .cat-inline-icon {
    font-size: 0.85rem;
  }

  .cat-name-text {
    font-weight: 700;
    color: var(--text-main);
  }

  .cat-val-box {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .cat-val-amount {
    font-weight: 700;
    color: var(--text-main);
  }

  .cat-val-percentage {
    font-size: 0.7rem;
    font-weight: 800;
    padding: 0.15rem 0.45rem;
    border-radius: 6px;
  }

  .cat-progress-track {
    height: 6px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 99px;
    overflow: hidden;
  }

  .cat-progress-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.6s ease;
  }

  /* Empty state */
  .empty-state-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    text-align: center;
    color: var(--text-muted);
  }

  .empty-icon-box {
    font-size: 1.75rem;
    margin-bottom: 0.5rem;
    opacity: 0.4;
  }

  .empty-label {
    font-size: 0.85rem;
    margin-bottom: 0.85rem;
  }

  .btn-micro-action {
    background: rgba(99, 102, 241, 0.15);
    border: 1px solid rgba(99, 102, 241, 0.3);
    color: #818cf8;
    padding: 0.45rem 0.85rem;
    border-radius: 8px;
    font-size: 0.775rem;
    font-weight: 700;
    cursor: pointer;
  }

  /* BENTO 2: Wallets */
  .wallets-compact-stream {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .wallet-row-item {
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 0.75rem 0.95rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .wallet-row-item:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateX(3px);
  }

  .wallet-left-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .wallet-icon-squircle {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 0.95rem;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  }

  .wallet-name-wrap {
    display: flex;
    flex-direction: column;
  }

  .wallet-name-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .wallet-type-badge {
    font-size: 0.675rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  .wallet-right-balance {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .wallet-balance-num {
    font-size: 0.925rem;
    font-weight: 800;
    background: linear-gradient(90deg, #38bdf8, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .wallet-arrow {
    font-size: 0.75rem;
    color: var(--text-dim);
  }

  /* BENTO 3: Budget Guard */
  .budget-content-wrap {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .budget-stat-grid {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stat-col-label {
    display: block;
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 600;
    margin-bottom: 0.2rem;
  }

  .dynamic-tag {
    font-size: 0.7rem;
    color: #38bdf8;
    font-style: normal;
    font-weight: 700;
  }

  .stat-col-val {
    font-size: 1.05rem;
    font-weight: 800;
  }

  .stat-col-val.danger { color: #f43f5e; }
  .stat-col-val.info { color: #38bdf8; }

  .budget-progress-track {
    height: 8px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 99px;
    overflow: hidden;
  }

  .budget-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
    border-radius: 99px;
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
    transition: width 0.6s ease;
  }

  .budget-progress-fill.warning {
    background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
  }

  .budget-progress-fill.danger {
    background: linear-gradient(90deg, #f43f5e 0%, #e11d48 100%);
    box-shadow: 0 0 10px rgba(244, 63, 94, 0.4);
  }

  .budget-advisor-pill {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 0.85rem 1rem;
    border-radius: 14px;
  }

  .budget-advisor-pill.alert-success {
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10b981;
  }

  .budget-advisor-pill.alert-warning {
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.3);
    color: #f59e0b;
  }

  .budget-advisor-pill.alert-danger {
    background: rgba(244, 63, 94, 0.12);
    border: 1px solid rgba(244, 63, 94, 0.3);
    color: #fb7185;
  }

  .adv-icon {
    font-size: 1.1rem;
    margin-top: 2px;
  }

  .adv-text strong {
    display: block;
    font-size: 0.825rem;
    font-weight: 800;
    margin-bottom: 0.15rem;
  }

  .adv-text p {
    font-size: 0.75rem;
    line-height: 1.4;
    opacity: 0.9;
    margin: 0;
    font-weight: 500;
  }

  /* BENTO 4: Goals & Reminders */
  .goals-tile-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .active-goal-card {
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .active-goal-card:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .goal-header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .goal-name-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .goal-emoji {
    font-size: 1rem;
  }

  .goal-title-txt {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .goal-pct-pill {
    background: rgba(168, 85, 247, 0.18);
    border: 1px solid rgba(168, 85, 247, 0.35);
    color: #c084fc;
    font-size: 0.725rem;
    font-weight: 800;
    padding: 0.15rem 0.5rem;
    border-radius: 6px;
  }

  .goal-track-line {
    height: 6px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 99px;
    overflow: hidden;
  }

  .goal-track-fill {
    height: 100%;
    background: linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%);
    border-radius: 99px;
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.4);
    transition: width 0.6s ease;
  }

  .goal-footer-nums {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  .goal-footer-nums strong {
    color: var(--text-main);
    font-weight: 700;
  }

  .bills-stack {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .bill-row-item {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;
    padding: 0.65rem 0.85rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .bill-row-item:hover {
    background: rgba(255, 255, 255, 0.07);
  }

  .bill-info-left {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .bill-bell-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
  }

  .bill-title-text {
    display: block;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .bill-due-date {
    display: block;
    font-size: 0.675rem;
    color: var(--text-muted);
  }

  .bill-amount-val {
    font-size: 0.825rem;
    font-weight: 800;
    color: #f43f5e;
  }

  .all-paid-clean-badge {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.25);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    font-size: 0.775rem;
    color: #10b981;
    font-weight: 700;
  }

  /* ========================================================================= */
  /* 5. RECENT ACTIVITY STREAM                                                 */
  /* ========================================================================= */
  .activity-stream-card {
    position: relative;
    z-index: 1;
    border-radius: 24px;
    padding: 1.8rem;
    background: rgba(15, 23, 42, 0.68);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border-glass, rgba(255, 255, 255, 0.1));
    box-shadow: var(--shadow-card, 0 16px 36px -10px rgba(0, 0, 0, 0.4));
    transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  }

  .stream-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.4rem;
  }

  .stream-title-group {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .stream-lightning-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
  }

  .stream-main-heading {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--text-main);
    letter-spacing: -0.4px;
  }

  .stream-sub-heading {
    font-size: 0.775rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  .stream-filter-segmented {
    display: flex;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 3px;
    gap: 3px;
  }

  .filter-seg-btn {
    background: transparent;
    border: none;
    padding: 0.4rem 0.9rem;
    border-radius: 9px;
    font-size: 0.775rem;
    font-weight: 700;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-seg-btn.active {
    background: rgba(255, 255, 255, 0.14);
    color: var(--text-main);
    font-weight: 800;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  }

  /* List */
  .stream-items-list {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .stream-tx-row {
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 16px;
    padding: 0.9rem 1.15rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .stream-tx-row:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateX(4px);
  }

  .tx-left-block {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: 0;
  }

  .tx-avatar-box {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .tx-meta-content {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .tx-desc-title {
    font-size: 0.925rem;
    font-weight: 700;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tx-tags-row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.725rem;
    color: var(--text-muted);
    margin-top: 0.15rem;
    flex-wrap: wrap;
    font-weight: 500;
  }

  .tx-tag-cat {
    color: var(--text-secondary);
    font-weight: 700;
  }

  .tx-tag-method {
    background: rgba(255, 255, 255, 0.08);
    padding: 0.1rem 0.45rem;
    border-radius: 5px;
    font-size: 0.675rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  .tx-right-block {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    flex-shrink: 0;
  }

  .tx-amount-pill {
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.3px;
  }

  .tx-amount-pill.income {
    color: #10b981;
    text-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
  }

  .tx-amount-pill.expense {
    color: #f43f5e;
    text-shadow: 0 0 12px rgba(244, 63, 94, 0.3);
  }

  .tx-chevron {
    font-size: 0.75rem;
    color: var(--text-dim);
  }

  .stream-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: var(--text-muted);
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .stream-empty-state i {
    font-size: 1.8rem;
    opacity: 0.5;
  }

  /* Bottom Navigator */
  .stream-bottom-navigator {
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .nav-history-full-btn {
    width: 100%;
    padding: 0.85rem 1.25rem;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text-main);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.25s ease;
  }

  .nav-history-full-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.24);
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
  }

  .btn-left-txt {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  /* ========================================================================= */
  /* LIGHT MODE THEME OVERRIDES (Full Contrast & Clarity Guaranteed)           */
  /* ========================================================================= */
  :global([data-theme="light"]) .cockpit-top-bar .welcome-title,
  :global(body.light-mode) .cockpit-top-bar .welcome-title {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .cockpit-top-bar .welcome-subtitle,
  :global(body.light-mode) .cockpit-top-bar .welcome-subtitle {
    color: #475569 !important;
  }

  :global([data-theme="light"]) .telemetry-pill.cloud-active,
  :global(body.light-mode) .telemetry-pill.cloud-active {
    background: rgba(16, 185, 129, 0.14) !important;
    border-color: rgba(16, 185, 129, 0.35) !important;
    color: #059669 !important;
  }

  :global([data-theme="light"]) .telemetry-pill.privacy-btn,
  :global(body.light-mode) .telemetry-pill.privacy-btn {
    background: #ffffff !important;
    border-color: #cbd5e1 !important;
    color: #1e293b !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06) !important;
  }

  :global([data-theme="light"]) .telemetry-pill.privacy-btn:hover,
  :global(body.light-mode) .telemetry-pill.privacy-btn:hover {
    background: #f1f5f9 !important;
    color: #0f172a !important;
  }

  /* Light Mode Wallet Selector Scroller */
  :global([data-theme="light"]) .wallet-tab-pill,
  :global(body.light-mode) .wallet-tab-pill {
    background: #ffffff !important;
    border-color: #e2e8f0 !important;
    color: #0f172a !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04) !important;
  }

  :global([data-theme="light"]) .wallet-tab-pill:hover,
  :global(body.light-mode) .wallet-tab-pill:hover {
    background: #f8fafc !important;
    border-color: #cbd5e1 !important;
  }

  :global([data-theme="light"]) .wallet-tab-pill.active,
  :global(body.light-mode) .wallet-tab-pill.active {
    background: #eef2ff !important;
    border-color: #6366f1 !important;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.18) !important;
  }

  :global([data-theme="light"]) .wallet-tab-pill .pill-title,
  :global(body.light-mode) .wallet-tab-pill .pill-title {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .wallet-tab-pill .pill-amount,
  :global(body.light-mode) .wallet-tab-pill .pill-amount {
    color: #64748b !important;
  }

  :global([data-theme="light"]) .wallet-tab-pill.active .pill-amount,
  :global(body.light-mode) .wallet-tab-pill.active .pill-amount {
    color: #4f46e5 !important;
    font-weight: 700 !important;
  }

  :global([data-theme="light"]) .wallet-tab-pill.add-btn,
  :global(body.light-mode) .wallet-tab-pill.add-btn {
    border-color: #cbd5e1 !important;
    color: #4f46e5 !important;
    background: #ffffff !important;
  }

  /* Light Mode Side Telemetry Cards */
  :global([data-theme="light"]) .income-side-card,
  :global(body.light-mode) .income-side-card {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(255, 255, 255, 0.98) 100%) !important;
    border-color: rgba(16, 185, 129, 0.28) !important;
    box-shadow: 0 10px 30px -8px rgba(16, 185, 129, 0.15), 0 2px 4px rgba(0, 0, 0, 0.03) !important;
  }

  :global([data-theme="light"]) .expense-side-card,
  :global(body.light-mode) .expense-side-card {
    background: linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(255, 255, 255, 0.98) 100%) !important;
    border-color: rgba(244, 63, 94, 0.28) !important;
    box-shadow: 0 10px 30px -8px rgba(244, 63, 94, 0.15), 0 2px 4px rgba(0, 0, 0, 0.03) !important;
  }

  :global([data-theme="light"]) .flow-card-label,
  :global(body.light-mode) .flow-card-label {
    color: #475569 !important;
  }

  :global([data-theme="light"]) .flow-card-footer,
  :global(body.light-mode) .flow-card-footer {
    color: #64748b !important;
  }

  :global([data-theme="light"]) .flow-badge.success,
  :global(body.light-mode) .flow-badge.success {
    background: rgba(16, 185, 129, 0.14) !important;
    border-color: rgba(16, 185, 129, 0.35) !important;
    color: #059669 !important;
  }

  :global([data-theme="light"]) .flow-badge.danger,
  :global(body.light-mode) .flow-badge.danger {
    background: rgba(244, 63, 94, 0.14) !important;
    border-color: rgba(244, 63, 94, 0.35) !important;
    color: #e11d48 !important;
  }

  /* Light Mode Floating Quick Launcher Dock */
  :global([data-theme="light"]) .dock-glass-capsule,
  :global(body.light-mode) .dock-glass-capsule {
    background: rgba(255, 255, 255, 0.92) !important;
    border-color: rgba(203, 213, 225, 0.8) !important;
    box-shadow: 0 16px 36px -12px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04) !important;
  }

  :global([data-theme="light"]) .dock-app-item,
  :global(body.light-mode) .dock-app-item {
    background: #ffffff !important;
    border-color: #e2e8f0 !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04) !important;
  }

  :global([data-theme="light"]) .dock-app-item:hover,
  :global(body.light-mode) .dock-app-item:hover {
    background: #f8fafc !important;
    border-color: rgba(99, 102, 241, 0.45) !important;
    box-shadow: 0 8px 20px -4px rgba(99, 102, 241, 0.18) !important;
  }

  :global([data-theme="light"]) .app-name,
  :global(body.light-mode) .app-name {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .app-desc,
  :global(body.light-mode) .app-desc {
    color: #64748b !important;
  }

  /* Light Mode Bento Matrix */
  :global([data-theme="light"]) .bento-glass-tile,
  :global(body.light-mode) .bento-glass-tile {
    background: rgba(255, 255, 255, 0.94) !important;
    border-color: rgba(203, 213, 225, 0.8) !important;
    box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.02) !important;
  }

  :global([data-theme="light"]) .tile-main-title,
  :global(body.light-mode) .tile-main-title {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .tile-sub-title,
  :global(body.light-mode) .tile-sub-title {
    color: #475569 !important;
  }

  :global([data-theme="light"]) .tile-action-link,
  :global(body.light-mode) .tile-action-link {
    background: #f1f5f9 !important;
    border-color: #cbd5e1 !important;
    color: #1e293b !important;
  }

  :global([data-theme="light"]) .tile-action-link:hover,
  :global(body.light-mode) .tile-action-link:hover {
    background: #e2e8f0 !important;
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .cat-name-text,
  :global(body.light-mode) .cat-name-text {
    color: #1e293b !important;
  }

  :global([data-theme="light"]) .cat-val-amount,
  :global(body.light-mode) .cat-val-amount {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .cat-progress-track,
  :global(body.light-mode) .cat-progress-track {
    background: rgba(0, 0, 0, 0.08) !important;
  }

  :global([data-theme="light"]) .wallet-row-item,
  :global(body.light-mode) .wallet-row-item {
    background: #f8fafc !important;
    border-color: #e2e8f0 !important;
  }

  :global([data-theme="light"]) .wallet-row-item:hover,
  :global(body.light-mode) .wallet-row-item:hover {
    background: #f1f5f9 !important;
    border-color: #cbd5e1 !important;
  }

  :global([data-theme="light"]) .wallet-name-title,
  :global(body.light-mode) .wallet-name-title {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .wallet-type-badge,
  :global(body.light-mode) .wallet-type-badge {
    color: #64748b !important;
  }

  :global([data-theme="light"]) .stat-col-label,
  :global(body.light-mode) .stat-col-label {
    color: #475569 !important;
  }

  :global([data-theme="light"]) .budget-progress-track,
  :global(body.light-mode) .budget-progress-track {
    background: rgba(0, 0, 0, 0.08) !important;
  }

  :global([data-theme="light"]) .budget-advisor-pill.alert-success,
  :global(body.light-mode) .budget-advisor-pill.alert-success {
    background: rgba(16, 185, 129, 0.12) !important;
    border-color: rgba(16, 185, 129, 0.3) !important;
    color: #047857 !important;
  }

  :global([data-theme="light"]) .budget-advisor-pill.alert-warning,
  :global(body.light-mode) .budget-advisor-pill.alert-warning {
    background: rgba(245, 158, 11, 0.12) !important;
    border-color: rgba(245, 158, 11, 0.3) !important;
    color: #b45309 !important;
  }

  :global([data-theme="light"]) .budget-advisor-pill.alert-danger,
  :global(body.light-mode) .budget-advisor-pill.alert-danger {
    background: rgba(244, 63, 94, 0.12) !important;
    border-color: rgba(244, 63, 94, 0.3) !important;
    color: #be123c !important;
  }

  :global([data-theme="light"]) .active-goal-card,
  :global(body.light-mode) .active-goal-card {
    background: #f8fafc !important;
    border-color: #e2e8f0 !important;
  }

  :global([data-theme="light"]) .active-goal-card:hover,
  :global(body.light-mode) .active-goal-card:hover {
    background: #f1f5f9 !important;
  }

  :global([data-theme="light"]) .goal-title-txt,
  :global(body.light-mode) .goal-title-txt {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .goal-footer-nums,
  :global(body.light-mode) .goal-footer-nums {
    color: #475569 !important;
  }

  :global([data-theme="light"]) .goal-footer-nums strong,
  :global(body.light-mode) .goal-footer-nums strong {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .goal-track-line,
  :global(body.light-mode) .goal-track-line {
    background: rgba(0, 0, 0, 0.08) !important;
  }

  :global([data-theme="light"]) .bill-row-item,
  :global(body.light-mode) .bill-row-item {
    background: #f8fafc !important;
    border-color: #e2e8f0 !important;
  }

  :global([data-theme="light"]) .bill-title-text,
  :global(body.light-mode) .bill-title-text {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .bill-due-date,
  :global(body.light-mode) .bill-due-date {
    color: #64748b !important;
  }

  :global([data-theme="light"]) .all-paid-clean-badge,
  :global(body.light-mode) .all-paid-clean-badge {
    background: rgba(16, 185, 129, 0.1) !important;
    border-color: rgba(16, 185, 129, 0.3) !important;
    color: #059669 !important;
  }

  /* Light Mode Activity Stream */
  :global([data-theme="light"]) .activity-stream-card,
  :global(body.light-mode) .activity-stream-card {
    background: rgba(255, 255, 255, 0.94) !important;
    border-color: rgba(203, 213, 225, 0.8) !important;
    box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.07) !important;
  }

  :global([data-theme="light"]) .stream-main-heading,
  :global(body.light-mode) .stream-main-heading {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .stream-sub-heading,
  :global(body.light-mode) .stream-sub-heading {
    color: #475569 !important;
  }

  :global([data-theme="light"]) .stream-filter-segmented,
  :global(body.light-mode) .stream-filter-segmented {
    background: #f1f5f9 !important;
    border-color: #e2e8f0 !important;
  }

  :global([data-theme="light"]) .filter-seg-btn,
  :global(body.light-mode) .filter-seg-btn {
    color: #64748b !important;
  }

  :global([data-theme="light"]) .filter-seg-btn.active,
  :global(body.light-mode) .filter-seg-btn.active {
    background: #ffffff !important;
    color: #0f172a !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08) !important;
  }

  :global([data-theme="light"]) .stream-tx-row,
  :global(body.light-mode) .stream-tx-row {
    background: #f8fafc !important;
    border-color: #e2e8f0 !important;
  }

  :global([data-theme="light"]) .stream-tx-row:hover,
  :global(body.light-mode) .stream-tx-row:hover {
    background: #f1f5f9 !important;
    border-color: #cbd5e1 !important;
  }

  :global([data-theme="light"]) .tx-desc-title,
  :global(body.light-mode) .tx-desc-title {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .tx-tags-row,
  :global(body.light-mode) .tx-tags-row {
    color: #64748b !important;
  }

  :global([data-theme="light"]) .tx-tag-cat,
  :global(body.light-mode) .tx-tag-cat {
    color: #334155 !important;
  }

  :global([data-theme="light"]) .tx-tag-method,
  :global(body.light-mode) .tx-tag-method {
    background: #e2e8f0 !important;
    color: #475569 !important;
  }

  :global([data-theme="light"]) .nav-history-full-btn,
  :global(body.light-mode) .nav-history-full-btn {
    background: #f8fafc !important;
    border-color: #e2e8f0 !important;
    color: #1e293b !important;
  }

  :global([data-theme="light"]) .nav-history-full-btn:hover,
  :global(body.light-mode) .nav-history-full-btn:hover {
    background: #f1f5f9 !important;
    border-color: #cbd5e1 !important;
    color: #0f172a !important;
  }

  /* ========================================================================= */
  /* RESPONSIVE DESIGN FOR TABLETS & MOBILES                                   */
  /* ========================================================================= */
  @media (max-width: 1100px) {
    .dock-glass-capsule {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 1024px) {
    .cockpit-wrapper {
      gap: 1rem;
    }

    .hero-section {
      grid-template-columns: 1fr !important;
    }

    .bento-matrix-grid {
      grid-template-columns: 1fr !important;
    }

    .cockpit-top-bar {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 0.6rem;
    }

    .welcome-badge-group {
      gap: 0.6rem;
    }

    .avatar-finora {
      width: 38px;
      height: 38px;
      font-size: 1rem;
    }

    .welcome-title {
      font-size: 0.95rem !important;
    }

    .welcome-subtitle {
      font-size: 0.7rem !important;
    }

    .telemetry-pill.privacy-btn {
      padding: 5px 9px !important;
      font-size: 0.72rem !important;
      white-space: nowrap !important;
    }

    .wallet-nav-scroller {
      padding: 2px 2px 8px !important;
      gap: 6px !important;
    }

    .wallet-tab-pill {
      padding: 6px 10px !important;
      font-size: 0.7rem !important;
    }

    .luxury-titanium-card {
      padding: 16px 14px 14px;
      border-radius: 20px;
    }

    .card-tier-text {
      font-size: 0.65rem;
    }

    .balance-sub-label {
      font-size: 0.64rem;
    }

    .balance-amount {
      font-size: clamp(1.5rem, 6.2vw, 2rem) !important;
      letter-spacing: -0.5px;
    }

    .peek-eye-btn {
      width: 30px;
      height: 30px;
      font-size: 0.8rem;
    }

    .wallet-asset-mix-row {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 6px !important;
      margin-top: 10px !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }

    .asset-mix-pill {
      display: flex !important;
      flex-direction: column !important;
      padding: 6px 6px !important;
      border-radius: 10px !important;
      gap: 2px !important;
      min-width: 0 !important;
      overflow: hidden !important;
    }

    .mix-header {
      display: flex !important;
      align-items: center !important;
      gap: 3px !important;
      font-size: 0.65rem !important;
      color: #94a3b8 !important;
    }

    .mix-val {
      font-size: 0.72rem !important;
      font-weight: 700 !important;
      color: #ffffff !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    .card-embossed-details {
      margin-bottom: 0.75rem;
    }

    .card-number-embossed {
      font-size: 0.82rem !important;
      letter-spacing: 1.5px !important;
      gap: 0.45rem !important;
    }

    .card-footer-action-row {
      padding-top: 0.7rem;
      gap: 0.65rem;
    }

    .meter-text-row {
      font-size: 0.72rem;
    }

    .card-cta-group {
      display: flex !important;
      flex-direction: column !important;
      gap: 6px !important;
      width: 100% !important;
    }

    .cta-primary-row {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 6px !important;
      width: 100% !important;
    }

    .cta-pill-btn {
      padding: 9px 4px !important;
      font-size: 0.78rem !important;
      gap: 5px !important;
      border-radius: 10px !important;
      justify-content: center !important;
    }

    .btn-icon-wrap {
      width: 18px !important;
      height: 18px !important;
      font-size: 0.65rem !important;
      border-radius: 5px !important;
      flex-shrink: 0 !important;
    }

    .cta-pill-btn.transfer.full-width {
      width: 100% !important;
      padding: 8px 10px !important;
      font-size: 0.75rem !important;
      border-radius: 10px !important;
    }

    /* Income & Expense Telemetry Twin-Grid */
    .side-flow-container {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 8px !important;
    }

    .telemetry-flow-card {
      padding: 12px 10px !important;
      border-radius: 16px !important;
    }

    .flow-icon-circle {
      width: 32px !important;
      height: 32px !important;
      font-size: 0.85rem !important;
    }

    .flow-badge {
      font-size: 0.62rem !important;
      padding: 2px 6px !important;
    }

    .flow-card-label {
      font-size: 0.7rem !important;
      margin-top: 4px !important;
    }

    .flow-card-amount {
      font-size: 1.02rem !important;
      margin-top: 2px !important;
    }

    .flow-sparkline-svg {
      height: 22px !important;
      margin: 4px 0 !important;
    }

    .flow-caption {
      font-size: 0.64rem !important;
      line-height: 1.2 !important;
    }

    /* Floating Quick Launcher 3x2 Grid */
    .launcher-dock-container {
      margin-top: 0.25rem !important;
      padding-bottom: 24px !important;
    }

    .dock-glass-capsule {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 8px !important;
      padding: 12px 6px !important;
      border-radius: 18px !important;
    }

    .dock-app-item {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      padding: 8px 2px !important;
      border-radius: 12px !important;
      background: rgba(255, 255, 255, 0.03) !important;
      min-width: 0 !important;
    }

    .app-icon-squircle {
      width: 44px !important;
      height: 44px !important;
      font-size: 1.15rem !important;
      margin-bottom: 6px !important;
      border-radius: 13px !important;
    }

    .app-name {
      font-size: 0.72rem !important;
      font-weight: 700 !important;
      text-align: center !important;
      line-height: 1.2 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      max-width: 100% !important;
    }

    .app-desc {
      display: none !important;
    }

    .stream-tx-row {
      padding: 9px 10px !important;
      border-radius: 12px !important;
    }

    .tx-avatar-box {
      width: 36px !important;
      height: 36px !important;
      font-size: 0.9rem !important;
    }

    .tx-desc-title {
      font-size: 0.84rem !important;
    }

    .tx-meta-info {
      font-size: 0.68rem !important;
    }

    .tx-amount-pill {
      font-size: 0.8rem !important;
      padding: 3px 8px !important;
    }

    .stream-header-bar {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 0.75rem !important;
    }

    .stream-filter-segmented {
      width: 100% !important;
      display: flex !important;
    }

    .filter-seg-btn {
      flex: 1 !important;
      text-align: center !important;
      padding: 0.4rem 0.4rem !important;
      font-size: 0.75rem !important;
    }
  }

  @media (max-width: 480px) {
    .luxury-titanium-card {
      padding: 14px 12px 12px !important;
      border-radius: 18px !important;
    }

    .balance-amount {
      font-size: clamp(1.4rem, 6vw, 1.85rem) !important;
    }

    .card-number-embossed {
      font-size: 0.75rem !important;
      letter-spacing: 1px !important;
    }

    .cta-pill-btn {
      padding: 8px 3px !important;
      font-size: 0.72rem !important;
    }

    .telemetry-flow-card {
      padding: 10px 8px !important;
    }

    .flow-card-amount {
      font-size: 0.95rem !important;
    }
  }
</style>
