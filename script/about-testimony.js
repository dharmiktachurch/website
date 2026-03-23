// ============================================================
// ABOUT-TESTIMONY.JS — TESTIMONIES CAROUSEL
// ============================================================
// Key fixes vs previous version:
//   1. querySelector target changed from '.testimonies-page' (old HTML)
//      to '.about-testimony-page' (unified HTML structure)
//   2. Template lookup now searches the full document, not just the
//      container — templates are siblings, not children of the carousel
//   3. initializeTestimoniesPage is safe to call multiple times
//   4. Keyboard listener is scoped + cleaned up to avoid stacking
// ============================================================

let currentSlide     = 0;
let totalSlides      = 0;
let testimoniesData  = [];
let track            = null;
let autoSlideInterval = null;
let keydownHandler   = null;   // kept so we can remove it on re-init

// ── Entry point called by about.js ─────────────────────────────────────────
window.initializeTestimoniesPage = function () {
  // Clean up any previous instance
  _cleanup();

  const container = document.getElementById('testimonies-container');
  if (!container) return;

  // Show spinner while fetching
  container.innerHTML = `
    <div class="loading-testimonies">
      <div class="loading-spinner"></div>
      <p>Loading testimonies…</p>
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

// ── Cleanup previous listeners / timers ────────────────────────────────────
function _cleanup() {
  if (autoSlideInterval) { clearInterval(autoSlideInterval); autoSlideInterval = null; }
  if (keydownHandler)    { document.removeEventListener('keydown', keydownHandler); keydownHandler = null; }
  currentSlide = 0;
  totalSlides  = 0;
  track        = null;
}

// ── Fetch testimony data ────────────────────────────────────────────────────
function loadTestimonies() {
  return fetch('/data/testimony.json')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => data.testimonies || data || []);
}

// ── Fallback data if fetch fails ────────────────────────────────────────────
function _fallbackData() {
  return [
    {
      id: 1,
      author: "John Smith",
      role: "Church Member",
      date: "January 2024",
      excerpt: "God's grace transformed my life in ways I never imagined possible.",
      fullText: ["God's grace transformed my life in ways I never imagined possible. Through prayer and faith, I found peace and purpose that I had been searching for my entire life."]
    },
    {
      id: 2,
      author: "Sarah Johnson",
      role: "Youth Leader",
      date: "December 2023",
      excerpt: "Finding community in this church has been a blessing to my whole family.",
      fullText: ["Finding community in this church has been a blessing to my whole family. The support and love we've received have helped us through the most difficult seasons of our lives."]
    }
  ];
}

// ── Main setup after data is ready ─────────────────────────────────────────
function _setup(container) {
  totalSlides = testimoniesData.length;

  if (totalSlides === 0) {
    container.innerHTML = `
      <div class="error-state" style="position:static;">
        <h3>No Testimonies Yet</h3>
        <p>Be the first to share what God has done in your life.</p>
      </div>`;
    return;
  }

  _renderSlides(container);
  _setupNavigation();
  _goToSlide(0, false);           // go to first without animation

  if (totalSlides > 1) _startAutoSlide();
}

// ── Render all testimony slides ─────────────────────────────────────────────
function _renderSlides(container) {
  container.innerHTML = '';

  track = document.createElement('div');
  track.className = 'testimonies-track';
  track.id = 'testimonies-track';

  // Template lives in the same partial — it's a sibling of the carousel section
  // document.getElementById works regardless of where in #about-content it sits
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

    // IDs / data
    slide.id                 = `testimony-slide-${index}`;
    slide.dataset.index      = index;
    card.dataset.testimonyId = testimony.id ?? index + 1;

    // Initials avatar — derive up to 2 letters from author name, no icon
    const name    = testimony.author || 'Anonymous';
    const parts   = name.trim().split(/\s+/);
    const initials = (parts.length >= 2)
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
    const initialsSpan = document.createElement('span');
    initialsSpan.className   = 'author-initials';
    initialsSpan.textContent = initials;
    avatarContainer.appendChild(initialsSpan);

    // Text content
    authorNameEl.textContent = name;
    authorRoleEl.textContent = testimony.role  || 'Member';
    if (dateEl) dateEl.textContent = testimony.date || '';

    excerptEl.textContent = testimony.excerpt || '';

    // Full text paragraphs
    if (testimony.fullText) {
      fullTextContainer.innerHTML = '';
      const paragraphs = Array.isArray(testimony.fullText) ? testimony.fullText : [testimony.fullText];
      paragraphs.forEach(text => {
        const p = document.createElement('p');
        p.textContent = text;
        fullTextContainer.appendChild(p);
      });
    }

    // No tags — template has none, data tags are ignored

    // Read more toggle
    readMoreBtn.addEventListener('click', _toggleExpand);

    track.appendChild(clone);
  });

  container.appendChild(track);
}

// ── Wire up nav buttons, indicators, keyboard, touch ───────────────────────
function _setupNavigation() {
  const prevBtn            = document.querySelector('.prev-btn');
  const nextBtn            = document.querySelector('.next-btn');
  const indicatorsContainer = document.getElementById('carousel-indicators');

  if (!prevBtn || !nextBtn) return;

  // Indicators
  if (indicatorsContainer) {
    indicatorsContainer.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
      const btn = document.createElement('button');
      btn.className = 'indicator' + (i === 0 ? ' active' : '');
      btn.dataset.index = i;
      btn.setAttribute('aria-label', `Go to testimony ${i + 1}`);
      btn.addEventListener('click', () => _goToSlide(i));
      indicatorsContainer.appendChild(btn);
    }
  }

  prevBtn.addEventListener('click', _prevSlide);
  nextBtn.addEventListener('click', _nextSlide);

  // Keyboard — stored so we can remove it later
  keydownHandler = (e) => {
    if (e.key === 'ArrowLeft')  _prevSlide();
    if (e.key === 'ArrowRight') _nextSlide();
  };
  document.addEventListener('keydown', keydownHandler);

  // Touch / swipe
  if (track) {
    let startX = 0;
    track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend',   e => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 48) diff > 0 ? _nextSlide() : _prevSlide();
    }, { passive: true });
  }

  // Pause auto-slide on hover
  const carousel = document.querySelector('.testimonies-carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', _pauseAutoSlide);
    carousel.addEventListener('mouseleave', _startAutoSlide);
  }
}

// ── Navigation helpers ──────────────────────────────────────────────────────
function _nextSlide() { _goToSlide((currentSlide + 1) % totalSlides); }
function _prevSlide() { _goToSlide((currentSlide - 1 + totalSlides) % totalSlides); }

function _goToSlide(index, animate = true) {
  if (index < 0 || index >= totalSlides || !track) return;
  currentSlide = index;

  if (!animate) track.style.transition = 'none';
  track.style.transform = `translateX(${-currentSlide * 100}%)`;
  if (!animate) requestAnimationFrame(() => { track.style.transition = ''; });

  // Update indicators
  document.querySelectorAll('.indicator').forEach((el, i) =>
    el.classList.toggle('active', i === currentSlide)
  );

  // Update counter
  const counter = document.getElementById('testimony-counter');
  if (counter) {
    const cs = counter.querySelector('.current-slide');
    const ts = counter.querySelector('.total-slides');
    if (cs) cs.textContent = currentSlide + 1;
    if (ts) ts.textContent = totalSlides;
  }

  // Disable buttons only when there's exactly 1 slide
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');
  if (prevBtn) prevBtn.disabled = totalSlides <= 1;
  if (nextBtn) nextBtn.disabled = totalSlides <= 1;

  _resetAutoSlide();
}

// ── Read more / less toggle ─────────────────────────────────────────────────
function _toggleExpand(event) {
  const btn     = event.currentTarget;
  const card    = btn.closest('.testimony-card');
  const excerpt = card.querySelector('.testimony-excerpt');
  const full    = card.querySelector('.testimony-full');
  const arrow   = btn.querySelector('.read-more-arrow');
  const label   = btn.querySelector('.btn-text');

  const expanding = full.style.display !== 'block';
  excerpt.style.display = expanding ? 'none'  : 'block';
  full.style.display    = expanding ? 'block' : 'none';
  label.textContent     = expanding ? 'Read Less' : 'Read More';
  if (arrow) arrow.style.transform = expanding ? 'rotate(180deg)' : 'rotate(0deg)';
  btn.classList.toggle('expanded', expanding);
}

// ── Auto-slide ──────────────────────────────────────────────────────────────
function _startAutoSlide() {
  if (autoSlideInterval || totalSlides <= 1) return;
  autoSlideInterval = setInterval(_nextSlide, 5000);
}

function _pauseAutoSlide() {
  if (autoSlideInterval) { clearInterval(autoSlideInterval); autoSlideInterval = null; }
}

function _resetAutoSlide() {
  _pauseAutoSlide();
  _startAutoSlide();
}

// ── Public API ──────────────────────────────────────────────────────────────
window.testimoniesCarousel = {
  next:      _nextSlide,
  prev:      _prevSlide,
  goTo:      _goToSlide,
  refresh:   window.initializeTestimoniesPage,
};