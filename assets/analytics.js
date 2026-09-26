'use strict';

// Basic consent: no vendor script, connection or event before a saved opt-in.
(() => {
  if (window.__hzAnalyticsReady) return;
  window.__hzAnalyticsReady = true;

  const GA_ID = 'G-P082GT179E';
  const CLARITY_ID = 'yod1p1xeaj';
  const KEY = 'hz-analytics-consent';
  const VERSION = 1;
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  const production = document.currentScript?.dataset.analyticsMode === 'production'
    && window.location.origin === 'https://zhao4hua4.github.io';
  const banner = document.getElementById('analytics-consent');
  if (!banner) return;
  const status = banner.querySelector('[data-consent-status]');
  const settings = document.querySelectorAll('[data-consent-settings]');
  const choices = banner.querySelectorAll('[data-consent-choice]');
  const advertisingDenied = {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
  };
  let started = false;
  let expiryTimer;
  let returnFocus;
  window['ga-disable-' + GA_ID] = true;

  function readChoice() {
    try {
      const raw = window.localStorage.getItem(KEY);
      const record = JSON.parse(raw);
      if (record?.version !== VERSION || !['accepted', 'declined'].includes(record.choice)
        || !Number.isSafeInteger(record.decidedAt) || record.decidedAt > Date.now()
        || Date.now() - record.decidedAt >= MAX_AGE) return null;
      // Fail closed if storage becomes unwritable, including after withdrawal.
      // Writing the same value does not extend consent or emit a storage event.
      window.localStorage.setItem(KEY, raw);
      return record;
    } catch { return null; }
  }

  function saveChoice(choice) {
    try {
      const value = JSON.stringify({ version: VERSION, choice, decidedAt: Date.now() });
      window.localStorage.setItem(KEY, value);
      return window.localStorage.getItem(KEY) === value;
    } catch { return false; }
  }

  function clearAnalyticsCookies() {
    try {
      const names = document.cookie.split(';').map(cookie => cookie.trim().split('=')[0]);
      const paths = new Set(['/']);
      const parts = window.location.pathname.split('/').filter(Boolean);
      parts.forEach((_, i) => {
        paths.add('/' + parts.slice(0, i + 1).join('/'));
        paths.add('/' + parts.slice(0, i + 1).join('/') + '/');
      });
      names.filter(name => /^(?:_ga(?:_|$)|_clck$|_clsk$)/.test(name)).forEach(name => {
        for (const path of paths) {
          for (const domain of ['', window.location.hostname, '.' + window.location.hostname]) {
            document.cookie = name + '=; Max-Age=0; Path=' + path
              + (domain ? '; Domain=' + domain : '') + '; SameSite=Lax';
          }
        }
      });
    } catch { /* Browser cookie restrictions must not prevent withdrawal. */ }
  }

  function showBanner(show, focus = false) {
    banner.hidden = !show;
    settings.forEach(button => button.setAttribute('aria-expanded', String(show)));
    if (focus) choices[0].focus({ preventScroll: true });
    if (!show && banner.contains(document.activeElement)) {
      (returnFocus || settings[0])?.focus({ preventScroll: true });
    }
  }

  function describeChoice(record) {
    const current = record?.choice === 'accepted' ? 'Analytics are on.' : 'Analytics are off.';
    status.textContent = production ? current : current + ' Tracking is disabled in this preview.';
  }

  function addScript(id, src) {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  }

  function startTracking() {
    if (started || !production || readChoice()?.choice !== 'accepted') return;
    started = true;
    window['ga-disable-' + GA_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { ...advertisingDenied, analytics_storage: 'denied' });
    window.gtag('consent', 'update', { ...advertisingDenied, analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      // Keep fragments and query-string values out of the configured page URL.
      page_location: window.location.origin + window.location.pathname,
      page_referrer: referrerOrigin()
    });
    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
    window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
    addScript('hz-google-tag', 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID);
    addScript('hz-clarity-tag', 'https://www.clarity.ms/tag/' + CLARITY_ID);
  }

  function referrerOrigin() {
    try { return new URL(document.referrer).origin; } catch { return ''; }
  }

  function stopTracking() {
    window['ga-disable-' + GA_ID] = true;
    if (started) {
      started = false;
      try {
        window.gtag('consent', 'update', { ...advertisingDenied, analytics_storage: 'denied' });
      } catch { /* Withdrawal must still work if a vendor is blocked. */ }
      try {
        window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
        window.clarity('stop');
      } catch { /* Reload also unloads a partially loaded or blocked vendor. */ }
      clearAnalyticsCookies();
      // Denied-mode Clarity can still collect. A reload removes both SDKs entirely.
      window.location.reload();
    } else {
      clearAnalyticsCookies();
    }
  }

  function refreshChoice() {
    const record = readChoice();
    window.clearTimeout(expiryTimer);
    describeChoice(record);
    if (record?.choice === 'accepted') startTracking();
    else stopTracking();
    showBanner(!record);
    if (record) {
      expiryTimer = window.setTimeout(refreshChoice,
        Math.min(MAX_AGE - (Date.now() - record.decidedAt), 2147483647));
    }
  }

  settings.forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => {
      returnFocus = button;
      describeChoice(readChoice());
      showBanner(true, true);
    });
  });
  choices.forEach(button => button.addEventListener('click', () => {
    const choice = button.dataset.consentChoice;
    if (!saveChoice(choice)) {
      if (choice === 'declined') {
        try { window.localStorage.removeItem(KEY); } catch { /* Storage can be blocked. */ }
      }
      stopTracking();
      status.textContent = 'Your browser could not save this choice. Analytics remain off.';
      return;
    }
    refreshChoice();
  }));
  banner.querySelector('[data-consent-close]').addEventListener('click', () => showBanner(false));
  banner.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); showBanner(false); }
  });

  // Keep all open pages in sync and recheck expiry when a sleeping page resumes.
  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) refreshChoice();
  });
  window.addEventListener('pageshow', refreshChoice);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshChoice();
  });

  // Purpose-specific actions complement GA's standard page and outbound events.
  // Only fixed categories and destination domains are sent, never a mailto URL.
  document.addEventListener('click', event => {
    if (!started || readChoice()?.choice !== 'accepted') return;
    const anchor = event.target.closest?.('a[href]');
    if (!anchor) return;
    let url;
    try { url = new URL(anchor.href, window.location.href); } catch { return; }
    const paperHosts = ['arxiv.org', 'doi.org', 'aclanthology.org', 'onlinelibrary.wiley.com', 'link.springer.com', 'dl.acm.org'];
    const kind = url.protocol === 'mailto:' ? 'contact_click'
      : url.hostname === 'github.com' ? 'github_click'
      : paperHosts.includes(url.hostname) ? 'paper_click' : null;
    if (!kind) return;
    window.gtag('event', kind, { destination: kind === 'contact_click' ? 'email' : url.hostname });
    window.clarity('event', kind);
  });

  refreshChoice();
})();
