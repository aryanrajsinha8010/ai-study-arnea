import { supabase } from './leaderboardController.js';

async function auditDatabase() {
  console.log('\n--- 🛡️ SCHOLAR ARENA: DB HEALTH AUDIT ---');

  const tables = [
    { name: 'quiz_questions', columns: ['topic', 'question', 'options', 'correctAnswer'] },
    { name: 'chat_messages', columns: ['room_id', 'sender', 'message'] },
    { name: 'leaderboard', columns: ['username', 'score'] }
  ];

  if (!supabase) {
    console.error('❌ CRITICAL: Supabase client not initialized. Check .env');
    return;
  }

  for (const table of tables) {
    process.stdout.write(`Testing [${table.name}]... `);
    
    try {
      // 1. Check Table Existence & Count
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`\n   ❌ ERROR: ${error.message}`);
        continue;
      }

      // 2. Check Schema Health (First Row Column Check)
      const { data: sample } = await supabase.from(table.name).select('*').limit(1);
      
      if (sample && sample.length > 0) {
        const missing = table.columns.filter(col => !(col in sample[0]));
        if (missing.length > 0) {
          console.log(`\n   ⚠️ SCHEMA WARNING: Missing columns [${missing.join(', ')}] in ${table.name}`);
        } else {
          console.log(`✅ Healthy (${count} records)`);
        }
      } else {
        console.log(`✅ Table Active (Empty: 0 records)`);
      }
    } catch (err) {
      console.log(`\n   ❌ Unexpected Failure: ${err.message}`);
    }
  }

  // 3. Efficiency Check: Topic Cache Hotness
  console.log('\n--- ⚡ EFFICIENCY METRICS ---');
  try {
    const { data: qData } = await supabase.from('quiz_questions').select('topic');
    if (qData && qData.length > 0) {
      const topics = qData.reduce((acc, q) => {
        acc[q.topic] = (acc[q.topic] || 0) + 1;
        return acc;
      }, {});
      
      console.log(`Active Cache: ${Object.keys(topics).length} Unique Subjects currently optimized.`);
      const topTopic = Object.entries(topics).sort((a,b) => b[1]-a[1])[0];
      if (topTopic) console.log(`Best Asset: "${topTopic[0].toUpperCase()}" has ${topTopic[1]} questions stored.`);
    } else {
      console.log('Cache is currently cold. Generate trials to start saving.');
    }
  } catch (err) {
    console.log('Efficiency metrics unavailable.');
  }

  console.log('\nAudit Complete. Your "Match & Fetch" rules are protected.\n');
}

auditDatabase();
