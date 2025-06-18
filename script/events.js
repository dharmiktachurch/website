document.addEventListener("DOMContentLoaded", function () {
  // Calendar variables
  let currentDate = new Date();
  let currentMonth = currentDate.getMonth();
  let currentYear = currentDate.getFullYear();
  const monthNames = ["January", "February", "March", "April", "May", "June", 
                     "July", "August", "September", "October", "November", "December"];

  // Navigation functionality
  const navLinks = document.querySelectorAll(".events-nav nav a");
  const contentDiv = document.getElementById("events-content");

  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get("page") || "events-upcoming";
  const sectionParam = urlParams.get("section");

  // Function to initialize hero calendar
  function initHeroCalendar() {
    const heroCalendarDays = document.getElementById('hero-calendar-days');
    const heroCurrentMonthYear = document.getElementById('hero-current-month-year');
    const heroPrevMonthBtn = document.getElementById('hero-prev-month');
    const heroNextMonthBtn = document.getElementById('hero-next-month');

    if (!heroCalendarDays || !heroCurrentMonthYear) return;

    // Initialize hero calendar
    function renderHeroCalendar() {
      // Update month/year display
      heroCurrentMonthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;
      
      // Clear previous calendar days
      heroCalendarDays.innerHTML = '';
      
      // Get first day of month and total days in month
      const firstDay = new Date(currentYear, currentMonth, 1).getDay();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      // Get days from previous month
      const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
      
      // Create days from previous month
      for (let i = firstDay - 1; i >= 0; i--) {
        const dayElement = document.createElement('div');
        dayElement.className = 'hero-calendar-day empty';
        dayElement.textContent = daysInPrevMonth - i;
        heroCalendarDays.appendChild(dayElement);
      }
      
      // Create days for current month
      const today = new Date();
      for (let i = 1; i <= daysInMonth; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'hero-calendar-day';
        dayElement.textContent = i;
        
        // Highlight today
        if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
          dayElement.classList.add('today');
        }
        
        heroCalendarDays.appendChild(dayElement);
      }
      
      // Calculate total cells (should be 42 to fill 6 weeks)
      const totalCells = firstDay + daysInMonth;
      const remainingCells = 42 - totalCells;
      
      // Create days for next month
      for (let i = 1; i <= remainingCells; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'hero-calendar-day empty';
        dayElement.textContent = i;
        heroCalendarDays.appendChild(dayElement);
      }
    }
    
    // Navigation handlers for hero calendar
    heroPrevMonthBtn.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderHeroCalendar();
      updateCalendarWithEvents();
    });
    
    heroNextMonthBtn.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderHeroCalendar();
      updateCalendarWithEvents();
    });
    
    // Initial render
    renderHeroCalendar();
  }

  // Function to update calendar with events
  function updateCalendarWithEvents(events = []) {
    const heroCalendarDays = document.getElementById('hero-calendar-days');
    if (!heroCalendarDays) return;

    const eventDays = new Set();
    events.forEach(event => {
      if (event.fullDateTime.getMonth() === currentMonth && 
          event.fullDateTime.getFullYear() === currentYear) {
        eventDays.add(event.fullDateTime.getDate());
      }
    });

    // Update calendar days
    const days = document.querySelectorAll('.hero-calendar-day:not(.empty)');
    days.forEach(day => {
      const dayNum = parseInt(day.textContent);
      if (eventDays.has(dayNum)) {
        day.classList.add('has-event');
        day.addEventListener('click', () => {
          document.getElementById('events').scrollIntoView({
            behavior: 'smooth'
          });
        });
      } else {
        day.classList.remove('has-event');
      }
    });
  }

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

      // Start from index 1 to skip header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');
        
        if (cells.length < (isPast ? 7 : 6)) {
            continue;
        }

        const eventName = cells[0]?.textContent?.trim();
        const eventDateStr = cells[1]?.textContent?.trim();
        const eventTimeStr = cells[2]?.textContent?.trim();
        const eventLocation = cells[3]?.textContent?.trim();
        const size = cells[4]?.textContent?.trim().toLowerCase();
        const eventDescription = cells[5]?.textContent?.trim();
        const imageUrl = isPast ? cells[6]?.textContent?.trim() : null;

        // Skip if essential fields are missing
        if (!eventName || !eventDateStr || !eventTimeStr) continue;

        // Parse the date - handle both "MM/DD/YYYY" and "Date(MM/DD/YYYY)" formats
        let cleanDateStr = eventDateStr.replace(/^Date\(/, '').replace(/\)$/, '');
        let [month, day, year] = cleanDateStr.split('/').map(num => parseInt(num, 10));

        // Parse the time - handle both "HH:MM" and "HH:MM AM/PM" formats
        let timeParts = eventTimeStr.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
        if (!timeParts) continue;

        let hours = parseInt(timeParts[1], 10);
        let minutes = parseInt(timeParts[2], 10);
        
        // Adjust for PM time
        if (timeParts[3] && timeParts[3].toUpperCase() === 'PM' && hours < 12) {
          hours += 12;
        }
        // Adjust for 12 AM
        if (timeParts[3] && timeParts[3].toUpperCase() === 'AM' && hours === 12) {
          hours = 0;
        }

        // Create the date object
        const fullDateTime = new Date(year, month - 1, day, hours, minutes);
        
        // Validate the date
        if (isNaN(fullDateTime.getTime())) {
          console.warn('Invalid date:', eventDateStr, eventTimeStr);
          continue;
        }

        // Determine event status
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
            continue; // Skip past events in upcoming view
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
      }

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
          // Update calendar with events
          updateCalendarWithEvents(events);
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
          
          // Initialize calendar only for upcoming events
          if (page === 'events-upcoming') {
            initHeroCalendar();
          }
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