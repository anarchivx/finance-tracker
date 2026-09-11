<script>
  import Navbar from '$lib/components/Navbar.svelte';
  import BalanceCard from '$lib/components/BalanceCard.svelte';
  import AiSmartInput from '$lib/components/AiSmartInput.svelte';
  import AiAdvisor from '$lib/components/AiAdvisor.svelte';
  import DailyBreakdown from '$lib/components/DailyBreakdown.svelte';
  import AnalyticsCharts from '$lib/components/AnalyticsCharts.svelte';
  import BudgetSection from '$lib/components/BudgetSection.svelte';
  import GoalsSection from '$lib/components/GoalsSection.svelte';
  import TransactionList from '$lib/components/TransactionList.svelte';
  import TransactionModal from '$lib/components/TransactionModal.svelte';
  import SecurityLock from '$lib/components/SecurityLock.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { activeTab } from '$lib/stores.js';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let isModalOpen = false;
  let modalInitialType = 'expense';
  let editingTx = null;
  // Otomatis terkunci saat aplikasi dibuka (Gaya M-Banking)
  let isAppLocked = true;

  onMount(() => {
    if (browser) {
      const isSessionUnlocked = sessionStorage.getItem('finora_session_unlocked') === 'true';
      if (isSessionUnlocked) {
        isAppLocked = false;
      } else {
        isAppLocked = true;
      }
    }
  });

  function openModal(type = 'expense') {
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
    if (browser) sessionStorage.removeItem('finora_session_unlocked');
    isAppLocked = true;
  }

  function unlockApp() {
    if (browser) sessionStorage.setItem('finora_session_unlocked', 'true');
    isAppLocked = false;
  }
</script>

<svelte:head>
  <title>Finora AI Pro — Smart Natural Language & Real-time Wealth Hub</title>
  <meta name="description" content="Aplikasi pencatat keuangan modern dengan Finora AI Smart Parser, analisis finansial cerdas, dan real-time database SQLite." />
</svelte:head>

<div class="page-wrapper">
  <!-- Top Navigation with AI tag & Lock button -->
  <Navbar
    onOpenModal={() => openModal('expense')}
    onLockApp={lockApp}
  />

  <!-- Main Dashboard Container -->
  <main class="dashboard-body">
    <!-- View Switcher based on $activeTab -->
    {#if $activeTab === 'dashboard'}
      <!-- Hero Balance -->
      <BalanceCard onQuickAdd={(type) => openModal(type)} />

      <!-- Finora AI Smart Input & 1-Click Simulator -->
      <AiSmartInput />

      <!-- Analytics & Charts -->
      <AnalyticsCharts />

      <!-- Finora AI Copilot & Financial Advisor -->
      <AiAdvisor />

      <!-- Budgets Preview & Goals Preview Grid -->
      <div class="two-col-grid">
        <BudgetSection />
        <GoalsSection />
      </div>

      <!-- Auto Daily Breakdown -->
      <DailyBreakdown onEditTransaction={handleEditTransaction} />

      <!-- Transaction List with Search & Export -->
      <TransactionList onEditTransaction={handleEditTransaction} />

    {:else if $activeTab === 'ai'}
      <!-- Dedicated Full AI Workspace -->
      <AiSmartInput />
      <AiAdvisor />

    {:else if $activeTab === 'breakdown'}
      <!-- Dedicated Daily Breakdown View -->
      <DailyBreakdown onEditTransaction={handleEditTransaction} />
      <TransactionList onEditTransaction={handleEditTransaction} />

    {:else if $activeTab === 'transactions'}
      <AiSmartInput />
      <TransactionList onEditTransaction={handleEditTransaction} />

    {:else if $activeTab === 'budgets'}
      <BudgetSection />
      <AnalyticsCharts />

    {:else if $activeTab === 'goals'}
      <GoalsSection />
    {/if}
  </main>

  <!-- Elegant App Footer with Heartfelt Copyright -->
  <Footer />

  <!-- Mobile Floating Navigation Dock -->
  <nav class="mobile-dock">
    <button
      class="dock-item"
      class:active={$activeTab === 'dashboard'}
      on:click={() => ($activeTab = 'dashboard')}
    >
      <i class="fa-solid fa-chart-pie"></i>
      <span>Beranda</span>
    </button>

    <button
      class="dock-item ai-dock"
      class:active={$activeTab === 'ai'}
      on:click={() => ($activeTab = 'ai')}
    >
      <i class="fa-solid fa-wand-magic-sparkles"></i>
      <span>Finora AI</span>
    </button>

    <!-- Floating Center Add Button -->
    <button class="dock-add-btn" on:click={() => openModal('expense')} title="Tambah Cepat">
      <i class="fa-solid fa-plus"></i>
    </button>

    <button
      class="dock-item"
      class:active={$activeTab === 'breakdown'}
      on:click={() => ($activeTab = 'breakdown')}
    >
      <i class="fa-solid fa-calendar-day"></i>
      <span>Perincian</span>
    </button>

    <button
      class="dock-item"
      class:active={$activeTab === 'transactions'}
      on:click={() => ($activeTab = 'transactions')}
    >
      <i class="fa-solid fa-receipt"></i>
      <span>Riwayat</span>
    </button>
  </nav>

  <!-- Add / Edit Transaction Modal -->
  <TransactionModal
    isOpen={isModalOpen}
    initialType={modalInitialType}
    editingTransaction={editingTx}
    onClose={closeModal}
  />

  <!-- Security Passcode Lock Overlay -->
  <SecurityLock
    isLocked={isAppLocked}
    onClose={unlockApp}
  />

  <!-- Global In-App Confirmation Dialog -->
  <ConfirmModal />
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
      z-index: 50;
      background: var(--navbar-bg);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border-top: 1px solid var(--border-glass);
      box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.15);
      padding: 8px 12px max(10px, env(safe-area-inset-bottom));
      justify-content: space-around;
      align-items: center;
      transition: background 0.25s ease, border-color 0.25s ease;
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
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--primary-gradient);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      box-shadow: 0 4px 20px var(--primary-glow);
      cursor: pointer;
      transform: translateY(-12px);
      transition: transform 0.15s ease;
    }

    .dock-add-btn:active {
      transform: translateY(-10px) scale(0.92);
    }
  }
</style>
