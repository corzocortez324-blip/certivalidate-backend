const jwt = require('jsonwebtoken');

// Middleware que protege rutas
const verificarToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).json({
      error: 'Token requerido'
    });
  }

  try {
    const decoded = jwt.verify(token, 'secreto123');
    req.usuario = decoded;

    next(); // continúa a la ruta
  } catch (error) {
    return res.status(401).json({
      error: 'Token inválido'
    });
  }
};

module.exports = verificarToken;