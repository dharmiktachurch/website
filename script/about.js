document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".about-nav nav a");
  const contentDiv = document.getElementById("about-content");
  const loadingBuffer = document.getElementById("loading-buffer");

  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get("page") || "about-jesus";
  const sectionParam = urlParams.get("section");

  /* ---------------------------
     LOADER FUNCTIONS
  ---------------------------- */
  function showLoader() {
    loadingBuffer.style.display = "block";
    loadingBuffer.classList.remove("hidden");
    contentDiv.style.display = "none";
    contentDiv.classList.remove("visible");
  }

  function hideLoader() {
    // Fade out skeleton
    loadingBuffer.classList.add("hidden");

    // Wait for fade transition to finish
    setTimeout(() => {
      loadingBuffer.style.display = "none";
      contentDiv.style.display = "block";
      contentDiv.classList.add("visible");
    }, 600); // match CSS transition duration
  }

  /* ---------------------------
     LOAD PAGE CONTENT
  ---------------------------- */
  function loadContent(page, callback) {
    showLoader();

    // Fetch content from "partials/" folder
    const fetchPromise = fetch(`partials/${page}.html`).then((res) => res.text());

    // Minimum skeleton display (500ms)
    const minLoader = new Promise((resolve) => setTimeout(resolve, 500));

    Promise.all([fetchPromise, minLoader])
      .then(([data]) => {
        contentDiv.innerHTML = data;
        hideLoader();

        if (callback) callback();
      })
      .catch((err) => {
        console.error("Error loading content:", err);
        contentDiv.innerHTML =
          "<p>Sorry, content could not be loaded at the moment.</p>";
        hideLoader();
      });
  }

  /* ---------------------------
     SET ACTIVE LINK
  ---------------------------- */
  function setActiveLink(page) {
    navLinks.forEach((link) => link.classList.remove("active"));
    const activeLink = document.querySelector(
      `.about-nav a[data-page="${page}"]`
    );
    if (activeLink) activeLink.classList.add("active");
  }

  /* ---------------------------
     INITIAL PAGE LOAD
  ---------------------------- */
  loadContent(pageParam, () => {
    setActiveLink(pageParam);

    if (sectionParam) {
      const target = document.getElementById(sectionParam);
      if (target) target.scrollIntoView({ behavior: "smooth" });
    }
  });

  /* ---------------------------
     NAVIGATION CLICKS
  ---------------------------- */
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = link.getAttribute("data-page");

      // Update URL
      history.pushState(null, "", `?page=${page}`);

      loadContent(page);
      setActiveLink(page);
    });
  });

  /* ---------------------------
     BROWSER BACK / FORWARD
  ---------------------------- */
  window.addEventListener("popstate", () => {
    const page =
      new URLSearchParams(window.location.search).get("page") || "about-jesus";
    loadContent(page);
    setActiveLink(page);
  });
});
