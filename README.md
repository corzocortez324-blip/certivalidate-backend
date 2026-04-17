# CertiValidate Backend

Sistema backend para validar y emitir certificados digitales con hash único para verificación.

## 📋 Tabla de Contenidos

- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Arquitectura de Base de Datos (Prisma 7)](#arquitectura-de-base-de-datos)
- [Endpoints API](#endpoints-api)
- [Ejemplos de Uso](#ejemplos-de-uso)

## 📦 Requisitos

- Node.js v14 o superior
- npm v6 o superior
- PostgreSQL (Supabase recomendado)

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
*(Nota: Esto instalará, además de Express, los adaptadores `@prisma/client`, `@prisma/adapter-pg` y `pg` obligatorios para la conexión a través de Pooler).*

3. **Configurar variables de entorno**

```bash
cp .env.example .env
```
Edita `.env` con tus credenciales de Supabase (revisa la sección de Arquitectura).

4. **Inicializar Base de Datos (Migraciones)**

Para ejecutar las migraciones y aplicar el esquema localmente:

```bash
npx prisma migrate dev --name init
```

5. **Iniciar servidor**

```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## ⚙️ Configuración

Edita el archivo `.env` con tus valores reales:

```env
# Ambiente de ejecución
PORT=3000
NODE_ENV=development

# JWT Secret y expiración
JWT_SECRET=tu_secreto_super_seguro_aqui
JWT_EXPIRES_IN=1h

# URL del frontend para CORS
FRONTEND_URL=http://localhost:3000

# Base de datos Supabase / Prisma 7
# URL de conexión con transaction pooler (puerto 6543) - para el código de la app
DATABASE_URL="postgres://postgres.[ref]:[pwd]@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"

# URL de conexión directa (puerto 5432) - para migraciones de Prisma
DIRECT_URL="postgres://postgres.[ref]:[pwd]@db.[ref].supabase.co:5432/postgres"
```

## 🧠 Arquitectura de Base de Datos

Este backend corre bajo **Prisma v7**, el cual exige configuraciones explícitas debido a que ya no maneja automáticamente las conexiones nativas universales internamente.

- **Conexión en Producción (pgbouncer)**: Prisma se conecta usando el adaptador nativo `@prisma/adapter-pg` para asegurar que las peticiones se enruten de forma ultra-rápida y concurrente hacia el **Transaction Pooler** de Supabase (Puerto 6543).
- **`src/utils/prisma.js`**: Este archivo centraliza la instancia. Inicia el *Pool* de Postgres y mapea el adaptador a la configuración, en lugar de usar un simple `new PrismaClient()`.
- **`prisma.config.ts`**: Utilizado exclusivamente por la CLI (Comandos en tu terminal). Sirve para indicarle a comandos como `npx prisma migrate` que usen forzosamente el túnel directo (`DIRECT_URL` en el puerto 5432). Es vital no omitir ni borrar este archivo.

## 📁 Estructura del Proyecto

```
src/
├── index.js                          # Entrada principal del servidor
├── controllers/
│   ├── auth.controller.js           # Lógica de autenticación vinculada a BD
│   └── certificado.controller.js    # Lógica de certificados vinculada a BD
├── routes/
│   ├── auth.routes.js               # Rutas de auth
│   └── certificado.routes.js        # Rutas de certificados
├── middlewares/
│   └── auth.middleware.js           # Validación de tokens JWT
└── utils/
    ├── response.utils.js            # Formatos de respuesta estándar
    ├── validators.js                # Validación de entrada
    ├── pdf.generator.js             # Generación de PDFs
    └── prisma.js                    # Inicializador avanzado (Adapter PG)
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
  "nombre": "Juan",
  "apellido": "Pérez",
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
  "data": { ... }
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

**Respuesta exitosa (200):** Se emite un token JWT.

---

#### Obtener Perfil

```http
GET /api/auth/perfil
Authorization: Bearer <token>
```

---

### Certificados

#### Emitir Certificado (Protegido)

```http
POST /api/certificados/emitir
Authorization: Bearer <token>
Content-Type: application/json

{
  "estudiante_id": "uuid-del-estudiante",
  "institucion_id": "uuid-de-institucion",
  "plantilla_id": "uuid-de-plantilla"
}
```

**Respuesta exitosa (201):**
Genera el registro formal del certificado y retorna un hash único.

---

#### Listar Certificados (Protegido)

```http
GET /api/certificados/listar
Authorization: Bearer <token>
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

---

#### Descargar Certificado como PDF (Protegido)

```http
GET /api/certificados/descargar/:id
Authorization: Bearer <token>
```

---

## 💡 Ejemplos de Uso

### Con cURL

**Emitir Certificado**

```bash
curl -X POST http://localhost:3000/api/certificados/emitir \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu_token>" \
  -d '{
    "estudiante_id": "12345678-abcd-1234-abcd-1234567890ab",
    "institucion_id": "87654321-dcba-4321-dcba-ba0987654321",
    "plantilla_id": "11111111-2222-3333-4444-555555555555"
  }'
```

---

## ✨ Mejoras Realizadas

### 🔐 Seguridad & Datos

- ✅ Integración estructurada con PostgreSQL usando Prisma 7
- ✅ Variables de entorno para secrets y control DB de Supabase
- ✅ JWT con expiración configurable
- ✅ Validación de tokens mejorada (Bearer)

### 📋 Validación y Persistencia

- ✅ Almacén de registros persistente implementado
- ✅ Verificación estricta de validación DB (Foreign Keys)
- ✅ Validación de entrada

### 🎯 Estructura y Herramientas

- ✅ Incorporación de Prisma Client 7 utilizando `pg` pool y capa de abstracción `src/utils/prisma.js`
- ✅ Configuración avanzada CLI local en `prisma.config.ts`
- ✅ Respuestas consistentes a través de Utilities

---

## 📞 Soporte

Para reportar problemas o sugerencias, contacta al equipo de desarrollo.
