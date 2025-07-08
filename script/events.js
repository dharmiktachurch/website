document.addEventListener("DOMContentLoaded", function() {
  // Calendar variables
  let currentDate = new Date();
  let currentMonth = currentDate.getMonth();
  let currentYear = currentDate.getFullYear();
  const monthNames = ["January", "February", "March", "April", "May", "June", 
                     "July", "August", "September", "October", "November", "December"];
  
  // Event caching
  let cachedEvents = [];

  // Navigation functionality
  const navLinks = document.querySelectorAll(".events-nav nav a");
  const contentDiv = document.getElementById("events-content");

  // Time calculation functions
  function getTimeRemaining(endtime) {
    const total = endtime - new Date();
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    
    return {
      total,
      days,
      hours,
      minutes,
      seconds
    };
  }

  // Update time remaining in real-time
  function updateTimeRemaining() {
    document.querySelectorAll('.event:not(.past-event) .time-left-badge').forEach(element => {
      const eventElement = element.closest('.event');
      const dateElement = eventElement.querySelector('.event-date .day');
      const monthElement = eventElement.querySelector('.event-date .month');
      
      // Get the event date from DOM elements
      const day = parseInt(dateElement.textContent);
      const month = monthElement.textContent;
      const year = new Date().getFullYear();
      
      // Find month index from month name
      const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
      const eventDate = new Date(year, monthIndex, day);
      
      // Get time from time string
      const timeString = eventElement.querySelector('.event-detail:first-child span').textContent;
      const timeParts = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      
      if (timeParts) {
        let hours = parseInt(timeParts[1]);
        const minutes = parseInt(timeParts[2]);
        const period = timeParts[3];
        
        if (period && period.toUpperCase() === 'PM' && hours < 12) {
          hours += 12;
        }
        if (period && period.toUpperCase() === 'AM' && hours === 12) {
          hours = 0;
        }
        
        eventDate.setHours(hours, minutes, 0, 0);
        
        const timeRemaining = getTimeRemaining(eventDate);
        let timeLeftString = '';
        let timeLeftClass = '';
        
        if (timeRemaining.total <= 0) {
          timeLeftString = 'Happening Now';
          timeLeftClass = 'urgent';
        } else if (timeRemaining.days > 0) {
          timeLeftString = `${timeRemaining.days}d ${timeRemaining.hours}h`;
          timeLeftClass = timeRemaining.days <= 1 ? 'soon' : '';
        } else if (timeRemaining.hours > 0) {
          timeLeftString = `${timeRemaining.hours}h ${timeRemaining.minutes}m`;
          timeLeftClass = 'soon';
        } else {
          timeLeftString = `${timeRemaining.minutes}m`;
          timeLeftClass = 'urgent';
        }
        
        element.innerHTML = `<i class="fas fa-hourglass-half"></i><span>${timeLeftString}</span>`;
        element.className = `time-left-badge ${timeLeftClass}`;
      }
    });
  }

  // Function to show event tooltip
  function showEventTooltip(e) {
    // Remove any existing tooltips
    document.querySelectorAll('.calendar-tooltip').forEach(tooltip => tooltip.remove());
    
    const dayElement = e.currentTarget;
    const eventsData = JSON.parse(dayElement.getAttribute('data-event-dates') || '[]');
    
    if (eventsData.length === 0) return;
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'calendar-tooltip';
    
    // Add events to tooltip
    eventsData.forEach(event => {
      const eventElement = document.createElement('div');
      eventElement.className = 'calendar-event';
      
      eventElement.innerHTML = `
        <h4>${event.name}</h4>
        <div class="event-time">${event.time}</div>
        ${event.description ? `<p class="event-description">${event.description}</p>` : ''}
      `;
      
      tooltip.appendChild(eventElement);
    });
    
    // Position tooltip
    const rect = dayElement.getBoundingClientRect();
    tooltip.style.position = 'absolute';
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'close-tooltip';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => tooltip.remove());
    tooltip.appendChild(closeButton);
    
    // Add to document
    document.body.appendChild(tooltip);
    
    // Close tooltip when clicking outside
    setTimeout(() => {
      const clickHandler = (e) => {
        if (!tooltip.contains(e.target) && e.target !== dayElement) {
          tooltip.remove();
          document.removeEventListener('click', clickHandler);
        }
      };
      document.addEventListener('click', clickHandler);
    }, 0);
  }

  // Update calendar with events
  function updateCalendarWithEvents(events = []) {
    const heroCalendarDays = document.getElementById('hero-calendar-days');
    if (!heroCalendarDays) return;

    // Filter events for the current month/year view
    const monthEvents = events.filter(event => 
      event.fullDateTime.getMonth() === currentMonth && 
      event.fullDateTime.getFullYear() === currentYear
    );

    // Group events by date
    const eventsByDate = {};
    monthEvents.forEach(event => {
      const date = event.fullDateTime.getDate();
      if (!eventsByDate[date]) {
        eventsByDate[date] = [];
      }
      eventsByDate[date].push(event);
    });

    // Clear any existing tooltips
    document.querySelectorAll('.calendar-tooltip').forEach(tooltip => tooltip.remove());

    const days = document.querySelectorAll('.hero-calendar-day:not(.empty)');
    days.forEach(day => {
      const dayNum = parseInt(day.textContent);
      
      // Remove previous event indicators
      day.classList.remove('has-event');
      day.removeAttribute('data-event-dates');
      
      if (eventsByDate[dayNum]) {
        day.classList.add('has-event');
        
        // Store event data as JSON string
        day.setAttribute('data-event-dates', JSON.stringify(
          eventsByDate[dayNum].map(event => ({
            name: event.eventName,
            time: event.fullDateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            description: event.eventDescription
          }))
        ));
        
        // Add click handler
        day.addEventListener('click', showEventTooltip);
      }
    });
  }

  // Initialize hero calendar
  function initHeroCalendar() {
    const heroCalendarDays = document.getElementById('hero-calendar-days');
    const heroCurrentMonthYear = document.getElementById('hero-current-month-year');
    const heroPrevMonthBtn = document.getElementById('hero-prev-month');
    const heroNextMonthBtn = document.getElementById('hero-next-month');

    if (!heroCalendarDays || !heroCurrentMonthYear) return;

    function renderHeroCalendar() {
      heroCurrentMonthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;
      heroCalendarDays.innerHTML = '';
      
      const firstDay = new Date(currentYear, currentMonth, 1).getDay();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
      
      // Previous month days
      for (let i = firstDay - 1; i >= 0; i--) {
        const dayElement = document.createElement('div');
        dayElement.className = 'hero-calendar-day empty';
        dayElement.textContent = daysInPrevMonth - i;
        heroCalendarDays.appendChild(dayElement);
      }
      
      // Current month days
      const today = new Date();
      for (let i = 1; i <= daysInMonth; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'hero-calendar-day';
        dayElement.textContent = i;
        
        if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
          dayElement.classList.add('today');
        }
        
        heroCalendarDays.appendChild(dayElement);
      }
      
      // Next month days
      const totalCells = firstDay + daysInMonth;
      const remainingCells = 42 - totalCells;
      
      for (let i = 1; i <= remainingCells; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'hero-calendar-day empty';
        dayElement.textContent = i;
        heroCalendarDays.appendChild(dayElement);
      }
    }
    
    heroPrevMonthBtn.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderHeroCalendar();
      updateCalendarWithEvents(cachedEvents);
    });
    
    heroNextMonthBtn.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderHeroCalendar();
      updateCalendarWithEvents(cachedEvents);
    });
    
    renderHeroCalendar();
  }

  // Initialize event filtering
  function initEventFilter() {
    const filterButtons = document.querySelectorAll('.timeline-filter .filter-btn');
    
    filterButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        // Update active state
        filterButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Get the filter value
        const filterValue = this.dataset.filter;
        
        // Filter events
        filterEvents(filterValue);
      });
    });
  }

  // Filter events by category
  function filterEvents(filterValue) {
    const eventCards = document.querySelectorAll('#event-container .event');
    
    eventCards.forEach(card => {
      if (filterValue === 'all') {
        card.style.display = ''; // Show all
      } else {
        const cardCategory = card.dataset.category || '';
        if (cardCategory.toLowerCase() === filterValue.toLowerCase()) {
          card.style.display = ''; // Show matching
        } else {
          card.style.display = 'none'; // Hide others
        }
      }
    });
  }

  // Load events from Google Sheet
  function loadEvents(showPast = false) {
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwzUR_NyZvDSpuMht8Xn4E8e2fNRy5cfyFprzkCy0tNRQYEVGnB-c3mKFHI8-DQACZUtCTVTRdIr7v/pub?output=html';
    const pastEventsSheetUrl = sheetUrl + '&gid=643141639';

    const container = document.getElementById('event-container');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner"><div class="spinner-circle"></div><p>Loading events...</p></div>';

    function createEventElement(event, isPast = false) {
      const { eventName, fullDateTime, eventTimeStr, eventLocation, size, eventDescription, imageUrl, category } = event;

      const eventElement = document.createElement('div');
      eventElement.classList.add('event', isPast ? 'past-event' : 'upcoming-event');
      const isBigEvent = size === 'big';
      eventElement.classList.add('event', isPast ? 'past-event' : 'upcoming-event', isBigEvent ? 'big-event' : 'small-event');
      if (category) eventElement.dataset.category = category.toLowerCase();

      const displayMonth = fullDateTime.toLocaleString('default', { month: 'short' });
      const displayDay = fullDateTime.getDate();
      const displayYear = fullDateTime.getFullYear();
      const timeString = fullDateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      
      if (isPast) {
        // Past event template
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
      } else {
        // Upcoming event template
        const timeRemaining = getTimeRemaining(fullDateTime);
        let timeLeftString = '';
        let timeLeftClass = '';
        
        if (timeRemaining.total <= 0) {
          timeLeftString = 'Happening Now';
          timeLeftClass = 'urgent';
        } else if (timeRemaining.days > 0) {
          timeLeftString = `${timeRemaining.days}d ${timeRemaining.hours}h`;
          timeLeftClass = timeRemaining.days <= 1 ? 'soon' : '';
        } else if (timeRemaining.hours > 0) {
          timeLeftString = `${timeRemaining.hours}h ${timeRemaining.minutes}m`;
          timeLeftClass = 'soon';
        } else {
          timeLeftString = `${timeRemaining.minutes}m`;
          timeLeftClass = 'urgent';
        }

        eventElement.innerHTML = `
        <div class="event-date">
          <span class="day">${displayDay}</span>
          <span class="month">${displayMonth}</span>
        </div>
        <div class="event-content">
          <h3 class="event-title">${eventName}</h3>
          <div class="time-left-badge ${timeLeftClass}">
            <i class="fas fa-hourglass-half"></i>
            <span>${timeLeftString}</span>
          </div>
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
      }
      return eventElement;
    }

    function processSheetData(html, isPast = false) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const rows = doc.querySelectorAll('table tr');
      const events = [];
      const now = new Date();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');
        
        if (cells.length < (isPast ? 7 : 6)) continue;

        const eventName = cells[0]?.textContent?.trim();
        const eventDateStr = cells[1]?.textContent?.trim();
        const eventTimeStr = cells[2]?.textContent?.trim();
        const eventLocation = cells[3]?.textContent?.trim();
        const size = cells[4]?.textContent?.trim().toLowerCase();
        const category = cells[5]?.textContent?.trim().toLowerCase();
        const eventDescription = cells[6]?.textContent?.trim();
        const imageUrl = isPast ? cells[7]?.textContent?.trim() : null;

        if (!eventName || !eventDateStr || !eventTimeStr) continue;

        let cleanDateStr = eventDateStr.replace(/^Date\(/, '').replace(/\)$/, '');
        let [month, day, year] = cleanDateStr.split('/').map(num => parseInt(num, 10));

        let timeParts = eventTimeStr.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
        if (!timeParts) continue;

        let hours = parseInt(timeParts[1], 10);
        let minutes = parseInt(timeParts[2], 10);
        
        if (timeParts[3] && timeParts[3].toUpperCase() === 'PM' && hours < 12) {
          hours += 12;
        }
        if (timeParts[3] && timeParts[3].toUpperCase() === 'AM' && hours === 12) {
          hours = 0;
        }

        const fullDateTime = new Date(year, month - 1, day, hours, minutes);
        
        if (isNaN(fullDateTime.getTime())) {
          console.warn('Invalid date:', eventDateStr, eventTimeStr);
          continue;
        }

        if (isPast) {
          if (fullDateTime >= now) {
            continue; // Prevent upcoming events from showing in past
          }
          status = 'Past Event';
          statusClass = 'past';
        }
        else {
          if (fullDateTime <= now) continue;
        }
        events.push({
          eventName,
          fullDateTime,
          eventTimeStr,
          eventLocation,
          size,
          category,
          eventDescription,
          imageUrl,
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
          cachedEvents = events; // Store events for calendar
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
          events.sort((a, b) => {
            if (!showPast && a.size !== b.size) {
              return a.size === 'big' ? -1 : 1;
            }
            return showPast
              ? b.fullDateTime - a.fullDateTime
              : a.fullDateTime - b.fullDateTime;
          });

          events.forEach(event => {
            container.appendChild(createEventElement(event, showPast));
          });

          if (!showPast) {
            updateTimeRemaining();
            setInterval(updateTimeRemaining, 60000);
          }
        }

        // Initialize filtering after loading
        initEventFilter();
        filterEvents('all');
      })
      .catch(error => {
        console.error('Error loading events:', error);
        container.innerHTML = '<div class="error-message">Unable to load events. Please try again later.</div>';
      });
  }

  // Initialize page
  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get("page") || "events-upcoming";
  const sectionParam = urlParams.get("section");

  function loadContent(page, callback) {
    fetch(`partials/${page}.html`)
      .then(res => res.text())
      .then(data => {
        contentDiv.innerHTML = data;

        if (page === 'events-upcoming' || page === 'events-past') {
          loadEvents(page === 'events-past');
          
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

  // Handle navigation
  navLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const page = link.getAttribute("data-page");
      history.pushState(null, "", `?page=${page}`);
      loadContent(page);
    });
  });

  // Handle popstate
  window.addEventListener("popstate", function() {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get("page") || "events-upcoming";
    loadContent(page);
  });

  // Initial load
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
});