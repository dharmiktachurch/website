window.onload = function () {
  const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwzUR_NyZvDSpuMht8Xn4E8e2fNRy5cfyFprzkCy0tNRQYEVGnB-c3mKFHI8-DQACZUtCTVTRdIr7v/pubhtml';
  const container = document.getElementById('event-container');

  container.innerHTML = '<div class="loading-spinner"></div>';

  fetch(sheetUrl)
    .then(response => response.text())
    .then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const rows = doc.querySelectorAll('table tr');
      container.innerHTML = '';

      let eventCount = 0;
      const now = new Date();

      rows.forEach((row, index) => {
        if (index < 2) return;

        const cells = row.querySelectorAll('td');
        if (cells.length < 5 || !cells[0].textContent.trim()) return;

        const eventName = cells[0].textContent.trim();
        const eventDateStr = cells[1].textContent.trim();  // e.g., "10/5/25"
        const eventTimeStr = cells[2].textContent.trim();  // e.g., "10:00"
        const eventLocation = cells[3].textContent.trim();
        const eventDescription = cells[4].textContent.trim();

        // Combine date and time
        const [day, month, year] = eventDateStr.split('/').map(Number);
        const fullDateTime = new Date(`20${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${eventTimeStr}`);

        // Determine event status
        let status = '';
        let statusClass = '';
        if (fullDateTime > now) {
          status = 'Upcoming';
          statusClass = 'upcoming';
        } 
        else if(fullDateTime = now){
          status = 'Today';
          statusClass = 'upcoming';
        }
        
        else {
          status = 'Past';
          statusClass = 'past';
        }

        // Display formatting
        const displayMonth = fullDateTime.toLocaleString('default', { month: 'short' });
        const displayDay = fullDateTime.getDate();

        const eventElement = document.createElement('div');
        eventElement.classList.add('event');
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
                <span>${fullDateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>

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

        container.appendChild(eventElement);
        eventCount++;
      });

      if (eventCount === 0) {
        const noEventMsg = document.createElement('div');
        noEventMsg.classList.add('no-events');
        noEventMsg.textContent = 'No upcoming events at this time. Please check back later!';
        container.appendChild(noEventMsg);
      }
    })
    .catch(error => {
      console.error('Error fetching or parsing the sheet:', error);
      container.innerHTML = '<div class="no-events">Unable to load events at this time. Please try again later.</div>';
    });
};
