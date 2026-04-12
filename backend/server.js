import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { generateQuiz, suggestTopics } from './quizController.js';
import { saveScore, getLeaderboard } from './leaderboardController.js';


// ─────────────────────────────────────────────
//  Bot Persona & Reply Engine
// ─────────────────────────────────────────────
const BOT_NAMES = ['Aryan', 'Priya', 'Rohan', 'Sneha', 'Dev', 'Kriti', 'Nikhil', 'Isha'];

// Each room with a bot gets a fixed persona for the session
const botPersonas = new Map(); // roomId → { name, typingSpeed }

function getBotPersona(roomId) {
  if (!botPersonas.has(roomId)) {
    botPersonas.set(roomId, {
      name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
      typingSpeed: 800 + Math.random() * 1200, // 0.8s – 2.0s delay
    });
  }
  return botPersonas.get(roomId);
}

// Helpers
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function sometimes(prob = 0.4) {
  return Math.random() < prob;
}

// Topic-aware study phrases
const TOPIC_LINES = {
  'computer science': [
    'yeah CS is wild — are you more into theory or systems?',
    'I was just reviewing Big O stuff, honestly tricky',
    'so like, do you prefer frontend or backend kinda stuff?',
    'OOP vs functional always gets me lol',
    'have you done any DSA prep yet?',
  ],
  'mathematics': [
    'math is honestly brutal but satisfying when it clicks',
    'which part — calculus, linear algebra, or stats?',
    'I always mess up integration by parts 😅',
    'proofs are pain honestly',
    'are you studying for an exam or just curious?',
  ],
  'physics': [
    'physics is basically just math with a story lol',
    'which chapter? thermodynamics always confuses me',
    'i still can\'t visualize magnetic field lines properly',
    'quantum stuff is interesting but my brain hurts',
    'what level are you at — high school or uni?',
  ],
  'biology': [
    'bio has so much memorization omg',
    'are you into molecular bio or ecology type stuff?',
    'cell signalling pathways are honestly wild',
    'I always mix up meiosis and mitosis in exams',
    'evolution stuff is actually pretty interesting tbh',
  ],
  'history': [
    'history is lowkey interesting once you see the patterns',
    'which era? ancient, medieval, or modern?',
    'colonialism and its effects are definitely worth discussing',
    'I feel like history keeps repeating itself ngl',
    'which country/region are you focused on?',
  ],
  'general knowledge': [
    'gk is broad — which area are you focused on?',
    'I usually brush up on current affairs before quizzes',
    'science or geography or polity?',
    'random fact: the shortest war in history was 38 minutes',
    'what\'s a topic you feel weak on?',
  ],
};

function getTopicLine(topic) {
  if (!topic) return null;
  const key = topic.toLowerCase();
  for (const [t, lines] of Object.entries(TOPIC_LINES)) {
    if (key.includes(t)) return pick(lines);
  }
  return null;
}

// Main reply generator
function generateBotReply(message, roomId) {
  const persona = getBotPersona(roomId);
  const lower = message.trim().toLowerCase();

  // ── Greetings ──────────────────────────────
  if (/^(hi+|hey+|hello+|heyy+|hiii+|yo+|sup|hola)\b/.test(lower)) {
    return pick([
      `hey! 👋 ready to grind?`,
      `hi hi! finally someone to study with lol`,
      `heyy! hope you're not as stressed as I am 😅`,
      `yo! what's up`,
    ]);
  }

  // ── Who are you / name ─────────────────────
  if (/who (are|r) (you|u)|what('?s| is) your name|ur name/.test(lower)) {
    return pick([
      `lol I'm ${persona.name} — you?`,
      `name's ${persona.name}. been on this app for like a week now`,
      `${persona.name} here! studying for an exam tbh`,
      `call me ${persona.name} 😄`,
    ]);
  }

  // ── Are you a bot / AI ─────────────────────
  if (/are you (a )?(bot|ai|robot|fake|real)/.test(lower) || /r u a bot/.test(lower)) {
    return pick([
      `lmao no?? I'm literally just trying to study 😭`,
      `bro what 💀 I'm as real as it gets`,
      `nah I'm ${persona.name}, just a student like you`,
      `haha why would I be a bot, I'm just here to not fail my exam`,
    ]);
  }

  // ── How are you ───────────────────────────
  if (/how (are|r) (you|u)|what'?s up|how'?s it going/.test(lower)) {
    return pick([
      `stressed but here 🫠 you?`,
      `honestly tired but let's do this`,
      `decent! been studying since morning tho 💀`,
      `good! a little nervous about the quiz tbh`,
    ]);
  }

  // ── Okay / Okay cool / Alright ─────────────
  if (/^(ok+|okay+|alright|sure|lol|haha|nice|cool|wow|damn|ikr|true|fr|facts)/.test(lower)) {
    return pick([
      `haha yeah`,
      `right?`,
      `exactly lol`,
      `for real`,
      `same tbh`,
      `😂 yep`,
    ]);
  }

  // ── Questions ending with ? ────────────────
  if (lower.includes('?')) {
    // Subject-specific questions
    if (lower.includes('when') || lower.includes('where') || lower.includes('what year')) {
      return pick([
        `hmm let me think… honestly not sure lol`,
        `that's a good question, I was just trying to remember too`,
        `I think I read about it but blanked 😅 what do you remember?`,
      ]);
    }
    if (lower.includes('how') && (lower.includes('work') || lower.includes('does'))) {
      return pick([
        `so basically the way I understand it is… you explain it better lol`,
        `I have a rough idea but I always mess it up somewhere in the middle`,
        `from what I recall it's like a chain of steps — the details escape me though`,
      ]);
    }
    if (lower.includes('do you know') || lower.includes('you know')) {
      return pick([
        `I think so? but i might be wrong`,
        `kinda yeah, not 100% though`,
        `I've heard about it, remind me what part you mean`,
      ]);
    }
    return pick([
      `hmm good point, what do you think?`,
      `honestly I'm not sure either 😅`,
      `that's exactly what I was wondering too`,
      `let me think… I'll come back to that one lol`,
      `depends I guess? what's your take`,
    ]);
  }

  // ── Struggle / Difficulty ──────────────────
  if (/don'?t (know|understand|get)|confus|hard|difficult|struggle|stuck|help/.test(lower)) {
    return pick([
      `same omg, this topic is no joke`,
      `I feel you, took me a while to get it too`,
      `honestly relatable 😭 we can figure it out together`,
      `yeah it's tricky — maybe we try a different approach?`,
      `don't stress, at least we have the quiz after to test ourselves lol`,
    ]);
  }

  // ── Agreement / understanding ──────────────
  if (/i (know|agree|get it|understand|think so|feel|see)|makes sense|exactly/.test(lower)) {
    return pick([
      `right?? glad I'm not the only one`,
      `yes! finally someone that agrees`,
      `exactly, that's what I was thinking`,
      `100%`,
      `yeah we're on the same page then`,
    ]);
  }

  // ── Quiz mention ───────────────────────────
  if (/quiz|test|exam|result|score/.test(lower)) {
    return pick([
      `ugh the quiz is coming up fast 😬`,
      `hope I don't blank on the quiz tbh`,
      `let's see how we do! trying to stay positive lol`,
      `I feel semi-ready? we'll see`,
      `okay quiz mode engaged 🎯`,
    ]);
  }

  // ── Random filler / general study talk ─────
  const fillers = [
    `yeah I feel like this topic has so many layers`,
    `I keep second-guessing myself on stuff like this lol`,
    `honestly same, took me a few tries to get it`,
    `let's see if we both remembered it right in the quiz 😅`,
    `good point — I hadn't thought of it that way`,
    `I usually try to relate it to real life, makes it stick better`,
    `I made notes on this but I literally have not opened them yet 💀`,
    `we're in this together at least haha`,
    `okay okay that's actually a good way to think about it`,
    `I should've studied more before coming here ngl`,
    `are you feeling ready for the quiz?`,
  ];

  return pick(fillers);
}

// ─────────────────────────────────────────────
//  Express + Socket.IO setup
// ─────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/quiz/generate', generateQuiz);
app.post('/api/quiz/suggest-topics', suggestTopics);
app.post('/api/leaderboard', saveScore);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/leaderboard', getLeaderboard);


const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

// Rooms that have a bot (roomId → topic)
const botRooms = new Map();

// Basic Matching Queue
let matchQueue = [];

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // ── Matchmaking ────────────────────────────
  socket.on('find_match', (data) => {
    const { username, topic } = data;
    console.log(`${username} looking for match on ${topic}`);

    matchQueue.push({ socket, username, topic });

    if (matchQueue.length >= 2) {
      const p1 = matchQueue.shift();
      const p2 = matchQueue.shift();
      const roomId = `room_${Date.now()}`;

      p1.socket.join(roomId);
      p2.socket.join(roomId);

      const roomData = {
        roomId,
        topic: p1.topic || p2.topic || 'General Knowledge',
        players: [p1.username, p2.username],
        duration: 30,
      };

      io.to(roomId).emit('match_found', roomData);
    } else {
      // Bot fallback after 2s if no real partner found
      setTimeout(() => {
        const index = matchQueue.findIndex((p) => p.socket.id === socket.id);
        if (index !== -1) {
          const p1 = matchQueue.splice(index, 1)[0];
          const roomId = `room_${Date.now()}`;
          p1.socket.join(roomId);

          // Assign bot persona immediately so name is consistent
          const persona = getBotPersona(roomId);

          const roomData = {
            roomId,
            topic: p1.topic || 'General Knowledge',
            players: [p1.username, persona.name], // show bot's real persona name
            duration: 30,
          };

          // Remember this room has a bot and what topic it's about
          botRooms.set(roomId, p1.topic || 'General Knowledge');

          io.to(roomId).emit('match_found', roomData);

          // Bot sends an opening message after a short delay
          setTimeout(() => {
            const opener = pick([
              `hey! glad I found someone to study with 😄`,
              `hi! let's make the most of the 30 seconds lol`,
              `hey there! ready to talk ${p1.topic || 'stuff'}?`,
              `finally! I was waiting forever 😅 hi!`,
            ]);
            io.to(roomId).emit('receive_message', {
              message: opener,
              sender: persona.name,
              timestamp: Date.now(),
            });
          }, 1000 + Math.random() * 800);
        }
      }, 2000);
    }
  });

  // ── Study Chat ─────────────────────────────
  socket.on('send_message', (data) => {
    const { roomId, message, sender } = data;
    io.to(roomId).emit('receive_message', { message, sender, timestamp: Date.now() });

    // Bot reply logic
    if (botRooms.has(roomId)) {
      const persona = getBotPersona(roomId);
      // Sender check — don't reply to own echo if somehow bot name leaks
      if (sender === persona.name) return;

      const topic = botRooms.get(roomId);
      const delay = persona.typingSpeed;

      // Emit "bot is typing" indicator
      io.to(roomId).emit('bot_typing', { sender: persona.name });

      setTimeout(() => {
        let reply = generateBotReply(message, roomId);

        // 25% chance: also drop a topic-related line after the main reply
        if (sometimes(0.25)) {
          const topicLine = getTopicLine(topic);
          if (topicLine) {
            reply = reply + ' ' + topicLine;
          }
        }

        io.to(roomId).emit('receive_message', {
          message: reply,
          sender: persona.name,
          timestamp: Date.now(),
        });
      }, delay);
    }
  });

  // ── Quiz Trigger ───────────────────────────
  socket.on('timer_ended', (data) => {
    io.to(data.roomId).emit('quiz_starting');
  });

  // ── Disconnect ─────────────────────────────
  socket.on('disconnect', () => {
    matchQueue = matchQueue.filter((p) => p.socket.id !== socket.id);
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
