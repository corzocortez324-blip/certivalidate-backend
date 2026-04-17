const express = require('express')
const router = express.Router()

const verificarToken = require('../middlewares/auth.middleware')
const {
  listarEstudiantes,
  obtenerEstudiante,
  crearEstudiante,
  actualizarEstudiante,
  eliminarEstudiante,
} = require('../controllers/estudiante.controller')
const { requirePermission, cargarInstitucionesUsuario } = require('../utils/authorization')
const {
  validateEstudiante,
  validateUUIDParam,
  handleValidationErrors,
} = require('../utils/validators')

router.get('/', verificarToken, cargarInstitucionesUsuario, requirePermission('estudiante', 'listar'), listarEstudiantes)
router.get(
  '/:id',
  verificarToken,
  cargarInstitucionesUsuario,
  requirePermission('estudiante', 'ver'),
  validateUUIDParam('id'),
  handleValidationErrors,
  obtenerEstudiante,
)
router.post(
  '/',
  verificarToken,
  cargarInstitucionesUsuario,
  requirePermission('estudiante', 'crear', {
    institucionIdResolver: (req) => req.body.institucion_id,
  }),
  validateEstudiante,
  handleValidationErrors,
  crearEstudiante,
)
router.put(
  '/:id',
  verificarToken,
  cargarInstitucionesUsuario,
  requirePermission('estudiante', 'actualizar'),
  validateUUIDParam('id'),
  validateEstudiante,
  handleValidationErrors,
  actualizarEstudiante,
)
router.delete(
  '/:id',
  verificarToken,
  cargarInstitucionesUsuario,
  requirePermission('estudiante', 'eliminar'),
  validateUUIDParam('id'),
  handleValidationErrors,
  eliminarEstudiante,
)

module.exports = router
