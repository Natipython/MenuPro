<script lang="ts">
  // Simple marketing landing page
</script>

<svelte:head>
  <title>MenuApp Pro | Smart QR Menus & POS</title>
</svelte:head>

<div class="landing-page">
  <nav class="main-nav">
    <div class="logo">MenuApp Pro</div>
    <div class="nav-links">
      <a href="#features">Features</a>
      <a href="#pricing">Pricing</a>
      <a href="/onboarding" class="btn-login">Sign Up / Login</a>
    </div>
  </nav>

  <header class="hero">
    <div class="hero-content">
      <h1>The Modern Operating System for Restaurants</h1>
      <p>Beautiful QR menus, frictionless ordering, kitchen display systems, and deep analytics. Built for cafes, restaurants, bars, and food trucks.</p>
      <div class="cta-group">
        <a href="/onboarding" class="btn-primary">Start Free Trial</a>
        <a href="#demo" class="btn-secondary">View Demo</a>
      </div>
    </div>
    <div class="hero-image">
      <div class="mockup-screen">
        <div class="mockup-header"></div>
        <div class="mockup-body">
          <div class="mockup-card"></div>
          <div class="mockup-card"></div>
          <div class="mockup-card"></div>
        </div>
      </div>
    </div>
  </header>

  <section class="features" id="features">
    <div class="feature">
      <div class="feature-icon">📱</div>
      <h3>Smart QR Menus</h3>
      <p>Table-specific QR codes that allow customers to browse, order, and pay from their own phones.</p>
    </div>
    <div class="feature">
      <div class="feature-icon">👨‍🍳</div>
      <h3>Kitchen Display (KDS)</h3>
      <p>Real-time order synchronization with your kitchen staff. No more lost paper tickets.</p>
    </div>
    <div class="feature">
      <div class="feature-icon">📊</div>
      <h3>Deep Analytics</h3>
      <p>Track your best-selling items, peak hours, and staff performance in real-time.</p>
    </div>
  </section>

  <section class="templates-preview">
    <h2>24 Pre-Built Business Templates</h2>
    <p>Whether you're a high-end restaurant, a bustling coffee shop, or a pop-up food truck, we have a layout optimized for your specific menu structure.</p>
    <a href="/onboarding" class="btn-outline">Explore Templates</a>
  </section>

  <footer class="footer">
    <div class="footer-content">
      <div class="brand">MenuApp Pro &copy; 2026</div>
      <div class="links">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/contact">Contact</a>
      </div>
    </div>
  </footer>
</div>

<style>
  :global(body) { margin: 0; font-family: system-ui, sans-serif; background: #f9fafb; color: #111827; }
  
  .landing-page { display: flex; flex-direction: column; min-height: 100vh; }
  
  .main-nav { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 5%; background: white; border-bottom: 1px solid #e5e7eb; }
  .logo { font-size: 1.5rem; font-weight: bold; color: #3b82f6; }
  .nav-links { display: flex; gap: 2rem; align-items: center; }
  .nav-links a { text-decoration: none; color: #4b5563; font-weight: 500; transition: color 0.2s; }
  .nav-links a:hover { color: #111827; }
  .btn-login { background: #111827; color: white !important; padding: 0.5rem 1rem; border-radius: 6px; }
  .btn-login:hover { background: #374151; }

  .hero { display: flex; align-items: center; justify-content: space-between; padding: 5rem 5%; background: linear-gradient(to right bottom, #ffffff, #eff6ff); }
  .hero-content { flex: 1; max-width: 600px; }
  .hero h1 { font-size: 3.5rem; line-height: 1.2; margin: 0 0 1.5rem 0; color: #111827; letter-spacing: -0.02em; }
  .hero p { font-size: 1.25rem; color: #6b7280; margin: 0 0 2rem 0; line-height: 1.6; }
  
  .cta-group { display: flex; gap: 1rem; }
  .btn-primary { background: #3b82f6; color: white; text-decoration: none; padding: 1rem 2rem; border-radius: 8px; font-weight: bold; font-size: 1.1rem; transition: background 0.2s; }
  .btn-primary:hover { background: #2563eb; }
  .btn-secondary { background: white; color: #374151; text-decoration: none; padding: 1rem 2rem; border-radius: 8px; font-weight: bold; font-size: 1.1rem; border: 1px solid #d1d5db; transition: background 0.2s; }
  .btn-secondary:hover { background: #f3f4f6; }

  .hero-image { flex: 1; display: flex; justify-content: center; }
  .mockup-screen { width: 300px; height: 600px; background: white; border-radius: 30px; border: 12px solid #111827; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); display: flex; flex-direction: column; overflow: hidden; }
  .mockup-header { height: 60px; background: #3b82f6; }
  .mockup-body { padding: 1rem; flex: 1; background: #f3f4f6; display: flex; flex-direction: column; gap: 1rem; }
  .mockup-card { background: white; height: 100px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

  .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 3rem; padding: 5rem 5%; background: white; }
  .feature { text-align: center; }
  .feature-icon { font-size: 3rem; margin-bottom: 1rem; }
  .feature h3 { font-size: 1.5rem; margin: 0 0 1rem 0; }
  .feature p { color: #6b7280; line-height: 1.6; }

  .templates-preview { text-align: center; padding: 5rem 5%; background: #111827; color: white; }
  .templates-preview h2 { font-size: 2.5rem; margin: 0 0 1rem 0; }
  .templates-preview p { font-size: 1.25rem; color: #9ca3af; max-width: 600px; margin: 0 auto 2rem auto; line-height: 1.6; }
  .btn-outline { display: inline-block; background: transparent; color: white; text-decoration: none; padding: 1rem 2rem; border-radius: 8px; font-weight: bold; border: 2px solid white; transition: all 0.2s; }
  .btn-outline:hover { background: white; color: #111827; }

  .footer { background: white; border-top: 1px solid #e5e7eb; padding: 2rem 5%; margin-top: auto; }
  .footer-content { display: flex; justify-content: space-between; align-items: center; }
  .brand { font-weight: bold; color: #6b7280; }
  .links { display: flex; gap: 1.5rem; }
  .links a { color: #6b7280; text-decoration: none; font-size: 0.875rem; }
  .links a:hover { color: #111827; }

  @media (max-width: 768px) {
    .hero { flex-direction: column; text-align: center; padding: 3rem 5%; gap: 3rem; }
    .cta-group { justify-content: center; flex-direction: column; }
    .hero h1 { font-size: 2.5rem; }
    .nav-links { display: none; /* simple mobile nav hide for demo */ }
  }
</style>
