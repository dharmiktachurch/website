// ================================================================
// EVENTS.JS
// ================================================================

document.addEventListener("DOMContentLoaded", function () {

  // ── Sheet URLs ────────────────────────────────────────────────
  const SHEET_UPCOMING = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwzUR_NyZvDSpuMht8Xn4E8e2fNRy5cfyFprzkCy0tNRQYEVGnB-c3mKFHI8-DQACZUtCTVTRdIr7v/pub?gid=0&single=true&output=csv';
  const SHEET_PAST     = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwzUR_NyZvDSpuMht8Xn4E8e2fNRy5cfyFprzkCy0tNRQYEVGnB-c3mKFHI8-DQACZUtCTVTRdIr7v/pub?gid=643141639&single=true&output=csv';

  const PER_PAGE     = 9;
  const MONTHS       = ["January","February","March","April","May","June",
                        "July","August","September","October","November","December"];
  const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun",
                        "Jul","Aug","Sep","Oct","Nov","Dec"];

  // ── State ─────────────────────────────────────────────────────
  let cachedUpcoming  = [];
  let cachedPast      = [];
  let filteredSmall   = [];   // small events currently displayed
  let shownSmall      = 0;
  let currentFilter   = 'all';
  let currentPage     = null;
  let calMonth, calYear;
  let calEventMap     = {};   // "YYYY-M-D" → [events]

  // ── DOM refs ──────────────────────────────────────────────────
  const navLinks   = document.querySelectorAll(".events-nav a");
  const contentDiv = document.getElementById("events-content");
  const loadingBuf = document.getElementById("loading-buffer");
  const urlParams  = new URLSearchParams(window.location.search);

  // ── Skeleton loader ───────────────────────────────────────────
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

  // ── Page loading ──────────────────────────────────────────────
  function loadPage(page) {
    if (currentPage === page) return;
    currentPage   = page;
    currentFilter = 'all';
    shownSmall    = 0;
    calEventMap   = {};

    navLinks.forEach(l => l.classList.remove('active'));
    const active = document.querySelector(`.events-nav a[data-page="${page}"]`);
    if (active) active.classList.add('active');

    history.pushState(null, '', `?page=${page}`);
    showLoader();

    fetch(`partials/${page}.html`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(html => {
        contentDiv.innerHTML = stripLinks(html);
        requestAnimationFrame(() => {
          if (page === 'events-upcoming') initUpcoming();
          if (page === 'events-past')     initPast();
          hideLoader();
        });
      })
      .catch(() => {
        contentDiv.innerHTML = `
          <div style="text-align:center;padding:4rem 2rem;
               color:#777;font-family:'Poppins',sans-serif;">
            Unable to load content. Please refresh the page.
          </div>`;
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

  function initPast() {
    initFilters();
    loadCSV(SHEET_PAST, true);
  }

  // ── CSV ───────────────────────────────────────────────────────
  function loadCSV(url, isPast) {
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(csv => {
        const events = parseCSV(csv, isPast);
        if (isPast) cachedPast     = events;
        else        cachedUpcoming = events;

        if (isPast) {
          renderPast(events);
        } else {
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

  // ── RENDER UPCOMING (big + small separated) ───────────────────
  function renderUpcoming(allEvents, filter) {
    // Hide initial spinner
    const spinner = document.getElementById('events-initial-spinner');
    if (spinner) spinner.style.display = 'none';

    // Apply filter
    const f = (filter || 'all').trim().toLowerCase();
    const filtered = f === 'all'
      ? allEvents
      : allEvents.filter(e => e.category === f);

    const bigEvents   = filtered.filter(e => e.size === 'big');
    const smallEvents = filtered.filter(e => e.size !== 'big');

    filteredSmall = smallEvents;
    shownSmall    = 0;

    // ── Big events ──
    const groupBig    = document.getElementById('group-big');
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

    // ── Small events ──
    const groupSmall    = document.getElementById('group-small');
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

  // ── RENDER PAST (timeline) ────────────────────────────────────
  function renderPast(events) {
    // Hide initial spinner if present
    const spinner = document.getElementById('events-initial-spinner');
    if (spinner) spinner.style.display = 'none';

    const container = document.getElementById('event-container');
    if (!container) return;

    container.innerHTML = '';

    if (events.length === 0) {
      container.innerHTML = '<div class="events-empty">No past events found.</div>';
      return;
    }

    const frag = document.createDocumentFragment();
    events.forEach(ev => frag.appendChild(buildTimelineItem(ev)));
    container.appendChild(frag);
  }

  // ── FILTERS ───────────────────────────────────────────────────
  function initFilters() {
    document.querySelectorAll('#events-filters .filter-pill').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#events-filters .filter-pill')
          .forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;

        if (currentPage === 'events-past') {
          const f = currentFilter.toLowerCase();
          const filtered = f === 'all' ? cachedPast
            : cachedPast.filter(e => e.category === f);
          renderPast(filtered);
        } else {
          renderUpcoming(cachedUpcoming, currentFilter);
        }
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

  // ── CARD BUILDERS ─────────────────────────────────────────────
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
    else if (days > 0) { badge = `${days}d ${hrs}h`;  bc = days <= 1 ? 'soon' : ''; }
    else if (hrs > 0)  { badge = `${hrs}h ${mins}m`;  bc = 'soon'; }
    else               { badge = `${mins}m`;            bc = 'urgent'; }

    const card = document.createElement('div');
    card.className = `event-card${size === 'big' ? ' big' : ''}`;
    card.innerHTML = `
      <div class="event-card-date">
        <span class="event-card-day">${day}</span>
        <span class="event-card-month">${month}</span>
      </div>
      <div class="event-card-body">
        <h3 class="event-card-title">${esc(eventName)}</h3>
        <div class="event-card-meta">
          <div class="event-card-meta-item"><i class="far fa-clock"></i> ${time}</div>
          <div class="event-card-meta-item"><i class="fas fa-map-marker-alt"></i> ${esc(eventLocation)}</div>
        </div>
        ${description ? `<p class="event-card-desc">${esc(description)}</p>` : ''}
        <span class="time-left-badge ${bc}">${badge}</span>
      </div>`;
    return card;
  }

  function buildTimelineItem(ev) {
    const { eventName, fullDateTime, eventLocation, description } = ev;
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `
      <div class="timeline-card">
        <div class="timeline-card-date">
          <span class="timeline-date-day">${fullDateTime.getDate()}</span>
          <span class="timeline-date-month">${MONTHS_SHORT[fullDateTime.getMonth()]}</span>
          <span class="timeline-date-year">${fullDateTime.getFullYear()}</span>
        </div>
        <div class="timeline-card-body">
          <h3 class="timeline-card-title">${esc(eventName)}</h3>
          <div class="timeline-card-meta">
            <div class="timeline-meta-item"><i class="far fa-clock"></i> ${fmt(fullDateTime)}</div>
            <div class="timeline-meta-item"><i class="fas fa-map-marker-alt"></i> ${esc(eventLocation)}</div>
          </div>
          ${description ? `<p class="timeline-card-desc">${esc(description)}</p>` : ''}
        </div>
      </div>`;
    return item;
  }

  // ── CALENDARS (desktop + mobile) ─────────────────────────────
  // Both calendars share the same month/year state and event data.
  function initCalendars() {
    const today = new Date();
    calMonth = today.getMonth();
    calYear  = today.getFullYear();

    // Desktop buttons
    document.getElementById('cal-prev')?.addEventListener('click', () => {
      calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
      refreshCalendars();
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
      calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
      refreshCalendars();
    });

    // Mobile buttons
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
    renderCalGrid('cal-days',   'cal-month-label');    // desktop
    renderCalGrid('cal-days-m', 'cal-month-label-m');  // mobile
    markCalEvents('cal-days',   'desktop-calendar');
    markCalEvents('cal-days-m', 'mobile-calendar');
  }

  function renderCalGrid(gridId, labelId) {
    const label = document.getElementById(labelId);
    const grid  = document.getElementById(gridId);
    if (!label || !grid) return;

    label.textContent = `${MONTHS[calMonth]} ${calYear}`;
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
      const key = `${ev.fullDateTime.getFullYear()}-${ev.fullDateTime.getMonth()}-${ev.fullDateTime.getDate()}`;
      if (!calEventMap[key]) calEventMap[key] = [];
      calEventMap[key].push(ev);
    });
  }

  // Mark event days and attach tooltip listener for one calendar grid
  function markCalEvents(gridId, calContainerId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    // Fresh clone to remove old listeners
    grid.querySelectorAll('.cal-day:not(.empty)').forEach(cell => {
      const fresh = cell.cloneNode(true);
      cell.parentNode.replaceChild(fresh, cell);
    });

    grid.querySelectorAll('.cal-day:not(.empty)').forEach(cell => {
      const d   = parseInt(cell.dataset.day, 10);
      const key = `${calYear}-${calMonth}-${d}`;
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

  // ── CALENDAR TOOLTIP ──────────────────────────────────────────
  // Desktop: appended to #desktop-calendar → CSS places it LEFT of card
  // Mobile:  appended to .mobile-calendar-inner → CSS places it BELOW card
  function showCalTooltip(cell, events, calContainerId) {
    removeCalTooltip();

    // For mobile calendar, anchor to the inner wrapper (not the card)
    // so the tooltip is positioned relative to the full-width container
    let anchorEl = document.getElementById(calContainerId);
    if (calContainerId === 'mobile-calendar') {
      anchorEl = document.querySelector('.mobile-calendar-inner') || anchorEl;
    }
    if (!anchorEl) return;

    const d   = parseInt(cell.dataset.day, 10);
    const tip = document.createElement('div');
    tip.className = 'cal-tooltip';
    tip.id        = 'cal-tooltip';

    tip.innerHTML = `
      <div class="cal-tip-header">
        <span class="cal-tip-date">${d} ${MONTHS[calMonth]}</span>
        <button class="cal-tip-close" aria-label="Close">&times;</button>
      </div>
      <ul class="cal-tip-list">
        ${events.map(ev => `
          <li class="cal-tip-item">
            <span class="cal-tip-name">${esc(ev.eventName)}</span>
            <span class="cal-tip-time">${fmt(ev.fullDateTime)}</span>
            ${ev.eventLocation
              ? `<span class="cal-tip-loc"><i class="fas fa-map-marker-alt"></i> ${esc(ev.eventLocation)}</span>`
              : ''}
          </li>`).join('')}
      </ul>`;

    anchorEl.style.position = 'relative';
    if (calContainerId === 'desktop-calendar') {
      anchorEl.style.overflow = 'visible';
    }
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