import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY

if (!apiKey) {
  console.warn('Gemini API key not configured. AI features will be disabled.')
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

/**
 * Parse natural-language attendance text into structured JSON.
 * Returns an array of objects: [{ students: string[], date: string, periods: number[], category: string }]
 */
export async function parseAttendanceText(text) {
  if (!genAI) throw new Error('Gemini API key is not configured.')

  const today = new Date().toISOString().split('T')[0]

  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    generationConfig: {
      responseMimeType: 'application/json',
    }
  })

  const prompt = `You are an attendance management assistant for a college.
Extract attendance details from the given text and return a JSON ARRAY of objects, where each object represents a distinct group of students or activity. Each object must have EXACTLY these fields:
[{"students":["reg_no_1","reg_no_2"],"date":"YYYY-MM-DD","periods":[1,2],"category":"category name"}]

Rules:
- students: array of registration numbers (e.g. 21CS001). If none found, return [].
- date: ISO date string. If only month/day given, use current year (${new Date().getFullYear()}). If no date, return "${today}".
- periods: array of integers between 1 and 7. If not specified, return [].
- category: string like "Placement", "Medical", "OD", "Sports", etc. If unclear, return "Other".

Text to analyze:
"${text}"`

  const result = await model.generateContent(prompt)
  let raw = result.response.text()
  
  // Sometimes models wrap json in markdown
  if (raw.startsWith('\`\`\`json')) {
    raw = raw.replace(/\`\`\`json\\n/g, '').replace(/\\n\`\`\`/g, '')
  } else if (raw.startsWith('\`\`\`')) {
    raw = raw.replace(/\`\`\`\\n/g, '').replace(/\\n\`\`\`/g, '')
  }

  const parsed = JSON.parse(raw)
  const parsedArray = Array.isArray(parsed) ? parsed : [parsed]

  return parsedArray.map(item => ({
    students: Array.isArray(item.students) ? item.students.map(s => String(s).trim()) : [],
    date: typeof item.date === 'string' ? item.date : today,
    periods: Array.isArray(item.periods)
      ? item.periods.map(Number).filter(n => n >= 1 && n <= 7)
      : [],
    category: typeof item.category === 'string' ? item.category : 'Other',
  }))
}

/**
 * Validate parsed attendance data against known students and existing records.
 * Returns an array of warning strings.
 */
export function validateAttendanceData(parsedArray, knownRegNos, existingRecords = []) {
  const warnings = []

  if (!Array.isArray(parsedArray) || parsedArray.length === 0) {
    warnings.push('No attendance events were detected.')
    return warnings
  }

  for (const parsedData of parsedArray) {
    if (!parsedData.students || parsedData.students.length === 0) {
      warnings.push(`An event has no students detected (${parsedData.category || 'unknown category'}).`)
    }

    const unknownStudents = parsedData.students?.filter(r => !knownRegNos.includes(r)) || []
    if (unknownStudents.length > 0) {
      warnings.push(`Unknown registration numbers: ${unknownStudents.join(', ')}`)
    }

    if (!parsedData.periods || parsedData.periods.length === 0) {
      warnings.push(`No periods were detected for ${parsedData.category || 'an event'}. Please select periods manually.`)
    }

    for (const student of parsedData.students || []) {
      for (const period of parsedData.periods ?? []) {
        const dup = existingRecords.find(
          r => r.reg_no === student && r.date === parsedData.date && r.period === period,
        )
        if (dup) {
          warnings.push(`Duplicate: ${student} already has attendance on ${parsedData.date} period ${period}.`)
        }
      }
    }
  }

  return [...new Set(warnings)]
}
