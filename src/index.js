require('dotenv').config()

// BigInt no es serializable por JSON.stringify nativo — Auditoria y VerificacionPublica usan BigInt PKs
BigInt.prototype.toJSON = function () { return this.toString() }

const { validateRequiredEnv } = require('./utils/env')
const logger = require('./utils/logger')
const prisma = require('./utils/prisma')
const app = require('./app')

const PORT = process.env.PORT || 3000
let server

try {
  validateRequiredEnv()
} catch (error) {
  logger.fatal(error.message)
  process.exit(1)
}

async function main() {
  await prisma.$connect()
  server = app.listen(PORT, () => {
    logger.info(
      { port: PORT, env: process.env.NODE_ENV || 'development' },
      'CertiValidate API v1.1.0 iniciada',
    )
  })
}

async function shutdown(signal) {
  try {
    logger.info({ signal }, 'Cerrando servidor...')

    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) return reject(err)
          resolve()
        })
      })
    }

    await prisma.$disconnect()
    process.exit(0)
  } catch (err) {
    logger.error({ err, signal }, 'Error durante el apagado del servidor')
    process.exit(1)
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled Promise Rejection')
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception')
  process.exit(1)
})

main().catch((err) => {
  logger.fatal({ err }, 'Error al iniciar el servidor')
  process.exit(1)
})
