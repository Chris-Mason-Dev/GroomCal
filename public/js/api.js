const Api = (() => {
  async function request(path, options = {}) {
    const res = await fetch(`/api${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (res.status === 401) {
      if (!window.location.pathname.endsWith('/login.html')) {
        window.location.href = '/login.html';
      }
      throw new Error('Not authenticated');
    }

    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      // no body
    }

    if (!res.ok) {
      throw new Error((data && data.error) || 'Something went wrong.');
    }
    return data;
  }

  return {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body }),
    put: (path, body) => request(path, { method: 'PUT', body }),
    del: (path) => request(path, { method: 'DELETE' }),

    me: () => request('/auth/me'),
    login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
    logout: () => request('/auth/logout', { method: 'POST' }),

    groomers: () => request('/groomers'),

    clients: () => request('/clients'),
    searchClients: (q) => request(`/clients?q=${encodeURIComponent(q)}`),
    client: (id) => request(`/clients/${id}`),
    createClient: (body) => request('/clients', { method: 'POST', body }),
    updateClient: (id, body) => request(`/clients/${id}`, { method: 'PUT', body }),
    deleteClient: (id) => request(`/clients/${id}`, { method: 'DELETE' }),

    createPet: (clientId, body) => request(`/clients/${clientId}/pets`, { method: 'POST', body }),
    updatePet: (clientId, petId, body) => request(`/clients/${clientId}/pets/${petId}`, { method: 'PUT', body }),
    deletePet: (clientId, petId) => request(`/clients/${clientId}/pets/${petId}`, { method: 'DELETE' }),

    appointments: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/appointments${qs ? `?${qs}` : ''}`);
    },
    createAppointment: (body) => request('/appointments', { method: 'POST', body }),
    updateAppointment: (id, body) => request(`/appointments/${id}`, { method: 'PUT', body }),
    deleteAppointment: (id) => request(`/appointments/${id}`, { method: 'DELETE' })
  };
})();
