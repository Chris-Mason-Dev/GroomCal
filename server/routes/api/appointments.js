const express = require('express');
const { get, all, run } = require('../../db');

const router = express.Router();

const SELECT_WITH_JOINS = `
  SELECT a.*,
         p.name AS pet_name,
         c.first_name, c.last_name, c.phone, c.email,
         u.name AS groomer_name, u.color AS groomer_color
  FROM appointments a
  LEFT JOIN pets p ON p.id = a.pet_id
  LEFT JOIN clients c ON c.id = a.client_id
  LEFT JOIN users u ON u.id = a.groomer_id
`;

router.get('/', async (req, res, next) => {
  try {
    const { start, end, groomerId } = req.query;
    let query = `${SELECT_WITH_JOINS} WHERE 1 = 1`;
    const params = [];
    if (start) {
      query += ' AND a.appointment_date >= ?';
      params.push(start);
    }
    if (end) {
      query += ' AND a.appointment_date <= ?';
      params.push(end);
    }
    if (groomerId) {
      query += ' AND a.groomer_id = ?';
      params.push(groomerId);
    }
    query += ' ORDER BY a.appointment_date ASC, a.start_time ASC';

    const appointments = await all(query, params);
    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const appt = await get(`${SELECT_WITH_JOINS} WHERE a.id = ?`, [req.params.id]);
    if (!appt) return res.status(404).json({ error: 'Appointment not found.' });
    res.json(appt);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { clientId, petId, groomerId, service, date, startTime, durationMinutes, notes, status } = req.body || {};
    if (!clientId || !service || !date || !startTime) {
      return res.status(400).json({ error: 'Client, service, date, and start time are required.' });
    }
    const result = await run(
      `INSERT INTO appointments (client_id, pet_id, groomer_id, service, appointment_date, start_time, duration_minutes, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId,
        petId || null,
        groomerId || null,
        service.trim(),
        date,
        startTime,
        durationMinutes || 60,
        status || 'scheduled',
        (notes || '').trim()
      ]
    );

    const appt = await get(`${SELECT_WITH_JOINS} WHERE a.id = ?`, [result.lastInsertRowid]);
    res.status(201).json(appt);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await get('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Appointment not found.' });

    const { clientId, petId, groomerId, service, date, startTime, durationMinutes, notes, status } = req.body || {};
    await run(
      `UPDATE appointments
       SET client_id = ?, pet_id = ?, groomer_id = ?, service = ?, appointment_date = ?, start_time = ?,
           duration_minutes = ?, notes = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        clientId ?? existing.client_id,
        petId ?? existing.pet_id,
        groomerId ?? existing.groomer_id,
        service ?? existing.service,
        date ?? existing.appointment_date,
        startTime ?? existing.start_time,
        durationMinutes ?? existing.duration_minutes,
        notes ?? existing.notes,
        status ?? existing.status,
        req.params.id
      ]
    );

    const appt = await get(`${SELECT_WITH_JOINS} WHERE a.id = ?`, [req.params.id]);
    res.json(appt);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await get('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Appointment not found.' });
    await run('DELETE FROM appointments WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
