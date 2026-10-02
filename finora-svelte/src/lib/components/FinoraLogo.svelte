<script>
  export let size = 'md'; // 'xs' (20px), 'sm' (28px), 'md' (38px), 'lg' (54px), 'xl' (76px), 'hero' (96px)
  export let showText = false;
  export let textSub = 'Intelligent Wealth Hub';
  export let animated = false;
  export let glow = true;
  export let className = '';

  const sizeMap = {
    xs: { icon: 20, font: '0.85rem', sub: '0.55rem' },
    sm: { icon: 28, font: '1.05rem', sub: '0.62rem' },
    md: { icon: 38, font: '1.25rem', sub: '0.68rem' },
    lg: { icon: 54, font: '1.65rem', sub: '0.78rem' },
    xl: { icon: 76, font: '2.1rem', sub: '0.85rem' },
    hero: { icon: 96, font: '2.6rem', sub: '0.95rem' }
  };

  $: dimensions = sizeMap[size] || {
    icon: typeof size === 'number' ? size : 38,
    font: '1.25rem',
    sub: '0.68rem'
  };
</script>

<div
  class="finora-brand-wrapper {className}"
  class:animated
  class:has-glow={glow}
>
  <!-- 3D Titanium Crystal Mark -->
  <div
    class="logo-mark"
    style="width: {dimensions.icon}px; height: {dimensions.icon}px;"
  >
    <img
      src="/logo.png"
      alt="Finora"
      class="logo-img"
    />
  </div>

  <!-- Optional Wordmark & Subtitle -->
  {#if showText}
    <div class="brand-text-block">
      <div class="brand-title" style="font-size: {dimensions.font};">
        <span class="text-fin">FIN</span><span class="text-ora">ORA</span>
      </div>
      {#if textSub}
        <div class="brand-sub" style="font-size: {dimensions.sub};">
          {textSub}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .finora-brand-wrapper {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    user-select: none;
    line-height: 1;
  }

  .logo-mark {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .logo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 26%;
    display: block;
  }

  .has-glow .logo-mark {
    filter: drop-shadow(0 0 14px rgba(99, 102, 241, 0.45));
  }

  :global([data-theme="light"]) .has-glow .logo-mark,
  :global(body.light-mode) .has-glow .logo-mark {
    filter: drop-shadow(0 4px 12px rgba(99, 102, 241, 0.25));
  }

  /* Animated Breathing & Floating Option */
  .animated .logo-mark {
    animation: finoraFloat 4s ease-in-out infinite;
  }

  .animated .pulse-core {
    animation: finoraCorePulse 3s ease-in-out infinite alternate;
  }

  .animated .beacon-sparkle {
    animation: finoraSparkle 2.5s ease-in-out infinite;
  }

  @keyframes finoraFloat {
    0%, 100% {
      transform: translateY(0px) rotate(0deg);
    }
    50% {
      transform: translateY(-4px) rotate(1deg);
    }
  }

  @keyframes finoraCorePulse {
    0% {
      opacity: 0.18;
      r: 26;
    }
    100% {
      opacity: 0.45;
      r: 32;
    }
  }

  @keyframes finoraSparkle {
    0%, 100% {
      opacity: 0.7;
      transform: scale(0.95);
      transform-origin: 75px 24px;
    }
    50% {
      opacity: 1;
      transform: scale(1.15);
      transform-origin: 75px 24px;
    }
  }

  .brand-text-block {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
  }

  .brand-title {
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    font-weight: 900;
    letter-spacing: 0.07em;
    display: inline-flex;
    align-items: baseline;
  }

  .text-fin {
    color: var(--text-main, #ffffff);
    transition: color 0.2s ease;
  }

  .text-ora {
    background: linear-gradient(135deg, #818cf8 0%, #c084fc 60%, #38bdf8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .brand-sub {
    color: var(--text-muted, #94a3b8);
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-size: 0.68rem;
  }

  :global([data-theme="light"]) .text-fin,
  :global(body.light-mode) .text-fin {
    color: #0f172a;
  }
</style>
