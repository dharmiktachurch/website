// ================================
// ABOUT PAGE – SMOOTH LOADER SYSTEM
// Fix: re-executes <script> tags after innerHTML injection
// ================================

document.addEventListener("DOMContentLoaded", function () {
  const navLinks      = document.querySelectorAll(".about-nav a");
  const contentDiv    = document.getElementById("about-content");
  const loadingBuffer = document.getElementById("loading-buffer");

  const urlParams   = new URLSearchParams(window.location.search);
  const pageParam   = urlParams.get("page") || "about-jesus";
  let   currentPage = null;

  // ── Preload CSS ──────────────────────────────────────────────────────────
  const cssFiles = ["style/about.css"];

  function preloadCSS(href) {
    if (document.querySelector(`link[href="${href}"]`)) return Promise.resolve();
    return new Promise((resolve) => {
      const link   = document.createElement("link");
      link.rel     = "stylesheet";
      link.href    = href;
      link.onload  = resolve;
      link.onerror = resolve;
      document.head.appendChild(link);
    });
  }

  const cssReady = Promise.all(cssFiles.map(preloadCSS));

  // ── Loader controls ──────────────────────────────────────────────────────
  function showLoader() {
    loadingBuffer.removeAttribute("hidden");
    loadingBuffer.style.opacity       = "1";
    loadingBuffer.style.visibility    = "visible";
    loadingBuffer.style.pointerEvents = "all";

    contentDiv.style.opacity    = "0";
    contentDiv.style.visibility = "hidden";
    contentDiv.style.display    = "none";
  }

  function hideLoader() {
    contentDiv.style.display = "block";
    void contentDiv.offsetHeight;

    requestAnimationFrame(() => {
      contentDiv.style.opacity    = "1";
      contentDiv.style.visibility = "visible";

      loadingBuffer.style.opacity       = "0";
      loadingBuffer.style.visibility    = "hidden";
      loadingBuffer.style.pointerEvents = "none";

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

  function stripLinkTags(html) {
    return html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, "");
  }

  // ── KEY FIX: re-execute <script> tags after innerHTML injection ──────────
  // innerHTML silently drops <script> tags — we extract and re-run them manually.
  function runScripts(container) {
    const scripts = container.querySelectorAll("script");
    scripts.forEach(function (oldScript) {
      const newScript = document.createElement("script");
      // Copy any attributes (e.g. type, src)
      Array.from(oldScript.attributes).forEach(function (attr) {
        newScript.setAttribute(attr.name, attr.value);
      });
      // Copy inline script content
      newScript.textContent = oldScript.textContent;
      // Replace old (inert) script with new (live) one
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }

  // ── Re-apply saved language after every partial inject ───────────────────
  function reapplyLang() {
    var lang = "en";
    try { lang = localStorage.getItem("dm-lang") || "en"; } catch (e) {}

    document.dispatchEvent(
      new CustomEvent("dm:langchange", { detail: { lang: lang } })
    );

    if (typeof window.setLang === "function") {
      window.setLang(lang);
    }
  }

  // ── Content loader ───────────────────────────────────────────────────────
  function loadContent(page) {
    if (currentPage === page) return;
    currentPage = page;
    showLoader();

    navLinks.forEach((link) => link.classList.remove("active"));
    const activeLink = document.querySelector(`.about-nav a[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add("active");

    history.pushState(null, "", `?page=${page}`);

    const fetchHTML = fetch(`partials/${page}.html`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(stripLinkTags);

    Promise.all([fetchHTML, cssReady])
      .then(([html]) => {
        contentDiv.innerHTML = html;

        // Re-execute scripts that innerHTML silently killed
        runScripts(contentDiv);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            hideLoader();
            reapplyLang();

            if (
              page === "about-testimony" &&
              typeof window.initializeTestimoniesPage === "function"
            ) {
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

  // ── Navigation events ────────────────────────────────────────────────────
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      loadContent(link.dataset.page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  window.addEventListener("popstate", () => {
    const page = new URLSearchParams(window.location.search).get("page") || "about-jesus";
    currentPage = null;
    loadContent(page);
  });

  // ── Initial load ─────────────────────────────────────────────────────────
  loadContent(pageParam);
});