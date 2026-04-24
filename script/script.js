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
// Called by applyLang() in navbar.js on explicit language switch,
// and by DOMContentLoaded below on initial page load.
window.runTypeWriter = function (lang) {
  const welcomeEl    = document.querySelector(".welcome");
  const churchNameEl = document.querySelector(".church-name");
  if (!welcomeEl || !churchNameEl) return;

  const texts = heroText[lang] || heroText["en"];
  typeString(welcomeEl, texts.welcome, 100, function () {
    typeString(churchNameEl, texts.churchName, 100, null);
  });
};

// On DOM load: set up burger, then fire typewriter in the saved language
document.addEventListener("DOMContentLoaded", function () {
  setupBurgerMenu();

  // Run typewriter on any page that has the hero spans
  const welcomeEl    = document.querySelector(".welcome");
  const churchNameEl = document.querySelector(".church-name");

  if (welcomeEl && churchNameEl) {
    // getSavedLang() is defined in navbar.js which loads before this file
    const lang = (typeof window.getSavedLang === "function")
      ? window.getSavedLang()
      : "en";
    window.runTypeWriter(lang);
  }
});