import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

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
      process.exit(1);
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
      process.exit(1);
    }

    // 3. Confirm write
    const { data: verified, error: verifyError } = await supabase
      .from('ping')
      .select('ping_count, last_pinged_at')
      .eq('id', 1)
      .single();

    if (verifyError) {
      console.error(`[${timestamp}] Verification failed:`, verifyError.message);
      process.exit(1);
    }

    console.log(`[${verified.last_pinged_at}] Ping successful (count: ${verified.ping_count})`);
  } catch (err) {
    console.error(`[${timestamp}] Unexpected error:`, err.message || err);
    process.exit(1);
  }
}

performPing();
