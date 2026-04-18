const requiredEnv = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY']

const warnEnv = [
  { key: 'FRONTEND_URL', fallback: 'http://localhost:3000', note: 'CORS permitirá solo el frontend local' },
  { key: 'PUBLIC_VERIFY_URL', fallback: 'http://localhost:3000/verificar', note: 'los PDFs tendrán URL de verificación local' },
]

const getEnv = (key, fallback = undefined) => {
  const value = process.env[key]
  if (value !== undefined && value !== null && value !== '') {
    return value
  }

  if (fallback !== undefined) {
    return fallback
  }

  throw new Error(`La variable de entorno ${key} es obligatoria`)
}

const validateRequiredEnv = () => {
  const missingEnv = requiredEnv.filter((key) => !process.env[key])
  if (missingEnv.length > 0) {
    throw new Error(
      `Variables de entorno faltantes: ${missingEnv.join(', ')}`,
    )
  }

  if (process.env.NODE_ENV === 'production') {
    for (const { key, note } of warnEnv) {
      if (!process.env[key]) {
        require('./logger').warn(`[WARN] Variable ${key} no definida en producción: ${note}`)
      }
    }
  }
}

module.exports = {
  getEnv,
  validateRequiredEnv,
}
