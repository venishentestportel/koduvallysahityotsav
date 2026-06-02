const fs = require('fs');

const tieDetectionLogic = `
                        // --- MULTIPLE CANDIDATE / TIE DETECTION ---
                        document.querySelectorAll('.dynamic-tie-text').forEach(el => el.remove());
                        const itemsRaw = textContent.items.map(i => i.str.trim()).filter(s => s !== '');
                        let rankCounts = {};
                        let tiesFound = [];
                        for (let i = 0; i < itemsRaw.length; i++) {
                            const text = itemsRaw[i];
                            if (/^(1st|2nd|3rd)$/i.test(text)) {
                                let rank = text.toLowerCase();
                                if (!rankCounts[rank]) rankCounts[rank] = [];
                                let name = itemsRaw[i+2] || 'Unknown Candidate';
                                let team = itemsRaw[i+3] || 'Unknown Team';
                                rankCounts[rank].push({ name, team });
                            }
                        }
                        for (let rank in rankCounts) {
                            if (rankCounts[rank].length > 1) {
                                tiesFound.push({ rank, extraCandidates: rankCounts[rank].slice(1) });
                            }
                        }
                        // ------------------------------------------
`;

const tiePromptLogic = `
                        // --- TIE PROMPT LOGIC ---
                        if (tiesFound.length > 0) {
                            let positions = tiesFound.map(t => t.rank).join(", ");
                            if (confirm(\`There are more candidates in the \${positions} position. Do you want to add them automatically?\`)) {
                                let topOffset = 200;
                                const canvas = document.getElementById('design-canvas');
                                tiesFound.forEach(tie => {
                                    tie.extraCandidates.forEach(cand => {
                                        const nameEl = document.createElement('div');
                                        nameEl.className = 'draggable-text dynamic-tie-text';
                                        nameEl.innerText = cand.name;
                                        nameEl.style.left = '50px';
                                        nameEl.style.top = topOffset + 'px';
                                        nameEl.style.fontSize = '24px';
                                        nameEl.style.color = '#000000';
                                        nameEl.style.fontFamily = "'Outfit', sans-serif";
                                        canvas.appendChild(nameEl);
                                        if (typeof initDraggableText === 'function') initDraggableText(nameEl);

                                        const teamEl = document.createElement('div');
                                        teamEl.className = 'draggable-text dynamic-tie-text';
                                        teamEl.innerText = cand.team;
                                        teamEl.style.left = '50px';
                                        teamEl.style.top = (topOffset + 30) + 'px';
                                        teamEl.style.fontSize = '18px';
                                        teamEl.style.color = '#666666';
                                        teamEl.style.fontFamily = "'Outfit', sans-serif";
                                        canvas.appendChild(teamEl);
                                        if (typeof initDraggableText === 'function') initDraggableText(teamEl);

                                        topOffset += 80;
                                    });
                                });
                            }
                        }
                        // ------------------------
`;

const files = ['admin.html', 'design-studio.html', 'design-studio2.html'];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');

    // For single upload
    const singleTarget1 = "const viewport = page.getViewport({ scale: 1.0 });";
    content = content.replace(singleTarget1, tieDetectionLogic + "\n" + singleTarget1);

    const singleTarget2 = "alert(\"Template populated successfully!\");";
    content = content.replace(singleTarget2, tiePromptLogic + "\n                        " + singleTarget2);

    // For bulk upload
    const bulkTarget1 = "let extractedData = null;";
    content = content.replace(bulkTarget1, tieDetectionLogic + "\n                        " + bulkTarget1);

    const bulkTarget2 = "const dataUrl = await new Promise(resolve => {";
    content = content.replace(bulkTarget2, tiePromptLogic + "\n                        " + bulkTarget2);

    fs.writeFileSync(file, content);
    console.log("Updated", file);
}
