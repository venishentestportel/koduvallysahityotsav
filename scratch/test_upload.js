const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://lxbvadjjboavxwidxsnl.supabase.co', 'sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT');
async function test() {
  const { data, error } = await supabase.storage.from('json file').upload('test_' + Date.now() + '.json', '{"test":1}', { contentType: 'application/json' });
  console.log('Upload Data:', data);
  console.log('Upload Error:', error);
}
test();
