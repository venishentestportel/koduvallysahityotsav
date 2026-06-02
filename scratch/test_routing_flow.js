const url = "https://lxbvadjjboavxwidxsnl.supabase.co";
const key = "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT";
const backendUrl = "http://localhost:3001";

const cleanSectorName = (str) => {
    if (!str) return '';
    return str.replace(/\s*\(group\)\s*/i, '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

async function testFlow() {
    console.log("--- START INTEGRATION TEST ---");
    
    // Test Case 1: Student sector has spaces and dashes, but matches target sector manipulator
    const student1 = {
        name: "Test Student Case 1",
        sector: "Manipu-ram ", // has uppercase, space, and dash
        program: "HS: Calligraphy (Male)",
        stage: "Stage 3",
        url: "http://localhost/test-card-url"
    };

    // Test Case 2: Student sector matches target group name fallback (no explicit sector label entered, GVHBJIOKP group name)
    const student2 = {
        name: "Test Student Case 2",
        sector: "gvh-bj-iokp", // matches GVHBJIOKP name fallback
        program: "Wall Painting",
        stage: "Stage 1",
        url: "http://localhost/test-card-url"
    };

    try {
        console.log("1. Fetching WhatsApp sector routing from local backend...");
        const routingRes = await fetch(`${backendUrl}/whatsapp-routing`);
        if (!routingRes.ok) throw new Error("Failed to fetch routing from backend");

        const routingData = await routingRes.json();
        console.log("Current WhatsApp routing map from server:", routingData);
        const routing = routingData.routing;

        const executeMatch = async (mockStudent) => {
            const name = mockStudent.name;
            const sector = mockStudent.sector;
            const progText = mockStudent.program;
            const cleanStudentSector = cleanSectorName(sector);

            console.log(`\nEvaluating student "${name}" in sector "${sector}" (Cleaned: "${cleanStudentSector}")...`);
            
            let matched = false;
            for (const chatId of Object.keys(routing)) {
                let targetSector = (routing[chatId].sector || "").trim();
                if (!targetSector) {
                    targetSector = (routing[chatId].name || "").trim();
                }

                const cleanTarget = cleanSectorName(targetSector);
                console.log(`- Checking target chatId "${chatId}" (Name: "${routing[chatId].name}", Sector Label: "${routing[chatId].sector || 'EMPTY'}", Cleaned Target: "${cleanTarget}")`);

                if (cleanTarget && cleanTarget === cleanStudentSector) {
                    console.log(`  => MATCH FOUND! Sending WhatsApp message to ${chatId}...`);
                    matched = true;

                    const message = `*Student Registration Alert*\n*Name:* ${name}\n*Sector:* ${sector}\n*Program:* ${progText}`;
                    
                    const sendRes = await fetch(`${backendUrl}/send-message`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ chatId: chatId, message: message })
                    });

                    if (sendRes.ok) {
                        const sendData = await sendRes.json();
                        console.log(`  => Send response:`, sendData);
                    } else {
                        console.error(`  => Failed to send message:`, await sendRes.text());
                    }
                }
            }

            if (!matched) {
                console.log("  => No matches found.");
            }
        };

        await executeMatch(student1);
        await executeMatch(student2);

        console.log("\n--- TEST COMPLETED ---");

    } catch (e) {
        console.error("Test failed with error:", e);
    }
}

testFlow();
