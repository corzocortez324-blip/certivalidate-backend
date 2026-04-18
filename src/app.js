const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const pinoHttp = require('pino-http')
const rateLimit = require('express-rate-limit')
const swaggerUi = require('swagger-ui-express')
const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')
const { sendSuccess, sendError } = require('./utils/response.utils')
const logger = require('./utils/logger')
const requestId = require('./middlewares/requestId.middleware')
const prisma = require('./utils/prisma')

const app = express()

app.set('trust proxy', 1)

app.use(requestId)
app.use(helmet())
app.use(
  pinoHttp({
    logger,
    customLogLevel: (_req, res) => {
      if (res.statusCode >= 500) return 'error'
      if (res.statusCode >= 400) return 'warn'
      return 'info'
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    customProps: (req) => ({ requestId: req.requestId }),
    autoLogging: { ignore: (req) => req.url === '/health' },
  }),
)

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

const isTest = process.env.NODE_ENV === 'test'
const START_TIME = Date.now()

const limiterGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, statusCode: 429, message: 'Demasiadas solicitudes, inténtalo de nuevo más tarde' },
})

const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, statusCode: 429, message: 'Demasiadas solicitudes de autenticación, inténtalo de nuevo más tarde' },
})

const limiterVerificacion = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, statusCode: 429, message: 'Demasiadas solicitudes de verificación, inténtalo de nuevo más tarde' },
})

const authRoutes = require('./routes/auth.routes')
const certificadoRoutes = require('./routes/certificado.routes')
const estudianteRoutes = require('./routes/estudiante.routes')
const institucionRoutes = require('./routes/institucion.routes')
const plantillaRoutes = require('./routes/plantilla.routes')
const auditoriaRoutes = require('./routes/auditoria.routes')

// Health y docs quedan fuera del rate limiter general
app.get('/health', async (req, res) => {
  let dbStatus = 'ok'
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (_e) {
    dbStatus = 'error'
  }
  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000)
  const status = dbStatus === 'ok' ? 'online' : 'degraded'
  sendSuccess(
    res,
    { status, db: dbStatus, uptime: uptimeSeconds, version: '1.1.0', timestamp: new Date() },
    'Servidor funcionando correctamente',
    dbStatus === 'ok' ? 200 : 503,
  )
})

const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const pinoHttp = require('pino-http')
const rateLimit = require('express-rate-limit')
const swaggerUi = require('swagger-ui-express')
const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')
const { sendSuccess, sendError } = require('./utils/response.utils')
const logger = require('./utils/logger')
const requestId = require('./middlewares/requestId.middleware')
const prisma = require('./utils/prisma')

const app = express()

app.set('trust proxy', 1)

app.use(requestId)
app.use(helmet())
app.use(
  pinoHttp({
    logger,
    customLogLevel: (_req, res) => {
      if (res.statusCode >= 500) return 'error'
      if (res.statusCode >= 400) return 'warn'
      return 'info'
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    customProps: (req) => ({ requestId: req.requestId }),
    autoLogging: { ignore: (req) => req.url === '/health' },
  }),
)

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(new Error('CORS bloqueado'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

const isTest = process.env.NODE_ENV === 'test'
const START_TIME = Date.now()

const limiterGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, statusCode: 429, message: 'Demasiadas solicitudes, inténtalo de nuevo más tarde' },
})

const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, statusCode: 429, message: 'Demasiadas solicitudes de autenticación, inténtalo de nuevo más tarde' },
})

const limiterVerificacion = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, statusCode: 429, message: 'Demasiadas solicitudes de verificación, inténtalo de nuevo más tarde' },
})

const authRoutes = require('./routes/auth.routes')
const certificadoRoutes = require('./routes/certificado.routes')
const estudianteRoutes = require('./routes/estudiante.routes')
const institucionRoutes = require('./routes/institucion.routes')
const plantillaRoutes = require('./routes/plantilla.routes')
const auditoriaRoutes = require('./routes/auditoria.routes')

// Health y docs quedan fuera del rate limiter general
app.get('/health', async (req, res) => {
  let dbStatus = 'ok'
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (_e) {
    dbStatus = 'error'
  }
  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000)
  const status = dbStatus === 'ok' ? 'online' : 'degraded'
  sendSuccess(
    res,
    { status, db: dbStatus, uptime: uptimeSeconds, version: '1.1.0', timestamp: new Date() },
    'Servidor funcionando correctamente',
    dbStatus === 'ok' ? 200 : 503,
  )
})

if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
  const swaggerDocument = yaml.load(
    fs.readFileSync(path.join(__dirname, 'docs', 'openapi.yaml'), 'utf8'),
  )
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: false }))
}

app.use(limiterGeneral)
app.use('/api/auth', limiterAuth, authRoutes)
app.use('/api/certificados/verificar', limiterVerificacion)
app.use('/api/certificados', certificadoRoutes)
app.use('/api/estudiantes', estudianteRoutes)
app.use('/api/instituciones', institucionRoutes)
app.use('/api/plantillas', plantillaRoutes)
app.use('/api/auditoria', auditoriaRoutes)

app.get('/', (req, res) => {
  sendSuccess(res, { version: '1.1.0', name: 'CertiValidate API', docs: '/api/docs' }, 'API CertiValidate lista para usar')
})

app.use((req, res) => {
  sendError(res, 'Ruta no encontrada', 404)
})

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return sendError(res, 'JSON inválido en el body', 400)
  }
  logger.error({ err, requestId: req.requestId }, 'Error no manejado')
  sendError(
    res,
    process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
    err.statusCode || 500,
  )
})

module.exports = app
