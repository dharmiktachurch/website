document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".about-nav nav a");
  const contentDiv = document.getElementById("about-content");
  const loadingBuffer = document.getElementById("loading-buffer");

  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get("page") || "about-jesus";
  const sectionParam = urlParams.get("section");

  // Show loader and hide content
  function showLoader() {
    loadingBuffer.style.display = 'flex';
    contentDiv.classList.remove('visible'); // hide content while loading
  }

  // Hide loader and show content
  function hideLoader() {
    loadingBuffer.style.display = 'none';
    contentDiv.classList.add('visible'); // fade in content
  }

  // Load content function
  function loadContent(page, callback) {
    showLoader();

    // Minimum loader display time
    const loaderPromise = new Promise(resolve => setTimeout(resolve, 800));

    Promise.all([
      fetch(`partials/${page}.html`).then(res => res.text()),
      loaderPromise
    ])
    .then(([data]) => {
      contentDiv.innerHTML = data;
      setActiveLink(page);

      // Use requestAnimationFrame to ensure DOM update before fade-in
      requestAnimationFrame(() => hideLoader());

      if (callback) callback();
    })
    .catch(error => {
      console.error('Error loading content:', error);
      contentDiv.innerHTML = '<div class="container"><p>Sorry, we couldn\'t load the content at this time.</p></div>';
      hideLoader();
    });
  }

  // Set active nav link
  function setActiveLink(page) {
    navLinks.forEach(link => link.classList.remove("active"));
    const activeLink = document.querySelector(`.about-nav a[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add("active");
  }

  // Load initial page
  loadContent(pageParam, () => {
    if (sectionParam) {
      // Delay scrolling to ensure section exists
      setTimeout(() => {
        const target = document.getElementById(sectionParam);
        if (target) target.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  });

  // Handle navigation clicks
  navLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const page = link.getAttribute("data-page");
      history.pushState(null, "", `?page=${page}`);
      loadContent(page);
    });
  });

  // Handle back/forward navigation
  window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get("page") || "about-jesus";
    loadContent(page);
  });
});
