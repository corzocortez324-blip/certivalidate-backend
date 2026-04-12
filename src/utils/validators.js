/**
 * Validadores para auth
 */

const { body, validationResult } = require('express-validator')

const validateRegister = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isLength({ min: 3 })
    .withMessage('El nombre debe tener al menos 3 caracteres'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener mayúscula, minúscula y número'),
]

const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es obligatoria'),
]

const validateUpdateProfile = [
  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage('El nombre debe tener al menos 3 caracteres'),
  body('apellido')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('El apellido no puede estar vacío'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail(),
]

const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('La contraseña actual es obligatoria'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'La nueva contraseña debe contener mayúscula, minúscula y número',
    ),
]

const validateCertificado = [
  body('estudiante_id')
    .trim()
    .notEmpty()
    .withMessage('estudiante_id es obligatorio')
    .isUUID()
    .withMessage('estudiante_id debe ser un UUID válido'),
  body('institucion_id')
    .trim()
    .notEmpty()
    .withMessage('institucion_id es obligatorio')
    .isUUID()
    .withMessage('institucion_id debe ser un UUID válido'),
  body('plantilla_id')
    .trim()
    .notEmpty()
    .withMessage('plantilla_id es obligatorio')
    .isUUID()
    .withMessage('plantilla_id debe ser un UUID válido'),
]

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: 'Errores de validación',
      errors: errors.array(),
      timestamp: new Date().toISOString(),
    })
  }
  next()
}

module.exports = {
  validateRegister,
  validateLogin,
  validateCertificado,
  handleValidationErrors,
}
