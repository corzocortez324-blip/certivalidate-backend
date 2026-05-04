const PDFDocument = require('pdfkit')
const QRCode = require('qrcode')
const logger = require('./logger')

const sanitizeFilename = (value) =>
  String(value || 'certificado')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')

const prepararDatos = async (certificado) => {
  const estudianteNombre =
    `${certificado.estudiante?.nombre || ''} ${certificado.estudiante?.apellido || ''}`.trim()
  const plantillaNombre   = certificado.plantilla?.nombre  || 'Plantilla no disponible'
  const institucionNombre = certificado.institucion?.nombre || 'Institución no disponible'

  const fecha = certificado.fecha_emision ? new Date(certificado.fecha_emision) : new Date()
  const fechaFormato = fecha.toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const hashTruncado  = certificado.hash_sha256
    ? `${certificado.hash_sha256.substring(0, 16)}...` : 'N/A'
  const codigoUnico   = certificado.codigo_unico || 'N/A'
  const frontendUrl   = process.env.FRONTEND_URL || 'http://localhost:5173'
  const qrUrl         = `${frontendUrl}/?codigo=${codigoUnico}`

  const qrBuffer = await QRCode.toBuffer(qrUrl, {
    width: 140, margin: 1,
    color: { dark: '#111827', light: '#ffffff' },
  })

  return { estudianteNombre, plantillaNombre, institucionNombre, fechaFormato, hashTruncado, codigoUnico, qrUrl, qrBuffer }
}

const escribirContenido = (doc, datos) => {
  const { estudianteNombre, plantillaNombre, institucionNombre, fechaFormato, hashTruncado, codigoUnico, qrUrl, qrBuffer } = datos

  // ── Título ──────────────────────────────────────────────────────
  doc.fontSize(28).font('Helvetica-Bold').fillColor('#1f2937')
     .text('CERTIFICADO DE LOGRO', { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(12).font('Helvetica').fillColor('#4b5563')
     .text(`Emitido por ${institucionNombre}`, { align: 'center' })

  doc.moveDown(1)
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke()
  doc.moveDown(1)

  // ── Cuerpo ──────────────────────────────────────────────────────
  doc.fontSize(12).font('Helvetica').fillColor('#374151').text('Se certifica que:')
  doc.moveDown(0.5)
  doc.fontSize(24).font('Helvetica-Bold').fillColor('#111827')
     .text(estudianteNombre, { align: 'center' })

  doc.moveDown(1)
  doc.fontSize(12).font('Helvetica').fillColor('#374151')
     .text('Ha completado satisfactoriamente el programa:')
  doc.moveDown(0.5)
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#111827')
     .text(plantillaNombre, { align: 'center' })

  doc.moveDown(1.5)
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke()
  doc.moveDown(1)

  // ── Datos de emisión ────────────────────────────────────────────
  doc.fontSize(11).font('Helvetica').fillColor('#374151')
     .text(`Fecha de emisión: ${fechaFormato}`)
  doc.moveDown(0.4)
  doc.text(`Código único: ${codigoUnico}`)
  doc.moveDown(0.4)
  doc.text(`Hash SHA-256: ${hashTruncado}`)

  // ── QR Code ─────────────────────────────────────────────────────
  doc.moveDown(1.5)
  const qrSize = 130
  const qrX = (595 - qrSize) / 2
  doc.image(qrBuffer, qrX, doc.y, { width: qrSize, height: qrSize })
  doc.y += qrSize + 10

  doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
     .text('Escanea este código para verificar la autenticidad del certificado', { align: 'center' })
  doc.moveDown(0.4)
  doc.fontSize(8).fillColor('#9ca3af').text(qrUrl, { align: 'center' })

  // ── Footer ──────────────────────────────────────────────────────
  doc.moveDown(2)
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke()
  doc.moveDown(0.75)
  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#9ca3af')
     .text('CertiValidate © 2026 — Todos los derechos reservados', { align: 'center' })
}

// Devuelve Buffer — para adjuntar en emails
const generarPDFBuffer = async (certificado) => {
  const datos = await prepararDatos(certificado)

  return new Promise((resolve, reject) => {
    const chunks = []
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    doc.on('data',  (chunk) => chunks.push(chunk))
    doc.on('end',   ()      => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    escribirContenido(doc, datos)
    doc.end()
  })
}

// Streama directo a la respuesta HTTP — para descarga
const generarPDF = async (certificado, res) => {
  try {
    const datos = await prepararDatos(certificado)
    const filename = `certificado_${sanitizeFilename(certificado.id)}_${sanitizeFilename(datos.estudianteNombre)}.pdf`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    doc.pipe(res)
    escribirContenido(doc, datos)
    doc.end()
  } catch (error) {
    logger.error({ err: error }, 'Error generando PDF')
    if (!res.headersSent) {
      res.status(500).json({ success: false, statusCode: 500, message: 'Error al generar el PDF' })
    }
  }
}

module.exports = { generarPDF, generarPDFBuffer }
