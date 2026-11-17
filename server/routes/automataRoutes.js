const express = require('express');
const router = express.Router();
const {
  getStates,
  getTransitions,
  getClientDFAState,
  getAllClients,
  resetClient,
} = require('../controllers/automataController');

router.get('/states', getStates);
router.get('/transitions', getTransitions);
router.get('/client/:clientId', getClientDFAState);
router.get('/clients', getAllClients);
router.post('/reset/:clientId', resetClient);

module.exports = router;
