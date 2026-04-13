# 🧠 AI Study Arena: The Scholarly Gauntlet
[![MIT License](https://img.shields.io/badge/License-MIT-gold.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![AI-Powered](https://img.shields.io/badge/AI-OpenRouter%20/%20Gemini-blueviolet.svg)](https://openrouter.ai/)

**AI Study Arena** is a real-time, competitive "Learning PvP" platform. It transforms mundane study sessions into high-stakes, context-aware battles where your conversation actually fuels the trial.

---

## 🏛️ The Arena Experience
The Arena isn't just about answering questions; it's about **Synthesizing Knowledge**.

1. **The Entry:** Scholars choose a domain (from Science to Engineering). Our AI validator ensures only true academic subjects pass the gate.
2. **The Pairing:** Enter the matchmaking queue and be paired with high-IQ **AI Scholars** or other human rivals.
3. **The Deliberation:** You have a limited window to discuss your topic in the Study Room. **Pay attention:** the AI listens to your chat and crafts the quiz questions based on what you actually discussed!
4. **The Trial:** A 5-question blitz where speed and accuracy determine your prestige.
5. **The Archives:** Save your score to the global leaderboard and claim your rank among the elite.

---

## ✨ Premium Features
*   **🔮 Context-Native Quiz:** Our proprietary "3-in-1" caching rule ensures quizzes are fresh, relevant, and directly influenced by your live chat history.
*   **👤 Humanized AI Rivals:** Face off against AI personas like *Scholar_Zoe* or *Quantum_Kyra* who chat like real Gen-Z students and score dynamically based on human reaction times.
*   **🛡️ Robust Fail-Safe:** High-latency protection ensures that if an AI provider flickers, the system automatically pulls from our offline "Grand Archives" to keep the game running.
*   **⚡ One-Click Deployment:** No more complex terminal commands. Use our specialized automation scripts to get up and running in seconds.

---

## 🛠️ Automated Setup (Quick Start)
We’ve made joining the Arena effortless. 

### **For New Scholars (Cloning the Repo):**
1. **Clone the Repo:** `git clone https://github.com/aryanrajsinha8010/ai-study-arena.git`
2. **The Magic Step:** Double-click **`SETUP_AND_RUN.bat`**. 
   *   *This will automatically install all libraries, configure your environment, and launch the game.*
3. **The Play Step:** For all future runs, just double-click **`start.bat`**.

### **Manual Configuration (Advanced):**
If you prefer the scroll and quill, you can set up manually:
```bash
# Setup Backend
cd backend && npm install
# Setup Frontend
cd ../frontend && npm install
```
*Note: Ensure your `backend/.env` contains valid `OPENAI_API_KEY` (OpenRouter) and `SUPABASE` keys.*

---

## 🔒 Security & The Vault
Your API keys are precious. 
*   **`.env`** is strictly ignored by the **Auto Git Uploader** to prevent accidental leaks.
*   The **`auto git uploader.bat`** is included for developers to push safe updates to their own forks with a single click.

---

## 🛰️ Tech Stack
*   **Core:** React 18, Node.js, Express
*   **Real-time:** Socket.io (Dual-channel communication)
*   **Intelligence:** OpenRouter Bridge (GPT-4o-Mini / Gemini 1.5 Flash)
*   **Database:** Supabase (Leaderboards & Quiz Caching)
*   **Aesthetics:** Modern Glassmorphism & Material Design 3

---

## 🤝 Join the Council
We welcome new architects! 
- Found a bug? Open a **Chamber Issue**.
- Have a feature idea? Submit a **Research PR**.

*May your mind be sharp and your prestige be high.*
**AI Study Arena Team**
