// SIMPLE ABOUT PAGE LOADER
document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".about-nav nav a");
  const contentDiv = document.getElementById("about-content");
  const loadingBuffer = document.getElementById("loading-buffer");
  const aboutWrapper = document.getElementById("about-wrapper");

  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get("page") || "about-jesus";
  
  let currentPage = pageParam;

  function showLoader() {
    loadingBuffer.classList.remove("hidden");
    contentDiv.classList.remove("visible");
    contentDiv.style.display = "none";
  }

  function hideLoader() {
    loadingBuffer.classList.add("hidden");
    contentDiv.style.display = "block";
    
    // Small delay for animation
    setTimeout(() => {
      contentDiv.classList.add("visible");
    }, 50);
  }

  function loadContent(page) {
    if (currentPage === page && contentDiv.innerHTML.trim() !== '') {
      return; // Already loaded
    }
    
    showLoader();
    currentPage = page;

    // Update active link
    navLinks.forEach(link => link.classList.remove("active"));
    const activeLink = document.querySelector(`.about-nav a[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add("active");

    // Update URL
    history.pushState(null, "", `?page=${page}`);

    // Load content
    fetch(`partials/${page}.html`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load');
        return res.text();
      })
      .then(data => {
        contentDiv.innerHTML = data;
        hideLoader();
        
        // Initialize testimony page if needed
        if (page === "about-testimony" && typeof window.initializeTestimoniesPage === 'function') {
          setTimeout(() => {
            window.initializeTestimoniesPage();
          }, 100);
        }
      })
      .catch(err => {
        console.error('Error loading content:', err);
        contentDiv.innerHTML = `
          <div class="content" style="text-align: center; padding: 4rem;">
            <h2>Content Loading Error</h2>
            <p>Sorry, we couldn't load the content. Please try again.</p>
            <button onclick="location.reload()" style="margin-top: 1rem; padding: 10px 20px; background: #111; color: white; border: none; border-radius: 5px; cursor: pointer;">
              Reload Page
            </button>
          </div>
        `;
        hideLoader();
      });
  }

  // Navigation click handlers
  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = link.getAttribute("data-page");
      if (currentPage !== page) {
        loadContent(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  // Handle browser back/forward
  window.addEventListener("popstate", () => {
    const page = new URLSearchParams(window.location.search).get("page") || "about-jesus";
    if (currentPage !== page) {
      loadContent(page);
    }
  });

  // Initial load
  if (contentDiv.innerHTML.trim() === '') {
    loadContent(pageParam);
  } else {
    // Content already loaded
    navLinks.forEach(link => link.classList.remove("active"));
    const activeLink = document.querySelector(`.about-nav a[data-page="${pageParam}"]`);
    if (activeLink) activeLink.classList.add("active");
    contentDiv.classList.add("visible");
  }
});