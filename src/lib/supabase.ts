import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nxxisxugpfswyvpchexs.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54eGlzeHVncGZzd3l2cGNoZXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNzY3NDMsImV4cCI6MjA5Mjk1Mjc0M30.sJdHdCHJ_n41xAVqpYN4s6wxq8SGSmkd6epWPdjcSY0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
