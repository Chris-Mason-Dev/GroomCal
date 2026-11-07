const express = require('express');
const { get, all, run } = require('../../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const search = (req.query.q || '').trim();
    let clients;
    if (search) {
      const like = `%${search}%`;
      clients = await all(
        `SELECT * FROM clients
         WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?
         ORDER BY last_name, first_name`,
        [like, like, like, like]
      );
    } else {
      clients = await all('SELECT * FROM clients ORDER BY last_name, first_name');
    }

    const pets = await all('SELECT * FROM pets ORDER BY name');
    const petsByClient = {};
    for (const pet of pets) {
      (petsByClient[pet.client_id] ||= []).push(pet);
    }

    res.json(clients.map((c) => ({ ...c, pets: petsByClient[c.id] || [] })));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const client = await get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found.' });

    const pets = await all('SELECT * FROM pets WHERE client_id = ? ORDER BY name', [client.id]);
    const appointments = await all(
      `SELECT a.*, p.name AS pet_name
       FROM appointments a
       LEFT JOIN pets p ON p.id = a.pet_id
       WHERE a.client_id = ?
       ORDER BY a.appointment_date DESC, a.start_time DESC`,
      [client.id]
    );

    res.json({ ...client, pets, appointments });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, address, notes } = req.body || {};
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First and last name are required.' });
    }
    const result = await run(
      'INSERT INTO clients (first_name, last_name, email, phone, address, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [firstName.trim(), lastName.trim(), (email || '').trim(), (phone || '').trim(), (address || '').trim(), (notes || '').trim()]
    );
    const client = await get('SELECT * FROM clients WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Client not found.' });

    const { firstName, lastName, email, phone, address, notes } = req.body || {};
    await run(
      `UPDATE clients SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ?, notes = ? WHERE id = ?`,
      [
        firstName ?? existing.first_name,
        lastName ?? existing.last_name,
        email ?? existing.email,
        phone ?? existing.phone,
        address ?? existing.address,
        notes ?? existing.notes,
        req.params.id
      ]
    );
    const client = await get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    res.json(client);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Client not found.' });
    await run('DELETE FROM clients WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- Pets nested under a client ---
router.post('/:id/pets', async (req, res, next) => {
  try {
    const client = await get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found.' });

    const { name, breed, size, notes } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Pet name is required.' });

    const result = await run(
      'INSERT INTO pets (client_id, name, breed, size, notes) VALUES (?, ?, ?, ?, ?)',
      [client.id, name.trim(), (breed || '').trim(), (size || '').trim(), (notes || '').trim()]
    );
    const pet = await get('SELECT * FROM pets WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(pet);
  } catch (err) {
    next(err);
  }
});

router.put('/:clientId/pets/:petId', async (req, res, next) => {
  try {
    const existing = await get('SELECT * FROM pets WHERE id = ? AND client_id = ?', [req.params.petId, req.params.clientId]);
    if (!existing) return res.status(404).json({ error: 'Pet not found.' });

    const { name, breed, size, notes } = req.body || {};
    await run(
      'UPDATE pets SET name = ?, breed = ?, size = ?, notes = ? WHERE id = ?',
      [name ?? existing.name, breed ?? existing.breed, size ?? existing.size, notes ?? existing.notes, req.params.petId]
    );
    const pet = await get('SELECT * FROM pets WHERE id = ?', [req.params.petId]);
    res.json(pet);
  } catch (err) {
    next(err);
  }
});

router.delete('/:clientId/pets/:petId', async (req, res, next) => {
  try {
    const pet = await get('SELECT * FROM pets WHERE id = ? AND client_id = ?', [req.params.petId, req.params.clientId]);
    if (!pet) return res.status(404).json({ error: 'Pet not found.' });
    await run('DELETE FROM pets WHERE id = ?', [req.params.petId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
