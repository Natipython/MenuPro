<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  // We will initialize GSAP and IndexedDB here later
</script>

<div class="app-shell">
  <main class="page-transition-wrapper">
    <slot />
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: #f9fafb;
    color: #111827;
  }
  
  .app-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  .page-transition-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
</style>
