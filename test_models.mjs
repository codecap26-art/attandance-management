import { GoogleGenerativeAI } from '@google/generative-ai';
const apiKey = process.env.VITE_GEMINI_API_KEY;
console.log("API Key preview:", apiKey.substring(0, 5) + "...");
// fetch natively
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
  .then(res => res.json())
  .then(data => {
    if (data.models) {
      console.log('Available models:');
      data.models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
    } else {
      console.log(data);
    }
  });
