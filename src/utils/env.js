const requiredEnv = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET']

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
}

module.exports = {
  getEnv,
  validateRequiredEnv,
}
