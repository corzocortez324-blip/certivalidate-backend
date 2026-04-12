const express = require('express')
const router = express.Router()

const verificarToken = require('../middlewares/auth.middleware')
const {
  listarPlantillas,
  obtenerPlantilla,
  crearPlantilla,
  actualizarPlantilla,
} = require('../controllers/plantilla.controller')

router.get('/', verificarToken, listarPlantillas)
router.get('/:id', verificarToken, obtenerPlantilla)
router.post('/', verificarToken, crearPlantilla)
router.put('/:id', verificarToken, actualizarPlantilla)

module.exports = router
