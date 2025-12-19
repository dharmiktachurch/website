document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".about-nav nav a");
  const contentDiv = document.getElementById("about-content");
  const loadingBuffer = document.getElementById("loading-buffer");
  const footer = document.querySelector('.footer');

  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get("page") || "about-jesus";
  const sectionParam = urlParams.get("section");

  let currentPage = pageParam;
  let isLoading = false;

  // Hide footer initially during loading
  if (footer) {
    footer.style.opacity = '0';
    footer.style.transition = 'opacity 0.3s ease';
  }

  function showLoader() {
    if (isLoading) return;
    isLoading = true;
    
    loadingBuffer.style.display = "block";
    void loadingBuffer.offsetWidth; // Force reflow
    loadingBuffer.classList.remove("hidden");
    contentDiv.style.display = "none";
    contentDiv.classList.remove("visible");
    
    // Hide footer during loading
    if (footer) {
      footer.style.opacity = '0';
    }
  }

  function hideLoader(instant = false) {
    isLoading = false;
    
    if (instant) {
      // Instant hide - no animation
      loadingBuffer.style.display = "none";
      contentDiv.style.display = "block";
      contentDiv.classList.add("visible");
      
      // Show footer immediately
      if (footer) {
        footer.style.opacity = '1';
      }
    } else {
      // Fade out skeleton
      loadingBuffer.classList.add("hidden");
      
      // Show content after a very short delay
      setTimeout(() => {
        contentDiv.style.display = "block";
        contentDiv.classList.add("visible");
        
        // Show footer
        if (footer) {
          footer.style.opacity = '1';
        }
        
        // Hide skeleton after animation
        setTimeout(() => {
          loadingBuffer.style.display = "none";
        }, 300);
      }, 50);
    }
  }

  function loadContent(page, callback) {
    // Don't reload if already on this page
    if (currentPage === page && contentDiv.innerHTML.trim() !== '') {
      if (callback) callback();
      return;
    }
    
    showLoader();
    
    // Clean up previous page resources
    if (currentPage === "about-testimony" && page !== "about-testimony") {
      // Stop carousel if leaving testimony page
      if (window.autoSlideInterval) {
        clearInterval(window.autoSlideInterval);
        window.autoSlideInterval = null;
      }
    }
    
    currentPage = page;

    fetch(`partials/${page}.html`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${page}`);
        return res.text();
      })
      .then((data) => {
        contentDiv.innerHTML = data;
        
        // If it's testimony page, handle differently
        if (page === "about-testimony") {
          // Hide loader immediately and let testimony handle its own loading
          hideLoader(true);
          
          // Initialize testimony carousel immediately
          setTimeout(() => {
            if (typeof window.initializeTestimoniesPage === 'function') {
              window.initializeTestimoniesPage();
            }
          }, 10);
        } else {
          // For other pages, hide loader normally
          hideLoader();
        }
        
        if (callback) callback();
        
        // Handle section parameter for scrolling
        if (sectionParam && page === pageParam) {
          setTimeout(() => {
            const target = document.getElementById(sectionParam);
            if (target) {
              target.scrollIntoView({ behavior: "smooth" });
            }
          }, 100);
        }
      })
      .catch((err) => {
        console.error("Error loading content:", err);
        contentDiv.innerHTML = `
          <div class="error-state" style="text-align: center; padding: 4rem;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 1rem;"></i>
            <h3>Content Loading Error</h3>
            <p>Sorry, the content could not be loaded at the moment.</p>
            <button onclick="loadContent(pageParam)" style="background: #111; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 5px; margin-top: 1rem; cursor: pointer;">
              Try Again
            </button>
          </div>
        `;
        hideLoader();
      });
  }

  function setActiveLink(page) {
    navLinks.forEach((link) => link.classList.remove("active"));
    const activeLink = document.querySelector(
      `.about-nav a[data-page="${page}"]`
    );
    if (activeLink) activeLink.classList.add("active");
  }

  // Initial load - check if we need to show loader
  if (contentDiv.innerHTML.trim() === '') {
    loadContent(pageParam, () => {
      setActiveLink(pageParam);
    });
  } else {
    // Content already loaded (back button or refresh)
    setActiveLink(pageParam);
    
    // If testimony page is already loaded, initialize it
    if (pageParam === "about-testimony") {
      setTimeout(() => {
        if (typeof window.initializeTestimoniesPage === 'function') {
          window.initializeTestimoniesPage();
        }
      }, 100);
    }
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = link.getAttribute("data-page");

      // Don't reload if already on this page
      if (currentPage === page) return;

      // Update URL without page reload
      history.pushState(null, "", `?page=${page}`);

      loadContent(page);
      setActiveLink(page);
      
      // Scroll to top when changing pages
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  window.addEventListener("popstate", () => {
    const page =
      new URLSearchParams(window.location.search).get("page") || "about-jesus";
    
    if (currentPage !== page) {
      loadContent(page);
      setActiveLink(page);
    }
  });

  // Show footer when everything is loaded
  window.addEventListener('load', function() {
    if (footer && !isLoading) {
      footer.style.opacity = '1';
    }
  });
});

// Cleanup function for when page is unloaded
window.addEventListener('beforeunload', function() {
  if (window.autoSlideInterval) {
    clearInterval(window.autoSlideInterval);
    window.autoSlideInterval = null;
  }
});