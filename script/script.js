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
const welcomeText = "Welcome to";
const churchNameText = "Dharmikta Church";

function typeWriter() {
  const welcomeEl = document.querySelector('.welcome');
  const churchNameEl = document.querySelector('.church-name');

  // Check if the elements exist before running the typewriter
  if (!welcomeEl || !churchNameEl) return;

  let i = 0;

  const welcomeInterval = setInterval(() => {
    welcomeEl.textContent += welcomeText.charAt(i);
    i++;
    if (i === welcomeText.length) {
      clearInterval(welcomeInterval);
      typeChurchName(churchNameEl);
    }
  }, 100);
}

function typeChurchName(churchNameEl) {
  let j = 0;

  const churchInterval = setInterval(() => {
    churchNameEl.textContent += churchNameText.charAt(j);
    j++;
    if (j === churchNameText.length) {
      clearInterval(churchInterval);
    }
  }, 100);
}

// On DOM load: load navbar & footer and start the typing effect (if applicable)
document.addEventListener("DOMContentLoaded", function () {
  loadHTML("navbar-include", "navbar.html");
  loadHTML("footer-include", "footer.html");

  typeWriter(); // Now only runs if the correct elements exist
});
