require('dotenv').config()
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const { sendSuccess, sendError } = require('./utils/response.utils')

const app = express()
const PORT = process.env.PORT || 3000

// Middlewares globales
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

// Rutas
const authRoutes = require('./routes/auth.routes')
const certificadoRoutes = require('./routes/certificado.routes')
const estudianteRoutes = require('./routes/estudiante.routes')
const institucionRoutes = require('./routes/institucion.routes')
const plantillaRoutes = require('./routes/plantilla.routes')

app.use(limiterGeneral)
app.use('/api/auth', limiterAuth, authRoutes)
app.use('/api/certificados/verificar', limiterVerificacion)
app.use('/api/certificados', certificadoRoutes)
app.use('/api/estudiantes', estudianteRoutes)
app.use('/api/instituciones', institucionRoutes)
app.use('/api/plantillas', plantillaRoutes)

// Ruta de prueba/health check
app.get('/health', (req, res) => {
  sendSuccess(
    res,
    { status: 'online', timestamp: new Date() },
    'Servidor funcionando correctamente',
  )
})

// Ruta raíz
app.get('/', (req, res) => {
  sendSuccess(
    res,
    { version: '1.0.0', name: 'CertiValidate API' },
    'API CertiValidate lista para usar',
  )
})

// Middleware para rutas no encontradas
app.use((req, res) => {
  sendError(res, 'Ruta no encontrada', 404)
})

// Middleware global para manejo de errores
app.use((err, req, res, next) => {
  console.error('Error global:', err)

  // Errores de sintaxis JSON
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`

   CertiValidate API v1.0.0             
   Servidor corriendo en puerto ${PORT}  
   URL: http://localhost:${PORT}         
   Ambiente: ${process.env.NODE_ENV || 'development'} 
  `)
})
