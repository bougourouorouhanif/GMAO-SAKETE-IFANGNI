// Mini i18n — charge JSON locale, expose t(key)
(function (global) {
  const state = { locale: localStorage.getItem('locale') || 'fr', dict: {} };

  async function loadLocale(locale) {
    try {
      const res = await fetch(`/locales/${locale}.json`);
      state.dict = await res.json();
      state.locale = locale;
      localStorage.setItem('locale', locale);
    } catch (err) {
      console.error('i18n: chargement échoué', err);
    }
  }

  function t(key, fallback) {
    const parts = key.split('.');
    let cur = state.dict;
    for (const p of parts) {
      if (cur == null) return fallback ?? key;
      cur = cur[p];
    }
    return cur ?? fallback ?? key;
  }

  function applyDom(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'), el.textContent);
    });
  }

  global.i18n = { loadLocale, t, applyDom, get locale() { return state.locale; } };
})(window);
