const bcrypt = require('bcrypt')
const prisma = require('../../src/utils/prisma')

// Prefijo único para todo dato creado en tests — facilita el cleanup
const TEST_PREFIX = '__test__'

const createTestUser = async (emailSuffix, password = 'TestPass123') => {
  const hash = await bcrypt.hash(password, 10)
  return prisma.usuario.create({
    data: {
      nombre: 'Test',
      apellido: 'User',
      email: `${TEST_PREFIX}${emailSuffix}@certivalidate.test`,
      password_hash: hash,
      email_verificado: true,
    },
  })
}

const createTestInstitucion = async (suffix) => {
  return prisma.institucion.create({
    data: { nombre: `${TEST_PREFIX}Institucion ${suffix}` },
  })
}

const linkUserToInstitucion = async (usuarioId, institucionId, rolNombre = 'admin') => {
  const rol = await prisma.rol.findUnique({ where: { nombre: rolNombre } })
  if (!rol) throw new Error(`Rol '${rolNombre}' no encontrado. Ejecuta: npm run seed`)
  return prisma.usuarioInstitucion.create({
    data: { usuario_id: usuarioId, institucion_id: institucionId, rol_id: rol.id },
  })
}

const createTestEstudiante = async (institucionId, suffix) => {
  return prisma.estudiante.create({
    data: {
      institucion_id: institucionId,
      nombre: 'Estudiante',
      apellido: `Test ${suffix}`,
      documento: `TEST${suffix}`,
    },
  })
}

const createTestPlantilla = async (institucionId, suffix) => {
  return prisma.plantillaCertificado.create({
    data: {
      institucion_id: institucionId,
      nombre: `${TEST_PREFIX}Plantilla ${suffix}`,
      template_html: '<p>Test template</p>',
      version: 1,
      activa: true,
    },
  })
}

/**
 * Elimina todos los datos de test en orden correcto (respetando FKs).
 * Busca por prefijo TEST_PREFIX en usuarios e instituciones.
 */
const cleanupTestData = async () => {
  const testUsers = await prisma.usuario.findMany({
    where: { email: { startsWith: TEST_PREFIX } },
    select: { id: true },
  })
  const testUserIds = testUsers.map((u) => u.id)

  const testInstituciones = await prisma.institucion.findMany({
    where: { nombre: { startsWith: TEST_PREFIX } },
    select: { id: true },
  })
  const testInstIds = testInstituciones.map((i) => i.id)

  if (testInstIds.length > 0) {
    const certs = await prisma.certificado.findMany({
      where: { institucion_id: { in: testInstIds } },
      select: { id: true },
    })
    const certIds = certs.map((c) => c.id)

    if (certIds.length > 0) {
      await prisma.verificacionPublica.deleteMany({ where: { certificado_id: { in: certIds } } })
      await prisma.revocacion.deleteMany({ where: { certificado_id: { in: certIds } } })
      await prisma.certificado.deleteMany({ where: { id: { in: certIds } } })
    }

    await prisma.estudiante.deleteMany({ where: { institucion_id: { in: testInstIds } } })
    await prisma.plantillaCertificado.deleteMany({ where: { institucion_id: { in: testInstIds } } })
  }

  if (testUserIds.length > 0) {
    await prisma.auditoria.deleteMany({ where: { usuario_id: { in: testUserIds } } })
    await prisma.refreshToken.deleteMany({ where: { usuario_id: { in: testUserIds } } })
    await prisma.usuarioInstitucion.deleteMany({ where: { usuario_id: { in: testUserIds } } })
  }

  if (testInstIds.length > 0) {
    await prisma.institucion.deleteMany({ where: { id: { in: testInstIds } } })
  }

  if (testUserIds.length > 0) {
    await prisma.usuario.deleteMany({ where: { id: { in: testUserIds } } })
  }
}

module.exports = {
  TEST_PREFIX,
  createTestUser,
  createTestInstitucion,
  linkUserToInstitucion,
  createTestEstudiante,
  createTestPlantilla,
  cleanupTestData,
}
