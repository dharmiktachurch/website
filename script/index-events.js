document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById('event-container');
  if (!container) return;

  function loadIndexEvents() {
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwzUR_NyZvDSpuMht8Xn4E8e2fNRy5cfyFprzkCy0tNRQYEVGnB-c3mKFHI8-DQACZUtCTVTRdIr7v/pub?gid=0&single=true&output=csv';

    container.innerHTML = '<div class="loading-spinner"></div>';

    function createEventElement(event) {
      const { eventName, fullDateTime, eventLocation, size, eventDescription } = event;
      const isBigEvent = size === 'big';

      const options = { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      const dateTimeString = fullDateTime.toLocaleString('en-US', options);
      const [datePart, timePart] = dateTimeString.split(', ');

      return `
        <div class="event ${isBigEvent ? 'big-event' : 'small-event'}">
          <div class="event-date">
            <span class="day">${datePart.split(' ')[1]}</span>
            <span class="month">${datePart.split(' ')[0]}</span>
          </div>
          <div class="event-content">
            <h3 class="event-title">${eventName}</h3>
            <div class="event-details">
              <div class="event-detail">
                <i class="far fa-clock"></i>
                <span>${timePart}</span>
              </div>
              <div class="event-detail">
                <i class="fas fa-map-marker-alt"></i>
                <span>${eventLocation}</span>
              </div>
            </div>
            <p class="event-description">${eventDescription}</p>
          </div>
          <div class="event-status upcoming">Upcoming</div>
        </div>
      `;
    }

    function parseEventDateTime(dateStr, timeStr) {
      const cleanDateStr = dateStr.replace(/^Date\(/, '').replace(/\)$/, '');
      const [month, day, year] = cleanDateStr.split('/').map(Number);

      let [hours, minutes] = timeStr.split(':').map(Number);
      const isPM = timeStr.toLowerCase().includes('pm');

      if (isPM && hours < 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;

      const date = new Date(year, month - 1, day, hours, minutes);
      return isNaN(date.getTime()) ? null : date;
    }

    function processSheetCSV(csv) {
      const lines = csv.trim().split('\n').map(line => line.split(','));
      const events = [];
      const now = new Date();
      const maxEvents = 3;

      for (let i = 1; i < lines.length && events.length < maxEvents; i++) {
        const cells = lines[i].map(cell => cell.trim());
        if (cells.length < 6 || !cells[0]) continue;

        const eventData = {
          eventName: cells[0],
          eventDateStr: cells[1],
          eventTimeStr: cells[2],
          eventLocation: cells[3],
          size: cells[4].toLowerCase(),
          eventDescription: cells[6] || ''
        };

        const fullDateTime = parseEventDateTime(eventData.eventDateStr, eventData.eventTimeStr);
        if (!fullDateTime || fullDateTime <= now) continue;

        events.push({ ...eventData, fullDateTime });
      }

      return events;
    }

    fetch(sheetUrl)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.text();
      })
      .then(csv => {
        const events = processSheetCSV(csv);
        container.innerHTML = events.length
          ? events.map(createEventElement).join('')
          : `<div class="no-events">No upcoming events at this time. Please check back later!</div>`;
      })
      .catch(error => {
        console.error('Error:', error);
        container.innerHTML = `
          <div class="error-message">
            <p>Unable to load events at this time.</p>
            <p>Please try again later.</p>
          </div>
        `;
      });
  }

  try {
    loadIndexEvents();
  } catch (error) {
    console.error('Initialization error:', error);
    container.innerHTML = '<div class="error-message">Failed to initialize event loader</div>';
  }
});