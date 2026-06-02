const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lxbvadjjboavxwidxsnl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testQuery() {
    const dbCat = 'HS';
    const program = 'Poem Writing (Male)';

    console.log(`Testing query for ${dbCat} - ${program}`);

    // Test with double quotes for spaces in column names
    const orString = `"program 1".eq."${program}","program 2".eq."${program}","program 3".eq."${program}","program 4".eq."${program}"`;
    
    let { data, error } = await supabase.from('registred')
        .select('*')
        .eq('category', dbCat)
        .or(orString);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Found ${data.length} students:`);
        data.forEach(d => console.log(d.name, d['program 1'], d['program 2']));
    }
}

testQuery();
