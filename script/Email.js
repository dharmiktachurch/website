window.onload = function() {  
    const form = document.getElementById('contact-form');
  
    form.addEventListener('submit', function(event) {
      event.preventDefault();
  
      // Automatically get the current time
      const now = new Date();
      const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  
      const formData = {
        name:    document.getElementById('user_name').value,
        email:   document.getElementById('user_email').value,
        subject: document.getElementById('user_subject').value,
        message: document.getElementById('user_message').value,
        time:    formattedTime  // 👈 Auto-injected time
      };
  
      emailjs.send('service_7kmeg82', 'template_baioota', formData)
        .then(function(response) {
            alert('Message sent successfully!');
            document.getElementById('contact-form').reset();
        }, function(error) {
            console.error('EmailJS Error:', error);
            alert('Failed to send message.\nError: ' + JSON.stringify(error));
        });
  
    });
  };
  