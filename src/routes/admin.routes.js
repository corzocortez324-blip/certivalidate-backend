const express = require('express')
const router = express.Router()

const { verificarToken, requireEmailVerified } = require('../middlewares/auth.middleware')
const { getStats } = require('../controllers/admin.controller')

router.get('/stats', verificarToken, requireEmailVerified, getStats)

module.exports = router
