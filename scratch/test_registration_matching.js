const backendUrl = "http://localhost:3001";

const cleanSectorName = (str) => {
    if (!str) return '';
    return str.replace(/\s*\(group\)\s*/i, '')
              .toLowerCase()
              .replace(/[\p{P}\p{Z}\p{S}\?]/gu, '')
              .trim();
};

async function runTest() {
    console.log("=== Testing Student Registration WhatsApp Alert Matching ===");
    
    // Sector name with Malayalam vowel signs, punctuation and spaces
    const studentSector = "manipuram";
    const studentName = "Faris Rahman";
    const programsListText = "Senior: Mono Act, GEN: Map Making";

    const cleanStudent = cleanSectorName(studentSector);
    console.log(`Student sector: "${studentSector}"`);
    console.log(`Cleaned student sector: "${cleanStudent}"`);

    try {
        console.log("\n1. Fetching current WhatsApp routing maps...");
        const res = await fetch(`${backendUrl}/whatsapp-routing?clientId=default`);
        if (!res.ok) {
            console.error("Failed to load WhatsApp routing. Is the backend server running?");
            return;
        }

        const data = await res.json();
        console.log("Current active routing keys:", Object.keys(data.routing || {}));

        let matchesCount = 0;
        const routing = data.routing || {};

        for (const chatId of Object.keys(routing)) {
            if (chatId.startsWith('offline_')) continue;

            let targetSector = (routing[chatId].sector || '').trim();
            if (!targetSector) {
                targetSector = (routing[chatId].name || '').trim();
            }

            const cleanTarget = cleanSectorName(targetSector);
            console.log(`Checking routing [${chatId}] - Name: "${routing[chatId].name}", Label: "${routing[chatId].sector || 'N/A'}" (Cleaned: "${cleanTarget}")`);

            if (cleanTarget && cleanTarget === cleanStudent) {
                matchesCount++;
                console.log(`>>> MATCH FOUND for ${chatId}! Preparing alert message...`);
                
                const message = `*Student Registration Alert*\n*Name:* ${studentName}\n*Sector:* ${studentSector}\n*Program:* ${programsListText}`;
                console.log(`Message payload:\n${message}\n`);
            }
        }

        console.log(`=== Done. Matches found: ${matchesCount} ===`);

    } catch (e) {
        console.error("Error during matching test:", e);
    }
}

runTest();
