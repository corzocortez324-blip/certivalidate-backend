# CertiValidate Backend

API REST para emisión y verificación de certificados digitales con hash SHA-256.

---

## Tabla de Contenidos

- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Docker](#docker)
- [Configuración](#configuración)
- [Arquitectura de conexión](#arquitectura-de-conexión)
- [Documentación interactiva](#documentación-interactiva)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Seguridad](#seguridad)
- [Endpoints](#endpoints)
- [Formato de respuestas](#formato-de-respuestas)
- [Ejemplos de uso](#ejemplos-de-uso)

---

## Requisitos

- Node.js v18 o superior
- npm v9 o superior
- PostgreSQL — se recomienda Supabase

---

## Instalación

**1. Clonar el repositorio**

```bash
git clone https://github.com/corzocortez324-blip/certivalidate-backend.git
cd certivalidate-backend
```

**2. Instalar dependencias**

```bash
npm install
```

> `postinstall` ejecuta `prisma generate` automáticamente. Si lo omitiste, corre `npx prisma generate` manualmente.

**3. Configurar variables de entorno**

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales reales. Consulta la tabla de variables más abajo.

**4. Aplicar migraciones**

```bash
npm run migrate
```

> Para desarrollo con migraciones interactivas usa `npm run migrate:dev`.  
> Si tu red bloquea el puerto 5432 (DIRECT_URL), ejecuta las migraciones desde el SQL Editor de Supabase o desde datos móviles.

**5. Generar cliente Prisma** *(solo si no corrió con npm install)*

```bash
npx prisma generate
```

**6. Poblar datos iniciales**

```bash
npm run seed
```

Crea los roles (admin, editor, lector) y los 18 permisos del sistema. Debe ejecutarse al menos una vez antes de crear usuarios.

**7. Iniciar el servidor**

```bash
npm run dev   # desarrollo (nodemon + pino-pretty)
npm start     # producción (logs JSON estructurados)
```

---

## Docker

Para levantar el backend con su propia base de datos PostgreSQL sin instalar nada localmente:

**1. Crear el archivo de entorno**

```bash
cp .env.example .env
```

Edita `.env` y configura al menos `JWT_SECRET` y `JWT_REFRESH_SECRET`. Las variables `DATABASE_URL` y `DIRECT_URL` las sobreescribe Docker Compose automáticamente.

**2. Levantar los servicios**

```bash
docker compose up --build
```

Esto inicia:
- `db` — PostgreSQL 16 en `localhost:5432`
- `api` — servidor Node.js en `localhost:3000` (espera a que la BD esté lista)

**3. Aplicar migraciones y seed** *(primera vez)*

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api node prisma/seed.js
```

**4. Detener**

```bash
docker compose down          # conserva los datos
docker compose down -v       # elimina también el volumen de datos
```

> La imagen de producción no incluye devDependencies, tests ni archivos `.env`. El build usa caché de capas: si solo cambias `src/`, la capa de `npm ci` no se reconstruye.

---

## Configuración

El servidor no arranca si faltan `DATABASE_URL`, `JWT_SECRET` o `JWT_REFRESH_SECRET`.

| Variable | Ejemplo | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto del servidor (opcional, default 3000) |
| `NODE_ENV` | `production` | Entorno: development o production |
| `DATABASE_URL` | `postgresql://...@pooler:6543/postgres` | URL del connection pooler de Supabase (puerto 6543) |
| `DIRECT_URL` | `postgresql://...@db:5432/postgres` | URL directa para migraciones (puerto 5432) |
| `JWT_SECRET` | cadena larga aleatoria | Secreto para firmar access tokens |
| `JWT_REFRESH_SECRET` | cadena larga aleatoria diferente | Secreto para firmar refresh tokens |
| `JWT_EXPIRES_IN` | `1h` | Duración del access token (opcional, default 1h) |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Duración del refresh token (opcional, default 7d) |
| `FRONTEND_URL` | `http://localhost:5173` | Origen permitido por CORS |

Para generar secretos seguros:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Arquitectura de conexión

El proyecto usa Prisma 7, que requiere configuración explícita de la capa de conexión.

- **`src/utils/prisma.js`** — instancia única del cliente Prisma usando `@prisma/adapter-pg` con pool de conexiones. Todas las operaciones de la app pasan por aquí.
- **`prisma.config.ts`** — usado exclusivamente por la CLI de Prisma (`migrate`, `db push`, `generate`). Apunta a `DIRECT_URL` para operaciones que requieren conexión directa sin pooler.
- **`DATABASE_URL` puerto 6543** — usado por la app en tiempo de ejecución a través del connection pooler de Supabase.
- **`DIRECT_URL` puerto 5432** — usado por las migraciones. Si tu red bloquea este puerto, ejecuta las migraciones desde datos móviles o desde el SQL Editor de Supabase.

---

## Documentación interactiva

La API incluye una especificación OpenAPI 3.0.3 completa. Con el servidor corriendo, abre:

```
http://localhost:3000/api/docs
```

Swagger UI muestra todos los endpoints, esquemas de request/response, códigos de error y permite probar llamadas directamente desde el navegador.

El archivo fuente está en [src/docs/openapi.yaml](src/docs/openapi.yaml).

---

## Estructura del proyecto

```
src/
  index.js                    Entrada principal: carga env, arranca servidor, signal handlers
  app.js                      Configuración Express: middlewares, rutas, error handler
  controllers/
    auth.controller.js        Registro, login, logout, perfil, tokens
    certificado.controller.js Emisión, verificación, revocación, descarga PDF
    estudiante.controller.js  CRUD de estudiantes por institución
    institucion.controller.js CRUD de instituciones y estadísticas
    plantilla.controller.js   Gestión de plantillas de certificado
    auditoria.controller.js   Consulta del log de auditoría
  routes/                     Define las rutas y aplica middlewares por endpoint
  middlewares/
    auth.middleware.js        Verifica JWT y que el usuario esté activo en DB
    requestId.middleware.js   Propaga o genera X-Request-ID por solicitud
  utils/
    env.js                    Validación de variables de entorno al arranque
    logger.js                 Instancia pino con pino-pretty en desarrollo
    token.service.js          Lógica de refresh tokens (crear, rotar, revocar)
    authorization.js          RBAC: requirePermission() y consulta de permisos
    auditoria.js              Registro de operaciones en tabla Auditoria
    validators.js             Validadores de entrada con express-validator
    response.utils.js         Formato estándar de respuestas JSON
    pdf.generator.js          Generación de PDF con pdfkit
    roles.js                  Utilidad para obtener roles por nombre
    prisma.js                 Instancia única del cliente Prisma
  docs/
    openapi.yaml              Especificación OpenAPI 3.0.3 completa
prisma/
  schema.prisma               Definición de modelos
  seed.js                     Carga inicial de roles y permisos
  migrations/                 Historial de migraciones SQL
prisma.config.ts              Configuración de CLI de Prisma
tests/
  auth.test.js                Tests de registro, login, refresh, logout, perfil
  authorization.test.js       Tests de aislamiento cross-institución
  certificado.public.test.js  Tests de verificación pública sin auth
  helpers/db.js               Helpers para crear y limpiar datos de test
  setup-env.js                Carga .env y fija NODE_ENV=test
```

---

## Seguridad

### Autenticación

El sistema usa JWT con dos tokens:

- **Access token** — vida corta (1h por defecto). Se envía en el header `Authorization: Bearer <token>`.
- **Refresh token** — vida larga (7d por defecto). Se guarda hasheado en la base de datos.
- **Rotación de refresh tokens** — cada vez que se usa un refresh token se revoca y se emite uno nuevo. Detecta el reuso de tokens robados.
- **Revocación en cambio de contraseña** — al cambiar la contraseña se invalidan todos los refresh tokens activos del usuario.

### Control de acceso por roles (RBAC)

Cada usuario tiene un rol por institución. Los permisos se verifican en cada endpoint con `requirePermission(recurso, accion)`.

| Rol | Permisos |
|---|---|
| `admin` | Todos los permisos del sistema (18) |
| `editor` | Emitir, listar, ver y descargar certificados. CRUD de estudiantes y plantillas |
| `lector` | Listar y ver certificados, estudiantes, instituciones y plantillas |

### Otras medidas

- **Helmet** — headers HTTP de seguridad en todas las respuestas
- **Rate limiting** — 100 req/15min generales, 10 en autenticación, 50 en verificación pública
- **Validación de entrada** — todos los endpoints validan con `express-validator`
- **Variables obligatorias** — el servidor no arranca si faltan los secrets
- **Auditoría** — cada operación crítica queda registrada con usuario, IP y timestamp

---

## Endpoints

### Autenticación — `/api/auth`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | Público | Registro de nuevo usuario |
| POST | `/api/auth/login` | Público | Login — retorna access y refresh token |
| POST | `/api/auth/refresh` | Público | Renueva access token usando refresh token |
| POST | `/api/auth/logout` | JWT | Revoca el refresh token activo |
| GET | `/api/auth/perfil` | JWT | Obtiene datos del usuario autenticado |
| PUT | `/api/auth/perfil` | JWT | Actualiza nombre, apellido o email |
| PUT | `/api/auth/perfil/password` | JWT | Cambia la contraseña e invalida todas las sesiones |

### Certificados — `/api/certificados`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/certificados/verificar` | Público | Verifica un certificado por hash o código único |
| POST | `/api/certificados/emitir` | JWT + emitir | Genera un certificado con hash SHA-256 |
| GET | `/api/certificados/listar` | JWT + listar | Lista certificados con paginación y filtros |
| GET | `/api/certificados/:id` | JWT + ver | Detalle de un certificado |
| GET | `/api/certificados/descargar/:id` | JWT + descargar | Descarga el certificado en PDF |
| GET | `/api/certificados/:id/verificaciones` | JWT + ver | Historial de verificaciones públicas |
| GET | `/api/certificados/:id/revocaciones` | JWT + ver | Historial de revocaciones |
| POST | `/api/certificados/:id/revocar` | JWT + revocar | Revoca un certificado con motivo |

### Estudiantes — `/api/estudiantes`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/estudiantes` | JWT + listar | Lista estudiantes con paginación y búsqueda |
| GET | `/api/estudiantes/:id` | JWT + ver | Detalle de un estudiante |
| POST | `/api/estudiantes` | JWT + crear | Registra un nuevo estudiante |
| PUT | `/api/estudiantes/:id` | JWT + actualizar | Actualiza datos del estudiante |
| DELETE | `/api/estudiantes/:id` | JWT + eliminar | Elimina un estudiante sin certificados |

### Instituciones — `/api/instituciones`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/instituciones` | JWT + ver | Lista instituciones del usuario |
| GET | `/api/instituciones/:id` | JWT + ver | Detalle de una institución |
| GET | `/api/instituciones/:id/estadisticas` | JWT + estadisticas | Conteos de estudiantes, certificados y verificaciones |
| POST | `/api/instituciones` | JWT | Crea institución y vincula al creador como admin |
| PUT | `/api/instituciones/:id` | JWT + actualizar | Actualiza datos de la institución |
| PATCH | `/api/instituciones/:id/desactivar` | JWT + actualizar | Desactiva una institución |

### Plantillas — `/api/plantillas`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/plantillas` | JWT + listar | Lista plantillas disponibles |
| GET | `/api/plantillas/:id` | JWT + ver | Detalle de una plantilla |
| POST | `/api/plantillas` | JWT + crear | Crea una nueva plantilla HTML |
| PUT | `/api/plantillas/:id` | JWT + actualizar | Actualiza una plantilla existente |

### Auditoría — `/api/auditoria`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/auditoria` | JWT + ver auditoría | Lista el log de operaciones con filtros |
| GET | `/api/auditoria/:id` | JWT + ver auditoría | Detalle de un registro |

### Sistema

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/health` | Público | Estado del servidor, DB, uptime y versión |
| GET | `/api/docs` | Público | Documentación interactiva Swagger UI |

---

## Formato de respuestas

Todos los endpoints retornan el mismo formato JSON.

**Respuesta exitosa**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {},
  "timestamp": "2026-04-17T00:00:00.000Z"
}
```

**Respuesta de error**

```json
{
  "success": false,
  "statusCode": 403,
  "message": "No autorizado para emitir certificado",
  "timestamp": "2026-04-17T00:00:00.000Z"
}
```

**Error de validación**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Errores de validación",
  "errors": [
    { "field": "email", "message": "Debe ser un email válido" }
  ],
  "timestamp": "2026-04-17T00:00:00.000Z"
}
```

---

## Ejemplos de uso

**Registro y login**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Juan","apellido":"Perez","email":"juan@ejemplo.com","password":"Segura123"}'

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"juan@ejemplo.com","password":"Segura123"}'
```

**Verificación pública de certificado**

```bash
curl -X POST http://localhost:3000/api/certificados/verificar \
  -H "Content-Type: application/json" \
  -d '{"codigo":"A1B2C3D4E5F6G7H8"}'
```

**Emitir un certificado**

```bash
curl -X POST http://localhost:3000/api/certificados/emitir \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "estudiante_id": "uuid-del-estudiante",
    "institucion_id": "uuid-de-la-institucion",
    "plantilla_id": "uuid-de-la-plantilla"
  }'
```

**Logout**

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_token>"}'
```

