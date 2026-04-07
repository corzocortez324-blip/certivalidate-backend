const jwt = require('jsonwebtoken')
const { sendError } = require('../utils/response.utils')

// Middleware que protege rutas
const verificarToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']

    if (!authHeader) {
      return sendError(res, 'Token requerido', 401)
    }

    // Extraer token del formato "Bearer <token>"
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader

    if (!token) {
      return sendError(res, 'Token inválido o malformado', 401)
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto123')
    req.usuario = decoded

    next() // continúa a la ruta
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Token expirado', 401)
    }
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 'Token inválido', 401)
    }
    return sendError(res, 'Error de autenticación', 401)
  }
}

module.exports = verificarToken
