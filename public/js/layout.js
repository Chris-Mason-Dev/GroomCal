async function renderLayout(activePage) {
  let user;
  try {
    user = await Api.me();
  } catch (_) {
    return; // Api.me() already redirects to /login.html on 401
  }

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = `
    <div class="brand">
      <div class="brand-mark">GC</div>
      <div class="brand-name">GroomCal</div>
    </div>
    <nav class="nav">
      <a href="/calendar.html" class="${activePage === 'calendar' ? 'active' : ''}">Calendar</a>
      <a href="/clients.html" class="${activePage === 'clients' ? 'active' : ''}">Clients</a>
    </nav>
    <div class="sidebar-footer">
      <div class="user-chip">
        <div class="user-avatar" style="background:${user.color}">${initials}</div>
        <div class="user-name">${escapeHtml(user.name)}</div>
      </div>
      <button class="logout-btn" id="logoutBtn">Log out</button>
    </div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await Api.logout();
    window.location.href = '/login.html';
  });

  return user;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
