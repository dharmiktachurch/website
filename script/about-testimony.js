// ============================================================
// ABOUT-TESTIMONY.JS — TESTIMONIES CAROUSEL (BILINGUAL)
// ============================================================

let currentSlide      = 0;
let totalSlides       = 0;
let testimoniesData   = [];
let track             = null;
let autoSlideInterval = null;
let keydownHandler    = null;

// ── Helpers ─────────────────────────────────────────────────────────────────
function _currentLang() {
  try { return localStorage.getItem('dm-lang') || 'en'; } catch (e) { return 'en'; }
}

function _t(testimony, field) {
  // Return the NE variant if active and it exists, else fall back to EN
  var lang = _currentLang();
  var neKey = field + '_ne';
  if (lang === 'ne' && testimony[neKey] !== undefined) return testimony[neKey];
  return testimony[field];
}

// ── Entry point ──────────────────────────────────────────────────────────────
window.initializeTestimoniesPage = function () {
  _cleanup();

  const container = document.getElementById('testimonies-container');
  if (!container) return;

  var loadingText = _currentLang() === 'ne' ? 'साक्षीहरू लोड हुँदैछ…' : 'Loading testimonies…';
  container.innerHTML = `
    <div class="loading-testimonies">
      <div class="loading-spinner"></div>
      <p>${loadingText}</p>
    </div>`;

  loadTestimonies()
    .then(data => {
      testimoniesData = Array.isArray(data) ? data : [];
      _setup(container);
    })
    .catch(() => {
      testimoniesData = _fallbackData();
      _setup(container);
    });
};

// ── Cleanup ──────────────────────────────────────────────────────────────────
function _cleanup() {
  if (autoSlideInterval) { clearInterval(autoSlideInterval); autoSlideInterval = null; }
  if (keydownHandler)    { document.removeEventListener('keydown', keydownHandler); keydownHandler = null; }
  currentSlide = 0;
  totalSlides  = 0;
  track        = null;
}

// ── Fetch ────────────────────────────────────────────────────────────────────
function loadTestimonies() {
  return fetch('/data/testimony.json')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => data.testimonies || data || []);
}

// ── Fallback ─────────────────────────────────────────────────────────────────
function _fallbackData() {
  return [
    {
      id: 1,
      author: 'Prashanna Parajuli',
      role: 'Church Member', role_ne: 'मण्डली सदस्य',
      date: 'January 2024',  date_ne: 'जनवरी २०२४',
      excerpt:    "God's grace transformed my life in ways I never imagined possible.",
      excerpt_ne: "परमेश्वरको अनुग्रहले मेरो जीवनलाई यस्तो तरिकाले रूपान्तरण गर्‍यो जुन मैले कहिल्यै सम्भव सोचेको थिइनँ।",
      fullText:    ["God's grace transformed my life in ways I never imagined possible. Through prayer and faith, I found peace and purpose."],
      fullText_ne: ["परमेश्वरको अनुग्रहले मेरो जीवनलाई यस्तो तरिकाले रूपान्तरण गर्‍यो जुन मैले कहिल्यै सम्भव सोचेको थिइनँ। प्रार्थना र विश्वासद्वारा मैले शान्ति र उद्देश्य पाएँ।"]
    }
  ];
}

// ── Setup ────────────────────────────────────────────────────────────────────
function _setup(container) {
  totalSlides = testimoniesData.length;

  if (totalSlides === 0) {
    var msg = _currentLang() === 'ne'
      ? 'अहिलेसम्म कुनै साक्षी छैन।'
      : 'No Testimonies Yet';
    container.innerHTML = `<div class="error-state" style="position:static;"><h3>${msg}</h3></div>`;
    return;
  }

  _renderSlides(container);
  _setupNavigation();
  _goToSlide(0, false);
  if (totalSlides > 1) _startAutoSlide();
}

// ── Render ────────────────────────────────────────────────────────────────────
function _renderSlides(container) {
  container.innerHTML = '';

  track            = document.createElement('div');
  track.className  = 'testimonies-track';
  track.id         = 'testimonies-track';

  const template = document.getElementById('testimony-template');
  if (!template) {
    container.innerHTML = '<p style="padding:2rem;color:#666;">Error: testimony template not found.</p>';
    return;
  }

  testimoniesData.forEach((testimony, index) => {
    const clone = template.content.cloneNode(true);

    const slide             = clone.querySelector('.testimony-slide');
    const card              = clone.querySelector('.testimony-card');
    const avatarContainer   = clone.querySelector('.author-avatar-container');
    const authorNameEl      = clone.querySelector('.author-name');
    const authorRoleEl      = clone.querySelector('.author-role');
    const dateEl            = clone.querySelector('.testimony-date');
    const excerptEl         = clone.querySelector('.testimony-excerpt p');
    const fullTextContainer = clone.querySelector('.testimony-full');
    const readMoreBtn       = clone.querySelector('.read-more-btn');
    const btnTextEl         = readMoreBtn ? readMoreBtn.querySelector('.btn-text') : null;

    slide.id                 = `testimony-slide-${index}`;
    slide.dataset.index      = index;
    card.dataset.testimonyId = testimony.id ?? index + 1;
    // Store testimony index so we can re-render on lang change
    card.dataset.tIndex      = index;

    // Initials avatar
    const name     = testimony.author || 'Anonymous';
    const parts    = name.trim().split(/\s+/);
    const initials = (parts.length >= 2)
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
    const initialsSpan       = document.createElement('span');
    initialsSpan.className   = 'author-initials';
    initialsSpan.textContent = initials;
    avatarContainer.appendChild(initialsSpan);

    // Author name (always in original script)
    authorNameEl.textContent = name;

    // Language-aware fields
    var lang = _currentLang();
    authorRoleEl.textContent = _t(testimony, 'role');
    if (dateEl)     dateEl.textContent    = _t(testimony, 'date');
    excerptEl.textContent                 = _t(testimony, 'excerpt');

    // Full text
    _renderFullText(fullTextContainer, testimony);

    // Read more button label
    if (btnTextEl) {
      btnTextEl.textContent = lang === 'ne' ? 'थप पढ्नुहोस्' : 'Read More';
    }

    readMoreBtn.addEventListener('click', _toggleExpand);
    track.appendChild(clone);
  });

  container.appendChild(track);
}

// ── Fill full-text paragraphs ────────────────────────────────────────────────
function _renderFullText(container, testimony) {
  container.innerHTML = '';
  var paragraphs = _t(testimony, 'fullText');
  if (!Array.isArray(paragraphs)) paragraphs = [paragraphs];
  paragraphs.forEach(function (text) {
    var p        = document.createElement('p');
    p.textContent = text;
    container.appendChild(p);
  });
}

// ── Update rendered slides when language changes ─────────────────────────────
function _updateRenderedLang() {
  var lang = _currentLang();

  document.querySelectorAll('.testimony-card').forEach(function (card) {
    var idx      = parseInt(card.dataset.tIndex, 10);
    var testimony = testimoniesData[idx];
    if (!testimony) return;

    var roleEl      = card.querySelector('.author-role');
    var dateEl      = card.querySelector('.testimony-date');
    var excerptEl   = card.querySelector('.testimony-excerpt p');
    var fullTextEl  = card.querySelector('.testimony-full');
    var btnTextEl   = card.querySelector('.read-more-btn .btn-text');

    if (roleEl)    roleEl.textContent    = _t(testimony, 'role');
    if (dateEl)    dateEl.textContent    = _t(testimony, 'date');
    if (excerptEl) excerptEl.textContent = _t(testimony, 'excerpt');
    if (fullTextEl) _renderFullText(fullTextEl, testimony);

    // Read more / less button — preserve expanded state label
    if (btnTextEl) {
      var btn        = card.querySelector('.read-more-btn');
      var isExpanded = btn && btn.classList.contains('expanded');
      if (isExpanded) {
        btnTextEl.textContent = lang === 'ne' ? 'कम पढ्नुहोस्' : 'Read Less';
      } else {
        btnTextEl.textContent = lang === 'ne' ? 'थप पढ्नुहोस्' : 'Read More';
      }
    }
  });

  // Also update the "of" word in counter
  var counter = document.getElementById('testimony-counter');
  if (counter) {
    var ofSpan = counter.querySelector('[data-en]');
    if (ofSpan) ofSpan.innerHTML = lang === 'ne' ? ' / ' : ' of ';
  }
}

// ── Listen for global language change ────────────────────────────────────────
document.addEventListener('dm:langchange', function (e) {
  _updateRenderedLang();
});

// ── Navigation ────────────────────────────────────────────────────────────────
function _setupNavigation() {
  const prevBtn             = document.querySelector('.prev-btn');
  const nextBtn             = document.querySelector('.next-btn');
  const indicatorsContainer = document.getElementById('carousel-indicators');
  var lang = _currentLang();

  if (indicatorsContainer) {
    indicatorsContainer.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
      const btn         = document.createElement('button');
      btn.className     = 'indicator' + (i === 0 ? ' active' : '');
      btn.dataset.index = i;
      btn.setAttribute('aria-label', `Go to testimony ${i + 1}`);
      btn.addEventListener('click', () => _goToSlide(i));
      indicatorsContainer.appendChild(btn);
    }
  }

  if (prevBtn) prevBtn.addEventListener('click', _prevSlide);
  if (nextBtn) nextBtn.addEventListener('click', _nextSlide);

  keydownHandler = (e) => {
    if (e.key === 'ArrowLeft')  _prevSlide();
    if (e.key === 'ArrowRight') _nextSlide();
  };
  document.addEventListener('keydown', keydownHandler);

  if (track) {
    let startX = 0;
    track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend',   e => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 48) diff > 0 ? _nextSlide() : _prevSlide();
    }, { passive: true });
  }

  const carousel = document.querySelector('.testimonies-carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', _pauseAutoSlide);
    carousel.addEventListener('mouseleave', _startAutoSlide);
  }
}

function _nextSlide() { _goToSlide((currentSlide + 1) % totalSlides); }
function _prevSlide() { _goToSlide((currentSlide - 1 + totalSlides) % totalSlides); }

function _goToSlide(index, animate = true) {
  if (index < 0 || index >= totalSlides || !track) return;
  currentSlide = index;

  if (!animate) track.style.transition = 'none';
  track.style.transform = `translateX(${-currentSlide * 100}%)`;
  if (!animate) requestAnimationFrame(() => { track.style.transition = ''; });

  document.querySelectorAll('.indicator').forEach((el, i) =>
    el.classList.toggle('active', i === currentSlide)
  );

  const counter = document.getElementById('testimony-counter');
  if (counter) {
    const cs = counter.querySelector('.current-slide');
    const ts = counter.querySelector('.total-slides');
    if (cs) cs.textContent = currentSlide + 1;
    if (ts) ts.textContent = totalSlides;
  }

  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');
  if (prevBtn) prevBtn.disabled = totalSlides <= 1;
  if (nextBtn) nextBtn.disabled = totalSlides <= 1;

  _resetAutoSlide();
}

// ── Read more / less ──────────────────────────────────────────────────────────
function _toggleExpand(event) {
  var lang     = _currentLang();
  const btn     = event.currentTarget;
  const card    = btn.closest('.testimony-card');
  const excerpt = card.querySelector('.testimony-excerpt');
  const full    = card.querySelector('.testimony-full');
  const arrow   = btn.querySelector('.read-more-arrow');
  const label   = btn.querySelector('.btn-text');

  const expanding           = full.style.display !== 'block';
  excerpt.style.display     = expanding ? 'none'  : 'block';
  full.style.display        = expanding ? 'block' : 'none';
  if (label) label.textContent = expanding
    ? (lang === 'ne' ? 'कम पढ्नुहोस्' : 'Read Less')
    : (lang === 'ne' ? 'थप पढ्नुहोस्' : 'Read More');
  if (arrow) arrow.style.transform = expanding ? 'rotate(180deg)' : 'rotate(0deg)';
  btn.classList.toggle('expanded', expanding);
}

// ── Auto-slide ────────────────────────────────────────────────────────────────
function _startAutoSlide() {
  if (autoSlideInterval || totalSlides <= 1) return;
  autoSlideInterval = setInterval(_nextSlide, 5000);
}
function _pauseAutoSlide() {
  if (autoSlideInterval) { clearInterval(autoSlideInterval); autoSlideInterval = null; }
}
function _resetAutoSlide() { _pauseAutoSlide(); _startAutoSlide(); }

// ── Public API ────────────────────────────────────────────────────────────────
window.testimoniesCarousel = {
  next:    _nextSlide,
  prev:    _prevSlide,
  goTo:    _goToSlide,
  refresh: window.initializeTestimoniesPage,
};