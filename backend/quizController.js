import 'dotenv/config';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './leaderboardController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── OpenRouter Client ───────────────────────────
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:5173", // Optional, for OpenRouter rankings
    "X-Title": "AI Study Arena",
  }
});

const topicRequestCounts = {};

// ─────────────────────────────────────────────────
//  AI Quiz Generator (via OpenRouter)
// ─────────────────────────────────────────────────
async function generateWithAI(topic, chatContext) {
  const systemPrompt = `You are an expert quiz master. Generate exactly 5 multiple-choice quiz questions about the given topic.
Return ONLY a valid JSON object in this exact format:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A"
    }
  ]
}
Rules:
- Each question must have exactly 4 options.
- correctAnswer must be the EXACT string from the options array.
- If the topic is inappropriate, generate General Knowledge questions instead.`;

  const userPrompt = `Topic: "${topic}"${chatContext ? `\n\nContext from student discussion:\n${chatContext}` : ''}`;

  const response = await openai.chat.completions.create({
    model: 'openai/gpt-4o-mini', // High reliability on OpenRouter
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7
  });

  const raw = response.choices[0].message.content;
  const parsed = JSON.parse(raw);

  if (parsed.questions && Array.isArray(parsed.questions)) {
    return parsed.questions;
  }
  throw new Error('AI returned unexpected JSON structure');
}

// ─────────────────────────────────────────────────
//  Main quiz generation route
// ─────────────────────────────────────────────────
export const generateQuiz = async (req, res) => {
  try {
    const { topic, chatHistory } = req.body;

    let chatContext = '';
    if (chatHistory && chatHistory.length > 0) {
      chatContext = chatHistory
        .filter(m => !m.isSystem)
        .map(m => `${m.sender}: ${m.message}`)
        .join('\n');
    }

    const topicKey = topic.toLowerCase();
    topicRequestCounts[topicKey] = (topicRequestCounts[topicKey] || 0) + 1;
    const forceApiRefresh = (topicRequestCounts[topicKey] % 3 === 0);

    // ── Try Database Cache First ────────────────
    if (supabase && !forceApiRefresh) {
      try {
        console.log(`[Quiz] Searching database cache for topic: "${topic}"`);
        const { data, error } = await supabase
          .from('quiz_questions')
          .select('question, options, correctAnswer')
          .ilike('topic', topic);

        if (!error && data && data.length >= 5) {
          const cachedQuestions = data.sort(() => 0.5 - Math.random()).slice(0, 5);
          console.log(`[Quiz] Database returned ${cachedQuestions.length} cached questions ✓`);
          return res.json(cachedQuestions);
        }
      } catch (dbErr) {
        console.error('[Quiz] Database cache lookup failed:', dbErr.message);
      }
    }

    // ── Generate via OpenRouter ─────────────────
    console.log(`[Quiz] Generating via OpenRouter for topic: "${topic}"`);
    const questions = await generateWithAI(topic, chatContext);
    
    // ── Cache to Database Asynchronously ────────
    if (supabase && questions && questions.length > 0) {
      const insertData = questions.map(q => ({
        topic: topic.toLowerCase(),
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer
      }));
      supabase.from('quiz_questions').insert(insertData).then(({ error }) => {
        if (!error) console.log('[Quiz] Saved newly generated questions to cache.');
      });
    }

    return res.json(questions);

  } catch (error) {
    console.warn('[Quiz] AI Generation failed, using fallback:', error.message);
    res.json(getFallbackQuiz(req.body?.topic));
  }
};

// ─────────────────────────────────────────────────
//  Fallback Question Bank
// ─────────────────────────────────────────────────
const FALLBACK_BANK = {
  'physics': [
    { question: "What is Newton's Second Law of Motion?", options: ['F = ma', 'E = mc²', 'F = mv', 'P = mv'], correctAnswer: 'F = ma' },
    { question: 'What is the SI unit of electric current?', options: ['Volt', 'Ohm', 'Ampere', 'Watt'], correctAnswer: 'Ampere' },
    { question: 'Which type of wave does not require a medium to travel?', options: ['Sound wave', 'Water wave', 'Electromagnetic wave', 'Seismic wave'], correctAnswer: 'Electromagnetic wave' },
    { question: 'What is the speed of light in a vacuum?', options: ['3 × 10⁸ m/s', '3 × 10⁶ m/s', '3 × 10¹⁰ m/s', '3 × 10⁴ m/s'], correctAnswer: '3 × 10⁸ m/s' },
    { question: "What does the first law of thermodynamics state?", options: ['Energy cannot be created or destroyed', 'Entropy always increases', 'Heat flows from hot to cold', 'Work equals force times distance'], correctAnswer: 'Energy cannot be created or destroyed' },
  ],
  'chemistry': [
    { question: 'What is the atomic number of Carbon?', options: ['6', '8', '12', '14'], correctAnswer: '6' },
    { question: 'What type of bond is formed by sharing electrons?', options: ['Ionic bond', 'Covalent bond', 'Metallic bond', 'Hydrogen bond'], correctAnswer: 'Covalent bond' },
    { question: 'What is the pH of a neutral solution at 25°C?', options: ['0', '7', '14', '3'], correctAnswer: '7' },
    { question: 'Which gas is produced when acid reacts with a metal?', options: ['Oxygen', 'Carbon dioxide', 'Hydrogen', 'Nitrogen'], correctAnswer: 'Hydrogen' },
    { question: 'What is Avogadro\'s number approximately?', options: ['6.022 × 10²³', '3.14 × 10²³', '9.81 × 10²³', '1.67 × 10²³'], correctAnswer: '6.022 × 10²³' },
  ],
  'mathematics': [
    { question: 'What is the derivative of sin(x)?', options: ['cos(x)', '-cos(x)', 'tan(x)', '-sin(x)'], correctAnswer: 'cos(x)' },
    { question: 'What is the sum of interior angles of a triangle?', options: ['90°', '180°', '270°', '360°'], correctAnswer: '180°' },
    { question: 'What is the value of π (pi) approximately?', options: ['3.14159', '2.71828', '1.61803', '1.41421'], correctAnswer: '3.14159' },
    { question: 'What does the Pythagorean theorem state?', options: ['a² + b² = c²', 'a + b = c', 'a² - b² = c²', '2a + 2b = c'], correctAnswer: 'a² + b² = c²' },
    { question: 'What is the integral of 1/x?', options: ['ln|x| + C', 'x + C', 'e^x + C', '1/x² + C'], correctAnswer: 'ln|x| + C' },
  ],
  'biology': [
    { question: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi apparatus'], correctAnswer: 'Mitochondria' },
    { question: 'What process do plants use to make food?', options: ['Respiration', 'Fermentation', 'Photosynthesis', 'Transpiration'], correctAnswer: 'Photosynthesis' },
    { question: 'What is the basic unit of heredity?', options: ['Cell', 'Gene', 'Chromosome', 'Protein'], correctAnswer: 'Gene' },
    { question: 'Which blood type is the universal donor?', options: ['A+', 'B-', 'O-', 'AB+'], correctAnswer: 'O-' },
    { question: 'What is the process by which cells divide?', options: ['Mitosis', 'Meiosis', 'Both A and B', 'Osmosis'], correctAnswer: 'Both A and B' },
  ],
  'computer science': [
    { question: 'What does OOP stand for?', options: ['Object-Oriented Programming', 'Open Office Protocol', 'Output Operation Process', 'Object-Ordered Processing'], correctAnswer: 'Object-Oriented Programming' },
    { question: 'Which data structure uses FIFO ordering?', options: ['Stack', 'Queue', 'Tree', 'Graph'], correctAnswer: 'Queue' },
    { question: 'What is the time complexity of bubble sort (worst case)?', options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'], correctAnswer: 'O(n²)' },
    { question: 'What does SQL stand for?', options: ['Structured Query Language', 'Simple Question Logic', 'System Query List', 'Sequential Queue Language'], correctAnswer: 'Structured Query Language' },
    { question: 'In binary, what is 1010?', options: ['8', '10', '12', '14'], correctAnswer: '10' },
  ],
  'history': [
    { question: 'In which year did World War II end?', options: ['1943', '1944', '1945', '1946'], correctAnswer: '1945' },
    { question: 'Who was the first President of the United States?', options: ['Abraham Lincoln', 'Thomas Jefferson', 'George Washington', 'John Adams'], correctAnswer: 'George Washington' },
    { question: 'Which empire was the largest by land area in history?', options: ['Roman Empire', 'British Empire', 'Mongol Empire', 'Ottoman Empire'], correctAnswer: 'Mongol Empire' },
    { question: 'In which year did the French Revolution begin?', options: ['1776', '1789', '1799', '1804'], correctAnswer: '1789' },
    { question: 'Who wrote the Communist Manifesto?', options: ['Lenin and Stalin', 'Marx and Engels', 'Rousseau and Voltaire', 'Darwin and Huxley'], correctAnswer: 'Marx and Engels' },
  ],
  'geography': [
    { question: 'What is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], correctAnswer: 'Nile' },
    { question: 'Which is the smallest continent by area?', options: ['Antarctica', 'Europe', 'Australia', 'South America'], correctAnswer: 'Australia' },
    { question: 'What is the capital of Japan?', options: ['Osaka', 'Beijing', 'Tokyo', 'Seoul'], correctAnswer: 'Tokyo' },
    { question: 'Which ocean is the largest?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correctAnswer: 'Pacific' },
    { question: 'Mount Everest is part of which mountain range?', options: ['Andes', 'Alps', 'Himalayas', 'Rockies'], correctAnswer: 'Himalayas' },
  ],
  'engineering': [
    { question: 'What is Ohm\'s Law?', options: ['V = IR', 'P = IV', 'V = I/R', 'E = mc²'], correctAnswer: 'V = IR' },
    { question: 'What is the unit of capacitance?', options: ['Farad', 'Henry', 'Ohm', 'Volt'], correctAnswer: 'Farad' },
    { question: 'Which component resists the flow of electric current?', options: ['Resistor', 'Capacitor', 'Inductor', 'Diode'], correctAnswer: 'Resistor' },
    { question: 'What does AC stand for in electrical terms?', options: ['Alternating Current', 'Active Circuit', 'Amperage Control', 'Apple Core'], correctAnswer: 'Alternating Current' },
    { question: 'A transformer works on the principle of:', options: ['Mutual induction', 'Self induction', 'Electrostatic force', 'Kinetic energy'], correctAnswer: 'Mutual induction' },
  ],
};

function getFallbackQuiz(topic = '') {
  const lower = (topic || '').toLowerCase();
  for (const [key, questions] of Object.entries(FALLBACK_BANK)) {
    if (lower.includes(key)) return questions;
  }
  return [
    { question: `In the study of ${topic}, what is considered the most fundamental concept?`, options: ['The primary theory', 'Basic observation', 'Advanced data', 'Applied practice'], correctAnswer: 'The primary theory' },
    { question: `Which of these tools is most likely used in ${topic}?`, options: ['Analytical thinking', 'A hammer', 'A calculator', 'All of the above'], correctAnswer: 'Analytical thinking' },
    { question: `Which century saw the biggest advancements in ${topic}?`, options: ['18th Century', '19th Century', '20th Century', '21st Century'], correctAnswer: '20th Century' },
    { question: `True or False: ${topic} is considered a branch of modern science?`, options: ['True', 'False', 'Partially', 'Unknown'], correctAnswer: 'True' },
    { question: `Which of these is a key terminology in ${topic}?`, options: ['Systematic Review', 'Random Trial', 'Basic Framework', 'Core Analysis'], correctAnswer: 'Core Analysis' },
  ];
}

// ─────────────────────────────────────────────────
//  Topic suggestion route
// ─────────────────────────────────────────────────
export const suggestTopics = async (req, res) => {
  const { query } = req.body;
  try {
    if (!query || query.trim().length < 2) return res.json([]);
    
    // Ensure we find the subjects.json even if the process is running from a different folder
    const subjectsPath = path.resolve(__dirname, 'subjects.json');
    
    let subjects = [];
    if (fs.existsSync(subjectsPath)) {
      subjects = JSON.parse(fs.readFileSync(subjectsPath, 'utf8'));
    } else {
      // Fallback list if file is missing
      subjects = ['Computer Science', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Engineering', 'History', 'Geography', 'Psychology', 'Medicine'];
    }

    const filtered = subjects
      .filter(t => t.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
      
    console.log(`[Quiz] Suggested ${filtered.length} topics for query: "${query}"`);
    res.json(filtered);
  } catch (error) {
    console.error('[Quiz] Suggestion failed:', error.message);
    res.json(['Computer Science', 'Physics', 'Biology', 'History', 'Mathematics']);
  }
};
