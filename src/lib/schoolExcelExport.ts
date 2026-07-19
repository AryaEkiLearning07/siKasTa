import ExcelJS from 'exceljs'
import { existsSync } from 'fs'
import path from 'path'
import { formatDateOnly } from '@/lib/academic'

type SchoolAssignment = {
  class: {
    name: string
    tingkat?: string
    tahunAjaran: string
    members: { name: string }[]
  }
  subject: { name: string }
}

type ExportStudent = {
  id: string
  name: string
  nisn: string | null
  gender: 'L' | 'P' | null
}

type AttendanceExportData = {
  assignment: SchoolAssignment
  teacherName: string
  students: ExportStudent[]
  sessions: {
    id: string
    date: Date
    meetingNumber: number
    records: { studentId: string; status: 'H' | 'I' | 'S' | 'A' }[]
  }[]
}

type GradeExportData = {
  assignment: SchoolAssignment
  teacherName: string
  semester?: string
  students: ExportStudent[]
  assessments: {
    id: string
    title: string
    type: string
    semester: string
    records: { studentId: string; score: unknown }[]
  }[]
}

type BorderStyle = ExcelJS.BorderStyle
type Worksheet = ExcelJS.Worksheet

const SCHOOL_NAME = 'SMPN 1 DLANGGU'
const SCHOOL_ADDRESS = 'Jl. Raya Jetis No. 20 Dlanggu, Mojokerto'
const SCHOOL_EMAIL = 'Email: smpn1dlanggu@gmail.com'
const FONT_FAMILY = 'Times New Roman'

const thinBorder = { style: 'thin' as BorderStyle, color: { argb: 'FF000000' } }
const mediumBorder = { style: 'medium' as BorderStyle, color: { argb: 'FF000000' } }
const dottedBorder = { style: 'dotted' as BorderStyle, color: { argb: 'FF000000' } }

export async function createAttendanceExportBuffer(data: AttendanceExportData) {
  const sessionColumnCount = Math.max(data.sessions.length, 20)
  const totalColumns = sessionColumnCount + 5
  const workbook = createWorkbook()
  const worksheet = workbook.addWorksheet('Daftar Hadir')

  setupWorksheet(worksheet, totalColumns)
  setupAttendanceColumns(worksheet, sessionColumnCount)
  addSchoolHeader(workbook, worksheet, totalColumns)
  const tableStartRow = addAttendanceDocumentInfo(worksheet, {
    totalColumns,
    assignment: data.assignment,
    teacherName: data.assignment.class.members[0]?.name || '-',
  })

  const sessionLabels = buildAttendanceLabels(data.sessions, sessionColumnCount)
  const lastDataRow = addAttendanceTable(worksheet, tableStartRow, data.students, data.sessions, sessionLabels)
  const lastRow = addFooter(worksheet, lastDataRow + 2, totalColumns, data.students, data.teacherName)

  finalizeWorksheet(worksheet, totalColumns, lastRow, tableStartRow)
  return workbookToBuffer(workbook)
}

export async function createGradeExportBuffer(data: GradeExportData) {
  const assessmentColumnCount = Math.max(data.assessments.length, 12)
  const totalColumns = assessmentColumnCount + 6
  const workbook = createWorkbook()
  const worksheet = workbook.addWorksheet('Daftar Nilai')

  setupWorksheet(worksheet, totalColumns)
  setupGradeColumns(worksheet, assessmentColumnCount)
  addSchoolHeader(workbook, worksheet, totalColumns)
  const tableStartRow = addDocumentInfo(worksheet, {
    totalColumns,
    title: 'DAFTAR NILAI',
    assignment: data.assignment,
    teacherName: data.assignment.class.members[0]?.name || '-',
    semester: data.semester || 'Semua',
  })

  const assessmentLabels = buildAssessmentLabels(data.assessments, assessmentColumnCount)
  const lastDataRow = addGradeTable(
    worksheet,
    tableStartRow,
    data.students,
    data.assessments,
    assessmentLabels
  )
  const legendRow = addAssessmentLegend(worksheet, lastDataRow + 2, totalColumns, data.assessments)
  const lastRow = addFooter(worksheet, legendRow + 1, totalColumns, data.students, data.teacherName)

  finalizeWorksheet(worksheet, totalColumns, lastRow, tableStartRow)
  return workbookToBuffer(workbook)
}

export function slugifyExportName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'laporan'
}

function createWorkbook() {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'siKasta'
  workbook.created = new Date()
  workbook.modified = new Date()
  workbook.properties.date1904 = false
  return workbook
}

function setupWorksheet(worksheet: Worksheet, totalColumns: number) {
  worksheet.properties.defaultRowHeight = 15
  worksheet.views = [{ state: 'frozen', ySplit: 11 }]
  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.35,
      bottom: 0.35,
      header: 0.15,
      footer: 0.15,
    },
    printTitlesRow: '1:11',
  }
  worksheet.headerFooter.oddFooter = '&C&P / &N'
  worksheet.getColumn(totalColumns).alignment = { vertical: 'middle' }
}

function setupAttendanceColumns(worksheet: Worksheet, sessionColumnCount: number) {
  worksheet.columns = [
    { key: 'number', width: 4 },
    { key: 'nisn', width: 15 },
    { key: 'name', width: 34 },
    { key: 'gender', width: 4 },
    ...Array.from({ length: sessionColumnCount }, (_, index) => ({
      key: `session${index + 1}`,
      width: 4,
    })),
    { key: 'note', width: 12 },
  ]
  worksheet.getColumn(2).numFmt = '@'
}

function setupGradeColumns(worksheet: Worksheet, assessmentColumnCount: number) {
  worksheet.columns = [
    { key: 'number', width: 4 },
    { key: 'nisn', width: 15 },
    { key: 'name', width: 34 },
    { key: 'gender', width: 4 },
    ...Array.from({ length: assessmentColumnCount }, (_, index) => ({
      key: `assessment${index + 1}`,
      width: 4.5,
    })),
    { key: 'average', width: 8 },
    { key: 'note', width: 12 },
  ]
  worksheet.getColumn(2).numFmt = '@'
}

function addSchoolHeader(workbook: ExcelJS.Workbook, worksheet: Worksheet, totalColumns: number) {
  const textStartColumn = 3
  const textEndColumn = Math.max(textStartColumn, totalColumns - 2)
  const headerRows = [
    { row: 1, value: 'PEMERINTAH KABUPATEN MOJOKERTO', size: 9 },
    { row: 2, value: 'DINAS PENDIDIKAN', size: 10 },
    { row: 3, value: SCHOOL_NAME, size: 12 },
    { row: 4, value: SCHOOL_ADDRESS, size: 7 },
    { row: 5, value: SCHOOL_EMAIL, size: 7 },
  ]

  worksheet.getRow(1).height = 11
  worksheet.getRow(2).height = 12
  worksheet.getRow(3).height = 16
  worksheet.getRow(4).height = 10
  worksheet.getRow(5).height = 10

  headerRows.forEach((header) => {
    worksheet.mergeCells(header.row, textStartColumn, header.row, textEndColumn)
    const cell = worksheet.getCell(header.row, textStartColumn)
    cell.value = header.value
    cell.font = {
      name: FONT_FAMILY,
      size: header.size,
      bold: true,
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  for (let column = 1; column <= totalColumns; column += 1) {
    worksheet.getCell(6, column).border = {
      top: mediumBorder,
      bottom: mediumBorder,
    }
  }
  worksheet.getRow(6).height = 4

  addLogo(workbook, worksheet, 'logo-kab-mojokerto.jpg', 'jpeg', 0.25, 0.2)
  addLogo(workbook, worksheet, 'logo-spensagu.png', 'png', totalColumns - 1.8, 0.2)
}

function addLogo(
  workbook: ExcelJS.Workbook,
  worksheet: Worksheet,
  fileName: string,
  extension: 'png' | 'jpeg',
  column: number,
  row: number
) {
  const filePath = path.join(process.cwd(), 'public', fileName)
  if (!existsSync(filePath)) return

  const imageId = workbook.addImage({
    filename: filePath,
    extension,
  })
  worksheet.addImage(imageId, {
    tl: { col: column, row },
    ext: { width: 54, height: 54 },
  })
}

function addDocumentInfo(
  worksheet: Worksheet,
  options: {
    totalColumns: number
    title: string
    assignment: SchoolAssignment
    teacherName: string
    semester: string
  }
) {
  const { assignment, totalColumns } = options
  worksheet.mergeCells(7, 1, 7, totalColumns)
  const titleCell = worksheet.getCell(7, 1)
  titleCell.value = options.title
  titleCell.font = { name: FONT_FAMILY, size: 12, bold: true, underline: true }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.getRow(7).height = 18

  const rightLabelColumn = Math.max(6, Math.floor(totalColumns * 0.58))
  const rightValueColumn = rightLabelColumn + 2
  const rightEndColumn = totalColumns

  setInfoPair(worksheet, 8, 1, 'WALAS', options.teacherName)
  setInfoPair(worksheet, 9, 1, 'KELAS', assignment.class.name)
  setInfoPair(worksheet, 8, rightLabelColumn, 'MAPEL', assignment.subject.name, rightValueColumn, rightEndColumn)
  setInfoPair(
    worksheet,
    9,
    rightLabelColumn,
    'TAHUN PELAJARAN',
    assignment.class.tahunAjaran,
    rightValueColumn,
    rightEndColumn
  )
  setInfoPair(worksheet, 10, rightLabelColumn, 'SEMESTER', options.semester, rightValueColumn, rightEndColumn)

  for (let row = 8; row <= 10; row += 1) {
    worksheet.getRow(row).height = 15
    for (let column = 1; column <= totalColumns; column += 1) {
      const cell = worksheet.getCell(row, column)
      cell.font = { name: FONT_FAMILY, size: 8, bold: true }
      cell.alignment = { vertical: 'middle' }
    }
  }

  return 12
}

function addAttendanceDocumentInfo(
  worksheet: Worksheet,
  options: {
    totalColumns: number
    assignment: SchoolAssignment
    teacherName: string
  }
) {
  const { assignment, totalColumns } = options
  const classLevel = assignment.class.tingkat || assignment.class.name.replace(/[A-Z]+$/i, '')
  const rightLabelColumn = Math.max(7, Math.floor(totalColumns * 0.58))
  const rightValueColumn = rightLabelColumn + 2
  const rightEndColumn = totalColumns

  worksheet.mergeCells(7, 1, 7, totalColumns)
  const titleCell = worksheet.getCell(7, 1)
  titleCell.value = `DATA SISWA KELAS ${classLevel} T.P. ${assignment.class.tahunAjaran}`
  titleCell.font = { name: FONT_FAMILY, size: 11, bold: true }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.getRow(7).height = 16

  worksheet.getCell(8, 1).value = `KELAS ${assignment.class.name}`
  worksheet.getCell(8, 1).font = { name: FONT_FAMILY, size: 10, bold: true }

  setInfoPair(worksheet, 8, rightLabelColumn, 'WALAS', options.teacherName, rightValueColumn, rightEndColumn)
  setInfoPair(worksheet, 9, rightLabelColumn, 'MAPEL', assignment.subject.name, rightValueColumn, rightEndColumn)

  for (let row = 8; row <= 10; row += 1) {
    worksheet.getRow(row).height = 14
    for (let column = 1; column <= totalColumns; column += 1) {
      const cell = worksheet.getCell(row, column)
      cell.font = cell.font || { name: FONT_FAMILY, size: 8, bold: true }
      cell.alignment = { vertical: 'middle' }
    }
  }

  return 12
}

function setInfoPair(
  worksheet: Worksheet,
  row: number,
  labelColumn: number,
  label: string,
  value: string,
  valueColumn = 3,
  valueEndColumn = 5
) {
  worksheet.getCell(row, labelColumn).value = `${label} :`
  if (valueColumn < valueEndColumn) {
    worksheet.mergeCells(row, valueColumn, row, valueEndColumn)
  }
  worksheet.getCell(row, valueColumn).value = value
}

function addAttendanceTable(
  worksheet: Worksheet,
  tableStartRow: number,
  students: ExportStudent[],
  sessions: AttendanceExportData['sessions'],
  sessionLabels: string[]
) {
  const headerRow = tableStartRow
  const subHeaderRow = tableStartRow + 1
  const firstSessionColumn = 5
  const lastSessionColumn = firstSessionColumn + sessionLabels.length - 1
  const noteColumn = lastSessionColumn + 1

  mergeVerticalHeaders(worksheet, headerRow, subHeaderRow, [1, 2, 3, 4, noteColumn])
  worksheet.getCell(headerRow, 1).value = 'NO'
  worksheet.getCell(headerRow, 2).value = 'NISN'
  worksheet.getCell(headerRow, 3).value = 'NAMA SISWA'
  worksheet.getCell(headerRow, 4).value = 'L/P'
  worksheet.mergeCells(headerRow, firstSessionColumn, headerRow, lastSessionColumn)
  worksheet.getCell(headerRow, firstSessionColumn).value = 'ABSENSI'
  worksheet.getCell(headerRow, noteColumn).value = 'KET'
  sessionLabels.forEach((label, index) => {
    worksheet.getCell(subHeaderRow, firstSessionColumn + index).value = label
  })

  styleTableHeader(worksheet, headerRow, subHeaderRow, noteColumn)
  styleAttendanceDateHeader(worksheet, subHeaderRow, firstSessionColumn, lastSessionColumn)

  const recordsBySessionId = new Map(sessions.map((session) => [
    session.id,
    new Map(session.records.map((record) => [record.studentId, record.status])),
  ]))

  students.forEach((student, index) => {
    const rowNumber = subHeaderRow + index + 1
    const row = worksheet.getRow(rowNumber)
    row.height = 18
    row.getCell(1).value = index + 1
    row.getCell(2).value = student.nisn || ''
    row.getCell(3).value = student.name
    row.getCell(4).value = student.gender || ''
    sessionLabels.forEach((_, sessionIndex) => {
      const session = sessions[sessionIndex]
      row.getCell(firstSessionColumn + sessionIndex).value = session
        ? recordsBySessionId.get(session.id)?.get(student.id) || ''
        : ''
    })
    row.getCell(noteColumn).value = ''
    styleDataRow(row, noteColumn)
  })

  return subHeaderRow + students.length
}

function styleAttendanceDateHeader(
  worksheet: Worksheet,
  subHeaderRow: number,
  firstSessionColumn: number,
  lastSessionColumn: number
) {
  worksheet.getRow(subHeaderRow).height = 32
  for (let column = firstSessionColumn; column <= lastSessionColumn; column += 1) {
    const cell = worksheet.getCell(subHeaderRow, column)
    cell.font = { name: FONT_FAMILY, size: 6, bold: true }
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      textRotation: 90,
      wrapText: true,
    }
  }
}

function addGradeTable(
  worksheet: Worksheet,
  tableStartRow: number,
  students: ExportStudent[],
  assessments: GradeExportData['assessments'],
  assessmentLabels: string[]
) {
  const headerRow = tableStartRow
  const subHeaderRow = tableStartRow + 1
  const firstAssessmentColumn = 5
  const lastAssessmentColumn = firstAssessmentColumn + assessmentLabels.length - 1
  const averageColumn = lastAssessmentColumn + 1
  const noteColumn = averageColumn + 1

  mergeVerticalHeaders(worksheet, headerRow, subHeaderRow, [1, 2, 3, 4, averageColumn, noteColumn])
  worksheet.getCell(headerRow, 1).value = 'NO'
  worksheet.getCell(headerRow, 2).value = 'NISN'
  worksheet.getCell(headerRow, 3).value = 'NAMA SISWA'
  worksheet.getCell(headerRow, 4).value = 'L/P'
  worksheet.mergeCells(headerRow, firstAssessmentColumn, headerRow, lastAssessmentColumn)
  worksheet.getCell(headerRow, firstAssessmentColumn).value = 'ASESMEN'
  worksheet.getCell(headerRow, averageColumn).value = 'RATA-RATA'
  worksheet.getCell(headerRow, noteColumn).value = 'KET'
  assessmentLabels.forEach((label, index) => {
    worksheet.getCell(subHeaderRow, firstAssessmentColumn + index).value = label
  })

  styleTableHeader(worksheet, headerRow, subHeaderRow, noteColumn)

  const recordsByAssessmentId = new Map(assessments.map((assessment) => [
    assessment.id,
    new Map(assessment.records.map((record) => [
      record.studentId,
      record.score == null ? null : Number(record.score),
    ])),
  ]))

  students.forEach((student, index) => {
    const scores = assessments.map((assessment) => recordsByAssessmentId.get(assessment.id)?.get(student.id))
    const filledScores = scores.filter((score): score is number => (
      typeof score === 'number' && Number.isFinite(score)
    ))
    const average = filledScores.length
      ? Math.round((filledScores.reduce((total, score) => total + score, 0) / filledScores.length) * 100) / 100
      : ''
    const rowNumber = subHeaderRow + index + 1
    const row = worksheet.getRow(rowNumber)
    row.height = 18
    row.getCell(1).value = index + 1
    row.getCell(2).value = student.nisn || ''
    row.getCell(3).value = student.name
    row.getCell(4).value = student.gender || ''
    assessmentLabels.forEach((_, assessmentIndex) => {
      row.getCell(firstAssessmentColumn + assessmentIndex).value = scores[assessmentIndex] ?? ''
    })
    row.getCell(averageColumn).value = average
    row.getCell(noteColumn).value = ''
    styleDataRow(row, noteColumn)
  })

  return subHeaderRow + students.length
}

function buildAttendanceLabels(sessions: AttendanceExportData['sessions'], columnCount: number) {
  return Array.from({ length: columnCount }, (_, index) => {
    const session = sessions[index]
    if (!session) return ''

    const date = formatDateOnly(session.date)
    const dayMonth = `${date.slice(8, 10)}/${date.slice(5, 7)}`
    return session.meetingNumber > 1 ? `${dayMonth}-${session.meetingNumber}` : dayMonth
  })
}

function buildAssessmentLabels(assessments: GradeExportData['assessments'], columnCount: number) {
  return Array.from({ length: columnCount }, (_, index) => {
    if (!assessments[index]) return ''
    return String(index + 1)
  })
}

function mergeVerticalHeaders(worksheet: Worksheet, headerRow: number, subHeaderRow: number, columns: number[]) {
  columns.forEach((column) => {
    worksheet.mergeCells(headerRow, column, subHeaderRow, column)
  })
}

function styleTableHeader(worksheet: Worksheet, headerRow: number, subHeaderRow: number, lastColumn: number) {
  for (let row = headerRow; row <= subHeaderRow; row += 1) {
    worksheet.getRow(row).height = row === headerRow ? 17 : 22
    for (let column = 1; column <= lastColumn; column += 1) {
      const cell = worksheet.getCell(row, column)
      cell.font = { name: FONT_FAMILY, size: 7, bold: true }
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      }
      cell.border = {
        top: mediumBorder,
        right: thinBorder,
        bottom: mediumBorder,
        left: thinBorder,
      }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' },
      }
    }
  }
}

function styleDataRow(row: ExcelJS.Row, lastColumn: number) {
  for (let column = 1; column <= lastColumn; column += 1) {
    const cell = row.getCell(column)
    const isNameColumn = column === 3
    cell.font = { name: FONT_FAMILY, size: isNameColumn ? getNameFontSize(cell.value) : 7 }
    cell.alignment = {
      horizontal: isNameColumn ? 'left' : 'center',
      vertical: 'middle',
      wrapText: false,
      shrinkToFit: isNameColumn,
    }
    cell.border = {
      top: dottedBorder,
      right: thinBorder,
      bottom: dottedBorder,
      left: thinBorder,
    }
  }
}

function getNameFontSize(value: ExcelJS.CellValue) {
  const length = String(value || '').trim().length
  if (length > 42) return 5
  if (length > 32) return 6
  return 7
}

function addAssessmentLegend(
  worksheet: Worksheet,
  startRow: number,
  totalColumns: number,
  assessments: GradeExportData['assessments']
) {
  if (assessments.length === 0) return startRow

  worksheet.mergeCells(startRow, 1, startRow, totalColumns)
  const titleCell = worksheet.getCell(startRow, 1)
  titleCell.value = `Keterangan Asesmen: ${assessments.map((assessment, index) => (
    `${index + 1}=${assessment.type} ${assessment.title}`
  )).join('; ')}`
  titleCell.font = { name: FONT_FAMILY, size: 7 }
  titleCell.alignment = { vertical: 'middle', wrapText: true }
  worksheet.getRow(startRow).height = 24
  return startRow
}

function addFooter(
  worksheet: Worksheet,
  startRow: number,
  totalColumns: number,
  students: ExportStudent[],
  teacherName: string
) {
  const maleCount = students.filter((student) => student.gender === 'L').length
  const femaleCount = students.filter((student) => student.gender === 'P').length
  const signatureColumn = Math.max(7, totalColumns - 5)
  const signatureEndColumn = totalColumns

  setFooterCell(worksheet, startRow, 1, 'Jumlah')
  setFooterCell(worksheet, startRow, 3, 'Laki-laki')
  setFooterCell(worksheet, startRow, 5, maleCount)
  setFooterCell(worksheet, startRow + 1, 3, 'Perempuan')
  setFooterCell(worksheet, startRow + 1, 5, femaleCount)
  setFooterCell(worksheet, startRow + 2, 5, maleCount + femaleCount)

  worksheet.mergeCells(startRow, signatureColumn, startRow, signatureEndColumn)
  worksheet.mergeCells(startRow + 1, signatureColumn, startRow + 1, signatureEndColumn)
  worksheet.mergeCells(startRow + 5, signatureColumn, startRow + 5, signatureEndColumn)
  worksheet.mergeCells(startRow + 6, signatureColumn, startRow + 6, signatureEndColumn)

  worksheet.getCell(startRow, signatureColumn).value = `Dlanggu, ${formatIndonesianDate(new Date())}`
  worksheet.getCell(startRow + 1, signatureColumn).value = 'Guru Mata Pelajaran'
  worksheet.getCell(startRow + 5, signatureColumn).value = teacherName
  worksheet.getCell(startRow + 6, signatureColumn).value = 'NIP'

  for (let row = startRow; row <= startRow + 6; row += 1) {
    for (let column = 1; column <= totalColumns; column += 1) {
      const cell = worksheet.getCell(row, column)
      cell.font = { name: FONT_FAMILY, size: 7 }
      cell.alignment = { vertical: 'middle' }
    }
    for (let column = signatureColumn; column <= signatureEndColumn; column += 1) {
      worksheet.getCell(row, column).alignment = { horizontal: 'center', vertical: 'middle' }
    }
  }

  return startRow + 6
}

function setFooterCell(worksheet: Worksheet, row: number, column: number, value: string | number) {
  const cell = worksheet.getCell(row, column)
  cell.value = value
  cell.border = {
    bottom: thinBorder,
  }
}

function finalizeWorksheet(
  worksheet: Worksheet,
  totalColumns: number,
  lastRow: number,
  tableStartRow: number
) {
  const lastColumnLetter = worksheet.getColumn(totalColumns).letter
  worksheet.pageSetup.printArea = `A1:${lastColumnLetter}${lastRow}`
  worksheet.autoFilter = {
    from: { row: tableStartRow + 1, column: 1 },
    to: { row: tableStartRow + 1, column: totalColumns },
  }

  for (let row = 1; row <= lastRow; row += 1) {
    for (let column = 1; column <= totalColumns; column += 1) {
      const cell = worksheet.getCell(row, column)
      if (!cell.font) cell.font = { name: FONT_FAMILY, size: 8 }
    }
  }
}

function formatIndonesianDate(date: Date) {
  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ]

  return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`
}

async function workbookToBuffer(workbook: ExcelJS.Workbook) {
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
