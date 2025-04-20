document.addEventListener("DOMContentLoaded", function () {
  setupBurgerMenu();
});

function setupBurgerMenu() {
  const burger = document.getElementById("burger");
  const navLinks = document.getElementById("nav-links");

  if (burger && navLinks) {
    burger.addEventListener("click", function () {
      navLinks.classList.toggle("active");
    });
  }
}

const message = "Welcome to Dharmikta Church";
let i = 0;

function typeWriter() {
  if (i < message.length) {
    document.getElementById("hero-title").textContent += message.charAt(i);
    i++;
    setTimeout(typeWriter, 100);
  }
}

window.onload = typeWriter;
