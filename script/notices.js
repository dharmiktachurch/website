document.addEventListener("DOMContentLoaded", function() {
  // Configuration - DOUBLE CHECK THESE VALUES
  const SHEET_ID = '1eX7ASnXSRjB7MHr6woWxfjhsti6zNCS9eP--h9J5_fs';
  const SHEET_GID = '998080244';
  const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?gid=${SHEET_GID}&tqx=out:json`;
  
  // DOM Elements
  const noticesContainer = document.getElementById('notices-content');
  const filterButtons = document.querySelectorAll('.filter-btn');

  // Load notices when page loads
  loadNotices();

  function loadNotices() {
    showLoading();
    
    // First, verify the URL is correct
    console.log("Fetching from:", SHEET_URL);
    
    fetch(SHEET_URL)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.text();
      })
      .then(data => {
        console.log("Raw data received:", data.substring(0, 100) + "..."); // Log first 100 chars
        const notices = parseSheetData(data);
        console.log("Parsed notices:", notices);
        
        if (notices.length > 0) {
          displayNotices(notices);
          initFilters();
        } else {
          showNoNotices();
        }
      })
      .catch(err => {
        console.error("Error loading notices:", err);
        showError();
      });
  }

  function parseSheetData(data) {
    try {
      // More robust JSON parsing
      const jsonStr = data.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/)[1];
      const jsonData = JSON.parse(jsonStr);
      
      const notices = [];
      const columns = jsonData.table.cols.map(col => col.label);
      console.log("Sheet columns:", columns);
      
      // Process each row
      jsonData.table.rows.forEach((row, i) => {
        try {
          // Skip header row if present
          if (i === 0 && row.c[0]?.v === "Title") return;
          
          const cells = row.c;
          if (!cells[0]?.v) return; // Skip empty rows
          
          // Parse date (multiple format support)
          let noticeDate;
          const dateStr = cells[1]?.v;
          if (dateStr) {
            if (dateStr.includes('/')) {
              const [month, day, year] = dateStr.split('/');
              noticeDate = new Date(year, month-1, day);
            } else {
              noticeDate = new Date(dateStr);
            }
            
            if (isNaN(noticeDate.getTime())) {
              console.warn(`Invalid date in row ${i}:`, dateStr);
              noticeDate = new Date(); // Fallback to current date
            }
          } else {
            noticeDate = new Date(); // Fallback if no date
          }
          
          // Process category
          let category = 'general';
          if (cells[2]?.v) {
            const cat = cells[2].v.toString().toLowerCase().trim();
            if (['urgent', 'general', 'event'].includes(cat)) {
              category = cat;
            }
          }
          
          notices.push({
            title: cells[0].v.toString(),
            date: noticeDate,
            formattedDate: noticeDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            category: category,
            details: cells[3]?.v?.toString() || '',
            link: cells[4]?.v?.toString() || null
          });
        } catch (e) {
          console.warn(`Error processing row ${i}:`, e);
        }
      });
      
      return notices.sort((a, b) => b.date - a.date); // Newest first
    } catch (e) {
      console.error("Sheet parsing error:", e);
      return [];
    }
  }

  function displayNotices(notices) {
    noticesContainer.innerHTML = '';
    
    if (notices.length === 0) {
      showNoNotices();
      return;
    }
    
    const noticeGrid = document.createElement('div');
    noticeGrid.className = 'notice-grid';
    
    notices.forEach(notice => {
      const noticeCard = document.createElement('div');
      noticeCard.className = `notice-card ${notice.category}`;
      noticeCard.dataset.category = notice.category;
      
      noticeCard.innerHTML = `
        <div class="notice-header">
          <h3 class="notice-title">${escapeHtml(notice.title)}</h3>
          <div class="notice-meta">
            <div class="notice-date">
              <i class="far fa-calendar-alt"></i>
              <span>${escapeHtml(notice.formattedDate)}</span>
            </div>
            <div class="notice-category ${notice.category}">
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
            </div>
          ` : ''}
        </div>
      `;
      
      noticeGrid.appendChild(noticeCard);
    });
    
    noticesContainer.appendChild(noticeGrid);
  }

  // Helper function to prevent XSS
  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag]));
  }

  // Rest of your functions (initFilters, filterNotices, etc.) remain the same
  function initFilters() {
    filterButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        filterButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        filterNotices(this.dataset.filter);
      });
    });
  }

  function filterNotices(filterValue) {
    const noticeCards = document.querySelectorAll('.notice-card');
    noticeCards.forEach(card => {
      card.style.display = (filterValue === 'all' || card.dataset.category === filterValue) 
        ? '' 
        : 'none';
    });
  }

  function showLoading() {
    noticesContainer.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner-circle"></div>
        <p>Loading notices...</p>
      </div>
    `;
  }

  function showNoNotices() {
    noticesContainer.innerHTML = `
      <div class="no-notices">
        <i class="far fa-bell-slash"></i>
        <p>No notices available at this time</p>
      </div>
    `;
  }

  function showError() {
    noticesContainer.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Failed to load notices. Please check:</p>
        <ol>
          <li>Sheet is published to web (File > Share > Publish to web)</li>
          <li>Correct Sheet ID and GID are set</li>
          <li>Your columns match: Title, Date, Category, Details, Link</li>
        </ol>
      </div>
    `;
  }
});