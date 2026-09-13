<script>
  // Year dynamic
  const year = new Date().getFullYear();
</script>

<footer class="app-footer">
  <div class="footer-container">
    <div class="footer-divider"></div>
    
    <div class="footer-content">
      <p class="tagline">
        <strong class="brand-name">Finora</strong> © {year}
        <span class="bullet">•</span>
        <span class="motto">Menjaga Setiap Langkah Hari Ini, Menumbuhkan Ketenangan Finansial Esok Hari.</span>
      </p>
      
      <p class="author-credits">
        Dikembangkan oleh <span class="author-name">Andri Hermawan</span>
        <span class="heart-wrap">• dibuat dengan sepenuh cinta <i class="fa-solid fa-heart heart-icon"></i></span>
      </p>
    </div>
  </div>
</footer>

<style>
  .app-footer {
    width: 100%;
    margin-top: 36px;
    padding: 0 20px 24px;
    text-align: center;
    position: relative;
    z-index: 10;
  }

  .footer-container {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .footer-divider {
    width: 100%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--border-glass) 25%,
      var(--border-glass-hover) 50%,
      var(--border-glass) 75%,
      transparent 100%
    );
    margin-bottom: 4px;
  }

  .footer-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .tagline {
    margin: 0;
    font-size: 0.88rem;
    color: var(--text-muted);
    line-height: 1.6;
    letter-spacing: -0.01em;
  }

  .brand-name {
    font-weight: 800;
    color: var(--text-main);
    letter-spacing: 0.04em;
    background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .bullet {
    margin: 0 8px;
    color: var(--primary);
    opacity: 0.7;
    font-weight: 700;
  }

  .motto {
    font-weight: 500;
    color: var(--text-muted);
  }

  .author-credits {
    margin: 0;
    font-size: 0.82rem;
    color: var(--text-dim);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex-wrap: wrap;
    line-height: 1.5;
  }

  .author-name {
    font-weight: 700;
    color: var(--text-main);
    transition: color 0.2s ease;
  }

  .author-name:hover {
    color: var(--primary);
  }

  .heart-wrap {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .heart-icon {
    color: #f43f5e;
    font-size: 0.84rem;
    animation: heartBeat 2.4s ease-in-out infinite;
    display: inline-block;
  }

  @keyframes heartBeat {
    0%, 100% {
      transform: scale(1);
    }
    14% {
      transform: scale(1.22);
    }
    28% {
      transform: scale(1);
    }
    42% {
      transform: scale(1.18);
    }
    70% {
      transform: scale(1);
    }
  }


  @media (max-width: 640px) {
    .app-footer {
      padding: 0 16px 20px;
      margin-top: 24px;
    }

    .tagline {
      font-size: 0.8rem;
    }

    .bullet {
      display: none;
    }

    .motto {
      display: block;
      margin-top: 2px;
    }

    .author-credits {
      font-size: 0.76rem;
    }
  }
</style>
