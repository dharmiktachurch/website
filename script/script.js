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
let i = 0; // Initialize the index for typing
const welcomeText = "Welcome to";
const churchNameText = "Dharmikta Church";

// Function to perform the typing effect
function typeWriter() {
  const welcomeEl = document.querySelector('.welcome');
  const churchNameEl = document.querySelector('.church-name');

  // Type for the "Welcome to" part
  const welcomeInterval = setInterval(() => {
    welcomeEl.textContent += welcomeText.charAt(i);
    i++;
    if (i === welcomeText.length) {
      clearInterval(welcomeInterval);
      // Once "Welcome to" finishes, type "Dharmikta Church"
      typeChurchName();
    }
  }, 100); // Adjust the speed here (100ms per character)
}

function typeChurchName() {
  let j = 0; // Reset index for the second part
  const churchNameEl = document.querySelector('.church-name');
  
  const churchInterval = setInterval(() => {
    churchNameEl.textContent += churchNameText.charAt(j);
    j++;
    if (j === churchNameText.length) {
      clearInterval(churchInterval);
    }
  }, 100); // Adjust the speed here (100ms per character)
}

// On DOM load: load navbar & footer and start the typing effect
document.addEventListener("DOMContentLoaded", function () {
  loadHTML("navbar-include", "navbar.html");
  loadHTML("footer-include", "footer.html");

  // Start typewriter effect after DOM is ready
  typeWriter();
});
