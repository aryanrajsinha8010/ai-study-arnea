import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: 'application/json' } });

export const generateQuiz = async (req, res) => {
    try {
        const { topic, chatHistory } = req.body;
        
        // ** FALLBACK Mechanism **
        // If we have no API key, or Gemini fails during a live-demo, we instantly serve a hardcoded Quiz.
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'dummy') {
            return res.json(getFallbackQuiz(topic));
        }

        let chatContext = "";
        if (chatHistory && chatHistory.length > 0) {
            const chatText = chatHistory.filter(m => !m.isSystem).map(m => `${m.sender}: ${m.message}`).join("\n");
            if (chatText.trim().length > 0) {
                chatContext = `\nPrioritize creating questions that test the knowledge shared in the following discussion between users:\n${chatText}\n\nIf the discussion is off-topic, random, or not educational, ignore the chat and generate questions strictly about the main topic.`;
            }
        }

        const prompt = `You are an educational AI. Generate 5 multiple choice questions about the topic: "${topic}".${chatContext}
        If the topic provided is gibberish, random keyboard smash, nonsensical, or inappropriate, IGNORE the topic and generate 5 General Knowledge or Science questions instead.
        You MUST return a JSON object containing a single key "questions" which maps to an array of 5 objects.
        Each object in the array must have EXACTLY:
        "question" (string),
        "options" (array of 4 strings),
        "correctAnswer" (string, exact string from options array).`;

        const result = await model.generateContent(prompt);
        let content = result.response.text();
        
        // Clean up markdown code blocks if present
        if (content.includes('```')) {
            content = content.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1');
        }

        let parsed;
        try {
            parsed = JSON.parse(content.trim());
        } catch (e) {
            console.error("Quiz Parse Error:", e.message, "Content:", content);
            throw new Error("Invalid Quiz response format");
        }
        
        // Normalization if model returns an object with a "questions" array
        if (parsed.questions && Array.isArray(parsed.questions)) {
            parsed = parsed.questions;
        }

        res.json(parsed);

    } catch (error) {
        console.error("Gemini Generation Error:", error.message || error);
        // Seamless fallback during demo pitch
        res.json(getFallbackQuiz(req.body.topic));
    }
};

function getFallbackQuiz(topic) {
    return [
        {
            question: `What is a core concept of ${topic || 'Computer Science'}?`,
            options: ["Magic", "Algorithmic Logic", "Guesswork", "Random Probability"],
            correctAnswer: "Algorithmic Logic"
        },
        {
            question: "How long is a typical AI Study Arena demo battle?",
            options: ["10 minutes", "30 seconds", "1 hour", "5 days"],
            correctAnswer: "30 seconds"
        },
        {
            question: "Why does AI Study Arena use OpenAI?",
            options: ["To write code", "To generate context-aware personalized quizzes", "To play games", "To chat with you"],
            correctAnswer: "To generate context-aware personalized quizzes"
        },
        {
            question: "Which feature ensures demo success?",
            options: ["Seamless Fallback", "Complex Login", "Heavy Load", "Crashing"],
            correctAnswer: "Seamless Fallback"
        },
        {
            question: "What completes the active learning loop?",
            options: ["Passive Reading", "Ignoring Output", "Instant Evaluation", "Sleeping"],
            correctAnswer: "Instant Evaluation"
        }
    ];
}
export const suggestTopics = async (req, res) => {
    const { query } = req.body;
    try {
        if (!query || query.trim().length < 2) return res.json([]);

        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'dummy') {
            const defaultTopics = ["Computer Science", "React Hooks", "Machine Learning", "Mathematics"];
            return res.json(defaultTopics.filter(t => t.toLowerCase().includes(query.toLowerCase())));
        }

        const prompt = `You are a topic validator for an educational platform. The user typed: "${query}".
        If the input is gibberish, a random keyboard smash, nonsensical, or inappropriate, return a JSON object with a single key "topics" mapping to an array of 5 general popular study topics like "Science", "History", "Mathematics", "Literature", "Geography".
        Otherwise, return a JSON object with a single key "topics" mapping to an array of up to 5 valid, formal, academic or specific study topics closely related to the input.
        If the input is already a valid topic, include the beautifully capitalized version of it as the first element.`;

        const result = await model.generateContent(prompt);
        let content = result.response.text();
        
        // Clean up markdown code blocks if present
        if (content.includes('```')) {
            content = content.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1');
        }

        let parsed;
        try {
            parsed = JSON.parse(content.trim());
        } catch (e) {
            console.error("JSON Parse Error:", e.message, "Content:", content);
            throw new Error("Invalid AI response format");
        }
        
        let topics = [];
        if (Array.isArray(parsed)) {
            topics = parsed;
        } else if (parsed.topics && Array.isArray(parsed.topics)) {
            topics = parsed.topics;
        }

        if (topics.length > 0) {
            res.json(topics);
        } else {
            console.warn("No topics found in parsed response:", parsed);
            res.json([]);
        }

    } catch (error) {
        console.error("Gemini Suggestion Error:", error.message || error);
        // Seamless fallback if API fails (e.g. invalid key)
        const fallbackQuery = query || "";
        const fallbackTopics = [fallbackQuery ? fallbackQuery.charAt(0).toUpperCase() + fallbackQuery.slice(1) : "Fallback Topic", "Computer Science", "Machine Learning", "Mathematics", "Science"];
        res.json(fallbackTopics.slice(0, 5));
    }
};
