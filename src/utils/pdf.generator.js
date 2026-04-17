const PDFDocument = require('pdfkit')

const sanitizeFilename = (value) =>
  String(value || 'certificado')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')

const generarPDF = (certificado, res) => {
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    })

    const estudianteNombre =
      `${certificado.estudiante?.nombre || ''} ${certificado.estudiante?.apellido || ''}`.trim()
    const plantillaNombre =
      certificado.plantilla?.nombre || 'Plantilla no disponible'
    const institucionNombre =
      certificado.institucion?.nombre || 'Institución no disponible'
    const fecha = certificado.fecha_emision
      ? new Date(certificado.fecha_emision)
      : new Date()
    const fechaFormato = fecha.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const hashTruncado = certificado.hash_sha256
      ? `${certificado.hash_sha256.substring(0, 16)}...`
      : 'N/A'
    const codigoUnico = certificado.codigo_unico || 'N/A'
    const publicVerifyUrl =
      process.env.PUBLIC_VERIFY_URL || 'http://localhost:3000/verificar'

    const filename = `certificado_${sanitizeFilename(certificado.id)}_${sanitizeFilename(estudianteNombre)}.pdf`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    doc.pipe(res)

    doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .fillColor('#1f2937')
      .text('CERTIFICADO DE LOGRO', { align: 'center' })

    doc.moveDown(0.5)
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#4b5563')
      .text(`Emitido por ${institucionNombre}`, { align: 'center' })

    doc.moveDown(1)
    doc.fontSize(12).font('Helvetica').text('Se certifica que:', {
      align: 'left',
    })

    doc.moveDown(0.5)
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(estudianteNombre, { align: 'center' })

    doc.moveDown(1)
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#374151')
      .text('Ha completado satisfactoriamente el programa:', { align: 'left' })

    doc.moveDown(0.5)
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(plantillaNombre, { align: 'center' })

    doc.moveDown(1.5)
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#374151')
      .text(`Fecha de emisión: ${fechaFormato}`, { align: 'left' })

    doc.moveDown(0.5)
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#374151')
      .text(`Código único: ${codigoUnico}`, { align: 'left' })

    doc.moveDown(0.5)
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#374151')
      .text(`Hash SHA256: ${hashTruncado}`, { align: 'left' })

    doc.moveDown(2)
    doc
      .fontSize(10)
      .font('Helvetica-Oblique')
      .fillColor('#6b7280')
      .text(
        'Verifica este certificado en el sistema CertiValidate proporcionando el código único o el hash SHA256 completo.',
        {
          align: 'center',
          width: 480,
        },
      )

    doc.moveDown(1)
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text(`Para validación oficial, visita: ${publicVerifyUrl}`, {
        align: 'center',
        width: 480,
      })

    doc.moveDown(2)
    doc
      .fillColor('#9ca3af')
      .fontSize(8)
      .text('CertiValidate © 2026 - Todos los derechos reservados', {
        align: 'center',
      })

    doc.end()
  } catch (error) {
    console.error('Error generando PDF:', error)
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Error al generar el PDF',
    })
  }
}

module.exports = generarPDF
