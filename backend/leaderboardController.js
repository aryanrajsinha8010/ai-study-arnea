import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

export const saveScore = async (req, res) => {
  try {
    const { username, topic, score } = req.body;
    
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
