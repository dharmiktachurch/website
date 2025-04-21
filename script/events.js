window.onload = function () {
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwzUR_NyZvDSpuMht8Xn4E8e2fNRy5cfyFprzkCy0tNRQYEVGnB-c3mKFHI8-DQACZUtCTVTRdIr7v/pubhtml';
  
    fetch(sheetUrl)
      .then(response => response.text())
      .then(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const rows = doc.querySelectorAll('table tr');
        const container = document.getElementById('event-container');
  
        rows.forEach((row, index) => {
          // Skip the header and the first actual data row
          if (index === 0 || index === 1) return;
  
          const cells = row.querySelectorAll('td');
          if (cells.length < 5 || !cells[0].textContent.trim()) return;
  
          const eventElement = document.createElement('div');
          eventElement.classList.add('event');
          eventElement.innerHTML = `
            <h2>${cells[0].textContent.trim()}</h2>
            <div class="event-details">
              <p><strong>Date:</strong> ${cells[1].textContent.trim()}</p>
              <p><strong>Time:</strong> ${cells[2].textContent.trim()}</p>
              <p><strong>Location:</strong> ${cells[3].textContent.trim()}</p>
            </div>
            <p class="event-description">${cells[4].textContent.trim()}</p>
          `;
          container.appendChild(eventElement);
        });
      })
      .catch(error => {
        console.error('Error fetching or parsing the sheet:', error);
      });
  };
  