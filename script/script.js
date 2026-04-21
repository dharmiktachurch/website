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

// Hero text per language
const heroText = {
  en: { welcome: "Welcome to",   churchName: "Dharmikta Church"    },
  ne: { welcome: "स्वागत छ",     churchName: "धार्मिकता मण्डलीमा" }
};

// Type a string into an element character by character
function typeString(el, text, speed, onDone) {
  el.textContent = "";
  let i = 0;
  const interval = setInterval(function () {
    el.textContent += text.charAt(i);
    i++;
    if (i === text.length) {
      clearInterval(interval);
      if (onDone) onDone();
    }
  }, speed);
}

// Public: run typewriter for a given language code
// Called by applyLang() in index.html — NOT called here on DOMContentLoaded,
// because the inline script that owns language state runs after this file loads.
window.runTypeWriter = function (lang) {
  const welcomeEl    = document.querySelector(".welcome");
  const churchNameEl = document.querySelector(".church-name");
  if (!welcomeEl || !churchNameEl) return;

  const texts = heroText[lang] || heroText["en"];
  typeString(welcomeEl, texts.welcome, 100, function () {
    typeString(churchNameEl, texts.churchName, 100, null);
  });
};

// On DOM load: only set up the burger; language + typewriter are handled by index.html
document.addEventListener("DOMContentLoaded", function () {
  setupBurgerMenu();

  // Fallback for pages that have the hero but NO language toggle
  // (other pages like about.html, services.html, etc.)
  if (!document.getElementById("btn-en")) {
    window.runTypeWriter("en");
  }
});