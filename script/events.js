// ================================================================
// EVENTS.JS
// ================================================================

document.addEventListener("DOMContentLoaded", function () {

  // ── Sheet URLs ────────────────────────────────────────────────
  const SHEET_UPCOMING = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwzUR_NyZvDSpuMht8Xn4E8e2fNRy5cfyFprzkCy0tNRQYEVGnB-c3mKFHI8-DQACZUtCTVTRdIr7v/pub?gid=0&single=true&output=csv';
  const SHEET_PAST     = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwzUR_NyZvDSpuMht8Xn4E8e2fNRy5cfyFprzkCy0tNRQYEVGnB-c3mKFHI8-DQACZUtCTVTRdIr7v/pub?gid=1201565484&single=true&output=csv';

  const PER_PAGE     = 9;
  const MONTHS       = ["January","February","March","April","May","June",
                        "July","August","September","October","November","December"];
  const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun",
                        "Jul","Aug","Sep","Oct","Nov","Dec"];

  // ── State ─────────────────────────────────────────────────────
  let cachedUpcoming   = [];
  let cachedMemories   = [];
  let filteredMemories = [];
  let filteredSmall    = [];
  let shownSmall       = 0;
  let shownMemories    = 0;
  let currentFilter    = 'all';
  let currentPage      = null;
  let calMonth, calYear;
  let calEventMap      = {};

  // ── DOM refs ──────────────────────────────────────────────────
  const navLinks   = document.querySelectorAll(".events-nav a");
  const contentDiv = document.getElementById("events-content");
  const loadingBuf = document.getElementById("loading-buffer");
  const urlParams  = new URLSearchParams(window.location.search);

  // ── Helpers ───────────────────────────────────────────────────
  function getSavedLang() {
    try { return localStorage.getItem('dm-lang') || 'en'; } catch (e) { return 'en'; }
  }

  function reApplyLang() {
    if (typeof window.applyLang === 'function') {
      window.applyLang(window.dmLang || getSavedLang());
    }
  }

  function showLoader() {
    contentDiv.classList.remove('visible');
    contentDiv.style.display = 'none';
    loadingBuf.style.display = 'flex';
    loadingBuf.style.opacity = '1';
  }

  function hideLoader() {
    contentDiv.style.display = 'block';
    void contentDiv.offsetHeight;
    contentDiv.classList.add('visible');
    loadingBuf.style.opacity = '0';
    setTimeout(() => { loadingBuf.style.display = 'none'; }, 350);
  }

  function stripLinks(html) {
    return html.replace(/<link[^>]*>/gi, '');
  }

  // ── Convert Google Drive share URL to embeddable thumbnail URL ──
  // Google blocks uc?export=view for hotlinking; thumbnail endpoint works.
  // sz=w1200 requests up to 1200px wide — Google serves the closest size.
  function driveToDirectUrl(url) {
    if (!url) return '';
    // Extract file ID from any Drive URL format
    const m = url.match(/\/file\/d\/([^/?#]+)/) ||
              url.match(/[?&]id=([^&]+)/);
    if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1200';
    return url;
  }

  // ── Page loading ──────────────────────────────────────────────
  function loadPage(page) {
    if (currentPage === page) return;
    currentPage   = page;
    currentFilter = 'all';
    shownSmall    = 0;
    shownMemories = 0;
    calEventMap   = {};

    navLinks.forEach(l => l.classList.remove('active'));
    const active = document.querySelector('.events-nav a[data-page="' + page + '"]');
    if (active) active.classList.add('active');

    history.pushState(null, '', '?page=' + page);
    showLoader();

    fetch('partials/' + page + '.html')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(html => {
        contentDiv.innerHTML = stripLinks(html);
        requestAnimationFrame(() => {
          if (page === 'events-upcoming') initUpcoming();
          if (page === 'events-past')     initPast();
          hideLoader();
          reApplyLang();
        });
      })
      .catch(() => {
        contentDiv.innerHTML =
          '<div style="text-align:center;padding:4rem 2rem;color:#777;font-family:Poppins,sans-serif;">' +
          'Unable to load content. Please refresh the page.</div>';
        hideLoader();
      });
  }

  // ── UPCOMING ──────────────────────────────────────────────────
  function initUpcoming() {
    initCalendars();
    initFilters();
    initSearch();
    loadCSV(SHEET_UPCOMING, false);
  }

  // ── PAST / MEMORIES ───────────────────────────────────────────
  function initPast() {
    initMemoryFilters();
    initLightbox();
    loadMemories();
  }

  // ── Load memories from Google Sheet CSV ───────────────────────
  // Sheet columns: Event Name | Date(MM/DD/YYYY) | Time | Location |
  //                Event Size | Category | Description | Images
  function loadMemories() {
    fetch(SHEET_PAST)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(csv => {
        const now   = new Date();
        const lines = csv.split('\n');
        cachedMemories = [];

        for (let i = 1; i < lines.length; i++) {
          const raw = lines[i].trim();
          if (!raw) continue;
          const c = parseCSVLine(raw);
          if (c.length < 2) continue;

          const title       = (c[0] || '').trim();
          const dateStr     = (c[1] || '').trim();
          // c[2] = time, c[3] = location, c[4] = size
          const category    = (c[5] || 'others').trim().toLowerCase();
          const description = (c[6] || '').trim();
          const imageRaw    = (c[7] || '').trim();
          const image       = driveToDirectUrl(imageRaw);

          if (!title || !dateStr) continue;

          const dp = dateStr.split('/');
          if (dp.length !== 3) continue;
          const dt = new Date(parseInt(dp[2], 10), parseInt(dp[0], 10) - 1, parseInt(dp[1], 10));
          if (isNaN(dt.getTime())) continue;

          // Only past entries
          if (dt >= now) continue;

          cachedMemories.push({ title, fullDateTime: dt, category, description, image });
        }

        cachedMemories.sort((a, b) => b.fullDateTime - a.fullDateTime); // newest first
        applyMemoryFilter(currentFilter);
      })
      .catch(err => {
        console.error('Memories CSV error:', err);
        const container = document.getElementById('event-container');
        if (container) container.innerHTML =
          '<div class="events-empty">Unable to load memories. Please try again later.</div>';
      });
  }

  // ── Apply filter and re-render memories ───────────────────────
  function applyMemoryFilter(filter) {
    currentFilter = filter;
    shownMemories = 0;
    const f = (filter || 'all').toLowerCase();
    filteredMemories = f === 'all'
      ? cachedMemories
      : cachedMemories.filter(m => (m.category || 'others').toLowerCase() === f);

    const container = document.getElementById('event-container');
    if (!container) return;
    container.innerHTML = '';

    if (filteredMemories.length === 0) {
      container.innerHTML = '<div class="events-empty">No memories found for this filter.</div>';
      reApplyLang();
      return;
    }

    renderMemoryBatch();
    reApplyLang();
  }

  // ── Render a batch of memory cards ────────────────────────────
  function renderMemoryBatch() {
    const container = document.getElementById('event-container');
    const loadBtn   = document.getElementById('load-more-btn');
    if (!container) return;

    const batch = filteredMemories.slice(shownMemories, shownMemories + PER_PAGE);
    shownMemories += batch.length;

    const frag = document.createDocumentFragment();
    batch.forEach(m => frag.appendChild(buildMemoryItem(m)));
    container.appendChild(frag);

    if (loadBtn) {
      loadBtn.hidden = shownMemories >= filteredMemories.length;
      loadBtn.onclick = renderMemoryBatch;
    }
  }

  // ── Build a single memory timeline item ───────────────────────
  function buildMemoryItem(mem) {
    const { title, fullDateTime, description, image } = mem;
    const day       = fullDateTime.getDate();
    const month     = MONTHS_SHORT[fullDateTime.getMonth()];
    const year      = fullDateTime.getFullYear();
    const dateLabel = day + ' ' + month + ' ' + year;

    const item = document.createElement('div');
    item.className = 'memory-item';

    const imgHtml = image
      ? '<img class="memory-img" src="' + esc(image) + '" alt="' + esc(title) + '" loading="lazy" ' +
        'onerror="this.closest(\'.memory-img-wrap\').classList.add(\'img-error\')" />'
      : '<div class="memory-img-placeholder"><i class="fas fa-image"></i></div>';

    item.innerHTML =
      '<div class="memory-card" role="button" tabindex="0" aria-label="View memory: ' + esc(title) + '">' +
        '<div class="memory-img-wrap">' +
          imgHtml +
          '<div class="memory-img-overlay">' +
            '<i class="fas fa-expand memory-img-overlay-icon"></i>' +
          '</div>' +
          '<span class="memory-date-badge">' + dateLabel + '</span>' +
        '</div>' +
        '<div class="memory-card-body">' +
          '<h3 class="memory-card-title">' + esc(title) + '</h3>' +
          (description ? '<p class="memory-card-desc">' + esc(description) + '</p>' : '') +
        '</div>' +
      '</div>';

    const card = item.querySelector('.memory-card');
    card.addEventListener('click', () => openLightbox(mem));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(mem); }
    });

    return item;
  }

  // ── Memory filters ────────────────────────────────────────────
  function initMemoryFilters() {
    document.querySelectorAll('#events-filters .filter-pill').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#events-filters .filter-pill')
          .forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        applyMemoryFilter(this.dataset.filter);
      });
    });
  }

  // ── Lightbox ──────────────────────────────────────────────────
  function initLightbox() {
    const lb    = document.getElementById('mem-lightbox');
    const close = document.getElementById('mem-lightbox-close');
    if (!lb || !close) return;

    close.addEventListener('click', closeLightbox);
    lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
    document.addEventListener('keydown', lbKeyHandler);
  }

  function openLightbox(mem) {
    const lb      = document.getElementById('mem-lightbox');
    const img     = document.getElementById('mem-lightbox-img');
    const caption = document.getElementById('mem-lightbox-caption');
    if (!lb || !img || !caption) return;

    const day   = mem.fullDateTime.getDate();
    const month = MONTHS[mem.fullDateTime.getMonth()];
    const year  = mem.fullDateTime.getFullYear();

    img.src = mem.image || '';
    img.alt = mem.title;
    caption.innerHTML =
      '<strong>' + esc(mem.title) + '</strong>' +
      (mem.description ? esc(mem.description) + '<br>' : '') +
      '<small style="color:rgba(255,255,255,0.5);font-size:0.75rem;margin-top:0.35rem;display:block;">' +
        day + ' ' + month + ' ' + year +
      '</small>';

    lb.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const lb = document.getElementById('mem-lightbox');
    if (lb) lb.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  function lbKeyHandler(e) {
    if (e.key === 'Escape') closeLightbox();
  }

  // ── CSV (upcoming only) ───────────────────────────────────────
  function loadCSV(url, isPast) {
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(csv => {
        const events = parseCSV(csv, isPast);
        if (!isPast) {
          cachedUpcoming = events;
          buildCalEventMap(events);
          renderUpcoming(events, currentFilter);
          refreshCalendars();
        }
      })
      .catch(err => {
        console.error('CSV error:', err);
        const spinner = document.getElementById('events-initial-spinner');
        if (spinner) spinner.innerHTML = '<p>Unable to load events. Please try again later.</p>';
        const container = document.getElementById('event-container');
        if (container) container.innerHTML =
          '<div class="events-empty">Unable to load events. Please try again later.</div>';
      });
  }

  function parseCSV(csv, isPast) {
    const now = new Date(), lines = csv.split('\n'), out = [];
    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw) continue;
      const c = parseCSVLine(raw);
      if (c.length < 5) continue;

      const eventName     = c[0].trim();
      const dateStr       = c[1].trim();
      const timeStr       = c[2].trim();
      const eventLocation = c[3].trim();
      const size          = (c[4] || 'small').trim().toLowerCase();
      const category      = (c[5] || 'others').trim().toLowerCase();
      const description   = (c[6] || '').trim();

      if (!eventName || !dateStr || !timeStr) continue;

      const dp = dateStr.split('/');
      if (dp.length !== 3) continue;
      const month = parseInt(dp[0], 10) - 1;
      const day   = parseInt(dp[1], 10);
      const year  = parseInt(dp[2], 10);

      const tp = timeStr.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
      if (!tp) continue;
      let h = parseInt(tp[1], 10), m = parseInt(tp[2], 10);
      if (tp[3] && tp[3].toUpperCase() === 'PM' && h < 12) h += 12;
      if (tp[3] && tp[3].toUpperCase() === 'AM' && h === 12) h = 0;

      const dt = new Date(year, month, day, h, m);
      if (isNaN(dt.getTime())) continue;
      if (isPast  && dt >= now) continue;
      if (!isPast && dt <  now) continue;

      out.push({ eventName, fullDateTime: dt, eventLocation, size, category, description });
    }
    out.sort((a, b) => isPast
      ? b.fullDateTime - a.fullDateTime
      : a.fullDateTime - b.fullDateTime);
    return out;
  }

  function parseCSVLine(line) {
    const result = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { result.push(cur); cur = ''; continue; }
      cur += ch;
    }
    result.push(cur);
    return result;
  }

  // ── RENDER UPCOMING ───────────────────────────────────────────
  function renderUpcoming(allEvents, filter) {
    const spinner = document.getElementById('events-initial-spinner');
    if (spinner) spinner.style.display = 'none';

    const f = (filter || 'all').trim().toLowerCase();
    const filtered = f === 'all' ? allEvents : allEvents.filter(e => e.category === f);

    const bigEvents   = filtered.filter(e => e.size === 'big');
    const smallEvents = filtered.filter(e => e.size !== 'big');

    filteredSmall = smallEvents;
    shownSmall    = 0;

    const groupBig     = document.getElementById('group-big');
    const containerBig = document.getElementById('container-big');

    if (bigEvents.length > 0 && groupBig && containerBig) {
      containerBig.innerHTML = '';
      const frag = document.createDocumentFragment();
      bigEvents.forEach(ev => frag.appendChild(buildEventCard(ev)));
      containerBig.appendChild(frag);
      groupBig.style.display = 'block';
    } else if (groupBig) {
      groupBig.style.display = 'none';
    }

    const groupSmall     = document.getElementById('group-small');
    const containerSmall = document.getElementById('event-container');

    if (groupSmall && containerSmall) {
      containerSmall.innerHTML = '';
      if (smallEvents.length === 0 && bigEvents.length === 0) {
        containerSmall.innerHTML = '<div class="events-empty">No events found for this filter.</div>';
        groupSmall.style.display = 'block';
      } else if (smallEvents.length > 0) {
        renderSmallBatch();
        groupSmall.style.display = 'block';
      } else {
        groupSmall.style.display = 'none';
      }
    }

    reApplyLang();
  }

  function renderSmallBatch() {
    const container = document.getElementById('event-container');
    const loadBtn   = document.getElementById('load-more-btn');
    if (!container) return;

    const batch = filteredSmall.slice(shownSmall, shownSmall + PER_PAGE);
    shownSmall += batch.length;

    const frag = document.createDocumentFragment();
    batch.forEach(ev => frag.appendChild(buildEventCard(ev)));
    container.appendChild(frag);

    if (loadBtn) {
      loadBtn.hidden = shownSmall >= filteredSmall.length;
      loadBtn.onclick = renderSmallBatch;
    }
  }

  // ── FILTERS (upcoming) ────────────────────────────────────────
  function initFilters() {
    document.querySelectorAll('#events-filters .filter-pill').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#events-filters .filter-pill')
          .forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        renderUpcoming(cachedUpcoming, currentFilter);
      });
    });
  }

  // ── SEARCH ────────────────────────────────────────────────────
  function initSearch() {
    const input = document.getElementById('event-search');
    if (!input) return;
    input.addEventListener('input', function () {
      const term = this.value.trim().toLowerCase();
      if (!term) { renderUpcoming(cachedUpcoming, currentFilter); return; }
      const found = cachedUpcoming.filter(e =>
        e.eventName.toLowerCase().includes(term) ||
        e.description.toLowerCase().includes(term) ||
        e.eventLocation.toLowerCase().includes(term)
      );
      renderUpcoming(found, 'all');
    });
  }

  // ── EVENT CARD (upcoming) ─────────────────────────────────────
  function buildEventCard(ev) {
    const { eventName, fullDateTime, eventLocation, size, description } = ev;
    const day   = fullDateTime.getDate();
    const month = MONTHS_SHORT[fullDateTime.getMonth()];
    const time  = fmt(fullDateTime);

    const ms   = fullDateTime - new Date();
    const days = Math.floor(ms / 86400000);
    const hrs  = Math.floor((ms % 86400000) / 3600000);
    const mins = Math.floor((ms % 3600000)  / 60000);

    let badge = '', bc = '';
    if      (ms <= 0)  { badge = 'Happening Now'; bc = 'urgent'; }
    else if (days > 0) { badge = days + 'd ' + hrs + 'h';  bc = days <= 1 ? 'soon' : ''; }
    else if (hrs > 0)  { badge = hrs + 'h ' + mins + 'm';  bc = 'soon'; }
    else               { badge = mins + 'm';                bc = 'urgent'; }

    const card = document.createElement('div');
    card.className = 'event-card' + (size === 'big' ? ' big' : '');
    card.innerHTML =
      '<div class="event-card-date">' +
        '<span class="event-card-day">' + day + '</span>' +
        '<span class="event-card-month">' + month + '</span>' +
      '</div>' +
      '<div class="event-card-body">' +
        '<h3 class="event-card-title">' + esc(eventName) + '</h3>' +
        '<div class="event-card-meta">' +
          '<div class="event-card-meta-item"><i class="far fa-clock"></i> ' + time + '</div>' +
          '<div class="event-card-meta-item"><i class="fas fa-map-marker-alt"></i> ' + esc(eventLocation) + '</div>' +
        '</div>' +
        (description ? '<p class="event-card-desc">' + esc(description) + '</p>' : '') +
        '<span class="time-left-badge ' + bc + '">' + badge + '</span>' +
      '</div>';
    return card;
  }

  // ── CALENDARS ─────────────────────────────────────────────────
  function initCalendars() {
    const today = new Date();
    calMonth = today.getMonth();
    calYear  = today.getFullYear();

    document.getElementById('cal-prev')?.addEventListener('click', () => {
      calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
      refreshCalendars();
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
      calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
      refreshCalendars();
    });
    document.getElementById('cal-prev-m')?.addEventListener('click', () => {
      calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
      refreshCalendars();
    });
    document.getElementById('cal-next-m')?.addEventListener('click', () => {
      calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
      refreshCalendars();
    });

    refreshCalendars();
  }

  function refreshCalendars() {
    renderCalGrid('cal-days',   'cal-month-label');
    renderCalGrid('cal-days-m', 'cal-month-label-m');
    markCalEvents('cal-days',   'desktop-calendar');
    markCalEvents('cal-days-m', 'mobile-calendar');
  }

  function renderCalGrid(gridId, labelId) {
    const label = document.getElementById(labelId);
    const grid  = document.getElementById(gridId);
    if (!label || !grid) return;

    label.textContent = MONTHS[calMonth] + ' ' + calYear;
    grid.innerHTML = '';

    const firstDay    = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today       = new Date();
    const frag        = document.createDocumentFragment();

    for (let i = 0; i < firstDay; i++) {
      const d = document.createElement('div');
      d.className = 'cal-day empty'; frag.appendChild(d);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = document.createElement('div');
      d.className = 'cal-day'; d.textContent = i; d.dataset.day = i;
      if (i === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear())
        d.classList.add('today');
      frag.appendChild(d);
    }
    grid.appendChild(frag);
  }

  function buildCalEventMap(events) {
    calEventMap = {};
    events.forEach(ev => {
      const key = ev.fullDateTime.getFullYear() + '-' + ev.fullDateTime.getMonth() + '-' + ev.fullDateTime.getDate();
      if (!calEventMap[key]) calEventMap[key] = [];
      calEventMap[key].push(ev);
    });
  }

  function markCalEvents(gridId, calContainerId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    grid.querySelectorAll('.cal-day:not(.empty)').forEach(cell => {
      const fresh = cell.cloneNode(true);
      cell.parentNode.replaceChild(fresh, cell);
    });

    grid.querySelectorAll('.cal-day:not(.empty)').forEach(cell => {
      const d   = parseInt(cell.dataset.day, 10);
      const key = calYear + '-' + calMonth + '-' + d;
      if (calEventMap[key]) {
        cell.classList.add('has-event');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('role', 'button');
        cell.addEventListener('click', e => {
          e.stopPropagation();
          showCalTooltip(cell, calEventMap[key], calContainerId);
        });
        cell.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            showCalTooltip(cell, calEventMap[key], calContainerId);
          }
        });
      }
    });
  }

  function showCalTooltip(cell, events, calContainerId) {
    removeCalTooltip();

    let anchorEl = document.getElementById(calContainerId);
    if (calContainerId === 'mobile-calendar') {
      anchorEl = document.querySelector('.mobile-calendar-inner') || anchorEl;
    }
    if (!anchorEl) return;

    const d   = parseInt(cell.dataset.day, 10);
    const tip = document.createElement('div');
    tip.className = 'cal-tooltip';
    tip.id        = 'cal-tooltip';

    tip.innerHTML =
      '<div class="cal-tip-header">' +
        '<span class="cal-tip-date">' + d + ' ' + MONTHS[calMonth] + '</span>' +
        '<button class="cal-tip-close" aria-label="Close">&times;</button>' +
      '</div>' +
      '<ul class="cal-tip-list">' +
        events.map(ev =>
          '<li class="cal-tip-item">' +
            '<span class="cal-tip-name">' + esc(ev.eventName) + '</span>' +
            '<span class="cal-tip-time">' + fmt(ev.fullDateTime) + '</span>' +
            (ev.eventLocation
              ? '<span class="cal-tip-loc"><i class="fas fa-map-marker-alt"></i> ' + esc(ev.eventLocation) + '</span>'
              : '') +
          '</li>'
        ).join('') +
      '</ul>';

    anchorEl.style.position = 'relative';
    if (calContainerId === 'desktop-calendar') anchorEl.style.overflow = 'visible';
    anchorEl.appendChild(tip);

    tip.querySelector('.cal-tip-close').addEventListener('click', e => {
      e.stopPropagation(); removeCalTooltip();
    });

    setTimeout(() => {
      document.addEventListener('click', outsideTipHandler);
      document.addEventListener('keydown', escTipHandler);
    }, 0);
  }

  function removeCalTooltip() {
    document.getElementById('cal-tooltip')?.remove();
    document.removeEventListener('click', outsideTipHandler);
    document.removeEventListener('keydown', escTipHandler);
  }

  function outsideTipHandler(e) {
    const tip = document.getElementById('cal-tooltip');
    if (tip && !tip.contains(e.target)) removeCalTooltip();
  }

  function escTipHandler(e) {
    if (e.key === 'Escape') removeCalTooltip();
  }

  // ── HELPERS ───────────────────────────────────────────────────
  function fmt(dt) {
    return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── NAVIGATION ────────────────────────────────────────────────
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      loadPage(link.dataset.page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  window.addEventListener('popstate', () => {
    const p = new URLSearchParams(window.location.search).get('page') || 'events-upcoming';
    currentPage = null;
    loadPage(p);
  });

  loadPage(urlParams.get('page') || 'events-upcoming');
});