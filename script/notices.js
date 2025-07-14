document.addEventListener("DOMContentLoaded", function () {
  const SHEET_ID = '1eX7ASnXSRjB7MHr6woWxfjhsti6zNCS9eP--h9J5_fs';
  const SHEETS = {
    notices: {
      gid: '998080244',
      container: 'notices-content',
      columns: ['Title', 'Date', 'Category', 'Details', 'Link']
    },
    leaders: {
      gid: '974827726',
      container: 'leaders-schedule-content',
      columns: ['Date', 'Service Lead', 'Worship Lead', 'Preaching', 'Bedi Prayer']
    },
    fellowship: {
      gid: '1090348253',
      container: 'house-fellowship-content',
      columns: ['Day', 'Host', 'Leaders', 'Frequency']
    }
  };

  // Initialize tabs
  const tabLinks = document.querySelectorAll('.schedules-nav a');
  tabLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      if (this.classList.contains('active')) return;

      tabLinks.forEach(tab => tab.classList.remove('active'));
      this.classList.add('active');

      const page = this.getAttribute('data-page');
      const currentActive = document.querySelector('.tab-content.active');

      if (currentActive) {
        currentActive.style.opacity = '0';
        currentActive.style.transform = 'translateY(10px)';
        setTimeout(() => {
          currentActive.classList.remove('active');
          showNewContent(page);
        }, 300);
      } else {
        showNewContent(page);
      }
    });
  });

  function showNewContent(page) {
    const activeContainer = document.getElementById(`${page}-container`);
    activeContainer.classList.add('active');
    void activeContainer.offsetWidth;
    activeContainer.style.opacity = '1';
    activeContainer.style.transform = 'translateY(0)';

    if (page === 'notices' && !activeContainer.dataset.loaded) {
      loadData('notices');
      activeContainer.dataset.loaded = 'true';
    } else if (page === 'leaders-schedule' && !activeContainer.dataset.loaded) {
      loadData('leaders');
      activeContainer.dataset.loaded = 'true';
    } else if (page === 'house-fellowship' && !activeContainer.dataset.loaded) {
      loadData('fellowship');
      activeContainer.dataset.loaded = 'true';
    }
  }

  // Load initial data
  document.getElementById('notices-container').dataset.loaded = 'true';
  loadData('notices');

  // Main data loading function
  async function loadData(type) {
    const sheetConfig = SHEETS[type];
    const container = document.getElementById(sheetConfig.container);
    const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?gid=${sheetConfig.gid}&tqx=out:json`;

    showLoading(container);

    try {
      const res = await fetch(`${SHEET_URL}&t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.text();
      const parsedData = parseSheetData(data, type, sheetConfig.columns);

      if (parsedData.length > 0) {
        displayData(parsedData, type, container);
        if (type === 'leaders') {
          highlightCurrentWeek();
          updateWeeklyRoles(parsedData);
          updateUpcomingRoles(parsedData);
        }
      } else {
        showNoData(container, `No ${type} data available`);
      }
    } catch (err) {
      console.error(`Error loading ${type}:`, err);
      showError(container, `Failed to load ${type} data. Please try again later.`);
    }
  }

  // Parse sheet data
  function parseSheetData(data, type, expectedColumns) {
    try {
      const jsonStr = data.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/)?.[1];
      if (!jsonStr) throw new Error('Invalid response format');

      const jsonData = JSON.parse(jsonStr);
      const items = [];

      jsonData.table.rows.forEach((row, i) => {
        try {
          const cells = row.c;
          if (!cells || !cells[0]?.v) return;
          if (i === 0 && cells[0]?.v === expectedColumns[0]) return;

          if (type === 'notices') {
            items.push({
              title: cells[0]?.v?.toString() || '',
              date: formatDate(cells[1]?.v),
              category: (cells[2]?.v?.toString() || 'general').toLowerCase(),
              details: cells[3]?.v?.toString() || '',
              link: cells[4]?.v?.toString() || null
            });
          } else if (type === 'leaders') {
            items.push({
              date: parseDate(cells[0]?.v),
              serviceLead: cells[1]?.v?.toString() || '',
              worshipLead: cells[2]?.v?.toString() || '',
              preaching: cells[3]?.v?.toString() || '',
              bediPrayer: cells[4]?.v?.toString() || ''
            });
          } else if (type === 'fellowship') {
            const frequencyMap = {
              '1': 'Once a month',
              '2': 'Twice a month',
              '4': 'Every week'
            };
            const frequencyValue = cells[3]?.v?.toString() || '';
            const frequencyText = frequencyMap[frequencyValue] || frequencyValue;

            items.push({
              day: cells[0]?.v?.toString() || '',
              host: cells[1]?.v?.toString() || '',
              leaders: cells[2]?.v?.toString() || '',
              frequency: frequencyText
            });
          }
        } catch (e) {
          console.warn(`Error processing row ${i}:`, e);
        }
      });

      return items;
    } catch (e) {
      console.error("Sheet parsing error:", e);
      throw e;
    }
  }

  // Display data based on type
  function displayData(data, type, container) {
    container.innerHTML = '';

    if (type === 'notices') {
      const noticeGrid = document.createElement('div');
      noticeGrid.className = 'notice-grid';

      data.forEach(notice => {
        const noticeCard = document.createElement('div');
        noticeCard.className = `notice-card ${notice.category}`;
        noticeCard.dataset.category = notice.category;

        noticeCard.innerHTML = `
          <div class="notice-header">
            <h3 class="notice-title">${escapeHtml(notice.title)}</h3>
            <div class="notice-meta">
              <div class="notice-date">
                <i class="far fa-calendar-alt"></i>
                <span>${escapeHtml(notice.date)}</span>
              </div>
              <div class="notice-category">
                ${escapeHtml(notice.category.charAt(0).toUpperCase() + notice.category.slice(1))}
              </div>
            </div>
          </div>
          <div class="notice-body">
            <div class="notice-content">${escapeHtml(notice.details)}</div>
            ${notice.link ? `
              <div class="notice-actions">
                <a href="${escapeHtml(notice.link)}" class="notice-link" target="_blank" rel="noopener">
                  <i class="fas fa-external-link-alt"></i>
                  <span>More Details</span>
                </a>
              </div>` : ''}
          </div>
        `;
        noticeGrid.appendChild(noticeCard);
      });

      container.appendChild(noticeGrid);
      initFilters();
    }
    else if (type === 'leaders') {      
      const tbody = document.getElementById('leaders-schedule-content');
      data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td data-rawdate="${item.date ? item.date.toISOString() : ''}">
            ${item.date ? formatDate(item.date) : 'N/A'}
          </td>
          <td>${escapeHtml(item.serviceLead)}</td>
          <td>${escapeHtml(item.worshipLead)}</td>
          <td>${escapeHtml(item.preaching)}</td>
          <td>${escapeHtml(item.bediPrayer)}</td>
        `;
        tbody.appendChild(row);
      });
    }
    else if (type === 'fellowship') {
      const tbody = document.getElementById('house-fellowship-content');
      data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${escapeHtml(item.day)}</td>
          <td>${escapeHtml(item.host)}</td>
          <td>${escapeHtml(item.leaders)}</td>
          <td>${escapeHtml(item.frequency)}</td>
        `;
        tbody.appendChild(row);
      });

      displayTodayFellowships(data);
    }
  }

  // Updated Weekly Roles Section
  function updateWeeklyRoles(data) {
    const container = document.getElementById('this-week-roles');
    if (!container) return;

    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay()); // Sunday
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Saturday

    // Format the week period string
    const weekPeriodStr = `${formatShortDate(currentWeekStart)} - ${formatShortDate(currentWeekEnd)}`;

    const weekRoles = [];

    data.forEach(item => {
      if (!item.date) return;
      const itemDate = new Date(item.date);
      if (itemDate >= currentWeekStart && itemDate <= currentWeekEnd) {
        weekRoles.push({
          date: item.date,
          serviceLead: item.serviceLead,
          worshipLead: item.worshipLead,
          preaching: item.preaching,
          bediPrayer: item.bediPrayer
        });
      }
    });

    // Sort by date
    weekRoles.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Role labels with Nepali translations
    const roleLabels = {
      serviceLead: { 
        label: 'Service Lead', 
        nepali: 'सेवा सञ्चालन',
        icon: 'fas fa-users' 
      },
      worshipLead: { 
        label: 'Worship Lead', 
        nepali: 'आराधना',
        icon: 'fas fa-music' 
      },
      preaching: { 
        label: 'Preaching', 
        nepali: 'प्रचार',
        icon: 'fas fa-bible' 
      },
      bediPrayer: { 
        label: 'The Altar Prayer', 
        nepali: 'बेदीको प्रार्थना',
        icon: 'fas fa-hands-praying' 
      }
    };

    container.innerHTML = `
      <div class="weekly-roles-section">
        <div class="weekly-roles-header">
          <h2 class="weekly-roles-title">
            <i class="fas fa-calendar-week"></i>
            This Week's Service Roles
          </h2>
          <div class="weekly-period">${weekPeriodStr}</div>
        </div>
        <div class="weekly-roles-body">
          ${weekRoles.length > 0 
            ? weekRoles.map(role => `
                <div class="role-day">
                  <div class="role-date">
                    <i class="fas fa-calendar-day"></i>
                    ${formatShortDate(role.date)}
                  </div>
                  <div class="role-items">
                    ${Object.entries(roleLabels)
                      .filter(([key]) => role[key])
                      .map(([key, label]) => `
                        <div class="role-item">
                          <div class="role-label">
                            <i class="${label.icon}"></i>
                            ${label.label}
                          </div>
                          <div class="role-value">${escapeHtml(role[key])}</div>
                          <div class="role-nepali">${label.nepali}</div>
                        </div>
                      `).join('')}
                  </div>
                </div>
              `).join('')
            : `<div class="no-roles">
                 <i class="far fa-calendar-times"></i>
                 <p>No service roles scheduled for this week</p>
               </div>`
          }
        </div>
      </div>
    `;
  }

  function updateUpcomingRoles(data) {
    const container = document.getElementById('upcoming-roles');
    if (!container) return;

    const now = new Date();
    const nextSaturday = new Date(now);
    nextSaturday.setDate(now.getDate() + (6 - now.getDay() + 7) % 7); // Next Saturday
    const nextWeekEnd = new Date(nextSaturday);
    nextWeekEnd.setDate(nextSaturday.getDate() + 6); // Following Friday

    const upcomingRoles = [];

    data.forEach(item => {
      if (!item.date) return;
      const itemDate = new Date(item.date);
      if (itemDate >= nextSaturday && itemDate <= nextWeekEnd) {
        upcomingRoles.push({
          date: item.date,
          serviceLead: item.serviceLead,
          worshipLead: item.worshipLead,
          preaching: item.preaching,
          bediPrayer: item.bediPrayer
        });
      }
    });

    // Sort by date
    upcomingRoles.sort((a, b) => new Date(a.date) - new Date(b.date));

    container.innerHTML = upcomingRoles.length > 0
      ? `
        <div class="weekly-roles-section">
          <div class="weekly-roles-header">
            <h2 class="weekly-roles-title">
              <i class="fas fa-calendar-plus"></i>
              Upcoming Service Roles
            </h2>
            <div class="weekly-period">Next Week</div>
          </div>
          <div class="weekly-roles-body">
            ${upcomingRoles.map(role => `
              <div class="role-day">
                <div class="role-date">
                  <i class="fas fa-calendar-day"></i>
                  ${formatShortDate(role.date)}
                </div>
                <div class="role-items">
                  ${role.serviceLead ? `
                    <div class="role-item">
                      <div class="role-label">
                        <i class="fas fa-users"></i>
                        Service Lead
                      </div>
                      <div class="role-value">${escapeHtml(role.serviceLead)}</div>
                      <div class="role-nepali">सेवा सञ्चालन</div>
                    </div>` : ''}
                  ${role.worshipLead ? `
                    <div class="role-item">
                      <div class="role-label">
                        <i class="fas fa-music"></i>
                        Worship Lead
                      </div>
                      <div class="role-value">${escapeHtml(role.worshipLead)}</div>
                      <div class="role-nepali">आराधना</div>
                    </div>` : ''}
                  ${role.preaching ? `
                    <div class="role-item">
                      <div class="role-label">
                        <i class="fas fa-bible"></i>
                        Preaching
                      </div>
                      <div class="role-value">${escapeHtml(role.preaching)}</div>
                      <div class="role-nepali">प्रचार</div>
                    </div>` : ''}
                  ${role.bediPrayer ? `
                    <div class="role-item">
                      <div class="role-label">
                        <i class="fas fa-hands-praying"></i>
                        The Altar Prayer
                      </div>
                      <div class="role-value">${escapeHtml(role.bediPrayer)}</div>
                      <div class="role-nepali">बेदीको प्रार्थना</div>
                    </div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `
      : `<div class="no-roles">
           <i class="far fa-calendar-times"></i>
           <p>No roles scheduled for next week</p>
         </div>`;
  }

  function highlightCurrentWeek() {
    const now = new Date();
    const currentWeekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const currentWeekEnd = new Date(now.setDate(now.getDate() + 6));

    document.querySelectorAll('#leaders-schedule-content tr').forEach(row => {
      const dateCell = row.querySelector('td:first-child');
      if (dateCell && dateCell.dataset.rawdate) {
        try {
          const date = new Date(dateCell.dataset.rawdate);
          if (date >= currentWeekStart && date <= currentWeekEnd) {
            row.classList.add('current-week');
          }
        } catch (e) {
          console.warn('Error parsing date:', e);
        }
      }
    });
  }

  function displayTodayFellowships(data) {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-US', { weekday: 'long' });
    const container = document.getElementById('today-fellowships');
    if (!container) return;

    const todaysFellowships = data.filter(item =>
      item.day.toLowerCase().includes(todayStr.toLowerCase())
    );

    container.innerHTML = todaysFellowships.length > 0
      ? `
        <div class="weekly-roles-section">
          <div class="weekly-roles-header">
            <h2 class="weekly-roles-title">
              <i class="fas fa-home"></i>
              Today's Fellowship Meetings
            </h2>
            <div class="weekly-period">${todayStr}</div>
          </div>
          <div class="weekly-roles-body">
            ${todaysFellowships.map(fellowship => `
              <div class="role-day">
                <div class="role-items">
                  <div class="role-item">
                    <div class="role-label">
                      <i class="fas fa-user-friends"></i>
                      Leaders
                    </div>
                    <div class="role-value">${escapeHtml(fellowship.leaders)}</div>
                  </div>
                  <div class="role-item">
                    <div class="role-label">
                      <i class="fas fa-home"></i>
                      Host
                    </div>
                    <div class="role-value">${escapeHtml(fellowship.host)}</div>
                  </div>
                  ${fellowship.frequency ? `
                    <div class="role-item">
                      <div class="role-label">
                        <i class="fas fa-calendar-alt"></i>
                        Frequency
                      </div>
                      <div class="role-value">${escapeHtml(fellowship.frequency)}</div>
                    </div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `
      : `<div class="no-roles">
           <i class="far fa-calendar-times"></i>
           <p>No fellowship meetings scheduled for today</p>
         </div>`;
  }

  // Helper functions
  function formatDate(dateValue) {
    const date = parseDate(dateValue);
    return (!date || isNaN(date.getTime())) ? 'Invalid date' : date.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  function formatShortDate(dateValue) {
    const date = parseDate(dateValue);
    return (!date || isNaN(date.getTime())) ? 'Invalid date' : date.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
  }

  function parseDate(dateValue) {
    const dateMatch = String(dateValue).match(/Date\((\d+),(\d+),(\d+)\)/);
    if (dateMatch) {
      const [_, year, month, day] = dateMatch;
      return new Date(year, month, day);
    }
    return new Date(dateValue);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return str.toString()
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showLoading(container) {
    container.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner-circle"></div>
        <p>Loading data...</p>
      </div>
    `;
  }

  function showNoData(container, message = 'No data available') {
    container.innerHTML = `
      <div class="no-data">
        <i class="far fa-calendar-times"></i>
        <p>${message}</p>
      </div>
    `;
  }

  function showError(container, message = 'Failed to load data') {
    container.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
      </div>
    `;
  }

  function initFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        filterButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        filterNotices(this.dataset.filter);
      });
    });
  }

  function filterNotices(filterValue) {
    const noticeCards = document.querySelectorAll('.notice-card');
    noticeCards.forEach(card => {
      card.style.display = (filterValue === 'all' || card.dataset.category === filterValue) ? '' : 'none';
    });
  }
});