import { GoogleGenerativeAI } from '@google/generative-ai';

console.log("Starting test...");

const apiKey = process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error("VITE_GEMINI_API_KEY is missing from environment variables.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function testParse() {
  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    generationConfig: { responseMimeType: 'application/json' }
  });

  const today = new Date().toISOString().split('T')[0];
  const text = 'Students 21CS001, 21CS002  attended placement drive on may 5 periods 3 and 4 .Students 21CS001, 21CS002  Sports on may 6 periods 3 and 6 .21CS002 attended placement drive on may 6';

  const prompt = `You are an attendance management assistant for a college.
Extract attendance details from the given text and return a JSON ARRAY of objects, where each object represents a distinct group of students or activity. Each object must have EXACTLY these fields:
[{"students":["reg_no_1","reg_no_2"],"date":"YYYY-MM-DD","periods":[1,2],"category":"category name"}]

Rules:
- students: array of registration numbers (e.g. 21CS001). If none found, return [].
- date: ISO date string. If only month/day given, use current year (${new Date().getFullYear()}). If no date, return "${today}".
- periods: array of integers between 1 and 7. If not specified, return [].
- category: string like "Placement", "Medical", "OD", "Sports", etc. If unclear, return "Other".

Text to analyze:
"${text}"`;

  try {
    const result = await model.generateContent(prompt);
    let raw = result.response.text();
    
    // Sometimes models wrap json in markdown
    if (raw.startsWith('\`\`\`json')) {
      raw = raw.replace(/\`\`\`json\\n/g, '').replace(/\\n\`\`\`/g, '')
    } else if (raw.startsWith('\`\`\`')) {
      raw = raw.replace(/\`\`\`\\n/g, '').replace(/\\n\`\`\`/g, '')
    }

    console.log("Raw JSON response:");
    console.log(raw);
    
    const parsed = JSON.parse(raw);
    console.log("Parsed successful:", parsed);
  } catch (err) {
    console.error("Error occurred:", err);
  }
}

testParse();
