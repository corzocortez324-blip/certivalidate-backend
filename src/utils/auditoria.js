const logger = require('./logger')

const registrarAuditoria = async (
  prisma,
  usuario_id,
  accion,
  entidad,
  entidad_id,
  valores_antes,
  valores_despues,
  ip,
) => {
  if (!usuario_id) {
    logger.warn('registrarAuditoria: usuario_id vacío, auditoría omitida')
    return
  }

  try {
    await prisma.auditoria.create({
      data: {
        usuario_id,
        accion,
        entidad,
        entidad_id,
        valores_antes: valores_antes || null,
        valores_despues: valores_despues || null,
        ip: ip || null,
      },
    })
  } catch (error) {
    logger.error({ err: error }, 'Error registrando auditoría')
    // No detener el flujo principal por un fallo en auditoría
  }
}

module.exports = {
  registrarAuditoria,
}
