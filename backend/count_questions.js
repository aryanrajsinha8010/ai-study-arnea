import { supabase } from './leaderboardController.js';

async function countQuestions() {
  if (!supabase) {
    console.error('Supabase not initialized. Check your .env file.');
    process.exit(1);
  }

  try {
    const { data, error } = await supabase.from('quiz_questions').select('*').limit(1);
    if (error) {
       console.log('Quiz Questions Error:', error.message);
    } else {
       console.log('Quiz Questions Data:', data);
       const { count } = await supabase.from('quiz_questions').select('*', { count: 'exact', head: true });
       console.log('Quiz Questions Count:', count);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

countQuestions();
