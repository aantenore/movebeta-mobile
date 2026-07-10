(function registerMoveBetaServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const registrationScript = document.currentScript;
  const serviceWorkerUrl = registrationScript?.dataset.serviceWorker || '/sw.js';

  window.addEventListener(
    'load',
    function registerAfterLoad() {
      navigator.serviceWorker.register(serviceWorkerUrl).catch(function ignoreRegistrationFailure() {
        // Service worker failures must not block local video analysis.
      });
    },
    { once: true },
  );
})();
