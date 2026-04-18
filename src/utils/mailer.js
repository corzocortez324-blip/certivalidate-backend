const logger = require('./logger')

const enviarEmailVerificacion = async ({ email, nombre, token }) => {
  const { getEnv } = require('./env')
  const baseUrl = getEnv('PUBLIC_VERIFY_URL', 'http://localhost:3000')
  const url = `${baseUrl}/verificar-email?token=${token}`

  if (process.env.NODE_ENV !== 'production') {
    logger.info({ email, url }, '[DEV] Email de verificación (no enviado por SMTP)')
    return
  }
  // TODO: integrar nodemailer o Resend aquí cuando haya SMTP configurado
  logger.warn({ email }, 'SMTP no configurado — email de verificación no enviado')
}

module.exports = { enviarEmailVerificacion }
