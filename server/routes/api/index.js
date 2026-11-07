const express = require('express');
const { requireAuth } = require('../../middleware/auth');

const clientsRouter = require('./clients');
const appointmentsRouter = require('./appointments');
const groomersRouter = require('./groomers');

const router = express.Router();

router.use(requireAuth);

router.use('/clients', clientsRouter);
router.use('/appointments', appointmentsRouter);
router.use('/groomers', groomersRouter);

module.exports = router;
