<script>
  import { activeTab, syncStatus, lastSyncTime, currency, isPrivacyMode, theme } from '../stores.js';
  import FinoraLogo from './FinoraLogo.svelte';
  export let onOpenModal = () => {};
  export let onLockApp = () => {};

  const tabs = [
    { id: 'dashboard', label: 'Ringkasan', icon: 'fa-solid fa-chart-pie' },
    { id: 'ai', label: 'Finora AI', icon: 'fa-solid fa-wand-magic-sparkles', isAi: true },
    { id: 'breakdown', label: 'Perincian', icon: 'fa-solid fa-calendar-day' },
    { id: 'transactions', label: 'Transaksi', icon: 'fa-solid fa-receipt' },
    { id: 'budgets', label: 'Anggaran', icon: 'fa-solid fa-wallet' },
    { id: 'goals', label: 'Target', icon: 'fa-solid fa-bullseye' }
  ];

  function togglePrivacy() {
    isPrivacyMode.update((v) => !v);
  }

  function toggleTheme() {
    theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }
</script>

<header class="navbar-wrapper">
  <div class="navbar-container">
    <!-- Brand Logo -->
    <div class="brand-section" on:click={() => ($activeTab = 'dashboard')} style="cursor: pointer;" title="Finora Dashboard">
      <FinoraLogo size="md" showText={true} glow={true} />
    </div>

    <!-- Center Navigation Tabs -->
    <nav class="nav-tabs">
      {#each tabs as tab}
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
    </nav>

    <!-- Right Controls -->
    <div class="nav-actions">
      <!-- Currency Switcher -->
      <select bind:value={$currency} class="currency-select" title="Pilih Mata Uang">
        <option value="IDR">🇮🇩 IDR (Rp)</option>
        <option value="USD">🇺🇸 USD ($)</option>
        <option value="EUR">🇪🇺 EUR (€)</option>
      </select>

      <!-- Privacy Mode Toggle -->
      <button
        class="btn-icon btn-outline privacy-btn"
        on:click={togglePrivacy}
        title={$isPrivacyMode ? 'Tampilkan Nominal' : 'Sembunyikan Nominal'}
      >
        <i class={$isPrivacyMode ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'}></i>
      </button>

      <!-- Theme Switcher (Dark / Light Mode) -->
      <button
        class="btn-icon btn-outline theme-btn"
        on:click={toggleTheme}
        title={$theme === 'dark' ? 'Beralih ke Mode Terang (Light Mode)' : 'Beralih ke Mode Gelap (Dark Mode)'}
      >
        {#if $theme === 'dark'}
          <i class="fa-solid fa-moon text-amber"></i>
        {:else}
          <i class="fa-solid fa-sun text-amber"></i>
        {/if}
      </button>

      <!-- Security Lock Button -->
      <button
        class="btn-icon btn-outline lock-btn"
        on:click={onLockApp}
        title="Kunci Aplikasi dengan PIN"
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
    transition: background 0.25s ease, border-color 0.25s ease;
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
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(236, 72, 153, 0.3));
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
  .theme-btn {
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
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
    .nav-tabs {
      display: none;
    }
    .brand-sub {
      display: none;
    }
  }

  @media (max-width: 640px) {
    .navbar-wrapper {
      padding: 8px 14px;
    }
    .brand-logo {
      width: 36px;
      height: 36px;
      font-size: 1.1rem;
    }
    .brand-title {
      font-size: 1.05rem;
    }
    .pro-tag {
      display: none;
    }
    .nav-actions {
      gap: 6px;
    }
    .sync-text {
      display: none;
    }
    .sync-pill {
      padding: 6px 8px;
    }
    .currency-select {
      padding: 5px 6px;
      font-size: 0.75rem;
    }
    .privacy-btn,
    .lock-btn,
    .theme-btn {
      width: 32px;
      height: 32px;
      font-size: 0.85rem;
    }
    .cta-btn {
      display: none; /* Already present in mobile dock */
    }
  }
</style>
