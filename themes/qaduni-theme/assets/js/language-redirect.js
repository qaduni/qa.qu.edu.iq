(function () {
    var STORAGE_KEY = 'qu_lang_preference';
    var path = window.location.pathname;
    var isHomepage = path === '/' || path === '/en/';

    // Capture explicit click on the language switcher BEFORE navigation
    // so the destination page sees the persisted preference. The link
    // template sets data-lang-switch="ar|en" on the <a>.
    document.addEventListener('click', function (event) {
        var link = event.target.closest && event.target.closest('a[data-lang-switch]');
        if (!link) return;
        try {
            localStorage.setItem(STORAGE_KEY, link.dataset.langSwitch);
        } catch (e) { /* private mode / quota — non-fatal */ }
    }, true);

    if (!isHomepage) return;

    // Query-string override wins over everything.
    var params = new URLSearchParams(window.location.search);
    var override = params.get('lang');
    if (override === 'ar' || override === 'en') {
        try { localStorage.setItem(STORAGE_KEY, override); } catch (e) {}
        return;  // honour the URL, don't redirect away from it
    }

    // Persisted preference (from a prior click or override) — never
    // auto-redirect once the user has expressed a choice.
    var stored;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (stored) return;

    var currentLang = document.documentElement.lang;
    var browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();

    // Default to Arabic; only redirect away to English if the browser
    // explicitly prefers English.
    var targetLang = 'ar';
    if (browserLang.indexOf('en') === 0) {
        targetLang = 'en';
    }

    if (targetLang === currentLang) {
        // Already on the right page — record the choice so we don't
        // re-evaluate on subsequent visits.
        try { localStorage.setItem(STORAGE_KEY, currentLang); } catch (e) {}
        return;
    }

    try { localStorage.setItem(STORAGE_KEY, targetLang); } catch (e) {}
    var newPath = targetLang === 'ar' ? '/' : '/' + targetLang + '/';
    window.location.replace(newPath);
})();
