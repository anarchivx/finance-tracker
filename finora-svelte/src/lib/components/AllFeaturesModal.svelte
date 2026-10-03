<script>
  import { activeTab, isPrivacyMode, theme, currency } from '../stores.js';
  import FinoraLogo from './FinoraLogo.svelte';
  import ScanReceiptIcon from './ScanReceiptIcon.svelte';

  export let isOpen = false;
  export let onClose = () => {};
  export let onOpenAddModal = () => {};
  export let onLockApp = () => {};
  export let onOpenCloudModal = () => {};

  let searchQuery = '';

  const featureSections = [
    {
      title: 'Pusat Keuangan & Transaksi',
      description: 'Ringkasan arus kas, mutasi, perincian, dan slip laporan',
      items: [
        {
          id: 'dashboard',
          title: 'Ringkasan Dashboard',
          subtitle: 'Ikhtisar total saldo, analitik & metrik',
          icon: 'fa-solid fa-chart-pie',
          color: '#3b82f6',
          bg: 'rgba(59, 130, 246, 0.15)',
          badge: 'Utama'
        },
        {
          id: 'transactions',
          title: 'Riwayat Transaksi',
          subtitle: 'Daftar lengkap mutasi masuk & keluar',
          icon: 'fa-solid fa-receipt',
          color: '#10b981',
          bg: 'rgba(16, 185, 129, 0.15)',
          badge: 'Aktif'
        },
        {
          id: 'breakdown',
          title: 'Perincian Harian',
          subtitle: 'Kalender pengeluaran hari demi hari',
          icon: 'fa-solid fa-calendar-day',
          color: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.15)',
          badge: 'Kalender'
        },
        {
          id: 'report',
          title: 'Laporan PDF Eksekutif',
          subtitle: 'Slip resmi siap cetak & Finora Wrapped',
          icon: 'fa-solid fa-file-invoice-dollar',
          color: '#06b6d4',
          bg: 'rgba(6, 182, 212, 0.15)',
          badge: 'PDF Print'
        }
      ]
    },
    {
      title: 'Fitur Cerdas Finora AI',
      description: 'Asisten keuangan artificial intelligence & computer vision',
      items: [
        {
          id: 'ai',
          title: 'Finora AI Copilot',
          subtitle: 'Analisis kesehatan finansial & advisor',
          icon: 'fa-solid fa-wand-magic-sparkles',
          color: '#ec4899',
          bg: 'rgba(236, 72, 153, 0.15)',
          badge: 'AI Engine'
        },
        {
          id: 'scanner',
          title: 'Scan Struk (OCR Vision)',
          subtitle: 'Pindai nota/struk belanjaan otomatis',
          icon: 'fa-solid fa-camera',
          color: '#a855f7',
          bg: 'rgba(168, 85, 247, 0.15)',
          badge: 'Auto-OCR'
        },
        {
          id: 'splitbill',
          title: 'Split Bill Nongkrong',
          subtitle: 'Kalkulator patungan makan & rincian WA',
          icon: 'fa-solid fa-users-viewfinder',
          color: '#14b8a6',
          bg: 'rgba(20, 184, 166, 0.15)',
          badge: 'Kirim WA'
        }
      ]
    },
    {
      title: 'Dompet, Beban & Perencanaan',
      description: 'Manajemen likuiditas kas, komitmen rutin, dan impian',
      items: [
        {
          id: 'wallets',
          title: 'Rekening & Dompet',
          subtitle: 'BCA, GoPay, Tunai & transfer saldo',
          icon: 'fa-solid fa-credit-card',
          color: '#2563eb',
          bg: 'rgba(37, 99, 235, 0.15)',
          badge: 'Multi-Akun'
        },
        {
          id: 'subscriptions',
          title: 'Langganan & Tagihan',
          subtitle: 'Netflix, WiFi, BPJS & jatuh tempo',
          icon: 'fa-solid fa-repeat',
          color: '#f43f5e',
          bg: 'rgba(244, 63, 94, 0.15)',
          badge: 'Auto-Debit'
        },
        {
          id: 'debts',
          title: 'Hutang & Piutang',
          subtitle: 'Pinjaman teman & pengingat WhatsApp',
          icon: 'fa-solid fa-handshake-angle',
          color: '#0ea5e9',
          bg: 'rgba(14, 165, 233, 0.15)',
          badge: 'Kontak WA'
        },
        {
          id: 'budgets',
          title: 'Anggaran Bulanan',
          subtitle: 'Batas kuota pengeluaran per kategori',
          icon: 'fa-solid fa-wallet',
          color: '#8b5cf6',
          bg: 'rgba(139, 92, 246, 0.15)',
          badge: 'Limit'
        },
        {
          id: 'goals',
          title: 'Target Impian',
          subtitle: 'Tabungan dana darurat & wishlist',
          icon: 'fa-solid fa-bullseye',
          color: '#10b981',
          bg: 'rgba(16, 185, 129, 0.15)',
          badge: 'Goals'
        },
        {
          id: 'cloud_sync',
          title: 'Cloud Database (Supabase)',
          subtitle: 'Akses bersama & realtime sync multi-device',
          icon: 'fa-solid fa-cloud-bolt',
          color: '#0284c7',
          bg: 'rgba(2, 132, 199, 0.15)',
          badge: 'Multi-User'
        }
      ]
    }
  ];

  // Filtering based on search query
  $: filteredSections = featureSections
    .map((sec) => ({
      ...sec,
      items: sec.items.filter(
        (it) =>
          it.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          it.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sec.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }))
    .filter((sec) => sec.items.length > 0);

  function selectFeature(id) {
    if (id === 'cloud_sync') {
      onClose();
      onOpenCloudModal();
      return;
    }
    $activeTab = id;
    onClose();
  }

  function handleKeydown(e) {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- Backdrop -->
  <div class="menu-modal-backdrop" on:click={onClose} role="dialog" aria-modal="true">
    <!-- Card Content -->
    <div class="menu-modal-card" on:click|stopPropagation role="document">
      <!-- Header -->
      <div class="modal-top-bar">
        <div class="brand-wrap">
          <FinoraLogo size="sm" showText={true} glow={true} />
          <span class="hub-pill">Pusat Navigasi & Kontrol</span>
        </div>
        <button class="close-btn" on:click={onClose} title="Tutup Menu (Esc)">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Search Bar -->
      <div class="search-wrap">
        <i class="fa-solid fa-magnifying-glass search-icon"></i>
        <input
          type="text"
          class="search-input"
          placeholder="Cari fitur Finora... (misal: struk, hutang, transfer, dompet, pdf)"
          bind:value={searchQuery}
          autofocus
        />
        {#if searchQuery}
          <button class="clear-btn" on:click={() => (searchQuery = '')}>
            <i class="fa-solid fa-xmark"></i>
          </button>
        {/if}
      </div>

      <!-- Menu Body Grids -->
      <div class="modal-body-scroll">
        {#each filteredSections as sec}
          <div class="section-group">
            <div class="section-heading">
              <h4>{sec.title}</h4>
              <p>{sec.description}</p>
            </div>

            <div class="features-grid">
              {#each sec.items as item (item.id)}
                <button
                  class="feature-tile-btn"
                  class:active={$activeTab === item.id}
                  on:click={() => selectFeature(item.id)}
                >
                  <div class="tile-icon-box" style="background: {item.bg}; color: {item.color};">
                    {#if item.id === 'scanner'}
                      <ScanReceiptIcon size={22} animated={false} glow={false} />
                    {:else}
                      <i class="{item.icon}"></i>
                    {/if}
                  </div>

                  <div class="tile-info">
                    <div class="tile-top-row">
                      <span class="tile-title">{item.title}</span>
                      <span class="tile-badge">{item.badge}</span>
                    </div>
                    <span class="tile-subtitle">{item.subtitle}</span>
                  </div>

                  {#if $activeTab === item.id}
                    <div class="current-indicator" title="Menu yang sedang aktif">
                      <i class="fa-solid fa-circle-check"></i>
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <!-- Quick Utility Footer -->
      <div class="modal-footer-utilities">
        <div class="util-left">
          <button
            class="util-pill-btn"
            on:click={() => {
              $isPrivacyMode = !$isPrivacyMode;
            }}
          >
            <i class={$isPrivacyMode ? "fa-solid fa-eye-slash text-rose" : "fa-solid fa-eye text-emerald"}></i>
            <span>{$isPrivacyMode ? 'Mode Privasi: Aktif' : 'Mode Privasi: Nonaktif'}</span>
          </button>

          <button
            class="util-pill-btn"
            on:click={() => {
              $theme = $theme === 'dark' ? 'light' : 'dark';
            }}
          >
            <i class={$theme === 'dark' ? "fa-solid fa-moon text-amber" : "fa-solid fa-sun text-amber"}></i>
            <span>{$theme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}</span>
          </button>

          <button
            class="util-pill-btn"
            on:click={() => {
              onClose();
              onLockApp();
            }}
          >
            <i class="fa-solid fa-lock text-rose"></i>
            <span>Kunci PIN</span>
          </button>
        </div>

        <button
          class="btn-cta-quick-add"
          on:click={() => {
            onClose();
            onOpenAddModal();
          }}
        >
          <i class="fa-solid fa-plus"></i>
          <span>Catat Transaksi Baru</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .menu-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(3, 7, 18, 0.82);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem;
    animation: fadeIn 0.2s ease;
  }

  .menu-modal-card {
    width: 100%;
    max-width: 960px;
    max-height: 88vh;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 24px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08);
    animation: scaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Top Bar */
  .modal-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.75rem;
    border-bottom: 1px solid var(--border-color);
  }

  .brand-wrap {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .hub-pill {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    background: rgba(99, 102, 241, 0.15);
    color: #818cf8;
    border: 1px solid rgba(99, 102, 241, 0.3);
  }

  .close-btn {
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    transition: all 0.15s ease;
  }

  .close-btn:hover {
    color: var(--text-primary);
    transform: scale(1.05);
  }

  /* Search Bar */
  .search-wrap {
    position: relative;
    padding: 1rem 1.75rem 0.5rem 1.75rem;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 2.75rem;
    color: var(--text-muted);
    font-size: 1rem;
  }

  .search-input {
    width: 100%;
    padding: 0.8rem 1rem 0.8rem 2.8rem;
    background: var(--bg-main);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    color: var(--text-primary);
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .search-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
  }

  .clear-btn {
    position: absolute;
    right: 2.75rem;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
  }

  /* Modal Body */
  .modal-body-scroll {
    padding: 1rem 1.75rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .section-group {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .section-heading h4 {
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .section-heading p {
    font-size: 0.76rem;
    color: var(--text-muted);
    margin: 0.15rem 0 0 0;
  }

  /* Features Grid */
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 0.85rem;
  }

  .feature-tile-btn {
    background: var(--bg-main);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.85rem;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s ease;
    position: relative;
  }

  .feature-tile-btn:hover {
    transform: translateY(-2px);
    border-color: #6366f1;
    box-shadow: 0 8px 20px -6px rgba(0, 0, 0, 0.3);
  }

  .feature-tile-btn.active {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.08);
  }

  .tile-icon-box {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .tile-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    flex: 1;
    overflow: hidden;
  }

  .tile-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
  }

  .tile-title {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tile-badge {
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.15rem 0.45rem;
    border-radius: 6px;
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .tile-subtitle {
    font-size: 0.74rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .current-indicator {
    color: #10b981;
    font-size: 0.95rem;
  }

  /* Footer Utilities */
  .modal-footer-utilities {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.75rem;
    background: var(--bg-hover);
    border-top: 1px solid var(--border-color);
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .util-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .util-pill-btn {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    font-size: 0.76rem;
    font-weight: 600;
    padding: 0.45rem 0.8rem;
    border-radius: 999px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    transition: all 0.15s ease;
  }

  .util-pill-btn:hover {
    background: var(--bg-main);
    color: var(--text-primary);
  }

  .btn-cta-quick-add {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: #ffffff;
    font-size: 0.84rem;
    font-weight: 700;
    padding: 0.6rem 1.15rem;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    transition: transform 0.15s ease;
  }

  .btn-cta-quick-add:hover {
    transform: translateY(-1px);
  }

  .text-rose { color: #f43f5e; }
  .text-emerald { color: #10b981; }
  .text-amber { color: #f59e0b; }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }

  @media (max-width: 680px) {
    .features-grid {
      grid-template-columns: 1fr;
    }
    .modal-footer-utilities {
      flex-direction: column;
      align-items: stretch;
    }
    .btn-cta-quick-add {
      justify-content: center;
    }
  }

  :global([data-theme="light"]) .menu-modal-card {
    background: #ffffff !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
    box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.15) !important;
  }

  :global([data-theme="light"]) .search-input {
    background: #f8fafc !important;
    color: #0f172a !important;
    border-color: rgba(148, 163, 184, 0.35) !important;
  }

  :global([data-theme="light"]) .feature-tile {
    background: #ffffff !important;
    border-color: rgba(148, 163, 184, 0.28) !important;
  }

  :global([data-theme="light"]) .feature-tile:hover {
    background: #f8fafc !important;
    border-color: #6366f1 !important;
  }

  :global([data-theme="light"]) .tile-title {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .tile-subtitle {
    color: #475569 !important;
  }

  :global([data-theme="light"]) .tile-badge {
    background: #f1f5f9 !important;
    color: #475569 !important;
  }

  :global([data-theme="light"]) .modal-footer-utilities {
    background: #f8fafc !important;
    border-top-color: rgba(148, 163, 184, 0.25) !important;
  }

  :global([data-theme="light"]) .util-pill-btn {
    background: #ffffff !important;
    color: #334155 !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
  }

  :global([data-theme="light"]) .util-pill-btn:hover {
    background: #f1f5f9 !important;
    color: #0f172a !important;
  }
</style>
