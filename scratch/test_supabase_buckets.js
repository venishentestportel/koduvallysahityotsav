const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://lxbvadjjboavxwidxsnl.supabase.co', 'sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT');
async function test() {
  const { data, error } = await supabase.storage.listBuckets();
  console.log('Buckets:', data);
  if (error) console.log('Error:', error);
}
test();
