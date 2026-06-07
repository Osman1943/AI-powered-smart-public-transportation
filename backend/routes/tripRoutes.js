// backend/routes/tripRoutes.js
const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const authMiddleware = require('../middleware/authMiddleware'); // Güvenlik duvarımız

// Tüm sefer rotaları korumalıdır, token şarttır!
router.post('/', authMiddleware, tripController.startTrip);
router.put('/:id/end', authMiddleware, tripController.endTrip);

module.exports = router;