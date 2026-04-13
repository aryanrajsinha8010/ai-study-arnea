import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Only initialize if URL is provided and not dummy
export const supabase = (supabaseUrl && !supabaseUrl.includes('dummy')) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

let inMemoryLeaderboard = [
  { username: 'AI_Master', topic: 'Computer Science', score: 95 },
  { username: 'Quantum_Guru', topic: 'Physics', score: 88 },
  { username: 'CodeNinja', topic: 'React Hooks', score: 85 }
];

export const saveScore = async (req, res) => {
  try {
    const { username, topic, score } = req.body;
    
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('dummy')) {
      inMemoryLeaderboard.push({ username, topic, score });
      return res.status(200).json({ success: true, data: [{ username, topic, score }] });
    }

    const { data, error } = await supabase
      .from('leaderboard')
      .insert([{ username, topic, score }]);
      
    if (error) throw error;
    
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error saving score:', error);
    res.status(500).json({ error: 'Failed to save score' });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('dummy')) {
      const data = [...inMemoryLeaderboard]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      return res.status(200).json(data);
    }

    // Get top 10 scores
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);
      
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};
