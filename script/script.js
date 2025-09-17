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
  typeWriter(); // Now only runs if the correct elements exist
});
