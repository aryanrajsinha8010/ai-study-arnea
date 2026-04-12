# 🧠 AI Study Arena

**AI Study Arena** is a real-time, competitive learning platform that leverages the power of **Google Gemini 2.5 Flash** to generate deeply context-aware, dynamic quizzes for users in multiplayer, head-to-head study battles. 

Players queue up, match with a random opponent into a realtime `StudyRoom`, converse about a validated topic for 30 seconds, and then battle in an AI-generated multiple-choice quiz sculpted natively out of their chat history!

---

## ✨ Key Features
- **🔮 Real-Time Matchmaking:** Powered by `Socket.io`, players queue up and are instantly routed into shared interactive environments.
- **🛡️ AI Topic Validation:** Intelligent debounced inputs prevent spam and gibberish. Gemini evaluates topics dynamically—restricting users to valid study subjects before they can queue.
- **💬 Context-Aware Generation:** The study session isn't just a waiting room. The native Chat History automatically influences the impending quiz via Gemini's powerful prompt digestion, forcing players to pay attention to both the subject and the conversation. 
- **⚖️ Failover Architecture:** Includes robust node fallbacks to hardcoded academic questions instantly to prevent game crashes if the AI provider goes offline. 

---

## 🛠️ Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, `socket.io-client`
- **Backend:** Node.js, Express, Socket.io 
- **AI Integrations:** `@google/generative-ai` (Gemini 2.5 Flash)
- **Database (TBD):** Supabase (Prepared for Leaderboards)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/en/) installed on your machine.
- A free API key from [Google AI Studio](https://aistudio.google.com/).

---

## 👥 Setup for Teammates (Cloning This Repo)

> **Note:** `node_modules` is NOT included in this repo (it's in `.gitignore`). You need to run `npm install` yourself — it recreates all packages from `package.json` automatically.

### Step 1: Clone the repo
```bash
git clone https://github.com/aryanrajsinha8010/hackthon.git
cd hackthon
```

### Step 2: Setup Backend
```bash
cd backend
npm install
```

Create a `.env` file (copy from `.env.example`):
```bash
copy .env.example .env
```
Then open `backend/.env` and fill in **your own API keys**:
```env
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=https://dummy.supabase.co
SUPABASE_ANON_KEY=dummy
```
> 🔑 Get a free Gemini API key at: https://aistudio.google.com/

Start the backend server:
```bash
node server.js
```
Backend runs at: `http://localhost:3001`

### Step 3: Setup Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: `http://localhost:5173`

---

## 🔒 Environment Variables (Security Warning)

> ⚠️ **NEVER share or upload your `.env` file!** It contains secret API keys.
> The `.env` file is in `.gitignore` and will NOT be pushed to GitHub.
> Each teammate must create their **own** `.env` with their own keys.

| File | Purpose | Push to GitHub? |
|------|---------|----------------|
| `.env` | Your real secret API keys | ❌ NO |
| `.env.example` | Template showing required keys | ✅ YES |

---

### 1. Backend Setup (Original Dev)
Navigate into the backend directory and configure your environment:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder and add the following:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001

# Placeholders to prevent boot crashes
SUPABASE_URL=https://dummy.supabase.co
SUPABASE_ANON_KEY=dummy
```
Start the server:
```bash
node server.js
```

### 2. Frontend Setup
Open a new terminal session, navigate to the frontend directory, and spin up the Vite server:
```bash
cd frontend
npm install
npm run dev
```
The website will now be running smoothly at `http://localhost:5173/`.

---

## 🗺️ Project Structure 
* **`/backend/server.js`**: Home for the Socket orchestration logic, managing global rooms, timers, and queues.
* **`/backend/quizController.js`**: Core implementation of Gemini prompt engineering linking `generateQuiz` and `suggestTopics`.
* **`/frontend/src/pages/Home.jsx`**: Handles topic validation dropdowns and entry matchmaking logic. 
* **`/frontend/src/pages/StudyRoom.jsx`**: Shared connection managing chats and 30-second context building.
* **`/frontend/src/pages/QuizBattle.jsx`**: The interactive visual arena receiving the compiled question objects. 

---

## 🔮 Future Enhancements
* **Formal Authentication:** Integrating `Supabase Auth` to link battle history and user profiles. 
* **Global Leaderboards:** Saving MMR/Scores natively to a cloud database database. 
* **AI Chat Moderation:** Utilize Gemini's `safetySettings` to moderate multiplayer chat sessions.

## 📦 Installation

### Backend
```bash
cd backend
npm install
# Ensure you have a .env file with GEMINI_API_KEY and other required variables
node server.js
```

### Frontend
```bash
cd ../frontend
npm install
npm run dev
```

The application will be accessible at `http://localhost:5173/`.

## 🕹️ How to Play
1. **Enter a Topic** – Type a study topic and click **Queue**.
2. **Matchmaking** – You will be paired with a random opponent.
3. **Chat Phase** – Talk for 30 seconds; the conversation fuels the quiz.
4. **Quiz Battle** – Answer AI‑generated multiple‑choice questions.
5. **Score** – The player with the higher score wins the match.

## 🤝 Contributing
We welcome contributions! Please fork the repository and submit a pull request. Follow the standard GitHub workflow:
- Create a feature branch.
- Write clear commit messages.
- Ensure all tests pass (`npm test`).
- Update documentation as needed.

## 📄 License
This project is licensed under the MIT License. See the `LICENSE` file for details.

---

*Happy studying and may the best mind win!*
