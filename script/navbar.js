/* ================================================================
   NAVBAR — navbar.js
   Load in <head> WITHOUT defer so setLang() exists before any
   onclick="setLang(...)" button in the HTML fires.

   BURGER ICON STRATEGY
   ────────────────────
   We inject three plain <line> SVG elements into the .burger button:
     .b-top  — top bar    → rotates down  to become the \ of ✕
     .b-mid  — middle bar → shrinks/fades away from center
     .b-bot  — bottom bar → rotates up    to become the / of ✕

   CSS transitions handle all the animation via .burger.open.
   The button background also flips dark so lines turn white.

   TYPEWRITER CONTRACT
   ───────────────────
   navbar.js never calls runTypeWriter() on page load.
   script.js owns the initial typewriter run:

       document.addEventListener('DOMContentLoaded', function () {
         var lang = window.getSavedLang ? window.getSavedLang() : 'en';
         runTypeWriter(lang);
       });

   When the user switches language, navbar.js calls
   window.runTypeWriter(lang) after clearing the spans.
   ================================================================ */

/* ── Expose setLang immediately (called by onclick in HTML) ── */
window.setLang = function (lang) { applyLang(lang, true); };

function applyLang(lang, userTriggered) {
  document.documentElement.lang = lang === 'ne' ? 'ne' : 'en';

  ['btn-en', 'btn-en-mob'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('active', lang === 'en');
  });
  ['btn-ne', 'btn-ne-mob'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('active', lang === 'ne');
  });

  document.querySelectorAll('[data-en]').forEach(function (el) {
    if (el.classList.contains('lang-btn')) return;
    var t = el.getAttribute('data-' + lang);
    if (t !== null) el.innerHTML = t;
  });

  if (userTriggered) {
    var welcome    = document.querySelector('.hero-content .welcome');
    var churchName = document.querySelector('.hero-content .church-name');
    if (welcome)    welcome.textContent    = '';
    if (churchName) churchName.textContent = '';

    if (typeof window.runTypeWriter === 'function') {
      window.runTypeWriter(lang);
    }

    document.dispatchEvent(new CustomEvent('dm:langchange', { detail: { lang: lang } }));
  }

  var enBlock = document.querySelector('.full-lang-en');
  var neBlock = document.querySelector('.full-lang-ne');
  if (enBlock) enBlock.style.display = lang === 'en' ? '' : 'none';
  if (neBlock) neBlock.style.display = lang === 'ne' ? '' : 'none';

  var rmBtn = document.querySelector('.senior-message-modern .read-more-btn');
  var rmMsg = document.querySelector('.senior-message-modern .full-message');
  if (rmBtn && rmMsg && rmMsg.style.display !== 'block') {
    rmBtn.textContent = lang === 'ne' ? 'थप पढ्नुहोस्' : 'Read More';
  }

  try { localStorage.setItem('dm-lang', lang); } catch (_) {}
}

window.getSavedLang = function () {
  try { return localStorage.getItem('dm-lang') || 'en'; } catch (_) { return 'en'; }
};

/* ================================================================
   navbarInit — all DOM-dependent logic lives here.
   ================================================================ */
function navbarInit() {

  if (window._navbarReady) return;
  window._navbarReady = true;

  var savedLang = window.getSavedLang();
  applyLang(savedLang, false);

  /* ── Config ── */
  var SHEET_ID          = '1eX7ASnXSRjB7MHr6woWxfjhsti6zNCS9eP--h9J5_fs';
  var NOTICES_GID       = '998080244';
  var TOAST_MS          = 6000;
  var TOAST_COOLDOWN_MS = 2 * 60 * 60 * 1000;
  var TOAST_TS_KEY      = 'dm-toast-last';

  var allNotices = [];
  var readSet    = new Set();
  var expandedId = null;
  var toastTimer = null;

  try {
    var r = sessionStorage.getItem('dm-read');
    if (r) readSet = new Set(JSON.parse(r));
  } catch (_) {}

  function saveReads() {
    try { sessionStorage.setItem('dm-read', JSON.stringify([...readSet])); } catch (_) {}
  }

  var notifBtn   = document.getElementById('notif-btn');
  var notifBadge = document.getElementById('notif-badge');
  var notifPanel = document.getElementById('notif-panel');
  var notifList  = document.getElementById('notif-list');
  var toast      = document.getElementById('notif-toast');
  var burger     = document.getElementById('burger');
  var navLinks   = document.getElementById('nav-links');

  if (!notifBtn || !burger || !navLinks) return;

  /* ════════════════════════════════════════════════════════════
     BURGER SVG INJECTION
     ────────────────────
     Clear any existing children, then inject a single inline SVG
     with three <line> elements:
       .b-top  — top bar
       .b-mid  — middle bar
       .b-bot  — bottom bar

     CSS in navbar.css animates them via .burger.open:
       .b-top → translateY(7px) rotate(45deg)   → becomes \
       .b-mid → scaleX(0) + opacity 0            → disappears
       .b-bot → translateY(-7px) rotate(-45deg)  → becomes /

     transform-origin is pinned to each bar's own Y coordinate
     so rotations pivot correctly from the bar itself.
  ════════════════════════════════════════════════════════════ */
  burger.innerHTML = '';

  var NS  = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');

  /* Helper: create a <line> at a given Y position with a CSS class */
  function mkBar(cls, y) {
    var l = document.createElementNS(NS, 'line');
    l.setAttribute('class', cls);
    l.setAttribute('x1', '3');
    l.setAttribute('y1', String(y));
    l.setAttribute('x2', '17');
    l.setAttribute('y2', String(y));
    return l;
  }

  svg.appendChild(mkBar('b-top', 3));
  svg.appendChild(mkBar('b-mid', 10));
  svg.appendChild(mkBar('b-bot', 17));
  burger.appendChild(svg);

  /* ── Burger open/close state ── */
  var menuOpen = false;

  function setBurgerState(open) {
    menuOpen = open;
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    navLinks.classList.toggle('open', open);
  }

  /* Always boot closed */
  setBurgerState(false);

  burger.addEventListener('click', function (e) {
    e.stopPropagation();
    setBurgerState(!menuOpen);
  });

  function closeMobileMenu() {
    setBurgerState(false);
  }

  /* ── Bell toggle ── */
  notifBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = notifPanel.classList.toggle('open');
    notifBtn.setAttribute('aria-expanded', String(open));
    if (open) dismissToast();
  });

  /* Prevent toast "View all" from being immediately closed */
  var suppressNextPanelClose = false;

  document.addEventListener('click', function (e) {
    var wrapper = document.getElementById('notif-wrapper');

    /* Close notification panel when clicking outside */
    if (wrapper && !wrapper.contains(e.target)) {
      if (suppressNextPanelClose) {
        suppressNextPanelClose = false;
      } else {
        notifPanel.classList.remove('open');
        notifBtn.setAttribute('aria-expanded', 'false');
      }
    }

    /* Close mobile menu when clicking outside burger + nav drawer */
    if (!burger.contains(e.target) && !navLinks.contains(e.target)) {
      closeMobileMenu();
    }

    /* Close toast when clicking outside */
    if (toast && toast.classList.contains('show') && !toast.contains(e.target)) {
      dismissToast();
    }
  });

  var markAllBtn = document.getElementById('mark-all-btn');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', function () {
      allNotices.forEach(function (n) { readSet.add(n.id); });
      saveReads();
      updateBadge();
      renderList();
    });
  }

  var toastClose   = document.getElementById('toast-close');
  var toastViewBtn = document.getElementById('toast-view-btn');
  if (toastClose) toastClose.addEventListener('click', dismissToast);

  if (toastViewBtn) {
    toastViewBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      suppressNextPanelClose = true;
      dismissToast();
      notifPanel.classList.add('open');
      notifBtn.setAttribute('aria-expanded', 'true');
    });
  }

  /* ── Active nav link ── */
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
        items.sort(function (a, b) { return (b.rawDate || 0) - (a.rawDate || 0); });
        return items;
      })
      .catch(function (e) { console.error('Notices fetch error:', e); return null; });
  }

  function renderList() {
    if (!allNotices.length) {
      notifList.innerHTML = '<div class="notif-empty"><i class="far fa-bell-slash"></i>No notices right now</div>';
      return;
    }
    notifList.innerHTML = '';
    allNotices.forEach(function (n) {
      var unread = !readSet.has(n.id);
      var wrap   = document.createElement('div');

      var importantBadge = n.category === 'important'
        ? '<span class="notif-important-badge" title="Important"><i class="fas fa-exclamation-circle"></i></span>'
        : '';

      var btn = document.createElement('button');
      btn.className = 'notif-item' + (unread ? ' unread' : '') + ' cat-' + n.category;
      btn.dataset.id = n.id;
      btn.innerHTML =
        '<div class="notif-dot"></div>' +
        '<div class="notif-body">' +
          '<div class="notif-top">' +
            '<div class="notif-title">' + esc(n.title) + importantBadge + '</div>' +
            '<div class="notif-date">'  + esc(n.date)  + '</div>' +
          '</div>' +
          '<div class="notif-chevron"><i class="fas fa-chevron-down"></i></div>' +
        '</div>';
      btn.addEventListener('click', function (e) { e.stopPropagation(); toggleExpand(n); });

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

  function updateBadge() {
    var count = allNotices.filter(function (n) { return !readSet.has(n.id); }).length;
    notifBadge.textContent = count > 9 ? '9+' : count;
    notifBadge.classList.toggle('hidden', count === 0);
    notifBtn.classList.toggle('has-unread', count > 0);
  }

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

  /* ── Utilities ── */
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
}

/* ── Run when DOM is ready, however the script was loaded ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', navbarInit);
} else {
  navbarInit();
}