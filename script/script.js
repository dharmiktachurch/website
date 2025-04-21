// Function to load external HTML into specified divs
function loadHTML(id, file) {
  fetch(file)
    .then(response => {
      if (!response.ok) throw new Error("Failed to fetch " + file);
      return response.text();
    })
    .then(data => {
      document.getElementById(id).innerHTML = data;

      // If navbar is loaded, initialize burger menu
      if (file === "navbar.html") setupBurgerMenu();
    })
    .catch(error => console.error(error));
}

// Burger menu toggle logic
function setupBurgerMenu() {
  const burger = document.getElementById("burger");
  const navLinks = document.getElementById("nav-links");

  if (burger && navLinks) {
    burger.addEventListener("click", function () {
      burger.classList.toggle("active");
      navLinks.classList.toggle("active");
    });
  }
}

// Typewriter effect for hero title
const message = "Welcome to Dharmikta Church";
let i = 0;

function typeWriter() {
  const titleEl = document.getElementById("hero-title");
  if (titleEl && i < message.length) {
    titleEl.textContent += message.charAt(i);
    i++;
    setTimeout(typeWriter, 100);
  }
}

// On DOM load: load navbar & footer
document.addEventListener("DOMContentLoaded", function () {
  loadHTML("navbar-include", "navbar.html");
  loadHTML("footer-include", "footer.html");

  // Start typewriter after DOM is ready (hero-title should already be present)
  typeWriter();
});
