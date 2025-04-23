document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".about-nav nav a");
  const contentDiv = document.getElementById("about-content");

  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get("page") || "about-jesus";
  const sectionParam = urlParams.get("section");

  function loadContent(page, callback) {
    fetch(`partials/${page}.html`)
      .then(res => res.text())
      .then(data => {
        contentDiv.innerHTML = data;
        setActiveLink(page);
        if (callback) callback();
      });
  }

  function setActiveLink(page) {
    navLinks.forEach(link => link.classList.remove("active"));
    const activeLink = document.querySelector(`.about-nav a[data-page="${page}"]`);
    if (activeLink) {
      activeLink.classList.add("active");
    }
  }

  // Load initial page
  loadContent(pageParam, () => {
    if (sectionParam) {
      // Delay scrolling to ensure the section is present
      setTimeout(() => {
        const target = document.getElementById(sectionParam);
        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
        }
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
});
