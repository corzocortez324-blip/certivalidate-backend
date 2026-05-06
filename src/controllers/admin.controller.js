const { sendSuccess, sendError } = require('../utils/response.utils')
const prisma = require('../utils/prisma')

const PERIOD_MONTHS = { '7d': 1, '30d': 3, '90d': 6, '1y': 12 }

const getStats = async (req, res) => {
  try {
    const period = req.query.period || '30d'
    const monthsBack = PERIOD_MONTHS[period] || 3

    const now = new Date()

    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - 7)

    const startOfMonth = new Date(now)
    startOfMonth.setDate(now.getDate() - 30)

    const trendStart = new Date(now)
    trendStart.setMonth(now.getMonth() - monthsBack)
    trendStart.setDate(1)
    trendStart.setHours(0, 0, 0, 0)

    const [
      totalEmitidos,
      totalRevocados,
      verifHoy,
      verifSemana,
      verifMes,
      emisionesPorMes,
      verificacionesPorMes,
      topEmisores,
      ultimasRevocaciones,
    ] = await Promise.all([
      prisma.certificado.count({ where: { deleted_at: null } }),
      prisma.certificado.count({ where: { deleted_at: null, estado: 'revocado' } }),
      prisma.verificacionPublica.count({ where: { fecha: { gte: startOfToday } } }),
      prisma.verificacionPublica.count({ where: { fecha: { gte: startOfWeek } } }),
      prisma.verificacionPublica.count({ where: { fecha: { gte: startOfMonth } } }),
      prisma.$queryRaw`
        SELECT TO_CHAR(DATE_TRUNC('month', fecha_emision), 'YYYY-MM') AS mes,
               COUNT(*)::int AS total
        FROM "Certificado"
        WHERE fecha_emision >= ${trendStart} AND deleted_at IS NULL
        GROUP BY DATE_TRUNC('month', fecha_emision)
        ORDER BY DATE_TRUNC('month', fecha_emision)
      `,
      prisma.$queryRaw`
        SELECT TO_CHAR(DATE_TRUNC('month', fecha), 'YYYY-MM') AS mes,
               COUNT(*)::int AS total
        FROM "VerificacionPublica"
        WHERE fecha >= ${trendStart}
        GROUP BY DATE_TRUNC('month', fecha)
        ORDER BY DATE_TRUNC('month', fecha)
      `,
      prisma.$queryRaw`
        SELECT u.nombre || ' ' || u.apellido AS nombre, COUNT(a.id)::int AS total
        FROM "Auditoria" a
        JOIN "Usuario" u ON a.usuario_id = u.id
        WHERE a.accion = 'EMITIR_CERTIFICADO'
        GROUP BY u.id, u.nombre, u.apellido
        ORDER BY COUNT(a.id) DESC
        LIMIT 5
      `,
      prisma.revocacion.findMany({
        take: 5,
        orderBy: { fecha_revocacion: 'desc' },
        include: {
          certificado: {
            select: {
              codigo_unico: true,
              estudiante: { select: { nombre: true, apellido: true } },
            },
          },
        },
      }),
    ])

    // Merge monthly trend filling gaps with zeros
    const mesMap = {}
    emisionesPorMes.forEach((r) => {
      mesMap[r.mes] = mesMap[r.mes] || {}
      mesMap[r.mes].emisiones = Number(r.total)
    })
    verificacionesPorMes.forEach((r) => {
      mesMap[r.mes] = mesMap[r.mes] || {}
      mesMap[r.mes].verificaciones = Number(r.total)
    })

    const tendencia = []
    for (let i = monthsBack; i >= 0; i--) {
      const d = new Date(now)
      d.setMonth(now.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      tendencia.push({
        mes: key,
        emisiones: mesMap[key]?.emisiones || 0,
        verificaciones: mesMap[key]?.verificaciones || 0,
      })
    }

    const totalValidos = totalEmitidos - totalRevocados
    const tasaValidez =
      totalEmitidos > 0
        ? Math.round((totalValidos / totalEmitidos) * 1000) / 10
        : 100

    sendSuccess(res, {
      totalEmitidos,
      totalValidos,
      totalRevocados,
      tasaValidez,
      verificacionesHoy: Number(verifHoy),
      verificacionesSemana: Number(verifSemana),
      verificacionesMes: Number(verifMes),
      tendencia,
      topEmisores: topEmisores.map((e) => ({ nombre: e.nombre, total: Number(e.total) })),
      ultimasRevocaciones: ultimasRevocaciones.map((r) => ({
        id: r.id,
        motivo_codigo: r.motivo_codigo,
        fecha_revocacion: r.fecha_revocacion,
        codigo_unico: r.certificado?.codigo_unico,
        titular: r.certificado?.estudiante
          ? `${r.certificado.estudiante.nombre} ${r.certificado.estudiante.apellido}`
          : null,
      })),
    })
  } catch (err) {
    sendError(res, err.message, 500)
  }
}

module.exports = { getStats }
