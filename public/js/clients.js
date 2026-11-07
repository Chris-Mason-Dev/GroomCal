let clients = [];
let currentClientId = null;

init();

async function init() {
  await renderLayout('clients');
  await loadClients();
  wireUi();
}

async function loadClients(query = '') {
  clients = query ? await Api.searchClients(query) : await Api.clients();
  renderClientList();
}

function renderClientList() {
  const container = document.getElementById('clientList');
  if (!clients.length) {
    container.innerHTML = '<div class="empty-state card">No clients yet. Click "Add Client" to create your first one.</div>';
    return;
  }

  container.innerHTML = clients
    .map(
      (c) => `
      <div class="card client-card">
        <div class="client-info">
          <h3>${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}</h3>
          ${c.phone ? `<div class="client-meta">📞 ${escapeHtml(c.phone)}</div>` : ''}
          ${c.email ? `<div class="client-meta">✉️ ${escapeHtml(c.email)}</div>` : ''}
          ${c.address ? `<div class="client-meta">${escapeHtml(c.address)}</div>` : ''}
          <div class="pet-tags">
            ${c.pets.map((p) => `<span class="pet-tag">🐾 ${escapeHtml(p.name)}${p.breed ? ` · ${escapeHtml(p.breed)}` : ''}</span>`).join('') || '<span class="pet-tag">No pets on file</span>'}
          </div>
        </div>
        <div class="client-actions">
          <button class="btn btn-secondary btn-sm" data-edit="${c.id}">Edit</button>
        </div>
      </div>`
    )
    .join('');

  container.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openClientModal('edit', Number(btn.dataset.edit)));
  });
}

function wireUi() {
  let searchTimer;
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadClients(e.target.value.trim()), 250);
  });

  document.getElementById('newClientBtn').addEventListener('click', () => openClientModal('create'));

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => hideModal(btn.dataset.close));
  });

  document.getElementById('addPetBtn').addEventListener('click', addPetHandler);
  document.getElementById('clientForm').addEventListener('submit', saveClientHandler);
  document.getElementById('clientDeleteBtn').addEventListener('click', deleteClientHandler);
}

async function openClientModal(mode, clientId) {
  const form = document.getElementById('clientForm');
  form.reset();
  document.getElementById('clientFormError').style.display = 'none';
  currentClientId = mode === 'edit' ? clientId : null;

  document.getElementById('clientModalTitle').textContent = mode === 'edit' ? 'Edit Client' : 'Add Client';
  document.getElementById('clientDeleteBtn').style.display = mode === 'edit' ? 'inline-flex' : 'none';
  document.getElementById('petsSection').style.display = mode === 'edit' ? 'block' : 'none';

  if (mode === 'edit') {
    const client = await Api.client(clientId);
    document.getElementById('c_firstName').value = client.first_name || '';
    document.getElementById('c_lastName').value = client.last_name || '';
    document.getElementById('c_phone').value = client.phone || '';
    document.getElementById('c_email').value = client.email || '';
    document.getElementById('c_address').value = client.address || '';
    document.getElementById('c_notes').value = client.notes || '';
    renderPetList(client.pets);
  }

  showModal('clientModal');
}

function renderPetList(pets) {
  const petList = document.getElementById('petList');
  if (!pets.length) {
    petList.innerHTML = '<p class="client-meta">No pets on file yet.</p>';
    return;
  }
  petList.innerHTML = pets
    .map(
      (p) => `
      <div class="detail-row" style="padding:7px 0;">
        <div class="detail-value">🐾 <strong>${escapeHtml(p.name)}</strong>${p.breed ? ` — ${escapeHtml(p.breed)}` : ''}${p.size ? ` (${escapeHtml(p.size)})` : ''}</div>
        <button type="button" class="btn-ghost" data-remove-pet="${p.id}">Remove</button>
      </div>`
    )
    .join('');

  petList.querySelectorAll('[data-remove-pet]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this pet from the client record?')) return;
      await Api.deletePet(currentClientId, Number(btn.dataset.removePet));
      const client = await Api.client(currentClientId);
      renderPetList(client.pets);
    });
  });
}

async function addPetHandler() {
  const name = document.getElementById('p_name').value.trim();
  if (!name) return;
  const breed = document.getElementById('p_breed').value.trim();
  const size = document.getElementById('p_size').value.trim();

  await Api.createPet(currentClientId, { name, breed, size });
  document.getElementById('p_name').value = '';
  document.getElementById('p_breed').value = '';
  document.getElementById('p_size').value = '';

  const client = await Api.client(currentClientId);
  renderPetList(client.pets);
}

async function saveClientHandler(e) {
  e.preventDefault();
  const errorBanner = document.getElementById('clientFormError');
  errorBanner.style.display = 'none';

  const body = {
    firstName: document.getElementById('c_firstName').value.trim(),
    lastName: document.getElementById('c_lastName').value.trim(),
    phone: document.getElementById('c_phone').value.trim(),
    email: document.getElementById('c_email').value.trim(),
    address: document.getElementById('c_address').value.trim(),
    notes: document.getElementById('c_notes').value.trim()
  };

  const saveBtn = document.getElementById('clientSaveBtn');
  saveBtn.disabled = true;
  try {
    if (currentClientId) {
      await Api.updateClient(currentClientId, body);
    } else {
      const created = await Api.createClient(body);
      currentClientId = created.id;
      // Allow immediately adding pets without reopening the modal.
      document.getElementById('clientModalTitle').textContent = 'Edit Client';
      document.getElementById('clientDeleteBtn').style.display = 'inline-flex';
      document.getElementById('petsSection').style.display = 'block';
      renderPetList([]);
      await loadClients(document.getElementById('searchInput').value.trim());
      return;
    }
    hideModal('clientModal');
    await loadClients(document.getElementById('searchInput').value.trim());
  } catch (err) {
    errorBanner.textContent = err.message;
    errorBanner.style.display = 'block';
  } finally {
    saveBtn.disabled = false;
  }
}

async function deleteClientHandler() {
  if (!currentClientId) return;
  if (!confirm('Delete this client and all of their pets? This cannot be undone.')) return;
  await Api.deleteClient(currentClientId);
  hideModal('clientModal');
  await loadClients(document.getElementById('searchInput').value.trim());
}

function showModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function hideModal(id) {
  document.getElementById(id).classList.add('hidden');
}
