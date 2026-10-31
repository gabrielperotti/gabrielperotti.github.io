(() => {
  'use strict';
  const origin = 'https://manny.man.ax';
  const launcher = document.getElementById('bito-launcher');
  const panel = document.getElementById('bito-panel');
  const feedback = document.getElementById('bito-feedback');
  const loading = document.getElementById('bito-loading');
  const errorMessage = document.getElementById('bito-error');
  const retry = document.getElementById('bito-retry');
  let sdkPromise;
  let initializing;
  let initialized = false;
  let iframe;
  let container;
  let visitorId;
  let widgetReady;

  function identity() {
    if (visitorId) return visitorId;
    try { visitorId = localStorage.getItem('gp-bito-visitor'); } catch { /* Memory fallback. */ }
    if (!/^gp-[a-f0-9]{32}$/.test(visitorId || '')) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      visitorId = 'gp-' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
      try { localStorage.setItem('gp-bito-visitor', visitorId); } catch { /* This page keeps its identity. */ }
    }
    return visitorId;
  }

  function loadSDK() {
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => finish(new Error('sdk_timeout')), 15000);
      function finish(error) {
        clearTimeout(timer);
        script.onload = script.onerror = null;
        if (error) { script.remove(); reject(error); } else resolve(window.AssistantSaaS);
      }
      script.src = origin + '/assistant-widget/client/assistant-saas.js';
      script.async = true;
      script.onload = () => finish(window.AssistantSaaS && ['init', 'open', 'close'].every(key => typeof window.AssistantSaaS[key] === 'function') ? null : new Error('sdk_invalid'));
      script.onerror = () => finish(new Error('sdk_load'));
      document.head.appendChild(script);
    }).catch(error => { sdkPromise = null; throw error; });
    return sdkPromise;
  }

  function showPanel() {
    panel.hidden = false;
    panel.inert = false;
    launcher.setAttribute('aria-expanded', 'true');
    panel.focus({ preventScroll: true });
  }

  function closePanel() {
    if (panel.hidden) return;
    if (initialized) window.AssistantSaaS.close();
    if (container) { container.hidden = true; container.inert = true; }
    panel.inert = true;
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus({ preventScroll: true });
  }

  function updateTitle() {
    if (iframe) iframe.title = panel.getAttribute('aria-label');
  }

  async function start() {
    if (initializing) return initializing;
    if (initialized) {
      container.hidden = false;
      container.inert = false;
      window.AssistantSaaS.open();
      iframe.focus({ preventScroll: true });
      return;
    }
    feedback.hidden = false;
    retry.hidden = true;
    loading.hidden = false;
    errorMessage.hidden = true;
    initializing = (async () => {
      let sdk;
      try {
        const id = identity();
        sdk = await loadSDK();
        sdk.init({
          tenantId: 'bito', userExternalId: id, userName: 'gabrielperotti.com',
          userDisplayName: 'Visitante del sitio Gabriel Perotti · ' + id.slice(-8),
          context: { environment: 'DEV' }, startOpened: false
        });
        container = document.getElementById('assistant-saas-container');
        iframe = container && container.querySelector('iframe');
        if (!iframe) throw new Error('widget_missing');
        // The SDK grants these by default; this integration needs no delegated permissions.
        iframe.setAttribute('allow', "microphone 'none'; clipboard-read 'none'; clipboard-write 'none'");
        updateTitle();
        container.hidden = true;
        container.inert = true;
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => { widgetReady = null; reject(new Error('widget_timeout')); }, 20000);
          widgetReady = () => { clearTimeout(timer); widgetReady = null; resolve(); };
        });
        container.hidden = panel.hidden;
        container.inert = panel.hidden;
        initialized = true;
        feedback.hidden = true;
        if (!panel.hidden) {
          sdk.open();
          if (document.activeElement === panel) iframe.focus({ preventScroll: true });
        }
      } catch {
        if (sdk && typeof sdk.destroy === 'function') sdk.destroy();
        iframe = null;
        container = null;
        feedback.hidden = false;
        retry.hidden = false;
        loading.hidden = true;
        errorMessage.hidden = false;
      } finally { initializing = null; }
    })();
    return initializing;
  }

  launcher.addEventListener('click', () => {
    if (!panel.hidden) return;
    showPanel();
    start();
  });
  retry.addEventListener('click', () => { panel.focus({ preventScroll: true }); start(); });
  document.addEventListener('keydown', event => {
    // Cross-origin iframe keystrokes do not bubble to the host.
    if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); closePanel(); }
  });
  window.addEventListener('message', event => {
    if (!iframe || event.origin !== origin || event.source !== iframe.contentWindow) return;
    if (event.data && event.data.type === 'assistant:ready' && widgetReady) widgetReady();
    if (event.data && event.data.type === 'assistant:closed') closePanel();
  });
  document.addEventListener('portfolio:language', updateTitle);
  launcher.hidden = false;
})();
