require('dotenv').config()

const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const { sendSuccess, sendError } = require('./utils/response.utils')
const prisma = require('./utils/prisma')
const { validateRequiredEnv } = require('./utils/env')

try {
  validateRequiredEnv()
} catch (error) {
  console.error(`[FATAL] ${error.message}`)
  process.exit(1)
}

const app = express()
const PORT = process.env.PORT || 3000

app.set('trust proxy', 1)

app.use(helmet())
app.use(morgan('combined'))

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const limiterGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Demasiadas solicitudes, inténtalo de nuevo más tarde',
  },
})

const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message:
      'Demasiadas solicitudes de autenticación, inténtalo de nuevo más tarde',
  },
})

const limiterVerificacion = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message:
      'Demasiadas solicitudes de verificación, inténtalo de nuevo más tarde',
  },
})

const authRoutes = require('./routes/auth.routes')
const certificadoRoutes = require('./routes/certificado.routes')
const estudianteRoutes = require('./routes/estudiante.routes')
const institucionRoutes = require('./routes/institucion.routes')
const plantillaRoutes = require('./routes/plantilla.routes')
const auditoriaRoutes = require('./routes/auditoria.routes')

app.use(limiterGeneral)
app.use('/api/auth', limiterAuth, authRoutes)
app.use('/api/certificados/verificar', limiterVerificacion)
app.use('/api/certificados', certificadoRoutes)
app.use('/api/estudiantes', estudianteRoutes)
app.use('/api/instituciones', institucionRoutes)
app.use('/api/plantillas', plantillaRoutes)
app.use('/api/auditoria', auditoriaRoutes)

app.get('/health', (req, res) => {
  sendSuccess(
    res,
    { status: 'online', timestamp: new Date() },
    'Servidor funcionando correctamente',
  )
})

app.get('/', (req, res) => {
  sendSuccess(
    res,
    { version: '1.1.0', name: 'CertiValidate API' },
    'API CertiValidate lista para usar',
  )
})

app.use((req, res) => {
  sendError(res, 'Ruta no encontrada', 404)
})

app.use((err, req, res, next) => {
  console.error('Error global:', err)

  if (err instanceof SyntaxError && 'body' in err) {
    return sendError(res, 'JSON inválido en el body', 400)
  }

  sendError(
    res,
    process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message,
    err.statusCode || 500,
  )
})

async function main() {
  await prisma.$connect()
  app.listen(PORT, () => {
    console.log(`\n   CertiValidate API v1.1.0\n   Servidor corriendo en puerto ${PORT}\n   URL: http://localhost:${PORT}\n   Ambiente: ${process.env.NODE_ENV || 'development'}\n    `)
  })
}

async function shutdown(signal) {
  console.log(`[${signal}] Cerrando servidor...`)
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

main().catch((err) => {
  console.error('[FATAL] Error al iniciar el servidor:', err)
  process.exit(1)
})
