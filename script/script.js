document.addEventListener("DOMContentLoaded", function () {
  function loadHTML(id, url, callback) {
    fetch(url)
      .then(response => response.text())
      .then(data => {
        document.getElementById(id).innerHTML = data;
        if (callback) callback();
      })
      .catch(error => {
        console.error('Error loading ' + url, error);
      });
  }

  loadHTML('nav', 'template/nav.html', setupBurgerMenu);
  loadHTML('footer', 'template/footer.html');
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

// Typewriter Effect for Hero Title
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
