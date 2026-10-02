<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { theme } from '$lib/stores.js';
  import { initSupabaseSync } from '$lib/supabaseSync.js';

  let deferredPrompt = null;
  let showInstallBanner = false;

  // Reactively apply theme to <html> and <body>
  $: if (browser && $theme) {
    document.documentElement.setAttribute('data-theme', $theme);
    if ($theme === 'light') {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    } else {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    }
  }

  onMount(() => {
    // Auto-connect to Supabase Cloud if credentials exist (env var or localStorage)
    if (browser) {
      initSupabaseSync();
    }

    // Capture PWA installation prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showInstallBanner = true;
    });
  });

  async function installPWA() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showInstallBanner = false;
    }
    deferredPrompt = null;
  }
</script>

<div class="app-layout">
  <!-- PWA Install Banner (if eligible) -->
  {#if showInstallBanner}
    <div class="pwa-banner">
      <div class="banner-content">
        <i class="fa-solid fa-mobile-screen-button"></i>
        <span>Pasang <strong>Finora Pro</strong> di perangkat Anda untuk akses cepat & offline!</span>
      </div>
      <div class="banner-actions">
        <button class="btn btn-primary btn-sm" on:click={installPWA}>
          Pasang Sekarang
        </button>
        <button class="btn-icon btn-outline" on:click={() => (showInstallBanner = false)}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
  {/if}

  <main class="main-content">
    <slot />
  </main>
</div>

<style>
  .app-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .main-content {
    flex: 1;
  }

  .pwa-banner {
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    color: white;
    padding: 10px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.85rem;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
    position: sticky;
    top: 0;
    z-index: 60;
  }

  .banner-content {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .banner-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 0.78rem;
    background: white;
    color: #4f46e5;
  }
</style>
