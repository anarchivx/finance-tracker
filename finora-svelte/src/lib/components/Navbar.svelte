<script>
  import {
    activeTab,
    currency,
    isPrivacyMode,
    theme,
    syncStatus
  } from "../stores.js";
  import FinoraLogo from "./FinoraLogo.svelte";
  import AllFeaturesModal from "./AllFeaturesModal.svelte";
  import CloudSyncModal from "./CloudSyncModal.svelte";
  import AdminKeyModal from "./AdminKeyModal.svelte";

  export let onOpenModal = () => {};
  export let onLockApp = () => {};

  let isAllFeaturesOpen = false;
  let isCloudModalOpen = false;
  let isAdminKeyModalOpen = false;

  const primaryTabs = [
    { id: "dashboard", label: "Ringkasan", icon: "fa-solid fa-chart-pie" },
    { id: "transactions", label: "Transaksi", icon: "fa-solid fa-receipt" },
    { id: "breakdown", label: "Perincian", icon: "fa-solid fa-calendar-day" },
    { id: "budgets", label: "Anggaran", icon: "fa-solid fa-wallet" },
    { id: "goals", label: "Target", icon: "fa-solid fa-bullseye" },
    {
      id: "ai",
      label: "Finora AI",
      icon: "fa-solid fa-wand-magic-sparkles",
      isAi: true,
    }
  ];

  const allTabsMap = {
    dashboard: "Ringkasan",
    transactions: "Transaksi",
    ai: "Finora AI",
    scanner: "Scan Struk",
    splitbill: "Split Bill",
    wallets: "Dompet",
    subscriptions: "Langganan",
    debts: "Hutang",
    report: "Laporan PDF",
    breakdown: "Perincian",
    budgets: "Anggaran",
    goals: "Target"
  };

  $: isSubTabActive = !primaryTabs.some((t) => t.id === $activeTab);
  $: activeSubTabName = allTabsMap[$activeTab] || '';

  function togglePrivacy() {
    isPrivacyMode.update((v) => !v);
  }

  function toggleTheme() {
    theme.update((t) => (t === "dark" ? "light" : "dark"));
  }
</script>

<header class="navbar-wrapper">
  <div class="navbar-container">
    <!-- Brand Logo -->
    <div
      class="brand-section"
      on:click={() => ($activeTab = "dashboard")}
      style="cursor: pointer;"
      title="Finora Dashboard"
    >
      <FinoraLogo size="md" showText={true} glow={true} />
    </div>

    <!-- Center Navigation Tabs -->
    <nav class="nav-tabs">
      {#each primaryTabs as tab}
        <button
          class="nav-tab-btn"
          class:active={$activeTab === tab.id}
          class:ai-tab={tab.isAi}
          on:click={() => ($activeTab = tab.id)}
        >
          <i class="{tab.icon} {tab.isAi ? 'ai-icon' : ''}"></i>
          <span>{tab.label}</span>
          {#if $activeTab === tab.id}
            <span class="active-indicator"></span>
          {/if}
        </button>
      {/each}

      <!-- All Features 1-Click Launcher Button -->
      <button
        class="nav-tab-btn all-features-trigger-btn"
        class:active={isSubTabActive}
        on:click={() => (isAllFeaturesOpen = true)}
        title="Buka Pusat Kontrol Fitur Ekstra (Scan Struk, Split Bill, Dompet, Langganan, Hutang, PDF)"
      >
        <i class="fa-solid fa-layer-group menu-grid-icon"></i>
        <span>Fitur Ekstra</span>
        {#if isSubTabActive && activeSubTabName}
          <span class="subtab-active-pill">{activeSubTabName}</span>
        {/if}
        <i class="fa-solid fa-chevron-down caret-icon"></i>
        {#if isSubTabActive}
          <span class="active-indicator"></span>
        {/if}
      </button>
    </nav>

    <!-- Right Controls -->
    <div class="nav-actions">
      <!-- Currency Switcher -->
      <select
        bind:value={$currency}
        class="currency-select"
        title="Pilih Mata Uang"
      >
        <option value="IDR">🇮🇩 IDR (Rp)</option>
        <option value="USD">🇺🇸 USD ($)</option>
        <option value="EUR">🇪🇺 EUR (€)</option>
      </select>

      <!-- Privacy Mode Toggle -->
      <button
        class="btn-icon btn-outline privacy-btn"
        on:click={togglePrivacy}
        title={$isPrivacyMode ? "Tampilkan Nominal" : "Sembunyikan Nominal"}
      >
        <i class={$isPrivacyMode ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}
        ></i>
      </button>

      <!-- Theme Switcher (Dark / Light Mode) -->
      <button
        class="btn-icon btn-outline theme-btn"
        on:click={toggleTheme}
        title={$theme === "dark"
          ? "Beralih ke Mode Terang (Light Mode)"
          : "Beralih ke Mode Gelap (Dark Mode)"}
      >
        {#if $theme === "dark"}
          <i class="fa-solid fa-moon text-amber"></i>
        {:else}
          <i class="fa-solid fa-sun text-amber"></i>
        {/if}
      </button>

      <!-- Cloud Database / Supabase Realtime Sync -->
      <button
        class="btn-icon btn-outline cloud-btn"
        class:is-connected={$syncStatus === 'cloud_connected'}
        on:click={() => (isCloudModalOpen = true)}
        title={$syncStatus === 'cloud_connected' ? 'Cloud Terhubung (Supabase Realtime Sync Aktif)' : 'Database Cloud / Supabase (Klik untuk Hubungkan)'}
      >
        {#if $syncStatus === 'cloud_connected'}
          <i class="fa-solid fa-cloud-bolt text-emerald"></i>
        {:else if $syncStatus === 'connecting'}
          <i class="fa-solid fa-spinner fa-spin text-amber"></i>
        {:else}
          <i class="fa-solid fa-cloud"></i>
        {/if}
      </button>

      <!-- Admin Authorization Key Button -->
      <button
        class="btn-icon btn-outline admin-key-btn"
        on:click={() => (isAdminKeyModalOpen = true)}
        title="Atur Kode Otorisasi Administrator (Master Recovery Key)"
      >
        <i class="fa-solid fa-key text-amber"></i>
      </button>

      <!-- Security Lock Button (Locks all connected devices simultaneously) -->
      <button
        class="btn-icon btn-outline lock-btn"
        on:click={onLockApp}
        title="Kunci Semua Perangkat (Lock All Devices)"
      >
        <i class="fa-solid fa-lock text-rose"></i>
      </button>

      <!-- Primary CTA: Quick Add -->
      <button class="btn btn-primary cta-btn" on:click={onOpenModal}>
        <i class="fa-solid fa-plus"></i>
        <span>Catat Baru</span>
      </button>
    </div>
  </div>
</header>

<AllFeaturesModal
  isOpen={isAllFeaturesOpen}
  onClose={() => (isAllFeaturesOpen = false)}
  onOpenAddModal={onOpenModal}
  onLockApp={onLockApp}
  onOpenCloudModal={() => (isCloudModalOpen = true)}
  onOpenAdminKeyModal={() => (isAdminKeyModalOpen = true)}
/>

<CloudSyncModal
  isOpen={isCloudModalOpen}
  onClose={() => (isCloudModalOpen = false)}
/>

<AdminKeyModal
  isOpen={isAdminKeyModalOpen}
  onClose={() => (isAdminKeyModalOpen = false)}
/>

<style>
  .navbar-wrapper {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--navbar-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border-glass);
    padding: 12px 24px;
    transition:
      background 0.25s ease,
      border-color 0.25s ease;
  }

  .navbar-container {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .brand-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand-logo {
    width: 42px;
    height: 42px;
    background: var(--primary-gradient);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 1.25rem;
    box-shadow: 0 0 20px var(--primary-glow);
  }

  .brand-title-wrap {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .brand-title {
    font-weight: 800;
    font-size: 1.25rem;
    letter-spacing: -0.5px;
    color: var(--text-main);
  }

  :global([data-theme="dark"]) .brand-title {
    background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  :global([data-theme="light"]) .brand-title,
  :global(body.light-mode) .brand-title {
    background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    color: #0f172a;
  }

  .pro-tag {
    font-size: 0.65rem;
    padding: 2.5px 7px;
    border-radius: 6px;
    background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
    color: #ffffff !important;
    -webkit-text-fill-color: #ffffff !important;
    font-weight: 800;
    letter-spacing: 0.6px;
    box-shadow: 0 2px 8px rgba(236, 72, 153, 0.35);
    border: none;
    line-height: 1.1;
    display: inline-flex;
    align-items: center;
  }

  .brand-sub {
    font-size: 0.72rem;
    color: var(--text-dim);
    letter-spacing: 0.2px;
  }

  .nav-tabs {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.04);
    padding: 4px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border-glass);
    gap: 4px;
  }

  .nav-tab-btn {
    position: relative;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 15px;
    border-radius: var(--radius-full);
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.84rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  .nav-tab-btn:hover {
    color: var(--text-main);
  }

  .nav-tab-btn.active {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.1);
  }

  .ai-tab.active {
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.3),
      rgba(236, 72, 153, 0.3)
    );
    color: #ffffff;
    border: 1px solid rgba(236, 72, 153, 0.4);
  }

  .ai-icon {
    color: #ec4899;
  }

  .active-indicator {
    position: absolute;
    bottom: -1px;
    left: 20%;
    right: 20%;
    height: 2px;
    background: var(--primary-gradient);
    border-radius: var(--radius-full);
  }

  .all-features-trigger-btn {
    background: rgba(99, 102, 241, 0.12);
    border: 1px solid rgba(99, 102, 241, 0.3) !important;
    color: #818cf8;
    gap: 8px;
    padding: 8px 16px;
    box-shadow: 0 2px 10px rgba(99, 102, 241, 0.15);
  }

  .all-features-trigger-btn:hover {
    background: rgba(99, 102, 241, 0.22);
    border-color: rgba(99, 102, 241, 0.5) !important;
    color: #ffffff;
    transform: translateY(-1px);
  }

  .all-features-trigger-btn.active {
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.35) 0%,
      rgba(168, 85, 247, 0.35) 100%
    );
    border-color: #818cf8 !important;
    color: #ffffff;
    box-shadow: 0 0 16px rgba(99, 102, 241, 0.35);
  }

  .menu-grid-icon {
    font-size: 0.95rem;
    color: #818cf8;
  }

  .all-features-trigger-btn.active .menu-grid-icon {
    color: #ffffff;
  }

  .subtab-active-pill {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
    background: #6366f1;
    color: #ffffff;
    margin-left: 2px;
    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.4);
  }

  .caret-icon {
    font-size: 0.72rem;
    opacity: 0.7;
    margin-left: 2px;
    transition: transform 0.2s ease;
  }

  .all-features-trigger-btn:hover .caret-icon {
    transform: translateY(1px);
    opacity: 1;
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .currency-select {
    padding: 7px 10px;
    background: var(--input-bg);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    color: var(--text-main);
    font-size: 0.8rem;
    font-weight: 600;
    outline: none;
    cursor: pointer;
  }

  .currency-select option {
    background: var(--bg-surface);
    color: var(--text-main);
  }

  .privacy-btn,
  .lock-btn,
  .theme-btn,
  .cloud-btn {
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cloud-btn.is-connected {
    background: rgba(16, 185, 129, 0.15);
    border-color: rgba(16, 185, 129, 0.4);
  }

  .text-emerald {
    color: #10b981;
  }

  .theme-btn:hover {
    transform: rotate(15deg);
    border-color: rgba(245, 158, 11, 0.4);
  }

  .lock-btn:hover {
    color: #f43f5e;
    border-color: rgba(244, 63, 94, 0.3);
  }

  .cta-btn {
    font-size: 0.85rem;
    padding: 8px 16px;
    border-radius: var(--radius-md);
  }

  @media (max-width: 1024px) {
    .navbar-wrapper {
      padding: 10px 16px;
    }
    .nav-tabs {
      display: none;
    }
    .brand-sub {
      display: none;
    }
    .brand-logo {
      width: 38px;
      height: 38px;
      font-size: 1.1rem;
    }
    .brand-title {
      font-size: 1.15rem;
    }
    .pro-tag {
      display: none;
    }
    .nav-actions {
      gap: 8px;
    }
    .currency-select {
      display: none; /* Disediakan rapi di menu bawah (Quick Hub) */
    }
    .lock-btn {
      display: none; /* Disediakan di menu bawah (Quick Hub) */
    }
    .privacy-btn,
    .theme-btn,
    .cloud-btn {
      width: 36px;
      height: 36px;
      font-size: 0.9rem;
    }
    .cta-btn {
      display: none; /* Sudah ada tombol tambah (+) mengambang di dock bawah */
    }
  }

  @media (max-width: 480px) {
    .navbar-wrapper {
      padding: 8px 12px;
    }
    .brand-logo {
      width: 34px;
      height: 34px;
      font-size: 1rem;
    }
    .brand-title {
      font-size: 1.05rem;
    }
    .privacy-btn,
    .theme-btn,
    .cloud-btn {
      width: 34px;
      height: 34px;
      font-size: 0.85rem;
    }
  }
</style>
