(async function init() {
  // Already logged in? Skip straight to the calendar.
  try {
    await Api.me();
    window.location.href = '/calendar.html';
    return;
  } catch (_) {
    // not logged in, show the form
  }
})();

const form = document.getElementById('loginForm');
const errorBanner = document.getElementById('errorBanner');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBanner.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in…';

  try {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    await Api.login(username, password);
    window.location.href = '/calendar.html';
  } catch (err) {
    errorBanner.textContent = err.message;
    errorBanner.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Log in';
  }
});
