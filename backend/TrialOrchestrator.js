import { generateWithAI, getFallbackQuiz } from './quizController.js';
import { supabase } from './leaderboardController.js';

/**
 * TrialOrchestrator
 * 
 * Manages the "Load" of quiz generation. 
 * Prevents API overload, prioritizes real-user battles, and optimizes costs.
 */
class TrialOrchestrator {
  constructor() {
    this.activeRequests = 0;
    this.MAX_CONCURRENT_API = 3; // Limit simultaneous AI calls to prevent rate hits
    this.requestQueue = [];
  }

  /**
   * getTrialQuestions
   * The single entry point for getting questions.
   * Handles priority, caching, and load management.
   */
  async getTrialQuestions(topic, isBotMatch = false, chatContext = '') {
    console.log(`[Orchestrator] Request for "${topic}" (isBot: ${isBotMatch})`);

    // 1. STRATEGY: DATABASE CACHE FIRST (Fastest, $0 Cost)
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('quiz_questions')
          .select('question, options, correctAnswer')
          .ilike('topic', topic);

        if (!error && data && data.length >= 5) {
          console.log(`[Orchestrator] Cache Hit for "${topic}". Returning stored trial.`);
          return data.sort(() => 0.5 - Math.random()).slice(0, 5);
        }
      } catch (err) {
        console.warn('[Orchestrator] DB Cache error:', err.message);
      }
    }

    // 2. STRATEGY: BOT MATCHES -> PREFER FALLBACK ON HIGH LOAD
    // If it's a bot match and we are busy, don't waste API units.
    if (isBotMatch && (this.activeRequests >= this.MAX_CONCURRENT_API)) {
      console.log(`[Orchestrator] High load + Bot match. Using fallback to save costs.`);
      return getFallbackQuiz(topic);
    }

    // 3. STRATEGY: QUEUED AI GENERATION
    return new Promise((resolve) => {
      this.requestQueue.push({ topic, chatContext, isBotMatch, resolve });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.activeRequests >= this.MAX_CONCURRENT_API || this.requestQueue.length === 0) {
      return;
    }

    // Prioritize Real-User matches in the queue
    this.requestQueue.sort((a, b) => (a.isBotMatch === b.isBotMatch ? 0 : a.isBotMatch ? 1 : -1));

    const { topic, chatContext, isBotMatch, resolve } = this.requestQueue.shift();
    this.activeRequests++;

    try {
      console.log(`[Orchestrator] Generating fresh trial for "${topic}" (Current Active: ${this.activeRequests})`);
      const questions = await generateWithAI(topic, chatContext);
      
      // Asynchronously cache new questions if they came from AI
      if (supabase && questions.length > 0) {
        const insertData = questions.map(q => ({
          topic: topic.toLowerCase(),
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer
        }));
        supabase.from('quiz_questions').insert(insertData).then(() => {
          console.log(`[Orchestrator] New trial for "${topic}" cached to database.`);
        });
      }

      resolve(questions);
    } catch (err) {
      console.error(`[Orchestrator] AI Generation failed for "${topic}":`, err.message);
      resolve(getFallbackQuiz(topic));
    } finally {
      this.activeRequests--;
      this.processQueue(); // Check for next in line
    }
  }
}

export const orchestrator = new TrialOrchestrator();
