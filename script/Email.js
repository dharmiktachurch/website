document.addEventListener('DOMContentLoaded', function () {

  const form      = document.getElementById('contact-form');
  const statusDiv = document.getElementById('form-status');

  if (!form) return;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    // ── Get current language ──────────────────────────────────
    var lang = 'en';
    try { lang = localStorage.getItem('dm-lang') || 'en'; } catch (e) {}

    var strings = {
      en: {
        sending: 'Sending…',
        send:    'Send Message',
        success: '✅ Message sent successfully!',
        failure: '❌ Failed to send. Please try again.'
      },
      ne: {
        sending: 'पठाउँदैछ…',
        send:    'सन्देश पठाउनुहोस्',
        success: '✅ सन्देश सफलतापूर्वक पठाइयो!',
        failure: '❌ पठाउन असफल भयो। कृपया पुनः प्रयास गर्नुहोस्।'
      }
    };
    var s = strings[lang] || strings['en'];

    // ── Collect & validate form values ────────────────────────
    var nameVal    = document.getElementById('user_name').value.trim();
    var emailVal   = document.getElementById('user_email').value.trim();
    var subjectVal = document.getElementById('user_subject').value.trim();
    var messageVal = document.getElementById('user_message').value.trim();

    if (!nameVal || !emailVal || !subjectVal || !messageVal) {
      statusDiv.className   = 'form-status error';
      statusDiv.textContent = lang === 'ne'
        ? '⚠️ कृपया सबै फिल्डहरू भर्नुहोस्।'
        : '⚠️ Please fill in all fields.';
      return;
    }

    var now = new Date();
    var formattedTime = now.toLocaleTimeString([], {
      hour:   '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // ── Template params — match {{variables}} in EmailJS exactly
    var templateParams = {
      name:    nameVal,
      email:   emailVal,
      subject: subjectVal,
      message: messageVal,
      time:    formattedTime
    };

    // ── UI: loading state ─────────────────────────────────────
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled    = true;
    btn.textContent = s.sending;
    statusDiv.className   = '';
    statusDiv.textContent = '';

    // ── Re-init EmailJS just before sending (ensures it's ready)
    emailjs.init({ publicKey: 'MoTUpsISKXLTAnyxm' });

    emailjs.send('service_fm4wwby', 'template_baioota', templateParams)
      .then(function () {
        statusDiv.className   = 'form-status success';
        statusDiv.textContent = s.success;
        form.reset();

        // Restore placeholders in correct language after form.reset()
        document.querySelectorAll('[data-placeholder-' + lang + ']').forEach(function (el) {
          var ph = el.getAttribute('data-placeholder-' + lang);
          if (ph) el.placeholder = ph;
        });

        // Auto-clear success message after 5 seconds
        setTimeout(function () { statusDiv.textContent = ''; }, 5000);
      })
      .catch(function (error) {
        console.error('EmailJS error:', error.status, error.text);
        statusDiv.className   = 'form-status error';
        statusDiv.textContent = s.failure;
      })
      .finally(function () {
        btn.disabled    = false;
        btn.textContent = s.send;
      });
  });

});