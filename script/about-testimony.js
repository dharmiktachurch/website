// TESTIMONIES CAROUSEL - CLEANED VERSION

// Global variables
let currentSlide = 0;
let totalSlides = 0;
let testimoniesData = [];
let track = null;
let carouselInitialized = false;
let autoSlideInterval = null;

// Cache DOM elements
let testimoniesPage = null;
let container = null;

// Main initialization function - called from about.js
window.initializeTestimoniesPage = function() {
  testimoniesPage = document.querySelector('.testimonies-page');
  container = document.getElementById('testimonies-container');
  
  if (!testimoniesPage) {
    return;
  }
  
  // Reset page state
  testimoniesPage.classList.remove('loaded');
  
  // Initialize carousel
  initializeTestimoniesCarousel();
};

function initializeTestimoniesCarousel() {
  // Clear any existing interval
  if (autoSlideInterval) {
    clearInterval(autoSlideInterval);
    autoSlideInterval = null;
  }
  
  if (!container) {
    return;
  }
  
  // Show loading state
  container.innerHTML = `
    <div class="loading-testimonies">
      <div class="loading-spinner"></div>
      <p>Loading testimonies...</p>
    </div>
  `;
  
  // Load data immediately
  loadTestimonies()
    .then(data => {
      testimoniesData = data;
      completeCarouselSetup();
    })
    .catch(error => {
      console.error('Error loading testimonies:', error);
      useFallbackData();
      completeCarouselSetup();
    });
}

function completeCarouselSetup() {
  carouselInitialized = true;
  totalSlides = testimoniesData.length;
  
  // Render testimonies
  renderTestimonies();
  
  // Setup carousel controls if we have data
  if (testimoniesData.length > 0) {
    setupCarousel();
    
    if (totalSlides > 1) {
      startAutoSlide();
    }
  } else {
    showNoTestimoniesMessage();
  }
  
  // Show page content
  if (testimoniesPage) {
    testimoniesPage.classList.add('loaded');
  }
}

function loadTestimonies() {
  return new Promise((resolve, reject) => {
    fetch('/data/about-testimony.json')
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error(`HTTP ${response.status}`);
      })
      .then(data => {
        resolve(data.testimonies || data || []);
      })
      .catch(error => {
        reject(error);
      });
  });
}

function useFallbackData() {
  testimoniesData = [
    {
      id: 1,
      author: "John Smith",
      role: "Church Member",
      date: "January 2024",
      excerpt: "God's grace transformed my life in ways I never imagined possible.",
      fullText: ["God's grace transformed my life in ways I never imagined possible. Through prayer and faith, I found peace and purpose."],
      tags: ["Transformation", "Faith"],
      icon: "fas fa-user"
    },
    {
      id: 2,
      author: "Sarah Johnson",
      role: "Youth Leader",
      date: "December 2023",
      excerpt: "Finding community in this church has been a blessing to my family.",
      fullText: ["Finding community in this church has been a blessing to my family. The support and love we've received have helped us through difficult times."],
      tags: ["Community", "Family"],
      icon: "fas fa-heart"
    }
  ];
}

function showNoTestimoniesMessage() {
  if (container) {
    container.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>No Testimonies Available</h3>
        <p>There are no testimonies to display at the moment.</p>
        <button class="retry-btn" onclick="window.testimoniesCarousel.refresh()">
          <i class="fas fa-redo"></i>
          Try Again
        </button>
      </div>
    `;
  }
}

function renderTestimonies() {
  if (!container) return;
  
  // Clear container
  container.innerHTML = '';
  
  // Create track
  track = document.createElement('div');
  track.className = 'testimonies-track';
  track.id = 'testimonies-track';
  
  const template = document.getElementById('testimony-template');
  if (!template) {
    container.innerHTML = '<p class="error-state">Error: Template not found</p>';
    return;
  }
  
  // Render each testimony
  testimoniesData.forEach((testimony, index) => {
    const clone = template.content.cloneNode(true);
    const slide = clone.querySelector('.testimony-slide');
    const card = clone.querySelector('.testimony-card');
    const icon = clone.querySelector('.author-avatar-container i');
    const authorName = clone.querySelector('.author-name');
    const authorRole = clone.querySelector('.author-role');
    const dateText = clone.querySelector('.date-text');
    const excerpt = clone.querySelector('.testimony-excerpt p');
    const fullTextContainer = clone.querySelector('.testimony-full');
    const tagsContainer = clone.querySelector('.testimony-tags');
    const readMoreBtn = clone.querySelector('.read-more-btn');
    
    // Set data attributes
    slide.id = `testimony-slide-${index}`;
    slide.dataset.index = index;
    card.dataset.testimonyId = testimony.id || index + 1;
    
    // Populate content
    icon.className = testimony.icon || 'fas fa-user';
    authorName.textContent = testimony.author || 'Anonymous';
    authorRole.textContent = testimony.role || 'Member';
    dateText.textContent = testimony.date || 'Recently';
    excerpt.textContent = testimony.excerpt || 'No excerpt available';
    
    // Full text
    if (testimony.fullText) {
      fullTextContainer.innerHTML = '';
      if (Array.isArray(testimony.fullText)) {
        testimony.fullText.forEach(paragraph => {
          const p = document.createElement('p');
          p.textContent = paragraph;
          fullTextContainer.appendChild(p);
        });
      } else {
        const p = document.createElement('p');
        p.textContent = testimony.fullText;
        fullTextContainer.appendChild(p);
      }
    }
    
    // Tags
    if (testimony.tags && Array.isArray(testimony.tags)) {
      testimony.tags.forEach(tagText => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = tagText;
        tagsContainer.appendChild(tag);
      });
    } else {
      tagsContainer.style.display = 'none';
    }
    
    // Read more button
    readMoreBtn.addEventListener('click', toggleTestimony);
    
    track.appendChild(clone);
  });
  
  container.appendChild(track);
}

function setupCarousel() {
  if (!track) return;
  
  const slides = track.querySelectorAll('.testimony-slide');
  if (slides.length === 0) return;
  
  // Set first slide as active
  slides.forEach(slide => slide.classList.remove('active'));
  slides[0].classList.add('active');
  
  setupNavigation();
  goToSlide(0);
}

function setupNavigation() {
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');
  const indicatorsContainer = document.getElementById('carousel-indicators');
  
  if (!prevBtn || !nextBtn) return;
  
  // Setup indicators
  if (indicatorsContainer) {
    indicatorsContainer.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
      const indicator = document.createElement('button');
      indicator.className = 'indicator';
      if (i === 0) indicator.classList.add('active');
      indicator.dataset.index = i;
      indicator.setAttribute('aria-label', `Go to testimony ${i + 1}`);
      indicator.addEventListener('click', () => goToSlide(i));
      indicatorsContainer.appendChild(indicator);
    }
  }
  
  function nextSlide() {
    if (currentSlide < totalSlides - 1) {
      goToSlide(currentSlide + 1);
    } else {
      goToSlide(0);
    }
  }
  
  function prevSlide() {
    if (currentSlide > 0) {
      goToSlide(currentSlide - 1);
    } else {
      goToSlide(totalSlides - 1);
    }
  }
  
  // Event listeners
  prevBtn.addEventListener('click', prevSlide);
  nextBtn.addEventListener('click', nextSlide);
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'ArrowRight') nextSlide();
  });
  
  // Touch/swipe support
  if (track) {
    let startX = 0;
    let endX = 0;
    
    track.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });
    
    track.addEventListener('touchend', (e) => {
      endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
    }, { passive: true });
  }
  
  // Auto-slide controls on hover
  const carouselContainer = document.querySelector('.testimonies-carousel');
  if (carouselContainer) {
    carouselContainer.addEventListener('mouseenter', pauseAutoSlide);
    carouselContainer.addEventListener('mouseleave', startAutoSlide);
  }
  
  updateNavButtons();
}

function goToSlide(slideIndex) {
  if (slideIndex < 0 || slideIndex >= totalSlides || !track) {
    return;
  }
  
  currentSlide = slideIndex;
  
  const slides = track.querySelectorAll('.testimony-slide');
  
  // Update slides
  slides.forEach(slide => slide.classList.remove('active'));
  if (slides[currentSlide]) {
    slides[currentSlide].classList.add('active');
  }
  
  // Update track position
  const translateX = -currentSlide * 100;
  track.style.transform = `translateX(${translateX}%)`;
  
  // Update UI
  updateIndicators();
  updateCounter();
  updateNavButtons();
  
  // Reset auto-slide timer
  resetAutoSlide();
}

function updateIndicators() {
  const indicators = document.querySelectorAll('.indicator');
  indicators.forEach((indicator, index) => {
    indicator.classList.toggle('active', index === currentSlide);
  });
}

function updateNavButtons() {
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');
  
  if (prevBtn && nextBtn) {
    prevBtn.disabled = totalSlides <= 1;
    nextBtn.disabled = totalSlides <= 1;
  }
}

function updateCounter() {
  const counter = document.getElementById('testimony-counter');
  if (!counter) return;
  
  const currentSpan = counter.querySelector('.current-slide');
  const totalSpan = counter.querySelector('.total-slides');
  
  if (currentSpan) {
    currentSpan.textContent = currentSlide + 1;
  }
  
  if (totalSpan) {
    totalSpan.textContent = totalSlides;
  }
}

function toggleTestimony(event) {
  const button = event.currentTarget;
  const testimonyCard = button.closest('.testimony-card');
  const excerpt = testimonyCard.querySelector('.testimony-excerpt');
  const full = testimonyCard.querySelector('.testimony-full');
  const icon = button.querySelector('i');
  const textSpan = button.querySelector('.btn-text');
  
  const isExpanded = full.style.display === 'block';
  
  if (!isExpanded) {
    excerpt.style.display = 'none';
    full.style.display = 'block';
    textSpan.textContent = 'Read Less';
    icon.style.transform = 'rotate(180deg)';
    button.classList.add('expanded');
    testimonyCard.classList.add('expanded');
  } else {
    full.style.display = 'none';
    excerpt.style.display = 'block';
    textSpan.textContent = 'Read More';
    icon.style.transform = 'rotate(0deg)';
    button.classList.remove('expanded');
    testimonyCard.classList.remove('expanded');
  }
}

function startAutoSlide() {
  if (autoSlideInterval) {
    clearInterval(autoSlideInterval);
  }
  
  if (totalSlides > 1) {
    autoSlideInterval = setInterval(() => {
      const nextSlide = (currentSlide + 1) % totalSlides;
      goToSlide(nextSlide);
    }, 5000);
  }
}

function pauseAutoSlide() {
  if (autoSlideInterval) {
    clearInterval(autoSlideInterval);
    autoSlideInterval = null;
  }
}

function resetAutoSlide() {
  pauseAutoSlide();
  if (totalSlides > 1) {
    startAutoSlide();
  }
}

// Global API for external control
window.testimoniesCarousel = {
  nextSlide: function() {
    const next = (currentSlide + 1) % totalSlides;
    goToSlide(next);
  },
  prevSlide: function() {
    const prev = (currentSlide - 1 + totalSlides) % totalSlides;
    goToSlide(prev);
  },
  goToSlide: function(index) {
    goToSlide(index);
  },
  refresh: function() {
    // Reset state
    carouselInitialized = false;
    currentSlide = 0;
    
    if (autoSlideInterval) {
      clearInterval(autoSlideInterval);
      autoSlideInterval = null;
    }
    
    // Reinitialize
    initializeTestimoniesCarousel();
  }
};

// Initialize if this page is loaded directly (not through about.js)
if (document.querySelector('.testimonies-page') && !document.querySelector('.about-nav')) {
  document.addEventListener('DOMContentLoaded', function() {
    window.initializeTestimoniesPage();
  });
}