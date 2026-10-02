<script>
  import Navbar from "$lib/components/Navbar.svelte";
  import DashboardCockpit from "$lib/components/DashboardCockpit.svelte";
  import BalanceCard from "$lib/components/BalanceCard.svelte";
  import AiSmartInput from "$lib/components/AiSmartInput.svelte";
  import AiAdvisor from "$lib/components/AiAdvisor.svelte";
  import DailyBreakdown from "$lib/components/DailyBreakdown.svelte";
  import AnalyticsCharts from "$lib/components/AnalyticsCharts.svelte";
  import BudgetSection from "$lib/components/BudgetSection.svelte";
  import GoalsSection from "$lib/components/GoalsSection.svelte";
  import TransactionList from "$lib/components/TransactionList.svelte";
  import TransactionModal from "$lib/components/TransactionModal.svelte";
  import MultiWallet from "$lib/components/MultiWallet.svelte";
  import SubscriptionsSection from "$lib/components/SubscriptionsSection.svelte";
  import DebtTrackerSection from "$lib/components/DebtTrackerSection.svelte";
  import ReceiptScanner from "$lib/components/ReceiptScanner.svelte";
  import SplitBill from "$lib/components/SplitBill.svelte";
  import ExecutiveReport from "$lib/components/ExecutiveReport.svelte";
  import SecurityLock from "$lib/components/SecurityLock.svelte";
  import ConfirmModal from "$lib/components/ConfirmModal.svelte";
  import SplashScreen from "$lib/components/SplashScreen.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import { activeTab, theme, isPrivacyMode, currency } from "$lib/stores.js";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  let isModalOpen = false;
  let modalInitialType = "expense";
  let editingTx = null;
  // Otomatis terkunci saat aplikasi dibuka (Gaya M-Banking)
  let isAppLocked = true;
  // One-handed Mobile Quick Hub Sheet
  let isMobileMenuOpen = false;
  // Tampilan loading awal (Splash Screen)
  let showSplash = true;

  function toggleTheme() {
    $theme = $theme === "dark" ? "light" : "dark";
  }

  function togglePrivacy() {
    $isPrivacyMode = !$isPrivacyMode;
  }

  function handleSelectTab(tab) {
    $activeTab = tab;
    isMobileMenuOpen = false;
  }

  onMount(() => {
    if (browser) {
      const isPinDisabled = localStorage.getItem("finora_pin_enabled") === "false";
      const isDeviceRemembered = localStorage.getItem("finora_device_unlocked") === "true";
      const isSessionUnlocked = sessionStorage.getItem("finora_session_unlocked") === "true";

      if (isPinDisabled || isDeviceRemembered || isSessionUnlocked) {
        isAppLocked = false;
      } else {
        const hasPin = localStorage.getItem("finora_security_pin");
        isAppLocked = !!hasPin; // Hanya kunci jika pengguna memang sudah pernah membuat PIN
      }
    }
  });

  function openModal(type = "expense") {
    editingTx = null;
    modalInitialType = type;
    isModalOpen = true;
  }

  function handleEditTransaction(tx) {
    editingTx = tx;
    modalInitialType = tx.type;
    isModalOpen = true;
  }

  function closeModal() {
    isModalOpen = false;
    editingTx = null;
  }

  function lockApp() {
    if (browser) {
      sessionStorage.removeItem("finora_session_unlocked");
      localStorage.removeItem("finora_device_unlocked");
      localStorage.setItem("finora_pin_enabled", "true");
    }
    isAppLocked = true;
  }

  function unlockApp() {
    if (browser) {
      sessionStorage.setItem("finora_session_unlocked", "true");
    }
    isAppLocked = false;
  }
</script>

<svelte:head>
  <title>Finora AI Pro — Smart Natural Language & Real-time Wealth Hub</title>
  <meta
    name="description"
    content="Aplikasi pencatat keuangan modern dengan Finora AI Smart Parser, analisis finansial cerdas, dan real-time database SQLite."
  />
</svelte:head>

<div class="page-wrapper">
  <!-- Top Navigation with AI tag & Lock button -->
  <Navbar onOpenModal={() => openModal("expense")} onLockApp={lockApp} />

  <!-- Main Dashboard Container -->
  <main class="dashboard-body">
    <!-- View Switcher based on $activeTab -->
    {#if $activeTab === "dashboard"}
      <!-- Executive Cockpit Dashboard (Fast, Clean & Non-Cluttered) -->
      <DashboardCockpit
        onQuickAdd={(type) => openModal(type)}
        onEditTransaction={handleEditTransaction}
      />
    {:else if $activeTab === "scanner"}
      <!-- Dedicated Smart Receipt Scanner Hub -->
      <ReceiptScanner />
    {:else if $activeTab === "splitbill"}
      <!-- Dedicated Split Bill Hub -->
      <SplitBill />
    {:else if $activeTab === "wallets"}
      <!-- Dedicated Multi-Wallet Hub -->
      <MultiWallet />
    {:else if $activeTab === "subscriptions"}
      <!-- Dedicated Subscriptions & Recurring Bills Hub -->
      <SubscriptionsSection />
    {:else if $activeTab === "debts"}
      <!-- Dedicated Debt & Loans Tracker Hub -->
      <DebtTrackerSection />
    {:else if $activeTab === "report"}
      <!-- Dedicated Executive Financial Report & Wrapped Hub -->
      <ExecutiveReport />
    {:else if $activeTab === "ai"}
      <!-- Dedicated Full AI Workspace -->
      <AiSmartInput />
      <AiAdvisor />
    {:else if $activeTab === "breakdown"}
      <!-- Dedicated Daily Breakdown View -->
      <DailyBreakdown onEditTransaction={handleEditTransaction} />
      <TransactionList onEditTransaction={handleEditTransaction} />
    {:else if $activeTab === "transactions"}
      <AiSmartInput />
      <TransactionList onEditTransaction={handleEditTransaction} />
    {:else if $activeTab === "budgets"}
      <BudgetSection />
      <AnalyticsCharts />
    {:else if $activeTab === "goals"}
      <GoalsSection />
    {/if}
  </main>

  <!-- Elegant App Footer with Heartfelt Copyright -->
  <Footer />

  <!-- Mobile Ergonomic One-Handed Bottom Dock -->
  <nav class="mobile-dock">
    <button
      class="dock-item"
      class:active={$activeTab === "dashboard" && !isMobileMenuOpen}
      on:click={() => handleSelectTab("dashboard")}
    >
      <i class="fa-solid fa-chart-pie"></i>
      <span>Beranda</span>
    </button>

    <button
      class="dock-item"
      class:active={$activeTab === "breakdown" && !isMobileMenuOpen}
      on:click={() => handleSelectTab("breakdown")}
    >
      <i class="fa-solid fa-calendar-day"></i>
      <span>Perincian</span>
    </button>

    <!-- Floating Thumb Center Add Button -->
    <button
      class="dock-add-btn"
      on:click={() => openModal("expense")}
      title="Catat Baru"
    >
      <i class="fa-solid fa-plus"></i>
    </button>

    <button
      class="dock-item"
      class:active={$activeTab === "transactions" && !isMobileMenuOpen}
      on:click={() => handleSelectTab("transactions")}
    >
      <i class="fa-solid fa-receipt"></i>
      <span>Riwayat</span>
    </button>

    <button
      class="dock-item menu-dock"
      class:active={isMobileMenuOpen}
      on:click={() => (isMobileMenuOpen = !isMobileMenuOpen)}
      title="Menu Lengkap & Pengaturan"
    >
      <i class="fa-solid {isMobileMenuOpen ? 'fa-xmark' : 'fa-bars-staggered'}"
      ></i>
      <span>{isMobileMenuOpen ? "Tutup" : "Menu"}</span>
    </button>
  </nav>

  <!-- One-Handed Quick-Hub Bottom Sheet -->
  {#if isMobileMenuOpen}
    <div
      class="quick-sheet-backdrop"
      on:click={() => (isMobileMenuOpen = false)}
      role="dialog"
      aria-modal="true"
    >
      <div class="quick-sheet-card" on:click|stopPropagation role="document">
        <div class="sheet-drag-pill"></div>

        <div class="sheet-title-row">
          <div class="sheet-title-info">
            <h3>Pusat Kontrol Finora</h3>
            <p>Akses seluruh menu dengan jangkauan satu jempol</p>
          </div>
          <button
            class="sheet-close-btn"
            on:click={() => (isMobileMenuOpen = false)}
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="sheet-grid">
          <button
            class="sheet-tile"
            class:active={$activeTab === "scanner"}
            on:click={() => handleSelectTab("scanner")}
          >
            <div class="tile-icon scan-gradient">
              <i class="fa-solid fa-camera"></i>
            </div>
            <span class="tile-label">Scan Struk</span>
            <span class="tile-desc">OCR Nota AI</span>
          </button>

          <button
            class="sheet-tile"
            class:active={$activeTab === "splitbill"}
            on:click={() => handleSelectTab("splitbill")}
          >
            <div class="tile-icon split-gradient">
              <i class="fa-solid fa-users-viewfinder"></i>
            </div>
            <span class="tile-label">Split Bill</span>
            <span class="tile-desc">Patungan Makan</span>
          </button>

          <button
            class="sheet-tile"
            class:active={$activeTab === "report"}
            on:click={() => handleSelectTab("report")}
          >
            <div class="tile-icon report-gradient">
              <i class="fa-solid fa-file-invoice-dollar"></i>
            </div>
            <span class="tile-label">Laporan PDF</span>
            <span class="tile-desc">Cetak & Wrapped</span>
          </button>

          <button
            class="sheet-tile"
            class:active={$activeTab === "wallets"}
            on:click={() => handleSelectTab("wallets")}
          >
            <div class="tile-icon wallet-gradient">
              <i class="fa-solid fa-credit-card"></i>
            </div>
            <span class="tile-label">Rekening</span>
            <span class="tile-desc">Multi-Dompet</span>
          </button>

          <button
            class="sheet-tile"
            class:active={$activeTab === "subscriptions"}
            on:click={() => handleSelectTab("subscriptions")}
          >
            <div class="tile-icon sub-gradient">
              <i class="fa-solid fa-repeat"></i>
            </div>
            <span class="tile-label">Langganan</span>
            <span class="tile-desc">Tagihan Rutin</span>
          </button>

          <button
            class="sheet-tile"
            class:active={$activeTab === "debts"}
            on:click={() => handleSelectTab("debts")}
          >
            <div class="tile-icon debt-gradient">
              <i class="fa-solid fa-handshake-angle"></i>
            </div>
            <span class="tile-label">Hutang</span>
            <span class="tile-desc">Piutang Teman</span>
          </button>

          <button
            class="sheet-tile"
            class:active={$activeTab === "ai"}
            on:click={() => handleSelectTab("ai")}
          >
            <div class="tile-icon ai-gradient">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
            </div>
            <span class="tile-label">Finora AI</span>
            <span class="tile-desc">Smart Copilot</span>
          </button>

          <button
            class="sheet-tile"
            class:active={$activeTab === "budgets"}
            on:click={() => handleSelectTab("budgets")}
          >
            <div class="tile-icon budget-gradient">
              <i class="fa-solid fa-wallet"></i>
            </div>
            <span class="tile-label">Anggaran</span>
            <span class="tile-desc">Batas Bulanan</span>
          </button>

          <button
            class="sheet-tile"
            class:active={$activeTab === "goals"}
            on:click={() => handleSelectTab("goals")}
          >
            <div class="tile-icon goal-gradient">
              <i class="fa-solid fa-bullseye"></i>
            </div>
            <span class="tile-label">Target Impian</span>
            <span class="tile-desc">Tabungan Goals</span>
          </button>

          <button class="sheet-tile" on:click={togglePrivacy}>
            <div class="tile-icon sys-gradient">
              <i
                class={$isPrivacyMode
                  ? "fa-solid fa-eye-slash text-rose"
                  : "fa-solid fa-eye text-emerald"}
              ></i>
            </div>
            <span class="tile-label">Mode Privasi</span>
            <span class="tile-desc"
              >{$isPrivacyMode ? "Sensor Saldo" : "Tampil Nominal"}</span
            >
          </button>

          <button class="sheet-tile" on:click={toggleTheme}>
            <div class="tile-icon theme-gradient">
              <i
                class={$theme === "dark"
                  ? "fa-solid fa-sun text-amber"
                  : "fa-solid fa-moon text-cyan"}
              ></i>
            </div>
            <span class="tile-label">Tema Tampilan</span>
            <span class="tile-desc"
              >{$theme === "dark" ? "Mode Gelap" : "Mode Terang"}</span
            >
          </button>

          <button
            class="sheet-tile"
            on:click={() => {
              isMobileMenuOpen = false;
              lockApp();
            }}
          >
            <div class="tile-icon lock-gradient">
              <i class="fa-solid fa-lock text-rose"></i>
            </div>
            <span class="tile-label">Kunci PIN</span>
            <span class="tile-desc">Kunci Brankas</span>
          </button>
        </div>

        <button
          class="sheet-dismiss-btn"
          on:click={() => (isMobileMenuOpen = false)}
        >
          <i class="fa-solid fa-chevron-down"></i> Sembunyikan Menu
        </button>
      </div>
    </div>
  {/if}

  <!-- Add / Edit Transaction Modal -->
  <TransactionModal
    isOpen={isModalOpen}
    initialType={modalInitialType}
    editingTransaction={editingTx}
    onClose={closeModal}
  />

  <!-- Security Passcode Lock Overlay -->
  <SecurityLock isLocked={isAppLocked} onClose={unlockApp} />

  <!-- Global In-App Confirmation Dialog -->
  <ConfirmModal />

  <!-- Tampilan Loading Awal Pas Masuk Aplikasi (Splash Screen) -->
  {#if showSplash}
    <SplashScreen onFinish={() => (showSplash = false)} />
  {/if}
</div>

<style>
  .page-wrapper {
    min-height: 100vh;
    padding-bottom: 95px;
  }

  .dashboard-body {
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px;
  }

  .two-col-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  @media (max-width: 1100px) {
    .two-col-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .dashboard-body {
      padding: 12px 14px;
    }
  }

  /* Mobile Dock */
  .mobile-dock {
    display: none;
  }

  @media (max-width: 768px) {
    .mobile-dock {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 500;
      background: var(--navbar-bg);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border-top: 1px solid var(--border-glass);
      box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.15);
      padding: 8px 12px max(10px, env(safe-area-inset-bottom));
      justify-content: space-around;
      align-items: center;
      transition:
        background 0.25s ease,
        border-color 0.25s ease;
    }

    .dock-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.68rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      transition: color 0.15s ease;
      min-width: 54px;
    }

    .dock-item i {
      font-size: 1.15rem;
    }

    .dock-item.active {
      color: #ffffff;
    }

    .dock-item.active i {
      color: var(--primary);
    }

    .ai-dock.active i {
      color: #ec4899;
    }

    .dock-add-btn {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--primary-gradient);
      color: white;
      border: 3px solid rgba(255, 255, 255, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      box-shadow: 0 6px 25px var(--primary-glow);
      cursor: pointer;
      transform: translateY(-16px);
      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease;
      touch-action: manipulation;
    }

    .dock-add-btn:active {
      transform: translateY(-12px) scale(0.92);
      box-shadow: 0 2px 10px var(--primary-glow);
    }

    .menu-dock.active i {
      color: #38bdf8;
    }
  }

  /* One-Handed Quick-Hub Bottom Sheet Styles */
  .quick-sheet-backdrop {
    position: fixed;
    inset: 0;
    z-index: 600;
    background: rgba(4, 7, 13, 0.78);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    animation: sheetBackdropFade 0.2s ease;
  }

  @keyframes sheetBackdropFade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .quick-sheet-card {
    width: 100%;
    max-width: 500px;
    background: linear-gradient(180deg, #131b2e 0%, #0b101d 100%);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 28px 28px 0 0;
    padding: 16px 20px max(24px, env(safe-area-inset-bottom));
    box-shadow: 0 -20px 50px rgba(0, 0, 0, 0.7);
    animation: sheetSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  }

  :global([data-theme="light"]) .quick-sheet-card,
  :global(body.light-mode) .quick-sheet-card {
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    border-color: rgba(0, 0, 0, 0.12);
  }

  @keyframes sheetSlideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .sheet-drag-pill {
    width: 44px;
    height: 5px;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 99px;
    margin: 0 auto 14px;
  }

  :global([data-theme="light"]) .sheet-drag-pill,
  :global(body.light-mode) .sheet-drag-pill {
    background: rgba(0, 0, 0, 0.18);
  }

  .sheet-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .sheet-title-info h3 {
    margin: 0 0 3px;
    font-size: 1.12rem;
    font-weight: 800;
    color: var(--text-main);
  }

  .sheet-title-info p {
    margin: 0;
    font-size: 0.76rem;
    color: var(--text-muted);
  }

  .sheet-close-btn {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--border-glass);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.95rem;
  }

  .sheet-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 16px;
  }

  .sheet-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 12px 6px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition:
      transform 0.15s ease,
      background 0.15s ease,
      border-color 0.15s ease;
    touch-action: manipulation;
  }

  .sheet-tile:active {
    transform: scale(0.95);
  }

  .sheet-tile.active {
    background: rgba(99, 102, 241, 0.18);
    border-color: var(--primary);
  }

  .tile-icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    margin-bottom: 8px;
  }

  .scan-gradient {
    background: linear-gradient(
      135deg,
      rgba(168, 85, 247, 0.25) 0%,
      rgba(236, 72, 153, 0.25) 100%
    );
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.4);
  }

  .split-gradient {
    background: linear-gradient(
      135deg,
      rgba(6, 182, 212, 0.25) 0%,
      rgba(16, 185, 129, 0.25) 100%
    );
    color: #34d399;
    border: 1px solid rgba(6, 182, 212, 0.4);
  }

  .report-gradient {
    background: linear-gradient(
      135deg,
      rgba(14, 165, 233, 0.25) 0%,
      rgba(2, 132, 199, 0.25) 100%
    );
    color: #38bdf8;
    border: 1px solid rgba(14, 165, 233, 0.4);
  }

  .wallet-gradient {
    background: linear-gradient(
      135deg,
      rgba(37, 99, 235, 0.25) 0%,
      rgba(59, 130, 246, 0.25) 100%
    );
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.4);
  }

  .sub-gradient {
    background: linear-gradient(
      135deg,
      rgba(236, 72, 153, 0.25) 0%,
      rgba(217, 70, 239, 0.25) 100%
    );
    color: #f472b6;
    border: 1px solid rgba(236, 72, 153, 0.4);
  }

  .debt-gradient {
    background: linear-gradient(
      135deg,
      rgba(6, 182, 212, 0.25) 0%,
      rgba(14, 165, 233, 0.25) 100%
    );
    color: #22d3ee;
    border: 1px solid rgba(6, 182, 212, 0.4);
  }

  .ai-gradient {
    background: linear-gradient(
      135deg,
      rgba(236, 72, 153, 0.25) 0%,
      rgba(168, 85, 247, 0.25) 100%
    );
    color: #f472b6;
    border: 1px solid rgba(236, 72, 153, 0.4);
  }

  .budget-gradient {
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.25) 0%,
      rgba(59, 130, 246, 0.25) 100%
    );
    color: #818cf8;
    border: 1px solid rgba(99, 102, 241, 0.4);
  }

  .goal-gradient {
    background: linear-gradient(
      135deg,
      rgba(16, 185, 129, 0.25) 0%,
      rgba(20, 184, 166, 0.25) 100%
    );
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.4);
  }

  .sys-gradient {
    background: linear-gradient(
      135deg,
      rgba(6, 182, 212, 0.2) 0%,
      rgba(14, 165, 233, 0.2) 100%
    );
    color: #38bdf8;
    border: 1px solid rgba(6, 182, 212, 0.35);
  }

  .theme-gradient {
    background: linear-gradient(
      135deg,
      rgba(245, 158, 11, 0.2) 0%,
      rgba(234, 88, 12, 0.2) 100%
    );
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.35);
  }

  .lock-gradient {
    background: linear-gradient(
      135deg,
      rgba(244, 63, 94, 0.2) 0%,
      rgba(225, 29, 72, 0.2) 100%
    );
    color: #fb7185;
    border: 1px solid rgba(244, 63, 94, 0.35);
  }

  .tile-label {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-main);
    margin-bottom: 2px;
  }

  .tile-desc {
    font-size: 0.65rem;
    color: var(--text-muted);
  }

  .sheet-dismiss-btn {
    width: 100%;
    height: 48px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    color: var(--text-main);
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    touch-action: manipulation;
  }

  :global([data-theme="light"]) .sheet-dismiss-btn,
  :global(body.light-mode) .sheet-dismiss-btn {
    background: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.1);
  }

  .sheet-dismiss-btn:active {
    transform: scale(0.98);
  }
</style>
