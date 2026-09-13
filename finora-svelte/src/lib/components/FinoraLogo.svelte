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
  <!-- Vector SVG Mark -->
  <div
    class="logo-mark"
    style="width: {dimensions.icon}px; height: {dimensions.icon}px;"
  >
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="logo-svg"
    >
      <defs>
        <linearGradient id="finoraGradPrimary" x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="35%" stop-color="#6366f1" />
          <stop offset="70%" stop-color="#8b5cf6" />
          <stop offset="100%" stop-color="#d946ef" />
        </linearGradient>

        <linearGradient id="finoraGradAccent" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#10b981" />
          <stop offset="45%" stop-color="#06b6d4" />
          <stop offset="100%" stop-color="#6366f1" />
        </linearGradient>

        <linearGradient id="finoraPlateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e1b4b" stop-opacity="0.85" />
          <stop offset="50%" stop-color="#0f172a" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#020617" stop-opacity="1" />
        </linearGradient>

        <filter id="finoraInnerGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <!-- Outer Squircle Bevel Plate -->
      <rect
        x="2"
        y="2"
        width="96"
        height="96"
        rx="26"
        fill="url(#finoraPlateGrad)"
        stroke="rgba(99, 102, 241, 0.45)"
        stroke-width="2"
        class="plate-rect"
      />

      <!-- Subtle Geometric Corner Accent -->
      <path
        d="M26 4 L74 4 C88 4 96 12 96 26"
        stroke="rgba(56, 189, 248, 0.5)"
        stroke-width="1.5"
        stroke-linecap="round"
        fill="none"
      />

      <!-- Ambient Glow Core -->
      <circle
        cx="50"
        cy="50"
        r="28"
        fill="#6366f1"
        opacity="0.25"
        filter="url(#finoraInnerGlow)"
        class="pulse-core"
      />

      <!-- Iconic Geometric 'F' + Growth Monogram -->
      <g filter="url(#finoraInnerGlow)">
        <!-- Vertical Backbone -->
        <path
          d="M29 23 C29 20.79 30.79 19 33 19 H38 C40.21 19 42 20.79 42 23 V77 C42 79.21 40.21 81 38 81 H33 C30.79 81 29 79.21 29 77 Z"
          fill="url(#finoraGradPrimary)"
          class="f-spine"
        />

        <!-- Top Growth Fin (Rising Apex) -->
        <path
          d="M42 22 C42 20.34 43.34 19 45 19 H65 C66.8 19 68.3 20.1 68.9 21.8 L76.8 41.2 C77.5 43.1 76.1 45 74.1 45 H55 C52.79 45 51 43.21 51 41 V33.5 C51 31.29 49.21 29.5 47 29.5 H42 V22 Z"
          fill="url(#finoraGradPrimary)"
          class="f-top"
        />

        <!-- Dynamic Middle Growth Ribbon -->
        <path
          d="M42 47.5 C42 45.84 43.34 44.5 45 44.5 H61 C63.21 44.5 65 46.29 65 48.5 V53 C65 55.21 63.21 57 61 57 H45 C43.34 57 42 55.66 42 54 V47.5 Z"
          fill="url(#finoraGradAccent)"
          class="f-mid"
        />

        <!-- Apex Diamond Beacon -->
        <polygon
          points="75,17 80,24 75,31 70,24"
          fill="#38bdf8"
          class="beacon-sparkle"
        />
        <circle cx="75" cy="24" r="2.2" fill="#ffffff" />
      </g>
    </svg>
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

  .logo-svg {
    width: 100%;
    height: 100%;
    overflow: visible;
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
