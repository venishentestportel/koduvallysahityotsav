const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxbvadjjboavxwidxsnl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    console.log("--- registred table ---");
    let { data: registredData } = await supabase.from('registred').select('*').limit(2);
    console.log(registredData);

    console.log("\n--- regist table ---");
    let { data: registData } = await supabase.from('regist').select('*').limit(2);
    console.log(registData);
}

check();
