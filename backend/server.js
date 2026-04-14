import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import 'dotenv/config';
import OpenAI from 'openai';

import quizRouter from './routes/quizRoutes.js';
import leaderboardRouter from './routes/leaderboardRouter.js';
import { orchestrator } from './TrialOrchestrator.js';
import { supabase } from './leaderboardController.js';


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
  // 1. Personal Question Detection (Must ALWAYS be generated)
  const isPersonalQuestions = /who are you|what (do |are )?you do|your name|are you (an )?ai|real|bot|who made you|creator|origins|identify/i.test(cleanMsg);


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
    console.warn(`[Chat] OpenRouter failed for ${roomId}:`, err.message);
    const reply = generateBotReplyFallback(message, roomId);
    updateHistory(history, message, reply);
    return reply;
  }
}

function updateHistory(history, msg, reply) {
  history.push({ 
    role: 'user', 
    sender: 'Student', // for context mapping
    message: msg,      // for context mapping
    parts: [{ text: msg }] 
  });
  history.push({ 
    role: 'model', 
    sender: 'AI Scholar', 
    message: reply,
    parts: [{ text: reply }] 
  });
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const matchmakingQueue = new Map(); // topic -> Array of { socket, username }

// Socket logic
io.on('connection', (socket) => {
  socket.on('find_match', ({ username, topic }) => {
    console.log(`[Matchmaking] ${username} searching for ${topic}`);
    
    // Safety: Remove this socket from any existing queues first
    for (const [t, queue] of matchmakingQueue.entries()) {
      const idx = queue.findIndex(u => u.socket.id === socket.id);
      if (idx !== -1) {
        queue.splice(idx, 1);
        if (queue.length === 0) matchmakingQueue.delete(t);
      }
    }

    // Check if someone is already waiting for this topic
    const waitingUsers = matchmakingQueue.get(topic) || [];
    // Match with anyone else in the queue who isn't THIS specific socket
    const siblingIndex = waitingUsers.findIndex(u => u.socket.id !== socket.id);

    if (siblingIndex !== -1) {
      // FOUND A REAL USER!
      const sibling = waitingUsers.splice(siblingIndex, 1)[0];
      if (waitingUsers.length === 0) matchmakingQueue.delete(topic);
      
      // CRITICAL: Clear the bot timer for the sibling who is now matched
      if (sibling.botTimeout) clearTimeout(sibling.botTimeout);

      const roomId = `room_${Math.random().toString(36).substring(7)}`;
      
      const roomDataForUser = { 
        roomId, 
        topic, 
        players: [username, sibling.username],
        opponent: sibling.username, 
        persona: 'Real Student' 
      };

      const roomDataForSibling = { 
        roomId, 
        topic, 
        players: [username, sibling.username],
        opponent: username, 
        persona: 'Real Student' 
      };

      // Store room info
      botRooms.set(roomId, { topic, players: [username, sibling.username], createdAt: Date.now() });

      // Match both!
      socket.emit('match_found', roomDataForUser);
      sibling.socket.emit('match_found', roomDataForSibling);
      
      console.log(`[Matchmaking] Matched ${username} with ${sibling.username} in ${roomId}`);
    } else {
      // NO REAL USER FOUND - Wait
      const userEntry = { socket, username };
      if (!matchmakingQueue.has(topic)) matchmakingQueue.set(topic, []);
      matchmakingQueue.get(topic).push(userEntry);

      // Set timeout to match with bot if no human found in 10 seconds
      const botTimeout = setTimeout(() => {
        const currentQueue = matchmakingQueue.get(topic) || [];
        const index = currentQueue.indexOf(userEntry);
        
        if (index !== -1) {
          // Time's up! Give a bot match
          currentQueue.splice(index, 1);
          if (currentQueue.length === 0) matchmakingQueue.delete(topic);

          const names = ['Aria_Zen', 'Liam_Study', 'Max_Archivist', 'Kyra_JS', 'Ben_Bio', 'Maya_Code', 'James_H', 'Luna_Dev', 'Alex_Smith', 'Jordan_K', 'Sasha_R', 'Sam_D', 'Casey_M', 'Zoe_Q', 'Noah_V'];
          const fakeOpponent = names[Math.floor(Math.random() * names.length)];
          const persona = pick(['The Analytical Monk', 'The Fast Responder', 'The Socratic Doubter']);

          const roomId = `room_bot_${Math.random().toString(36).substring(7)}`;
          const roomData = { 
            roomId, 
            topic, 
            players: [username, fakeOpponent],
            opponent: fakeOpponent, 
            persona: persona 
          };

          botRooms.set(roomId, { topic, players: [username, fakeOpponent], createdAt: Date.now() });
          socket.emit('match_found', roomData);
          console.log(`[Matchmaking] ${username} matched with BOT ${fakeOpponent} after timeout`);
        }
      }, 10000); // 10 second wait (5-in-2 arena rule)

      userEntry.botTimeout = botTimeout;

      socket.on('disconnect', () => {
        const queue = matchmakingQueue.get(topic);
        if (queue) {
          const idx = queue.findIndex(u => u.socket.id === socket.id);
          if (idx !== -1) {
            const entry = queue[idx];
            if (entry.botTimeout) clearTimeout(entry.botTimeout);
            queue.splice(idx, 1);
          }
          if (queue.length === 0) matchmakingQueue.delete(topic);
        }
      });
    }
  });

  socket.on('join_room', ({ roomId, username, topic, players }) => {
    socket.join(roomId);
    if (!botRooms.has(roomId)) {
      console.log(`[Room] Creating new tracking entry for ${roomId}`);
      botRooms.set(roomId, { topic, lastActivity: Date.now(), players: players || [username] });
    }
    const room = botRooms.get(roomId);
    
    // Sync players if they were passed (critical for bot rooms initiated by frontend)
    if (players && Array.isArray(players)) {
      players.forEach(p => {
        if (!room.players.includes(p)) room.players.push(p);
      });
    } else if (!room.players.includes(username)) {
      room.players.push(username);
    }
    
    console.log(`[Room] ${username} joined ${roomId}. Players:`, room.players);
    socket.to(roomId).emit('player_joined', { username });
  });

  socket.on('send_message', async ({ roomId, message, sender }) => {
    // 1. Instantly echo the user's message
    io.to(roomId).emit('receive_message', { sender, message, timestamp: new Date().toISOString() });
    
    // 2. Archive to Database (Minimize API calls rule - persistence of context)
    if (supabase) {
      supabase.from('chat_messages').insert([{ 
        room_id: roomId, 
        sender, 
        message 
      }]).then(({ error }) => {
        if (error) console.error('[ChatDB] Save failed:', error.message);
      });
    }

    const room = botRooms.get(roomId);
    if (room && sender !== 'AI Scholar' && roomId.startsWith('room_bot_')) {
      // 3. Instantly show that the bot is "composing"
      io.to(roomId).emit('bot_typing');

      try {
        const botName = room.players[1] || 'AI Scholar'; 
        console.log(`[AI] Generating reply for ${sender} in ${roomId} (Bot Name: ${botName})`);
        
        const reply = await generateBotReplyAI(message, roomId, room.topic, botName);
        
        // 4. Archive AI reply too
        if (supabase) {
          supabase.from('chat_messages').insert([{ 
            room_id: roomId, 
            sender: botName, 
            message: reply 
          }]).then(({ error }) => {
            if (error) console.error('[ChatDB] Bot save failed:', error.message);
          });
        }

        // 5. Send AI reply with a human-like delay
        const delay = 800 + Math.random() * 1200;
        setTimeout(() => {
          io.to(roomId).emit('receive_message', { sender: botName, message: reply, timestamp: new Date().toISOString() });
          console.log(`[AI] sent reply to ${roomId}`);
        }, delay);
      } catch (err) {
        console.error('[AI] Bot reply flow failed:', err.message);
      }
    }
  });

  socket.on('battle_ready', ({ roomId, username }) => {
    socket.to(roomId).emit('opponent_ready', { username });
  });

  socket.on('timer_ended', async ({ roomId }) => {
    console.log(`[Game] Timer ended for room ${roomId}. Requesting trial questions via Orchestrator...`);
    
    const room = botRooms.get(roomId);
    if (!room) return;

    // Check if questions already exist (to prevent double-gen in race conditions)
    if (room.questions) {
      // Sync Start: Tell everyone to start in 2 seconds
      const startAt = Date.now() + 2000;
      io.to(roomId).emit('quiz_starting', { questions: room.questions, startAt });
      return;
    }

    try {
      const isBotMatch = roomId.startsWith('room_bot_');
      const history = chatHistories.get(roomId) || [];
      const chatContext = history
        .map(m => `${m.sender || m.role}: ${m.message || '...'}`)
        .join('\n');

      // Get questions with load/priority management
      const questions = await orchestrator.getTrialQuestions(room.topic, isBotMatch, chatContext);
      room.questions = questions;

      const startAt = Date.now() + 2000;
      io.to(roomId).emit('quiz_starting', { questions, startAt });
    } catch (err) {
      console.error('[Game] Orchestrator failed:', err.message);
      io.to(roomId).emit('quiz_starting', { questions: [], startAt: Date.now() });
    }

    
    // Simulate Bot Score Progression
    if (roomId.startsWith('room_bot_')) {
      const room = botRooms.get(roomId);
      if (room) {
        const botName = room.players[1] || 'AI Scholar'; 
        const totalQuestions = 5;
        
        // INITIALIZE bot stats in room
        room.botScore = 0;
        room.botAnswered = 0;

        const interval = setInterval(() => {
          if (!botRooms.has(roomId)) {
            clearInterval(interval);
            return;
          }
          
          room.botAnswered++;
          
          // Human-like performance: 75% accuracy, score varies by "speed"
          if (Math.random() > 0.25) {
            const speedPoints = Math.floor(Math.random() * 40) + 60; // 60-100 points
            room.botScore += speedPoints;
          }
          
          io.to(roomId).emit('opponent_update', { score: room.botScore, answered: room.botAnswered });
          console.log(`[Bot-Sim] ${botName} answered ${room.botAnswered}/5. Score: ${room.botScore}`);
  
          if (room.botAnswered >= totalQuestions) clearInterval(interval);
        }, 4000 + Math.random() * 8000); // Varied reaction time (4s to 12s)
      }
    }
  });

  socket.on('update_score', ({ roomId, score, answered }) => {
    socket.to(roomId).emit('opponent_update', { score, answered });
  });

  socket.on('complete_battle', ({ roomId, score, stats }) => {
    const room = botRooms.get(roomId);
    if (!room) return;
    
    if (!room.results) room.results = {};
    room.results[socket.id] = { username: stats?.username || 'Player', score };

    socket.to(roomId).emit('opponent_finished', { score, stats });
    socket.to(roomId).emit('opponent_update', { score, answered: 5 });

    // PERFECT SYNC: If it's a bot match or both humans are done, conclue
    const isBotMatch = roomId.startsWith('room_bot_');
    
    if (isBotMatch) {
      // Ensure bot is in results
      const botName = room.players[1] || 'AI Scholar';
      room.results['bot_socket_id'] = { username: botName, score: room.botScore || 0 };
      io.to(roomId).emit('battle_concluded', { results: room.results });
    } else if (Object.keys(room.results).length >= 2) {
      io.to(roomId).emit('battle_concluded', { results: room.results });
    }
  });
});


const PORT = process.env.PORT || 5000;

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server] Port ${PORT} is busy. Exiting — nodemon will restart...`);
    process.exit(1);
  } else {
    console.error('[Server] Fatal error:', err);
    process.exit(1);
  }
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
