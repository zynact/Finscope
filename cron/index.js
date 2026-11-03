import dotenv from 'dotenv';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';

// Load .env relative to this file so it works from any directory
dotenv.config({ path: new URL('./.env', import.meta.url) });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Convert hours from .env to cron syntax (e.g., 24 -> '0 0 * * *', 12 -> '0 */12 * * *')
const INTERVAL_HOURS = parseInt(process.env.INTERVAL_HOURS || '24', 10);
const cronSchedule = process.env.CRON_SCHEDULE || (INTERVAL_HOURS >= 24 ? '0 0 * * *' : `0 */${INTERVAL_HOURS} * * *`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function performPing() {
  const timestamp = new Date().toISOString();

  try {
    // 1. Read current ping status
    const { data: current, error: readError } = await supabase
      .from('ping')
      .select('ping_count')
      .eq('id', 1)
      .maybeSingle();

    if (readError) {
      console.error(`[${timestamp}] Read failed:`, readError.message);
      return false;
    }

    const nextCount = (current?.ping_count || 0) + 1;

    // 2. Write update
    const { error: writeError } = await supabase
      .from('ping')
      .upsert({
        id: 1,
        last_pinged_at: timestamp,
        ping_count: nextCount,
      });

    if (writeError) {
      console.error(`[${timestamp}] Write failed:`, writeError.message);
      return false;
    }

    // 3. Confirm write
    const { data: verified, error: verifyError } = await supabase
      .from('ping')
      .select('ping_count, last_pinged_at')
      .eq('id', 1)
      .single();

    if (verifyError) {
      console.error(`[${timestamp}] Verification failed:`, verifyError.message);
      return false;
    }

    console.log(`[${verified.last_pinged_at}] Ping successful (count: ${verified.ping_count})`);
    return true;
  } catch (err) {
    console.error(`[${timestamp}] Unexpected error:`, err.message || err);
    return false;
  }
}

if (process.argv.includes('--once') || process.argv.includes('--test')) {
  performPing().then((success) => {
    process.exitCode = success ? 0 : 1;
  });
} else {
  performPing();
  cron.schedule(cronSchedule, performPing);
  console.log(`Keep-alive cron active [Every ${INTERVAL_HOURS}h | Schedule: "${cronSchedule}"]`);
}
