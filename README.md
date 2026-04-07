# CertiValidate Backend

Sistema backend para validar y emitir certificados digitales con hash único para verificación.

## 📋 Tabla de Contenidos

- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Endpoints API](#endpoints-api)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Mejoras Realizadas](#mejoras-realizadas)

## 📦 Requisitos

- Node.js v14 o superior
- npm v6 o superior

## 🚀 Instalación

1. **Clonar repositorio**

```bash
git clone <repository-url>
cd CertiValidate-backend
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

```bash
cp .env.example .env
```

4. **Iniciar servidor**

```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## ⚙️ Configuración

Edita el archivo `.env` con tus valores:

```env
# Puerto donde corre el servidor
PORT=3000

# Ambiente de ejecución
NODE_ENV=development

# JWT Secret y expiración
JWT_SECRET=tu_secreto_super_seguro_aqui
JWT_EXPIRES_IN=1h

# URL del frontend para CORS
FRONTEND_URL=http://localhost:3000

# Nivel de logging
LOG_LEVEL=info
```

## 📁 Estructura del Proyecto

```
src/
├── index.js                          # Entrada principal del servidor
├── controllers/
│   ├── auth.controller.js           # Lógica de autenticación
│   └── certificado.controller.js    # Lógica de certificados
├── routes/
│   ├── auth.routes.js               # Rutas de auth
│   └── certificado.routes.js        # Rutas de certificados
├── middlewares/
│   └── auth.middleware.js           # Validación de tokens JWT
└── utils/
    ├── response.utils.js            # Formatos de respuesta estándar
    ├── validators.js                # Validación de entrada
    └── pdf.generator.js             # Generación de PDFs
```

## 📡 Endpoints API

### Health Check

```http
GET /health
```

Verifica que el servidor esté funcionando.

---

### Autenticación

#### Registro

```http
POST /api/auth/register
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "password": "Segura123"
}
```

**Validaciones:**

- Email debe ser válido
- Nombre mínimo 3 caracteres
- Contraseña mínimo 6 caracteres (mayúscula, minúscula, número)

**Respuesta exitosa (201):**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Usuario registrado correctamente",
  "data": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "Segura123"
}
```

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login exitoso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": 1,
      "nombre": "Juan Pérez",
      "email": "juan@example.com"
    }
  },
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

---

#### Obtener Perfil

```http
GET /api/auth/perfil
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Perfil obtenido correctamente",
  "data": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:40:00.000Z"
}
```

---

### Certificados

#### Emitir Certificado (Protegido)

```http
POST /api/certificados/emitir
Authorization: Bearer <token>
Content-Type: application/json

{
  "estudiante": "María González",
  "curso": "Curso de Node.js Avanzado"
}
```

**Validaciones:**

- Estudiante mínimo 3 caracteres
- Curso mínimo 3 caracteres
- Requiere autenticación

**Respuesta exitosa (201):**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Certificado generado correctamente",
  "data": {
    "id": 1,
    "estudiante": "María González",
    "curso": "Curso de Node.js Avanzado",
    "hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "usuarioId": 1,
    "estado": "válido",
    "fechaEmision": "2024-01-15T10:45:00.000Z",
    "createdAt": "2024-01-15T10:45:00.000Z",
    "updatedAt": "2024-01-15T10:45:00.000Z"
  },
  "timestamp": "2024-01-15T10:45:00.000Z"
}
```

---

#### Listar Certificados (Protegido)

```http
GET /api/certificados/listar
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Certificados obtenidos correctamente",
  "data": {
    "total": 2,
    "certificados": [...]
  },
  "timestamp": "2024-01-15T10:50:00.000Z"
}
```

---

#### Obtener Certificado por ID (Protegido)

```http
GET /api/certificados/:id
Authorization: Bearer <token>
```

---

#### Verificar Certificado (Público)

```http
POST /api/certificados/verificar
Authorization: Bearer <token>
Content-Type: application/json

{
  "hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

**Respuesta - Válido (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Certificado válido",
  "data": {
    "id": 1,
    "estudiante": "María González",
    "curso": "Curso de Node.js Avanzado",
    "hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "estado": "válido",
    "mensaje": "Certificado verificado correctamente",
    ...
  },
  "timestamp": "2024-01-15T10:55:00.000Z"
}
```

**Respuesta - No válido (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Verificación completada",
  "data": {
    "estado": "no válido",
    "mensaje": "El certificado no fue encontrado o no es válido"
  },
  "timestamp": "2024-01-15T11:00:00.000Z"
}
```

---

#### Descargar Certificado como PDF (Protegido)

```http
GET /api/certificados/descargar/:id
Authorization: Bearer <token>
```

Descarga un PDF del certificado especificado.

---

## 💡 Ejemplos de Uso

### Con cURL

**1. Registrarse**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Carlos López",
    "email": "carlos@example.com",
    "password": "Prueba123"
  }'
```

**2. Login**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "carlos@example.com",
    "password": "Prueba123"
  }'
```

**3. Emitir Certificado**

```bash
curl -X POST http://localhost:3000/api/certificados/emitir \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu_token>" \
  -d '{
    "estudiante": "Carlos López",
    "curso": "Desarrollo Web Moderno"
  }'
```

**4. Verificar Certificado**

```bash
curl -X POST http://localhost:3000/api/certificados/verificar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu_token>" \
  -d '{
    "hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
  }'
```

### Con Postman

1. Crear una colección "CertiValidate"
2. Crear variables:
   - `baseUrl`: http://localhost:3000
   - `token`: (se llena después de hacer login)

3. En el script "Tests" del login:

```javascript
var jsonData = pm.response.json()
pm.environment.set('token', jsonData.data.token)
```

---

## ✨ Mejoras Realizadas

### 🔐 Seguridad

- ✅ Variables de entorno para secrets
- ✅ JWT con expiración configurable
- ✅ Validación de tokens mejorada (Bearer)
- ✅ Manejo de errores de token específico

### 📋 Validación

- ✅ Validación de entrada con express-validator
- ✅ Validación de email y contraseña fuerte
- ✅ Mensajes de error claros y consistentes

### 🎯 Estructura

- ✅ Respuestas consistentes en todo el API
- ✅ Códigos HTTP apropiados
- ✅ Timestamps en todas las respuestas
- ✅ Manejo global de errores

### 📊 Logging y Monitoreo

- ✅ Morgan para logging de peticiones
- ✅ Console logs para debugging
- ✅ Endpoint `/health` para verificación

### 🔧 Funcionalidad

- ✅ Nuevo endpint GET /api/auth/perfil
- ✅ Nuevo endpoint GET /api/certificados/listar
- ✅ Nuevo endpoint GET /api/certificados/:id
- ✅ PDFs mejorados con mejor formato
- ✅ CORS configurado

### 📖 Documentación

- ✅ README completo con ejemplos
- ✅ Comentarios en código
- ✅ Estructura clara del proyecto

---

## 🔜 Próximas Mejoras (Cuando la BD esté lista)

- [ ] Integración con MongoDB/PostgreSQL
- [ ] Validación de email (envío y confirmación)
- [ ] Recuperación de contraseña
- [ ] Refresh tokens
- [ ] Roles y permisos (admin, docente, estudiante)
- [ ] Rate limiting
- [ ] Tests unitarios e integración
- [ ] Swagger/OpenAPI docs

---

## 📞 Soporte

Para reportar problemas o sugerencias, contacta al equipo de desarrollo.

---

**Versión:** 1.0.0  
**Última actualización:** 2024  
**Estado:** Fase de desarrollo
