/* ================================================================
   NAVBAR — navbar.js
   Load in <head> WITHOUT defer so setLang() exists before any
   onclick="setLang(...)" button in the HTML fires.
   ================================================================

   TYPEWRITER CONTRACT
   ───────────────────
   navbar.js never calls runTypeWriter() on page load.
   script.js owns the initial typewriter run. It should read the
   saved language like this and pass it in:

       document.addEventListener('DOMContentLoaded', function () {
         var lang = window.getSavedLang ? window.getSavedLang() : 'en';
         runTypeWriter(lang);
       });

   When the user explicitly switches language via the EN/NE buttons,
   navbar.js calls window.runTypeWriter(lang) after clearing the spans.
   ================================================================ */

/* ── Expose setLang immediately (called by onclick in HTML) ── */
window.setLang = function (lang) { applyLang(lang, true); };

/*
  applyLang(lang, userTriggered)
    userTriggered = true  → explicit button click → restart typewriter
    userTriggered = false → page-load restore     → skip typewriter
                            (script.js handles it)
*/
function applyLang(lang, userTriggered) {
  document.documentElement.lang = lang === 'ne' ? 'ne' : 'en';

  /* Sync all EN/NE toggle buttons */
  ['btn-en', 'btn-en-mob'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('active', lang === 'en');
  });
  ['btn-ne', 'btn-ne-mob'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('active', lang === 'ne');
  });

  /* Swap every [data-en] / [data-ne] element */
  document.querySelectorAll('[data-en]').forEach(function (el) {
    if (el.classList.contains('lang-btn')) return;
    var t = el.getAttribute('data-' + lang);
    if (t !== null) el.innerHTML = t;
  });

  /* ── Only on explicit user switch ── */
  if (userTriggered) {
    /* Clear hero spans first so typewriter starts fresh */
    var welcome    = document.querySelector('.hero-content .welcome');
    var churchName = document.querySelector('.hero-content .church-name');
    if (welcome)    welcome.textContent    = '';
    if (churchName) churchName.textContent = '';

    /* Call script.js typewriter if available */
    if (typeof window.runTypeWriter === 'function') {
      window.runTypeWriter(lang);
    }
  }

  /* Always: toggle bilingual pastor message blocks */
  var enBlock = document.querySelector('.full-lang-en');
  var neBlock = document.querySelector('.full-lang-ne');
  if (enBlock) enBlock.style.display = lang === 'en' ? '' : 'none';
  if (neBlock) neBlock.style.display = lang === 'ne' ? '' : 'none';

  /* Always: read-more button label when message is collapsed */
  var rmBtn = document.querySelector('.senior-message-modern .read-more-btn');
  var rmMsg = document.querySelector('.senior-message-modern .full-message');
  if (rmBtn && rmMsg && rmMsg.style.display !== 'block') {
    rmBtn.textContent = lang === 'ne' ? 'थप पढ्नुहोस्' : 'Read More';
  }

  try { localStorage.setItem('dm-lang', lang); } catch (_) {}
}

/* ── Expose saved language for script.js to read ── */
window.getSavedLang = function () {
  try { return localStorage.getItem('dm-lang') || 'en'; } catch (_) { return 'en'; }
};

/* ── Everything that needs the DOM ── */
document.addEventListener('DOMContentLoaded', function () {

  /* Restore saved language — no typewriter, script.js handles that */
  var savedLang = window.getSavedLang();
  applyLang(savedLang, false);

  /* ── Config ── */
  var SHEET_ID          = '1eX7ASnXSRjB7MHr6woWxfjhsti6zNCS9eP--h9J5_fs';
  var NOTICES_GID       = '998080244';
  var TOAST_MS          = 6000;
  var TOAST_COOLDOWN_MS = 2 * 60 * 60 * 1000; /* 2 hours */
  var TOAST_TS_KEY      = 'dm-toast-last';

  var allNotices = [];
  var readSet    = new Set();
  var expandedId = null;
  var toastTimer = null;

  /* Persist read state across pages within a session */
  try { var r = sessionStorage.getItem('dm-read'); if (r) readSet = new Set(JSON.parse(r)); } catch (_) {}
  function saveReads() { try { sessionStorage.setItem('dm-read', JSON.stringify([...readSet])); } catch (_) {} }

  /* DOM refs */
  var notifBtn   = document.getElementById('notif-btn');
  var notifBadge = document.getElementById('notif-badge');
  var notifPanel = document.getElementById('notif-panel');
  var notifList  = document.getElementById('notif-list');
  var toast      = document.getElementById('notif-toast');
  var burger     = document.getElementById('burger');
  var navLinks   = document.getElementById('nav-links');

  if (!notifBtn || !burger || !navLinks) return;

  /* ── Burger menu ──
     Icon swaps between fa-bars (closed) and fa-times (open).
     No CSS transform tricks — the icon IS the state indicator.
  ── */
  function setBurgerIcon(open) {
    var icon = burger.querySelector('i');
    if (!icon) return;
    if (open) {
      icon.classList.remove('fa-bars');
      icon.classList.add('fa-times');
    } else {
      icon.classList.remove('fa-times');
      icon.classList.add('fa-bars');
    }
  }

  burger.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = navLinks.classList.toggle('open');
    setBurgerIcon(open);
    burger.setAttribute('aria-expanded', String(open));
  });

  function closeMobileMenu() {
    navLinks.classList.remove('open');
    setBurgerIcon(false);
    burger.setAttribute('aria-expanded', 'false');
  }

  /* Bell toggle */
  notifBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = notifPanel.classList.toggle('open');
    notifBtn.setAttribute('aria-expanded', String(open));
    if (open) dismissToast();
  });

  /* Close on outside click */
  document.addEventListener('click', function (e) {
    var wrapper = document.getElementById('notif-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      notifPanel.classList.remove('open');
      notifBtn.setAttribute('aria-expanded', 'false');
    }
    /* Only close mobile menu if it is currently open AND the click was outside */
    if (navLinks.classList.contains('open') &&
        !burger.contains(e.target) &&
        !navLinks.contains(e.target)) {
      closeMobileMenu();
    }
    if (toast && toast.classList.contains('show') && !toast.contains(e.target)) {
      dismissToast();
    }
  });

  /* Mark all read */
  var markAllBtn = document.getElementById('mark-all-btn');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', function () {
      allNotices.forEach(function (n) { readSet.add(n.id); });
      saveReads(); updateBadge(); renderList();
    });
  }

  /* Toast controls */
  var toastClose   = document.getElementById('toast-close');
  var toastViewBtn = document.getElementById('toast-view-btn');
  if (toastClose)   toastClose.addEventListener('click', dismissToast);
  if (toastViewBtn) toastViewBtn.addEventListener('click', function () {
    dismissToast();
    notifPanel.classList.add('open');
    notifBtn.setAttribute('aria-expanded', 'true');
  });

  /* Mark current page nav link active */
  (function () {
    var current = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links li a').forEach(function (a) {
      if (a.getAttribute('href') === current) a.classList.add('active-page');
    });
  })();

  /* ── Fetch notices ── */
  function fetchNotices() {
    var url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID +
              '/gviz/tq?gid=' + NOTICES_GID + '&tqx=out:json&t=' + Date.now();
    return fetch(url)
      .then(function (res) { return res.text(); })
      .then(function (text) {
        var m = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+?)\);?\s*$/);
        if (!m) return [];
        var json  = JSON.parse(m[1]);
        var items = [];
        json.table.rows.forEach(function (row, i) {
          var c = row.c;
          if (!c || !c[0] || !c[0].v) return;
          if (i === 0 && c[0].v === 'Title') return;
          items.push({
            id:       i,
            title:    (c[0] && c[0].v) ? c[0].v.toString() : '',
            rawDate:  parseRawDate(c[1] && c[1].v),
            date:     fmtDate(c[1] && c[1].v),
            category: (c[2] && c[2].v) ? c[2].v.toString().toLowerCase().trim() : 'general',
            details:  (c[3] && c[3].v) ? c[3].v.toString() : '',
            link:     (c[4] && c[4].v) ? c[4].v.toString() : null
          });
        });
        /* Newest first */
        items.sort(function (a, b) { return (b.rawDate || 0) - (a.rawDate || 0); });
        return items;
      })
      .catch(function (e) { console.error('Notices fetch error:', e); return null; });
  }

  /* ── Render list ──
     Collapsed view: title + date only (no description)
     Expanded view:  full details + optional link
  ── */
  function renderList() {
    if (!allNotices.length) {
      notifList.innerHTML = '<div class="notif-empty"><i class="far fa-bell-slash"></i>No notices right now</div>';
      return;
    }
    notifList.innerHTML = '';
    allNotices.forEach(function (n) {
      var unread = !readSet.has(n.id);
      var wrap   = document.createElement('div');

      /* Collapsed button — title + date only, NO description */
      var btn = document.createElement('button');
      btn.className = 'notif-item' + (unread ? ' unread' : '') + ' cat-' + n.category;
      btn.dataset.id = n.id;
      btn.innerHTML =
        '<div class="notif-dot"></div>' +
        '<div class="notif-body">' +
          '<div class="notif-top">' +
            '<div class="notif-title">' + esc(n.title) + '</div>' +
            '<div class="notif-date">'  + esc(n.date)  + '</div>' +
          '</div>' +
          '<div class="notif-chevron"><i class="fas fa-chevron-down"></i></div>' +
        '</div>';
      btn.addEventListener('click', function (e) { e.stopPropagation(); toggleExpand(n); });

      /* Expanded panel — full description + optional link */
      var exp = document.createElement('div');
      exp.className = 'notif-expanded';
      exp.id = 'ne-' + n.id;
      exp.innerHTML =
        '<div class="notif-expanded-inner">' +
          esc(n.details) +
          (n.link
            ? '<br><a href="' + esc(n.link) + '" target="_blank" rel="noopener">' +
              '<i class="fas fa-external-link-alt"></i> Open link</a>'
            : '') +
        '</div>';

      wrap.appendChild(btn);
      wrap.appendChild(exp);
      notifList.appendChild(wrap);
    });

    /* Re-open previously expanded item */
    if (expandedId !== null) {
      setTimeout(function () {
        var el  = document.getElementById('ne-' + expandedId);
        var btn = notifList.querySelector('[data-id="' + expandedId + '"]');
        if (el)  el.classList.add('open');
        if (btn) btn.classList.add('expanded');
      }, 0);
    }
  }

  function toggleExpand(n) {
    if (!readSet.has(n.id)) { readSet.add(n.id); saveReads(); updateBadge(); }
    var closing = expandedId === n.id;
    expandedId = closing ? null : n.id;
    renderList();
  }

  /* ── Badge ── */
  function updateBadge() {
    var count = allNotices.filter(function (n) { return !readSet.has(n.id); }).length;
    notifBadge.textContent = count > 9 ? '9+' : count;
    notifBadge.classList.toggle('hidden', count === 0);
    notifBtn.classList.toggle('has-unread', count > 0);
  }

  /* ── Toast — only "important" category, 2-hour cooldown ── */
  function maybeShowToast(notices) {
    var important = null;
    for (var i = 0; i < notices.length; i++) {
      if (notices[i].category === 'important') { important = notices[i]; break; }
    }
    if (!important) return;

    var last = 0;
    try { last = parseInt(localStorage.getItem(TOAST_TS_KEY) || '0', 10); } catch (_) {}
    if (Date.now() - last < TOAST_COOLDOWN_MS) return;

    try { localStorage.setItem(TOAST_TS_KEY, String(Date.now())); } catch (_) {}
    setTimeout(function () { showToast(important); }, 900);
  }

  function showToast(n) {
    if (!toast) return;
    document.getElementById('toast-bar').className = 'toast-bar ' + n.category;

    var icon = document.getElementById('toast-icon');
    icon.className = 'toast-icon-wrap ' + n.category;
    icon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';

    var cat = document.getElementById('toast-cat');
    cat.className   = 'toast-cat ' + n.category;
    cat.textContent = cap(n.category);

    document.getElementById('toast-ttl').textContent = n.title;
    document.getElementById('toast-dsc').textContent = n.details;

    var fill = document.getElementById('toast-fill');
    fill.style.animation = 'none';
    void fill.offsetWidth;
    fill.style.animation = 'shrink ' + TOAST_MS + 'ms linear forwards';

    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(dismissToast, TOAST_MS);
  }

  function dismissToast() {
    if (toast) toast.classList.remove('show');
    clearTimeout(toastTimer);
  }

  /* ── Init ── */
  fetchNotices().then(function (notices) {
    if (!notices) {
      notifList.innerHTML = '<div class="notif-empty"><i class="far fa-bell-slash"></i>Could not load notices</div>';
      return;
    }
    allNotices = notices;
    updateBadge();
    renderList();
    maybeShowToast(notices);
  });

  /* ── Helpers ── */
  function esc(s) {
    return (s == null ? '' : String(s))
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
  function parseRawDate(v) {
    if (!v) return 0;
    var m = String(v).match(/Date\((\d+),(\d+),(\d+)\)/);
    var d = m ? new Date(+m[1], +m[2], +m[3]) : new Date(v);
    return isNaN(d) ? 0 : d.getTime();
  }
  function fmtDate(v) {
    var ts = parseRawDate(v);
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

});