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

const validateCertificado = [
  body('estudiante')
    .trim()
    .notEmpty()
    .withMessage('El nombre del estudiante es obligatorio')
    .isLength({ min: 3 })
    .withMessage('El nombre debe tener al menos 3 caracteres'),
  body('curso')
    .trim()
    .notEmpty()
    .withMessage('El nombre del curso es obligatorio')
    .isLength({ min: 3 })
    .withMessage('El curso debe tener al menos 3 caracteres'),
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
