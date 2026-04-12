const { sendSuccess, sendError } = require('../utils/response.utils')
const prisma = require('../utils/prisma')

// Listar plantillas activas
const listarPlantillas = async (req, res) => {
  try {
    const plantillas = await prisma.plantillaCertificado.findMany({
      where: { activa: true },
      orderBy: { created_at: 'desc' },
    })

    return sendSuccess(
      res,
      plantillas,
      'Plantillas obtenidas correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en listarPlantillas:', error)
    return sendError(res, 'Error al listar plantillas', 500)
  }
}

// Obtener plantilla por ID
const obtenerPlantilla = async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return sendError(res, 'ID de la plantilla es obligatorio', 400)
    }

    const plantilla = await prisma.plantillaCertificado.findUnique({
      where: { id },
    })

    if (!plantilla) {
      return sendError(res, 'Plantilla no encontrada', 404)
    }

    return sendSuccess(res, plantilla, 'Plantilla obtenida correctamente', 200)
  } catch (error) {
    console.error('Error en obtenerPlantilla:', error)
    return sendError(res, 'Error al obtener plantilla', 500)
  }
}

// Crear plantilla
const crearPlantilla = async (req, res) => {
  try {
    const { institucion_id, nombre, template_html, version, activa } = req.body

    if (!institucion_id || !nombre || !template_html || version === undefined) {
      return sendError(
        res,
        'institucion_id, nombre, template_html y version son obligatorios',
        400,
      )
    }

    const institucion = await prisma.institucion.findUnique({
      where: { id: institucion_id },
    })

    if (!institucion) {
      return sendError(res, 'Institución no encontrada', 404)
    }

    const nuevaPlantilla = await prisma.plantillaCertificado.create({
      data: {
        institucion_id,
        nombre,
        template_html,
        version,
        activa: typeof activa === 'boolean' ? activa : true,
      },
    })

    return sendSuccess(
      res,
      nuevaPlantilla,
      'Plantilla creada correctamente',
      201,
    )
  } catch (error) {
    console.error('Error en crearPlantilla:', error)
    return sendError(res, 'Error al crear plantilla', 500)
  }
}

// Actualizar plantilla
const actualizarPlantilla = async (req, res) => {
  try {
    const { id } = req.params
    const { institucion_id, nombre, template_html, version, activa } = req.body

    if (!id) {
      return sendError(res, 'ID de la plantilla es obligatorio', 400)
    }

    const plantillaExistente = await prisma.plantillaCertificado.findUnique({
      where: { id },
    })

    if (!plantillaExistente) {
      return sendError(res, 'Plantilla no encontrada', 404)
    }

    if (institucion_id) {
      const institucion = await prisma.institucion.findUnique({
        where: { id: institucion_id },
      })

      if (!institucion) {
        return sendError(res, 'Institución no encontrada', 404)
      }
    }

    const plantillaActualizada = await prisma.plantillaCertificado.update({
      where: { id },
      data: {
        institucion_id: institucion_id || plantillaExistente.institucion_id,
        nombre: nombre || plantillaExistente.nombre,
        template_html: template_html || plantillaExistente.template_html,
        version: version !== undefined ? version : plantillaExistente.version,
        activa:
          typeof activa === 'boolean' ? activa : plantillaExistente.activa,
      },
    })

    return sendSuccess(
      res,
      plantillaActualizada,
      'Plantilla actualizada correctamente',
      200,
    )
  } catch (error) {
    console.error('Error en actualizarPlantilla:', error)
    return sendError(res, 'Error al actualizar plantilla', 500)
  }
}

module.exports = {
  listarPlantillas,
  obtenerPlantilla,
  crearPlantilla,
  actualizarPlantilla,
}
