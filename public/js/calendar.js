let calendar;
let groomers = [];
let clients = [];
let activeGroomerIds = new Set();
let currentApptId = null; // set while editing an existing appointment

const DEFAULT_COLOR = '#0d9488';

init();

async function init() {
  await renderLayout('calendar');

  [groomers, clients] = await Promise.all([Api.groomers(), Api.clients()]);
  groomers.forEach((g) => activeGroomerIds.add(g.id));
  renderGroomerFilters();
  populateClientSelect();
  populateGroomerSelect();

  calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
    initialView: 'timeGridWeek',
    headerToolbar: false,
    height: 'auto',
    slotMinTime: '07:00:00',
    slotMaxTime: '20:00:00',
    nowIndicator: true,
    firstDay: 0,
    dayMaxEvents: 3,
    eventTimeFormat: { hour: 'numeric', minute: '2-digit', meridiem: 'short' },
    datesSet: () => {
      document.getElementById('calendarTitle').textContent = calendar.view.title;
      updateViewSwitchButtons();
    },
    events: fetchEvents,
    eventClick: (info) => openDetailModal(info.event),
    dateClick: (info) => openFormModal('create', { date: info.dateStr.slice(0, 10) })
  });
  calendar.render();

  wireToolbar();
  wireModals();
}

function wireToolbar() {
  document.getElementById('prevBtn').addEventListener('click', () => calendar.prev());
  document.getElementById('nextBtn').addEventListener('click', () => calendar.next());
  document.getElementById('todayBtn').addEventListener('click', () => calendar.today());

  document.querySelectorAll('.view-switch button').forEach((btn) => {
    btn.addEventListener('click', () => calendar.changeView(btn.dataset.view));
  });

  document.getElementById('newApptBtn').addEventListener('click', () => openFormModal('create'));
}

function updateViewSwitchButtons() {
  const current = calendar.view.type;
  document.querySelectorAll('.view-switch button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === current);
  });
}

function renderGroomerFilters() {
  const container = document.getElementById('groomerFilters');
  container.innerHTML = groomers
    .map(
      (g) => `
      <button class="groomer-chip ${activeGroomerIds.has(g.id) ? 'active' : ''}" data-id="${g.id}"
        style="${activeGroomerIds.has(g.id) ? `background:${g.color}` : ''}">
        <span class="dot" style="background:${activeGroomerIds.has(g.id) ? '#fff' : g.color}"></span>
        ${escapeHtml(g.name)}
      </button>`
    )
    .join('');

  container.querySelectorAll('.groomer-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const id = Number(chip.dataset.id);
      if (activeGroomerIds.has(id)) {
        activeGroomerIds.delete(id);
      } else {
        activeGroomerIds.add(id);
      }
      renderGroomerFilters();
      calendar.refetchEvents();
    });
  });
}

async function fetchEvents(fetchInfo, successCallback, failureCallback) {
  try {
    const appts = await Api.appointments({
      start: fetchInfo.startStr.slice(0, 10),
      end: fetchInfo.endStr.slice(0, 10)
    });
    const events = appts
      .filter((a) => !a.groomer_id || activeGroomerIds.has(a.groomer_id))
      .map(apptToEvent);
    successCallback(events);
  } catch (err) {
    failureCallback(err);
  }
}

function apptToEvent(a) {
  const color = a.groomer_color || DEFAULT_COLOR;
  const clientName = `${a.first_name || ''} ${a.last_name || ''}`.trim();
  const titleParts = [a.pet_name, a.service].filter(Boolean);
  return {
    id: String(a.id),
    title: titleParts.join(' · ') || clientName,
    start: `${a.appointment_date}T${a.start_time}`,
    end: addMinutes(`${a.appointment_date}T${a.start_time}`, a.duration_minutes),
    backgroundColor: a.status === 'cancelled' ? '#9aa3b2' : color,
    borderColor: a.status === 'cancelled' ? '#9aa3b2' : color,
    textColor: '#ffffff',
    extendedProps: { ...a, clientName }
  };
}

function addMinutes(isoLocal, minutes) {
  const d = new Date(isoLocal);
  d.setMinutes(d.getMinutes() + Number(minutes || 60));
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

/* ---------------- Detail popup ---------------- */

function openDetailModal(event) {
  const a = event.extendedProps;
  currentApptId = a.id;
  window.__lastDetailAppt = a;

  document.getElementById('detailTitle').textContent = a.service;
  document.getElementById('detailBody').innerHTML = `
    <div class="detail-row">
      <div class="detail-label">Status</div>
      <div class="detail-value"><span class="status-badge status-${a.status}">${a.status}</span></div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Client</div>
      <div class="detail-value">${escapeHtml(a.clientName) || '<span class="muted">—</span>'}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Pet</div>
      <div class="detail-value">${escapeHtml(a.pet_name) || '<span class="muted">—</span>'}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Phone</div>
      <div class="detail-value">${escapeHtml(a.phone) || '<span class="muted">—</span>'}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">When</div>
      <div class="detail-value">${formatDate(a.appointment_date)} at ${formatTime(a.start_time)} &middot; ${a.duration_minutes} min</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Groomer</div>
      <div class="detail-value">${escapeHtml(a.groomer_name) || '<span class="muted">Unassigned</span>'}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Notes</div>
      <div class="detail-value ${a.notes ? '' : 'muted'}">${escapeHtml(a.notes) || 'No notes'}</div>
    </div>
  `;
  showModal('detailModal');
}

/* ---------------- Create / edit form ---------------- */

function populateClientSelect() {
  const select = document.getElementById('f_client');
  select.innerHTML = clients
    .map((c) => `<option value="${c.id}">${escapeHtml(c.last_name)}, ${escapeHtml(c.first_name)}</option>`)
    .join('');
  select.addEventListener('change', () => populatePetSelect(Number(select.value)));
}

function populatePetSelect(clientId, selectedPetId) {
  const client = clients.find((c) => c.id === clientId);
  const select = document.getElementById('f_pet');
  const pets = client ? client.pets : [];
  select.innerHTML =
    '<option value="">— No pet on file —</option>' +
    pets.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  if (selectedPetId) select.value = String(selectedPetId);
}

function populateGroomerSelect() {
  const select = document.getElementById('f_groomer');
  select.innerHTML =
    '<option value="">Unassigned</option>' +
    groomers.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
}

function openFormModal(mode, prefill = {}) {
  const form = document.getElementById('apptForm');
  form.reset();
  document.getElementById('formError').style.display = 'none';
  currentApptId = mode === 'edit' ? prefill.id : null;
  document.getElementById('formTitle').textContent = mode === 'edit' ? 'Edit Appointment' : 'New Appointment';

  if (clients.length) {
    document.getElementById('f_client').value = String(prefill.client_id || clients[0].id);
  }
  populatePetSelect(Number(document.getElementById('f_client').value), prefill.pet_id);

  document.getElementById('f_service').value = prefill.service || '';
  document.getElementById('f_date').value = prefill.date || prefill.appointment_date || todayStr();
  document.getElementById('f_time').value = prefill.start_time || '09:00';
  document.getElementById('f_duration').value = prefill.duration_minutes || 60;
  document.getElementById('f_groomer').value = prefill.groomer_id ? String(prefill.groomer_id) : '';
  document.getElementById('f_status').value = prefill.status || 'scheduled';
  document.getElementById('f_notes').value = prefill.notes || '';

  showModal('formModal');
}

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

document.getElementById('apptForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorBanner = document.getElementById('formError');
  errorBanner.style.display = 'none';

  const body = {
    clientId: Number(document.getElementById('f_client').value),
    petId: document.getElementById('f_pet').value ? Number(document.getElementById('f_pet').value) : null,
    groomerId: document.getElementById('f_groomer').value ? Number(document.getElementById('f_groomer').value) : null,
    service: document.getElementById('f_service').value.trim(),
    date: document.getElementById('f_date').value,
    startTime: document.getElementById('f_time').value,
    durationMinutes: Number(document.getElementById('f_duration').value),
    status: document.getElementById('f_status').value,
    notes: document.getElementById('f_notes').value.trim()
  };

  const saveBtn = document.getElementById('formSaveBtn');
  saveBtn.disabled = true;
  try {
    if (currentApptId) {
      await Api.updateAppointment(currentApptId, body);
    } else {
      await Api.createAppointment(body);
    }
    hideModal('formModal');
    calendar.refetchEvents();
  } catch (err) {
    errorBanner.textContent = err.message;
    errorBanner.style.display = 'block';
  } finally {
    saveBtn.disabled = false;
  }
});

/* ---------------- Modal plumbing ---------------- */

function wireModals() {
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => hideModal(btn.dataset.close));
  });

  document.getElementById('detailEditBtn').addEventListener('click', () => {
    hideModal('detailModal');
    openFormModal('edit', window.__lastDetailAppt);
  });

  document.getElementById('detailDeleteBtn').addEventListener('click', async () => {
    if (!currentApptId) return;
    if (!confirm('Delete this appointment? This cannot be undone.')) return;
    await Api.deleteAppointment(currentApptId);
    hideModal('detailModal');
    calendar.refetchEvents();
  });
}

function showModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function hideModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
