document.addEventListener("DOMContentLoaded", function () {
  // Navigation functionality
  const navLinks = document.querySelectorAll(".events-nav nav a");
  const contentDiv = document.getElementById("events-content");

  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get("page") || "events-upcoming";
  const sectionParam = urlParams.get("section");

  // Function to load events
  function loadEvents(showPast = false) {
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwzUR_NyZvDSpuMht8Xn4E8e2fNRy5cfyFprzkCy0tNRQYEVGnB-c3mKFHI8-DQACZUtCTVTRdIr7v/pub?output=html';
    const pastEventsSheetUrl = sheetUrl + '&gid=643141639';

    const container = document.getElementById('event-container');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner"></div>';

    function createEventElement(event, isPast = false) {
      const { eventName, fullDateTime, eventTimeStr, eventLocation, size, eventDescription, imageUrl, status, statusClass } = event;

      if (!isPast) {
        // Upcoming events style
        const isBigEvent = size === 'big';
        const displayMonth = fullDateTime.toLocaleString('default', { month: 'short' });
        const displayDay = fullDateTime.getDate();
        const timeString = fullDateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

        const eventElement = document.createElement('div');
        eventElement.classList.add('event', isBigEvent ? 'big-event' : 'small-event');

        eventElement.innerHTML = `
          <div class="event-date">
            <span class="day">${displayDay}</span>
            <span class="month">${displayMonth}</span>
          </div>
          <div class="event-content">
            <h3 class="event-title">${eventName}</h3>
            <div class="event-details">
              <div class="event-detail">
                <i class="far fa-clock"></i>
                <span>${timeString}</span>
              </div>
              <div class="event-detail">
                <i class="fas fa-map-marker-alt"></i>
                <span>${eventLocation}</span>
              </div>
            </div>
            <p class="event-description">${eventDescription}</p>
          </div>
          <div class="event-status ${statusClass}">${status}</div>
        `;

        return eventElement;
      } else {
        // Timeline style for past events
        const displayMonth = fullDateTime.toLocaleString('default', { month: 'short' });
        const displayDay = fullDateTime.getDate();
        const displayYear = fullDateTime.getFullYear();
        const timeString = fullDateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

        const eventElement = document.createElement('div');
        eventElement.classList.add('event', 'past-event');

        eventElement.innerHTML = `
          <div class="event-date">
            <span class="month">${displayMonth}</span>
            <span class="day">${displayDay}</span>
            <span class="year">${displayYear}</span>
          </div>
          <div class="event-content">
            <div class="event-image-container">
              ${imageUrl ? `<img src="${imageUrl}" alt="${eventName}" class="event-image">` : '<div class="event-image-placeholder">No Image</div>'}
            </div>
            <h3 class="event-title">${eventName}</h3>
            <div class="event-details">
              <div class="event-detail">
                <i class="far fa-clock"></i>
                <span>${timeString}</span>
              </div>
              <div class="event-detail">
                <i class="fas fa-map-marker-alt"></i>
                <span>${eventLocation}</span>
              </div>
            </div>
            <p class="event-description">${eventDescription}</p>
          </div>
        `;
        return eventElement;
      }
    }

    function processSheetData(html, isPast = false) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const rows = doc.querySelectorAll('table tr');
      const events = [];
      const now = new Date();

      rows.forEach((row, index) => {
        if (index < 2) return; // skip header rows

        const cells = row.querySelectorAll('td');
        if (cells.length < (isPast ? 7 : 6) || !cells[0].textContent.trim()) return;

        const eventName = cells[0].textContent.trim();
        const eventDateStr = cells[1].textContent.trim();
        const eventTimeStr = cells[2].textContent.trim();
        const eventLocation = cells[3].textContent.trim();
        const size = cells[4].textContent.trim().toLowerCase();
        const eventDescription = cells[5].textContent.trim();
        const imageUrl = isPast ? cells[6]?.textContent.trim() : null;

        const fullDateTime = new Date(`${eventDateStr} ${eventTimeStr}`);
        if (isNaN(fullDateTime.getTime())) {
          console.warn('Invalid date:', eventDateStr, eventTimeStr);
          return;
        }

        let status = '';
        let statusClass = '';

        if (isPast) {
          status = 'Past Event';
          statusClass = 'past';
        } else {
          if (fullDateTime > now) {
            status = 'Upcoming';
            statusClass = 'upcoming';
          } else if (fullDateTime.toDateString() === now.toDateString()) {
            status = 'Today';
            statusClass = 'today';
          } else {
            return;
          }
        }

        events.push({
          eventName,
          fullDateTime,
          eventTimeStr,
          eventLocation,
          size,
          eventDescription,
          imageUrl,
          status,
          statusClass
        });
      });

      return events;
    }

    const fetchUrl = showPast ? pastEventsSheetUrl : sheetUrl;

    fetch(fetchUrl)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.text();
      })
      .then(html => {
        const events = processSheetData(html, showPast);
        container.innerHTML = '';

        if (showPast) {
          container.classList.add('past-events');
        } else {
          container.classList.remove('past-events');
        }

        if (events.length === 0) {
          const noEventMsg = document.createElement('div');
          noEventMsg.classList.add('no-events');
          noEventMsg.textContent = showPast 
            ? 'No past events available.' 
            : 'No upcoming events at this time. Please check back later!';
          container.appendChild(noEventMsg);
        } else {
          // Sort: big events first, then by date (asc for upcoming, desc for past)
          events.sort((a, b) => {
            if (!showPast && a.size !== b.size) {
              return a.size === 'big' ? -1 : 1;
            }
            return showPast
              ? b.fullDateTime - a.fullDateTime // Newest first for past events
              : a.fullDateTime - b.fullDateTime; // Oldest first for upcoming
          });

          events.forEach(event => {
            container.appendChild(createEventElement(event, showPast));
          });
        }
      })
      .catch(error => {
        console.error('Error fetching or parsing the sheet:', error);
        container.innerHTML = '<div class="error-message">Unable to load events at this time. Please try again later.</div>';
      });
  }

  function loadContent(page, callback) {
    fetch(`partials/${page}.html`)
      .then(res => res.text())
      .then(data => {
        contentDiv.innerHTML = data;

        if (page === 'events-upcoming' || page === 'events-past') {
          loadEvents(page === 'events-past');
        }

        if (callback) callback();
      })
      .catch(err => {
        console.error("Error loading content:", err);
        contentDiv.innerHTML = "<p>Error loading content. Please try again later.</p>";
      });

    setActiveLink(page);
  }

  function setActiveLink(page) {
    navLinks.forEach(link => link.classList.remove("active"));
    const activeLink = document.querySelector(`.events-nav a[data-page="${page}"]`);
    if (activeLink) {
      activeLink.classList.add("active");
    }
  }

  // Initialize
  loadContent(pageParam, () => {
    if (sectionParam) {
      setTimeout(() => {
        const target = document.getElementById(sectionParam);
        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  });

  // Handle navigation clicks
  navLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const page = link.getAttribute("data-page");
      history.pushState(null, "", `?page=${page}`);
      loadContent(page);
    });
  });

  // Handle browser back/forward
  window.addEventListener("popstate", function() {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get("page") || "events-upcoming";
    loadContent(page);
  });
});