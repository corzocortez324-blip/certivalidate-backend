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
    console.error('Error registrando auditoría:', error)
    // No detener el flujo principal por un fallo en auditoría
  }
}

module.exports = {
  registrarAuditoria,
}
