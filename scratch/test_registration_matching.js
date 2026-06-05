const url = "https://lxbvadjjboavxwidxsnl.supabase.co";
const key = "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT";

async function run() {
    try {
        const res = await fetch(`${url}/rest/v1/registred%202?select=*`, {
            headers: {
                "apikey": key,
                "Authorization": `Bearer ${key}`
            }
        });
        const data = await res.json();
        
        console.log("Matching students for UP Mappila Pattu:");
        let count = 0;
        data.forEach(s => {
            const matchesCategory = s.category && (s.category.toLowerCase().trim() === 'up' || s.category.toLowerCase().trim() === 'upper primary');
            const progs = [s['program 1'], s['program 2'], s['program 3'], s['program 4']];
            const matchesProgram = progs.some(p => p && p.toLowerCase().includes('mappila pattu'));
            
            if (matchesProgram) {
                console.log(`Student: ${s.name}, Category: ${s.category}, Progs: [${progs.join(', ')}], MatchesCat: ${matchesCategory}`);
                if (matchesCategory) count++;
            }
        });
        console.log(`Total matching UP: ${count}`);
    } catch (e) {
        console.error("ERROR:", e);
    }
}

run();
