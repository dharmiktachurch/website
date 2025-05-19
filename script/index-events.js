document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById('event-container');
  if (!container) return;

  function loadIndexEvents() {
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwzUR_NyZvDSpuMht8Xn4E8e2fNRy5cfyFprzkCy0tNRQYEVGnB-c3mKFHI8-DQACZUtCTVTRdIr7v/pub?output=html';

    container.innerHTML = '<div class="loading-spinner"></div>';

    function createEventElement(event) {
      const { eventName, fullDateTime, eventTimeStr, eventLocation, size, eventDescription } = event;

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
        <div class="event-status upcoming">Upcoming</div>
      `;

      return eventElement;
    }

    function processSheetData(html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const rows = doc.querySelectorAll('table tr');
      const events = [];
      const now = new Date();
      const maxEvents = 3; // Only show 3 events on index page

      rows.forEach((row, index) => {
        if (index < 2) return; // skip header rows
        if (events.length >= maxEvents) return; // limit to 3 events

        const cells = row.querySelectorAll('td');
        if (cells.length < 6 || !cells[0].textContent.trim()) return;

        const eventName = cells[0].textContent.trim();
        const eventDateStr = cells[1].textContent.trim();
        const eventTimeStr = cells[2].textContent.trim();
        const eventLocation = cells[3].textContent.trim();
        const size = cells[4].textContent.trim().toLowerCase();
        const eventDescription = cells[5].textContent.trim();

        const fullDateTime = new Date(`${eventDateStr} ${eventTimeStr}`);
        if (isNaN(fullDateTime.getTime())) {
          console.warn('Invalid date:', eventDateStr, eventTimeStr);
          return;
        }

        // Only include upcoming events
        if (fullDateTime > now) {
          events.push({
            eventName,
            fullDateTime,
            eventTimeStr,
            eventLocation,
            size,
            eventDescription
          });
        }
      });

      return events;
    }

    fetch(sheetUrl)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.text();
      })
      .then(html => {
        const events = processSheetData(html);
        container.innerHTML = '';

        if (events.length === 0) {
          const noEventMsg = document.createElement('div');
          noEventMsg.classList.add('no-events');
          noEventMsg.textContent = 'No upcoming events at this time. Please check back later!';
          container.appendChild(noEventMsg);
        } else {
          // Sort: big events first, then by date (ascending)
          events.sort((a, b) => {
            if (a.size !== b.size) {
              return a.size === 'big' ? -1 : 1;
            }
            return a.fullDateTime - b.fullDateTime;
          });

          events.forEach(event => {
            container.appendChild(createEventElement(event));
          });
        }
      })
      .catch(error => {
        console.error('Error fetching or parsing the sheet:', error);
        container.innerHTML = '<div class="error-message">Unable to load events at this time. Please try again later.</div>';
      });
  }

  // Initialize
  loadIndexEvents();
});