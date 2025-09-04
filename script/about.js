document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".about-nav nav a");
  const contentDiv = document.getElementById("about-content");
  const loadingBuffer = document.getElementById("loading-buffer");

  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get("page") || "about-jesus";
  const sectionParam = urlParams.get("section");

  function showLoader() {
    loadingBuffer.classList.remove('hidden');
    contentDiv.classList.remove('visible');
  }

  function hideLoader() {
    loadingBuffer.classList.add('hidden');
    contentDiv.classList.add('visible');
  }

  function loadContent(page, callback) {
    showLoader();

    // Fetch content asynchronously
    const fetchPromise = fetch(`partials/${page}.html`).then(res => res.text());

    // Minimum loader display time (500ms)
    const minLoader = new Promise(resolve => setTimeout(resolve, 500));

    // Wait for both fetch and minimum loader time
    Promise.all([fetchPromise, minLoader])
      .then(([data]) => {
        contentDiv.innerHTML = data;
        hideLoader();

        if (callback) callback();
      })
      .catch(err => {
        console.error('Error loading content:', err);
        contentDiv.innerHTML = '<p>Sorry, content could not be loaded.</p>';
        hideLoader();
      });
  }

  function setActiveLink(page) {
    navLinks.forEach(link => link.classList.remove("active"));
    const activeLink = document.querySelector(`.about-nav a[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add("active");
  }

  // Load initial page
  loadContent(pageParam, () => {
    setActiveLink(pageParam);
    if (sectionParam) {
      const target = document.getElementById(sectionParam);
      if (target) target.scrollIntoView({ behavior: "smooth" });
    }
  });

  // Navigation clicks
  navLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const page = link.getAttribute("data-page");
      history.pushState(null, "", `?page=${page}`);
      loadContent(page);
      setActiveLink(page);
    });
  });

  // Back/forward navigation
  window.addEventListener('popstate', () => {
    const page = new URLSearchParams(window.location.search).get("page") || "about-jesus";
    loadContent(page);
    setActiveLink(page);
  });
});
