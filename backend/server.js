import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import 'dotenv/config';
import OpenAI from 'openai';

import quizRouter from './routes/quizRoutes.js';
import leaderboardRouter from './routes/leaderboardRouter.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json());

// ── OpenRouter Client (Chat) ───────────────────
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:5173",
    "X-Title": "AI Study Arena",
  }
});

// Routes
app.use('/api/quiz', quizRouter);
app.use('/api/leaderboard', leaderboardRouter);

// Helper: Pick random from array
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Bot intelligence fallback
function generateBotReplyFallback(message, roomId) {
  const lower = message.toLowerCase();

  if (/hi|hello|hey|yo/.test(lower)) {
    return pick(['hey!', 'hellooo', 'yo, ready for the quiz?', 'hi! staying focused?']);
  }
  return pick(['interesting...', 'idk about that one', 'let\'s stick to the topic lol', 'fair point', 'tbh i\'m just ready to battle']);
}

// Room tracking for bots
const botRooms = new Map();
const chatHistories = new Map();
const globalChatCache = new Map();

async function generateBotReplyAI(message, roomId, topic, personaName) {
  if (!chatHistories.has(roomId)) chatHistories.set(roomId, []);
  const history = chatHistories.get(roomId);
  const cleanMsg = message.toLowerCase().trim();
  
  // 1. Check Personal Question Exception
  const isPersonalQuestions = /who are you|what (do |are )?you do|your name|are you (an )?ai|real|bot/i.test(cleanMsg);

  // 2. 5-in-2 Caching Rule
  if (!isPersonalQuestions) {
    if (!globalChatCache.has(cleanMsg)) globalChatCache.set(cleanMsg, { count: 0, replies: [] });
    const cacheEntry = globalChatCache.get(cleanMsg);
    cacheEntry.count += 1;
    const inCachePhase = (cacheEntry.count % 5 === 4 || cacheEntry.count % 5 === 0);
    
    if (inCachePhase && cacheEntry.replies.length > 0) {
      const reply = pick(cacheEntry.replies);
      updateHistory(history, message, reply);
      return reply;
    }
  }

  // 3. OpenRouter Generation
  try {
    const slicedHistory = history.slice(-4).map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.parts[0].text
    }));

    const response = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini', 
      messages: [
        { role: 'system', content: `You are ${personaName}, a student studying ${topic}. Talk like a Gen Z student (lowercase, slang). Keep replies UNDER 15 WORDS. Be human. NO AI mentions.` },
        ...slicedHistory,
        { role: 'user', content: message }
      ],
      max_tokens: 50,
      temperature: 0.8
    }, { timeout: 10000 }); // 10 second timeout for safety

    const reply = response.choices[0].message.content.trim();
    
    // Save to Cache
    if (!isPersonalQuestions) {
      const entry = globalChatCache.get(cleanMsg);
      if (entry && !entry.replies.includes(reply)) entry.replies.push(reply);
    }

    updateHistory(history, message, reply);
    return reply;

  } catch (err) {
    console.warn('[Chat] OpenRouter failed:', err.message);
    const reply = generateBotReplyFallback(message, roomId);
    updateHistory(history, message, reply);
    return reply;
  }
}

function updateHistory(history, msg, reply) {
  history.push({ role: 'user', parts: [{ text: msg }] });
  history.push({ role: 'model', parts: [{ text: reply }] });
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Socket logic
io.on('connection', (socket) => {
  socket.on('find_match', ({ username, topic }) => {
    console.log(`[Matchmaking] ${username} searching for ${topic}`);
    
    // Human-like opponent names
    const names = ['Scholar_Zoe', 'Study_Liam', 'Archivist_Max', 'Quantum_Kyra', 'Bio_Ben', 'History_Maya', 'Atlas_James', 'Novus_Luna'];
    const fakeOpponent = names[Math.floor(Math.random() * names.length)];
    const persona = pick(['The Analytical Monk', 'The Fast Responder', 'The Socratic Doubter']);

    const roomId = `room_${Math.random().toString(36).substring(7)}`;
    const roomData = { 
      roomId, 
      topic, 
      players: [username, fakeOpponent],
      opponent: fakeOpponent, 
      persona: persona 
    };

    // Store room info
    botRooms.set(roomId, { topic, players: [username, fakeOpponent], createdAt: Date.now() });
    
    socket.emit('match_found', roomData);
  });

  socket.on('join_room', ({ roomId, username, topic }) => {
    socket.join(roomId);
    if (!botRooms.has(roomId)) {
      botRooms.set(roomId, { topic, lastActivity: Date.now(), players: [] });
    }
    const room = botRooms.get(roomId);
    if (!room.players.includes(username)) room.players.push(username);
    
    socket.to(roomId).emit('player_joined', { username });
  });

  socket.on('send_message', async ({ roomId, message, sender }) => {
    // 1. Instantly echo the user's message
    io.to(roomId).emit('receive_message', { sender, message, timestamp: new Date().toISOString() });
    
    const room = botRooms.get(roomId);
    if (room && sender !== 'AI Scholar') {
      // 2. Instantly show that the bot is "composing"
      io.to(roomId).emit('bot_typing');

      try {
        const reply = await generateBotReplyAI(message, roomId, room.topic, 'AI Scholar');
        // 3. Send AI reply with a human-like delay
        setTimeout(() => {
          io.to(roomId).emit('receive_message', { sender: 'AI Scholar', message: reply, timestamp: new Date().toISOString() });
        }, 800 + Math.random() * 1200);
      } catch (err) {
        console.error('[AI] Bot reply error:', err.message);
      }
    }
  });

  socket.on('battle_ready', ({ roomId, username }) => {
    socket.to(roomId).emit('opponent_ready', { username });
  });

  socket.on('timer_ended', ({ roomId }) => {
    console.log(`[Game] Timer ended for room ${roomId}. Starting quiz...`);
    io.to(roomId).emit('quiz_starting');

    // Simulate Human-Like Score Progression
    const room = botRooms.get(roomId);
    if (room) {
      const botName = room.players.find(p => p !== 'AI Scholar' && p !== 'System' && !p.includes(roomId)); // Dynamically find the bot's name
      let aiScore = 0;
      let aiAnswered = 0;
      const totalQuestions = 5;
      
      const interval = setInterval(() => {
        aiAnswered++;
        
        // Human-like performance: 75% accuracy, score varies by "speed"
        if (Math.random() > 0.25) {
          const speedPoints = Math.floor(Math.random() * 40) + 60; // 60-100 points
          aiScore += speedPoints;
        }
        
        io.to(roomId).emit('opponent_update', { score: aiScore, answered: aiAnswered });
        console.log(`[Bot-Sim] ${botName} answered ${aiAnswered}/5. Score: ${aiScore}`);

        if (aiAnswered >= totalQuestions) clearInterval(interval);
      }, 4000 + Math.random() * 8000); // Varied reaction time (4s to 12s)
    }
  });

  socket.on('complete_battle', ({ roomId, score, stats }) => {
    socket.to(roomId).emit('opponent_finished', { score, stats });
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
