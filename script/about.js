// ================================
// ABOUT PAGE – SMOOTH LOADER SYSTEM (FIXED)
// ================================

document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".about-nav a");
  const contentDiv = document.getElementById("about-content");
  const loadingBuffer = document.getElementById("loading-buffer");

  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get("page") || "about-jesus";
  let currentPage = null;

  // ── Preload CSS upfront — all styles live in about.css now ───────────────
  const cssFiles = [
    "style/about.css",
    // about-testimony.css is merged into about.css — no separate file needed
  ];

  function preloadCSS(href) {
    if (document.querySelector(`link[href="${href}"]`)) return Promise.resolve();
    return new Promise((resolve) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = resolve;
      link.onerror = resolve; // don't block on missing files
      document.head.appendChild(link);
    });
  }

  // Fire all CSS loads immediately on DOMContentLoaded
  const cssReady = Promise.all(cssFiles.map(preloadCSS));

  /* --------------------
     LOADER CONTROLS
  -------------------- */
  function showLoader() {
    loadingBuffer.removeAttribute("hidden");
    loadingBuffer.style.opacity = "1";
    loadingBuffer.style.visibility = "visible";
    loadingBuffer.style.pointerEvents = "all";

    contentDiv.style.opacity = "0";
    contentDiv.style.visibility = "hidden";
    contentDiv.style.display = "none";
  }

  function hideLoader() {
    // Show content first (still invisible), then fade loader out
    contentDiv.style.display = "block";

    // Force reflow so the transition actually fires
    void contentDiv.offsetHeight;

    requestAnimationFrame(() => {
      contentDiv.style.opacity = "1";
      contentDiv.style.visibility = "visible";

      loadingBuffer.style.opacity = "0";
      loadingBuffer.style.visibility = "hidden";
      loadingBuffer.style.pointerEvents = "none";

      // After transition completes, set display:none so it doesn't intercept clicks
      loadingBuffer.addEventListener(
        "transitionend",
        () => {
          if (loadingBuffer.style.opacity === "0") {
            loadingBuffer.setAttribute("hidden", "");
          }
        },
        { once: true }
      );
    });
  }

  /* --------------------
     STRIP <link> tags from partial HTML
     (CSS is already preloaded into <head>)
  -------------------- */
  function stripLinkTags(html) {
    return html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, "");
  }

  /* --------------------
     CONTENT LOADER
  -------------------- */
  function loadContent(page) {
    if (currentPage === page) return;
    currentPage = page;
    showLoader();

    // Update active nav
    navLinks.forEach((link) => link.classList.remove("active"));
    const activeLink = document.querySelector(
      `.about-nav a[data-page="${page}"]`
    );
    if (activeLink) activeLink.classList.add("active");

    // Update URL
    history.pushState(null, "", `?page=${page}`);

    // Wait for CSS AND fetch to both complete before revealing
    const fetchHTML = fetch(`partials/${page}.html`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(stripLinkTags);

    Promise.all([fetchHTML, cssReady])
      .then(([html]) => {
        contentDiv.innerHTML = html;

        // Small breathing room for browser to paint injected DOM
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            hideLoader();

            // Init testimony carousel AFTER the fade-in transition ends
            // so the template element is fully in the live DOM
            if (
              page === "about-testimony" &&
              typeof window.initializeTestimoniesPage === "function"
            ) {
              // 420ms matches the opacity transition in #about-content (0.4s)
              setTimeout(() => window.initializeTestimoniesPage(), 420);
            }
          });
        });
      })
      .catch((err) => {
        console.error("Page load error:", err);
        contentDiv.innerHTML = `
          <div class="error-state">
            <i class="fas fa-exclamation-circle"></i>
            <h3>Failed to Load</h3>
            <p>Something went wrong. Please try again.</p>
            <button onclick="location.reload()" class="retry-btn">
              <i class="fas fa-redo"></i> Retry
            </button>
          </div>`;
        hideLoader();
      });
  }

  /* --------------------
     NAVIGATION EVENTS
  -------------------- */
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      loadContent(link.dataset.page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  window.addEventListener("popstate", () => {
    const page =
      new URLSearchParams(window.location.search).get("page") || "about-jesus";
    currentPage = null; // force reload on back/forward
    loadContent(page);
  });

  /* --------------------
     INITIAL LOAD
  -------------------- */
  loadContent(pageParam);
});