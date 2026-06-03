const { createClient } = require('@supabase/supabase-js');
const http = require('http');

const SUPABASE_URL = 'https://lxbvadjjboavxwidxsnl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT';
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const WA_BACKEND_URL = 'http://localhost:3001';

async function sendSectorNotification(studentName, sector, regularProgsText, generalProgsText, stage) {
    try {
        const postData = JSON.stringify({
            clientId: 'default',
            studentName,
            sector,
            regularProgsText,
            generalProgsText,
            stage
        });

        return new Promise((resolve) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3001,
                path: '/send-sector-notification',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': postData.length
                }
            }, (res) => {
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => {
                    try {
                        const data = JSON.parse(body);
                        resolve(data);
                    } catch(e) { resolve({ success: false, error: 'JSON Parse Error: ' + body }); }
                });
            });
            req.on('error', (e) => resolve({ success: false, error: e.message }));
            req.write(postData);
            req.end();
        });
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function runTest() {
    const name = 'fadika';
    const unit = 'Elettil';
    const cat = 'GEN';
    const prog = 'Spot Magazine';
    const stage = 'Stage 5';
    const isGeneral = cat === 'GEN';

    console.log(`Simulating registration for ${name}...`);
    
    // Simulate notification dispatch
    const regularProgText = isGeneral ? '' : (cat ? cat + ': ' : '') + prog;
    const generalProgText = isGeneral ? (cat ? cat + ': ' : '') + prog : '';
    
    console.log("Sending Notification...");
    const res = await sendSectorNotification(name, unit, regularProgText, generalProgText, stage);
    console.log("Notification Result:", res);
}

runTest();
