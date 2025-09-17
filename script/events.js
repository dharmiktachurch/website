document.addEventListener("DOMContentLoaded", function() {
  // Calendar variables
  let currentDate = new Date();
  let currentMonth = currentDate.getMonth();
  let currentYear = currentDate.getFullYear();
  const monthNames = ["January", "February", "March", "April", "May", "June", 
                     "July", "August", "September", "October", "November", "December"];
  
  // Event caching and pagination
  let cachedUpcomingEvents = [];
  let cachedPastEvents = [];
  let displayedEvents = [];
  const eventsPerLoad = 6;
  let currentFilter = 'all';
  let currentView = 'grid';
  
  // DOM elements
  const navLinks = document.querySelectorAll(".events-nav nav a");
  const contentDiv = document.getElementById("events-content");
  const eventModal = document.getElementById('event-modal');
  const calendarModal = document.getElementById('calendar-modal');
  const modalCloseButtons = document.querySelectorAll('.modal-close');

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
      const monthIndex = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase());
      if (monthIndex === -1) return;
      
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

  function showEventTooltip(e) {
    e.stopPropagation();
    
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
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'close-tooltip';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      tooltip.remove();
    });
    tooltip.appendChild(closeButton);
    
    // Add to document
    document.body.appendChild(tooltip);
    
    // Position tooltip
    const rect = dayElement.getBoundingClientRect();
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    
    // Default position (below the day)
    let topPosition = rect.bottom + window.scrollY + 5;
    let leftPosition = rect.left + window.scrollX;
    let arrowPosition = 'bottom';
    
    // Check if tooltip would go off screen bottom
    if (rect.bottom + tooltipHeight > window.innerHeight) {
      // Position above the day instead
      topPosition = rect.top + window.scrollY - tooltipHeight - 5;
      arrowPosition = 'top';
    }
    
    // Check if tooltip would go off screen right
    if (rect.left + tooltipWidth > window.innerWidth) {
      leftPosition = window.innerWidth - tooltipWidth - 10;
    }
    
    // Set tooltip position
    tooltip.style.position = 'absolute';
    tooltip.style.left = `${leftPosition}px`;
    tooltip.style.top = `${topPosition}px`;
    
    // Add arrow class based on position
    tooltip.classList.add(`arrow-${arrowPosition}`);
    
    // For mobile devices
    if ('ontouchstart' in window) {
      dayElement.classList.add('active');
      tooltip.classList.add('mobile-tooltip');
      tooltip.classList.remove(`arrow-${arrowPosition}`);
      tooltip.style.position = 'fixed';
      tooltip.style.left = '50%';
      tooltip.style.top = 'auto';
      tooltip.style.bottom = '20px';
      tooltip.style.transform = 'translateX(-50%)';
      tooltip.style.width = 'calc(100% - 40px)';
      tooltip.style.maxWidth = '350px';
    }
    
    // Close tooltip when clicking outside or scrolling
    const closeTooltipHandler = (e) => {
      if (!tooltip.contains(e.target)) {
        tooltip.remove();
        document.removeEventListener('click', closeTooltipHandler);
        window.removeEventListener('scroll', closeTooltipHandler);
      }
    };
    
    document.addEventListener('click', closeTooltipHandler);
    window.addEventListener('scroll', closeTooltipHandler);
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

  // Initialize hero calendar - FIXED VERSION
  function initHeroCalendar() {
    const heroCalendarDays = document.getElementById('hero-calendar-days');
    const heroCurrentMonthYear = document.getElementById('hero-current-month-year');
    const heroPrevMonthBtn = document.getElementById('hero-prev-month');
    const heroNextMonthBtn = document.getElementById('hero-next-month');

    if (!heroCalendarDays || !heroCurrentMonthYear) return;

    function renderHeroCalendar() {
      heroCurrentMonthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;
      heroCalendarDays.innerHTML = '';
      
      // Get first day of month (0-6, Sun-Sat)
      const firstDay = new Date(currentYear, currentMonth, 1).getDay();
      // Get number of days in month
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      // Get number of days in previous month
      const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
      
      // Previous month days (empty cells)
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
        
        // Highlight today
        if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
          dayElement.classList.add('today');
        }
        
        heroCalendarDays.appendChild(dayElement);
      }
      
      // Next month days (empty cells to complete grid)
      const totalCells = firstDay + daysInMonth;
      const remainingCells = 42 - totalCells; // 6 rows x 7 days
      
      for (let i = 1; i <= remainingCells; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'hero-calendar-day empty';
        dayElement.textContent = i;
        heroCalendarDays.appendChild(dayElement);
      }
      
      console.log(`Rendered calendar for ${monthNames[currentMonth]} ${currentYear}`);
    }
    
    // Remove any existing event listeners to prevent duplicates
    const newNextBtn = heroNextMonthBtn.cloneNode(true);
    const newPrevBtn = heroPrevMonthBtn.cloneNode(true);
    heroNextMonthBtn.parentNode.replaceChild(newNextBtn, heroNextMonthBtn);
    heroPrevMonthBtn.parentNode.replaceChild(newPrevBtn, heroPrevMonthBtn);
    
    // Get fresh references to the buttons
    const freshNextBtn = document.getElementById('hero-next-month');
    const freshPrevBtn = document.getElementById('hero-prev-month');
    
    // Next month button - FIXED VERSION
    freshNextBtn.addEventListener('click', function() {
      console.log(`Current month before: ${currentMonth} (${monthNames[currentMonth]})`);
      currentMonth = (currentMonth + 1) % 12;
      if (currentMonth === 0) currentYear++;
      console.log(`Current month after: ${currentMonth} (${monthNames[currentMonth]})`);
      renderHeroCalendar();
      updateCalendarWithEvents(cachedUpcomingEvents);
    });
    
    // Previous month button - FIXED VERSION
    freshPrevBtn.addEventListener('click', function() {
      console.log(`Current month before: ${currentMonth} (${monthNames[currentMonth]})`);
      currentMonth = (currentMonth - 1 + 12) % 12;
      if (currentMonth === 11) currentYear--;
      console.log(`Current month after: ${currentMonth} (${monthNames[currentMonth]})`);
      renderHeroCalendar();
      updateCalendarWithEvents(cachedUpcomingEvents);
    });
    
    // Initial render
    renderHeroCalendar();
  }

  // Initialize event filtering
  function initEventFilter() {
    const filterButtons = document.querySelectorAll('.timeline-filter .filter-btn');
    
    filterButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        filterButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        filterEvents(currentFilter);
      });
    });
  }

  // Filter events by category
  function filterEvents(filterValue) {
    const eventContainer = document.getElementById('event-container');
    if (!eventContainer) return;
    
    displayedEvents = [];
    
    if (filterValue === 'all') {
      displayedEvents = eventContainer.classList.contains('past-events') 
        ? [...cachedPastEvents] 
        : [...cachedUpcomingEvents];
    } else {
      const sourceEvents = eventContainer.classList.contains('past-events') 
        ? cachedPastEvents 
        : cachedUpcomingEvents;
      
      displayedEvents = sourceEvents.filter(event => 
        event.category && event.category.toLowerCase() === filterValue.toLowerCase()
      );
    }
    
    eventContainer.innerHTML = '';
    displayEventsBatch();
  }

  // Display a batch of events
  function displayEventsBatch() {
    const eventContainer = document.getElementById('event-container');
    if (!eventContainer) return;
    
    const startIndex = eventContainer.children.length;
    const endIndex = Math.min(startIndex + eventsPerLoad, displayedEvents.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const event = displayedEvents[i];
      eventContainer.appendChild(createEventElement(event, eventContainer.classList.contains('past-events')));
    }
    
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.style.display = endIndex < displayedEvents.length ? 'flex' : 'none';
    }
    
    if (!eventContainer.classList.contains('past-events')) {
      updateTimeRemaining();
    }
  }

  // Create event element
  function createEventElement(event, isPast = false) {
      const { eventName, fullDateTime, eventTimeStr, eventLocation, size, eventDescription, imageUrl, category } = event;

      const eventElement = document.createElement('div');
      eventElement.classList.add('event', isPast ? 'past-event' : 'upcoming-event');
      const isBigEvent = size === 'big';
      eventElement.classList.add(isBigEvent ? 'big-event' : 'small-event');
      if (category) eventElement.dataset.category = category.toLowerCase();

      const displayMonth = fullDateTime.toLocaleString('default', { month: 'short' });
      const displayDay = fullDateTime.getDate();
      const displayYear = fullDateTime.getFullYear();
      const timeString = fullDateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      
      if (isPast) {
          eventElement.innerHTML = `
              <div class="event-date">
                  <span class="month">${displayMonth}</span>
                  <span class="day">${displayDay}</span>
                  <span class="year">${displayYear}</span>
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
          `;
      } else {
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

          // Inside the createEventElement function
          if (isBigEvent) {
              // Big event HTML structure
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
                      ${eventDescription ? `<p class="event-description">${eventDescription}</p>` : ''}
                      <div class="event-actions">
                          <button class="event-action-btn" data-action="view-details">
                              <i class="far fa-eye"></i> Details
                          </button>
                          <button class="event-action-btn" data-action="add-to-calendar">
                              <i class="far fa-calendar-plus"></i> Add to Calendar
                          </button>
                      </div>
                  </div>
              `;
          } else {
              // Small event HTML structure
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
                      ${eventDescription ? `<p class="event-description">${eventDescription}</p>` : ''}
                      <div class="event-actions">
                          <button class="event-action-btn" data-action="view-details">
                              <i class="far fa-eye"></i> Details
                          </button>
                          <button class="event-action-btn" data-action="add-to-calendar">
                              <i class="far fa-calendar-plus"></i> Add to Calendar
                          </button>
                      </div>
                  </div>
              `;
          }
      }
      
      // Add click handler for event details
      eventElement.addEventListener('click', function(e) {
          if (!e.target.closest('.time-left-badge') && !e.target.closest('.event-action-btn')) {
              openEventModal(eventElement);
          }
      });
      
      return eventElement;
  }

  // Initialize view toggle
  function initViewToggle() {
    const viewButtons = document.querySelectorAll('.view-toggle .view-btn');
    const eventContainer = document.getElementById('event-container');
    
    viewButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        viewButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentView = this.dataset.view;
        eventContainer.classList.remove('grid-view', 'list-view');
        eventContainer.classList.add(`${currentView}-view`);
      });
    });
  }

  // Initialize search functionality
  function initSearch() {
    const searchInput = document.getElementById('event-search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      const eventContainer = document.getElementById('event-container');
      
      if (searchTerm.length === 0) {
        filterEvents(currentFilter);
        return;
      }
      
      const sourceEvents = eventContainer.classList.contains('past-events') 
        ? cachedPastEvents 
        : cachedUpcomingEvents;
      
      const filteredEvents = sourceEvents.filter(event => 
        event.eventName.toLowerCase().includes(searchTerm) ||
        (event.eventDescription && event.eventDescription.toLowerCase().includes(searchTerm))
      );
      
      eventContainer.innerHTML = '';
      
      if (filteredEvents.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'No events match your search. Try different keywords.';
        eventContainer.appendChild(noResults);
      } else {
        displayedEvents = filteredEvents;
        displayEventsBatch();
      }
    });
  }

  // Initialize modals
  function initModals() {
    modalCloseButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => {
          modal.classList.remove('active');
        });
      });
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });
    
    document.addEventListener('click', (e) => {
      if (e.target.closest('.event-action-btn[data-action="add-to-calendar"]')) {
        e.preventDefault();
        calendarModal.classList.add('active');
      }
      
      if (e.target.closest('.event-action-btn[data-action="view-details"]')) {
        e.preventDefault();
        const eventElement = e.target.closest('.event');
        openEventModal(eventElement);
      }
    });
  }

  // Open event modal with details
  function openEventModal(eventElement) {
    if (!eventElement) return;
    
    const modalBody = eventModal.querySelector('.modal-body');
    const eventName = eventElement.querySelector('.event-title').textContent;
    const eventDate = eventElement.querySelector('.event-date .day').textContent;
    const eventMonth = eventElement.querySelector('.event-date .month').textContent;
    const eventTime = eventElement.querySelector('.event-detail:first-child span').textContent;
    const eventLocation = eventElement.querySelector('.event-detail:nth-child(2) span').textContent;
    const eventDescription = eventElement.querySelector('.event-description').textContent;
    
    modalBody.innerHTML = `
      <div class="event-spotlight">
        <div class="event-spotlight-image">
          <img src="https://source.unsplash.com/random/600x400/?event,${encodeURIComponent(eventName)}" alt="${eventName}">
        </div>
        <div class="event-spotlight-content">
          <h2 class="event-spotlight-title">${eventName}</h2>
          <div class="event-spotlight-meta">
            <div class="event-spotlight-meta-item">
              <i class="far fa-calendar"></i>
              <span>${eventMonth} ${eventDate}</span>
            </div>
            <div class="event-spotlight-meta-item">
              <i class="far fa-clock"></i>
              <span>${eventTime}</span>
            </div>
            <div class="event-spotlight-meta-item">
              <i class="fas fa-map-marker-alt"></i>
              <span>${eventLocation}</span>
            </div>
          </div>
          <p class="event-spotlight-description">${eventDescription}</p>
          <div class="event-spotlight-highlights">
            <h4 class="event-spotlight-highlights-title">Event Highlights</h4>
            <div class="event-spotlight-highlights-list">
              <div class="event-spotlight-highlight">
                <i class="fas fa-users"></i>
                <span>Networking opportunities</span>
              </div>
              <div class="event-spotlight-highlight">
                <i class="fas fa-lightbulb"></i>
                <span>Expert speakers</span>
              </div>
              <div class="event-spotlight-highlight">
                <i class="fas fa-utensils"></i>
                <span>Refreshments provided</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    eventModal.classList.add('active');
  }

  // Initialize load more button
  function initLoadMore() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', displayEventsBatch);
    }
  }

  // Load events from Google Sheet
  function loadEvents(showPast = false) {
  // Replace these with your published sheet URLs
  const upcomingSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwzUR_NyZvDSpuMht8Xn4E8e2fNRy5cfyFprzkCy0tNRQYEVGnB-c3mKFHI8-DQACZUtCTVTRdIr7v/pub?gid=0&single=true&output=csv';
  const pastSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwzUR_NyZvDSpuMht8Xn4E8e2fNRy5cfyFprzkCy0tNRQYEVGnB-c3mKFHI8-DQACZUtCTVTRdIr7v/pub?gid=643141639&single=true&output=csv';

  const container = document.getElementById('event-container');
  if (!container) return;

  container.innerHTML = '<div class="loading-spinner"><div class="spinner-circle"></div><p>Loading events...</p></div>';

  function processCSVData(csv, isPast = false) {
    const lines = csv.split('\n');
    const events = [];
    const now = new Date();

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (won't handle quoted fields with commas)
      const cells = line.split(',');
      
      if (cells.length < (isPast ? 7 : 6)) continue;

      const eventName = cells[0]?.trim();
      const eventDateStr = cells[1]?.trim();
      const eventTimeStr = cells[2]?.trim();
      const eventLocation = cells[3]?.trim();
      const size = cells[4]?.trim().toLowerCase();
      const category = cells[5]?.trim().toLowerCase();
      const eventDescription = cells[6]?.trim();
      const imageUrl = isPast ? cells[7]?.trim() : null;

      if (!eventName || !eventDateStr || !eventTimeStr) continue;

      // Parse date and time (adjust this based on your actual date format)
      let dateParts = eventDateStr.split('/');
      if (dateParts.length !== 3) continue;
      
      let month = parseInt(dateParts[0], 10);
      let day = parseInt(dateParts[1], 10);
      let year = parseInt(dateParts[2], 10);
      
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
        if (fullDateTime >= now) continue;
      } else {
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

  const fetchUrl = showPast ? pastSheetUrl : upcomingSheetUrl;

  fetch(fetchUrl)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.text();
    })
    .then(csv => {
      const events = processCSVData(csv, showPast);
      
      if (showPast) {
        cachedPastEvents = events;
      } else {
        cachedUpcomingEvents = events;
      }

      displayEvents(events, showPast);
      
      if (!showPast) {
        initHeroCalendar();
        updateCalendarWithEvents(events);
        updateTimeRemaining();
        setInterval(updateTimeRemaining, 60000);
      }
    })
    .catch(error => {
      console.error('Error loading events:', error);
      container.innerHTML = '<div class="error-message">Unable to load events. Please try again later.</div>';
    });
}

  // Display events in the container
  function displayEvents(events, isPastEvents) {
    const container = document.getElementById('event-container');
    if (!container) return;

    container.innerHTML = '';
    container.classList.toggle('past-events', isPastEvents);
    
    if (events.length === 0) {
      const noEventMsg = document.createElement('div');
      noEventMsg.classList.add('no-events');
      noEventMsg.textContent = isPastEvents 
        ? 'No past events available.' 
        : 'No upcoming events at this time. Please check back later!';
      container.appendChild(noEventMsg);
      return;
    }

    // Sort events
    events.sort((a, b) => {
      if (!isPastEvents && a.size !== b.size) {
        return a.size === 'big' ? -1 : 1;
      }
      return isPastEvents
        ? b.fullDateTime - a.fullDateTime
        : a.fullDateTime - b.fullDateTime;
    });

    displayedEvents = [...events];
    displayEventsBatch();
    
    // Initialize components
    initEventFilter();
    initViewToggle();
    initSearch();
    initModals();
    initLoadMore();
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