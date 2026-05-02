// ================================================================
//  script.js  —  Hero typewriter + burger menu
//  Fix: track all active intervals and cancel them before any new
//  typewriter run, preventing mixed-language characters on fast toggle.
// ================================================================

// Track active typewriter intervals so we can cancel mid-run
let _typeIntervals = [];

function clearTypeIntervals() {
  _typeIntervals.forEach(clearInterval);
  _typeIntervals = [];
}

// Burger menu toggle logic
function setupBurgerMenu() {
  const burger   = document.getElementById("burger");
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
  en: { welcome: "Welcome to",  churchName: "Dharmikta Church"    },
  ne: { welcome: "स्वागत छ",    churchName: "धार्मिकता मण्डलीमा" }
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
      // Remove this interval from the tracking array once it finishes naturally
      _typeIntervals = _typeIntervals.filter(function (id) { return id !== interval; });
      if (onDone) onDone();
    }
  }, speed);
  // Register this interval so it can be cancelled externally
  _typeIntervals.push(interval);
}

// Public: run typewriter for a given language code.
// Called by applyLang() in navbar.js on explicit language switch,
// and by DOMContentLoaded below on initial page load.
window.runTypeWriter = function (lang) {
  const welcomeEl    = document.querySelector(".welcome");
  const churchNameEl = document.querySelector(".church-name");
  if (!welcomeEl || !churchNameEl) return;

  // Cancel any in-progress typing intervals immediately
  clearTypeIntervals();

  // Blank both spans so no stale characters remain
  welcomeEl.textContent    = "";
  churchNameEl.textContent = "";

  const texts = heroText[lang] || heroText["en"];

  // Type the welcome line first, then the church name after it finishes
  typeString(welcomeEl, texts.welcome, 100, function () {
    typeString(churchNameEl, texts.churchName, 100, null);
  });
};

// On DOM load: set up burger, then fire typewriter in the saved language
document.addEventListener("DOMContentLoaded", function () {
  setupBurgerMenu();

  // Only run on pages that have the hero spans
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