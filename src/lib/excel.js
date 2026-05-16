import * as XLSX from 'xlsx'

/**
 * Export attendance records to XLSX.
 * Only exports: Date, Reg No, Student Name, Period, Category.
 * @param {Array} records - Attendance log rows joined with student names
 * @param {string} filename - Output filename (without extension)
 */
export function exportToExcel(records, filename = 'attendance_report') {
  if (!records || records.length === 0) {
    throw new Error('No records to export.')
  }

  // Map to only the required columns
  const rows = records.map(r => ({
    'Date':          r.date,
    'Reg No':        r.reg_no,
    'Student Name':  r.student_name ?? r.students?.full_name ?? '',
    'Period':        r.period,
    'Category':      r.category,
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)

  // Column widths
  worksheet['!cols'] = [
    { wch: 14 },  // Date
    { wch: 12 },  // Reg No
    { wch: 28 },  // Student Name
    { wch: 8 },   // Period
    { wch: 20 },  // Category
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance')

  const b64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' })
  const url = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${b64}`
  
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
export async function exportToXlsx(records, filename = 'attendance_report') {
  if (!records || records.length === 0) {
    throw new Error('No records to export.')
  }

  const rows = records.map(r => ({
    'Date':          r.date,
    'Reg No':        r.reg_no,
    'Student Name':  r.student_name ?? r.students?.full_name ?? '',
    'Period':        r.period,
    'Category':      r.category,
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [
    { wch: 14 },  // Date
    { wch: 12 },  // Reg No
    { wch: 28 },  // Student Name
    { wch: 8 },   // Period
    { wch: 20 },  // Category
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance')

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${filename}.xlsx`,
        types: [{
          description: 'Excel Spreadsheet',
          accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
        }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
    } catch (err) {
      if (err.name !== 'AbortError') throw err
    }
  } else {
    // Fallback
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}
