document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".about-nav nav a");
  const contentDiv = document.getElementById("about-content");

  function loadContent(page) {
    fetch(`partials/${page}.html`)
      .then(res => res.text())
      .then(data => {
        contentDiv.innerHTML = data;
        setActiveLink(page);
      });
  }

  function setActiveLink(page) {
    // Remove active class from all links
    navLinks.forEach(link => link.classList.remove("active"));
    
    // Add active class to the selected link
    const activeLink = document.querySelector(`.about-nav a[data-page="${page}"]`);
    if (activeLink) {
      activeLink.classList.add("active");
    }
  }

  // Default page (load About Jesus by default)
  loadContent("about-jesus");

  // Sub-nav click
  navLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const page = link.getAttribute("data-page");
      loadContent(page);
    });
  });
});
