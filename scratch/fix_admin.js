const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'admin.html');
let content = fs.readFileSync(filePath, 'utf8');

const newBlock = `        function extractPdfHeader(items, rankIdx, currentData) {
            let preRankItems = [];
            for (let i = Math.max(0, rankIdx - 8); i < rankIdx; i++) {
                if (items[i] && items[i].trim() !== '') preRankItems.push(items[i].trim());
            }

            let resultNo = '';
            let compStrIdx = preRankItems.findIndex(s => /#\\d+/.test(s) || /^(result|comp).*\\d/i.test(s));

            if (compStrIdx !== -1) {
                const compStr = preRankItems[compStrIdx];
                const match = compStr.match(/#\\d+/);
                resultNo = match ? match[0] : compStr;
                preRankItems.splice(compStrIdx, 1);
            } else {
                resultNo = \`R\${Date.now().toString().slice(-4)}\`;
            }

            let category = 'Unknown';
            let program = 'Unknown';

            let catIndex = -1;
            if (typeof currentData !== 'undefined' && currentData.categories) {
                for (let i = preRankItems.length - 1; i >= 0; i--) {
                    if (currentData.categories.some(c => c.toLowerCase() === preRankItems[i].toLowerCase())) {
                        catIndex = i;
                        break;
                    }
                }
            }

            if (catIndex !== -1) {
                category = preRankItems[catIndex];

                const isNoise = (s) => /sahithyolsav|published|results|time|date|comp|#\\d+/i.test(s);

                let beforeParts = [];
                for (let i = 0; i < catIndex; i++) {
                    if (!isNoise(preRankItems[i])) {
                        beforeParts.push(preRankItems[i]);
                    }
                }
                let before = beforeParts.join(' ');

                let afterParts = [];
                for (let i = catIndex + 1; i < preRankItems.length; i++) {
                    if (!isNoise(preRankItems[i])) {
                        afterParts.push(preRankItems[i]);
                    }
                }
                let after = afterParts.join(' ');

                if (before && (!after || before.length >= after.length)) {
                    program = before;
                } else if (after) {
                    program = after;
                } else {
                    program = 'Unknown';
                }
            } else {
                category = preRankItems.length > 1 ? preRankItems[preRankItems.length - 2] : 'Unknown';

                // If category wasn't found in the preset list, just join the rest for the program
                let progParts = [];
                for (let i = 0; i < preRankItems.length - 2; i++) {
                    progParts.push(preRankItems[i]);
                }
                if (progParts.length === 0 && preRankItems.length > 0) {
                    progParts.push(preRankItems[preRankItems.length - 1]);
                }
                program = progParts.join(' ') || 'Unknown';

                // Swap if needed
                if (typeof currentData !== 'undefined' && currentData.categories) {
                    const isCat0 = currentData.categories.some(c => c.toLowerCase() === category.toLowerCase());
                    const isCat1 = currentData.categories.some(c => c.toLowerCase() === program.toLowerCase());
                    if (isCat1 && !isCat0) {
                        let temp = category; category = program; program = temp;
                    }
                }
            }

            return { category, program, resultNo };
        }

        function cleanExtractedPdfText(val, isNameOrUnit = false) {
            if (typeof val !== 'string') return val;
            
            // Phrases to remove (case-insensitive, as complete words or exact matches)
            const phrasesToRemove = [
                /\\bIn\\s+Progress\\b/gi,
                /\\bManage\\s+Event\\b/gi,
                /\\bManeg\\s+Event\\b/gi,
                /\\bManage\\b/gi,
                /\\bManeg\\b/gi,
                /\\bEvent\\b/gi,
                /\\bSubmitted\\b/gi,
                /\\bSubmit\\b/gi,
                /\\bpoints\\b/gi,
                /\\bpoint\\b/gi,
                /\\bview\\b/gi,
                /\\bstatus\\b/gi,
                /\\baction\\s*s?\\b/gi,
                /\\bpending\\b/gi,
                /\\bverified\\b/gi,
                /\\bscore\\b/gi,
                /\\bmarks?\\b/gi,
                /\\bedit\\b/gi,
                /\\bdelete\\b/gi,
                /\\bdetails\\b/gi,
                /\\bChest\\s*#?\\b/gi,
                /\\bSl\\s*No\\.?\\b/gi,
                /\\bParticipant\\b/gi,
                /\\bCode\\s*Letter\\b/gi,
                /\\bTeam\\b/gi,
                /\\bGrade\\b/gi,
                /\\bPrize\\b/gi,
                /\\b1st\\s*Prize\\b/gi,
                /\\b2nd\\s*Prize\\b/gi,
                /\\b3rd\\s*Prize\\b/gi,
                /\\b4th\\s*Prize\\b/gi,
                /\\b[1-9]th\\s*Prize\\b/gi,
                /\\bcompleestion\\s+result\\s*,?\\s*and\\b/gi,
                /\\bcompleestion\\s+results?\\b/gi,
                /\\bcompletion\\s+result\\s*,?\\s*and\\b/gi,
                /\\bcompletion\\s+results?\\b/gi,
                /\\bcompetition\\s+result\\s*,?\\s*and\\b/gi,
                /\\bcompetition\\s+results?\\b/gi,
                /\\bcompetition\\b/gi,
                /\\bcompleestion\\b/gi,
                /\\bcompletion\\b/gi,
                /\\bresults?\\b/gi,
                /[🥇🥈🥉]/g
            ];
            
            let cleaned = val;
            phrasesToRemove.forEach(regex => {
                cleaned = cleaned.replace(regex, '');
            });
            
            // Extra cleaning for name and unit fields
            if (isNameOrUnit) {
                // Remove single letter codes (A, B, C, D, etc.) when isolated by boundaries
                cleaned = cleaned.replace(/\\b[a-zA-Z]\\b/g, '');
                
                // Remove all numbers (scores, chest numbers, rank numbers)
                cleaned = cleaned.replace(/\\b\\d+\\b/g, '');
                cleaned = cleaned.replace(/\\b\\d+(st|nd|rd|th)\\b/gi, '');
                
                // Strip punctuation artifacts like single dots, commas, hyphens or "..."
                cleaned = cleaned.replace(/\\b\\.\\.\\.\\b/g, '');
                cleaned = cleaned.replace(/[.,\\-\\//\\\\#+()$~%'":*?<>{}]/g, ' ');
            }
            
            return cleaned.replace(/\\s+/g, ' ').trim();
        }

        async function handlePdfResultUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const btnLabel = document.getElementById('pdf-upload-label');
            const oldHtml = btnLabel.innerHTML;
            btnLabel.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Parsing PDF...';

            try {
                const fileReader = new FileReader();
                fileReader.onload = async function () {
                    try {
                        const typedarray = new Uint8Array(this.result);

                        const pdfjsLib = window['pdfjs-dist/build/pdf'];
                        if (!pdfjsLib) throw new Error("PDF.js library not loaded yet.");
                        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

                        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                        const page = await pdf.getPage(1);
                        const textContent = await page.getTextContent();

                        if (!window.selectedAiTemplate) {
                            throw new Error("Please select an AI PDF Template first from the sidebar before uploading a PDF.");
                        }

                        
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

                        const viewport = page.getViewport({ scale: 1.0 });
                        let extractedData = {};

                        window.selectedAiTemplate.data.regions.forEach(region => {
                            const left = region.boundingBox.x * viewport.width;
                            const top = region.boundingBox.y * viewport.height;
                            const right = left + (region.boundingBox.w * viewport.width);
                            const bottom = top + (region.boundingBox.h * viewport.height);

                            let regionText = [];
                            textContent.items.forEach(item => {
                                const textX = item.transform[4];
                                const textY = viewport.height - item.transform[5];
                                const textW = item.width;
                                const textH = item.height || 10;
                                const cx = textX + (textW / 2);
                                const cy = textY - (textH / 2);

                                if (cx >= left && cx <= right && cy >= top && cy <= bottom) {
                                    regionText.push(item.str.trim());
                                }
                            });

                            const labelLower = region.label.toLowerCase();
                            const isNameOrUnit = labelLower.includes('name') || labelLower.includes('place') || labelLower.includes('unit');

                            let cleanedText = regionText.join(' ');
                            cleanedText = cleanExtractedPdfText(cleanedText, isNameOrUnit);
                            extractedData[region.label] = cleanedText;
                        });

                        // Clean up program result numbers (e.g., "#66") from the extracted program names
                        ['Program', 'program', 'Programs', 'p'].forEach(k => {
                            if (extractedData[k] && typeof extractedData[k] === 'string') {
                                extractedData[k] = extractedData[k].replace(/#\\d+/g, '').trim();
                            }
                        });

                        let category = extractedData['Category'] || extractedData['category'] || extractedData['Categoriy'] || extractedData['c'] || 'Unknown';
                        let program = extractedData['Program'] || extractedData['program'] || extractedData['Programs'] || extractedData['p'] || 'Unknown';
                        let resultNo = extractedData['Result'] || extractedData['result'] || extractedData['r'] || Date.now().toString().slice(-4);

                        // Intelligently parse headers if Category or Program contains split patterns
                        let fullHeader = "";
                        [category, program].forEach(val => {
                            if (val && val.includes('-') && val.length > fullHeader.length) {
                                fullHeader = val;
                            }
                        });

                        if (fullHeader) {
                            if (fullHeader.includes(':')) {
                                const colonParts = fullHeader.split(':');
                                if (colonParts.length >= 2) {
                                    resultNo = colonParts[0].trim();
                                    const rest = colonParts.slice(1).join(':');
                                    const dashParts = rest.split('-');
                                    if (dashParts.length >= 2) {
                                        category = dashParts[0].trim();
                                        program = dashParts.slice(1).join('-').trim();
                                    }
                                }
                            } else {
                                const dashParts = fullHeader.split('-');
                                if (dashParts.length >= 2) {
                                    category = dashParts[0].trim();
                                    program = dashParts.slice(1).join('-').trim();
                                }
                            }
                        }

                        // Assign normalized values back to all variations to guarantee a match with canvas placeholders
                        extractedData['Category'] = extractedData['category'] = extractedData['Categoriy'] = extractedData['c'] = category;
                        extractedData['Program'] = extractedData['program'] = extractedData['Programs'] = extractedData['p'] = program;
                        extractedData['Result'] = extractedData['result'] = extractedData['r'] = resultNo;

                        // Auto-populate design canvas texts dynamically by matching AI labels
                        const texts = Array.from(document.querySelectorAll('#design-canvas .draggable-text'));

                        texts.forEach(el => {
                            const txt = el.getAttribute('data-placeholder') || el.innerText.trim();
                            if (!el.hasAttribute('data-placeholder')) {
                                el.setAttribute('data-placeholder', txt);
                            }
`;

// Regex replacement targeting the function extractPdfHeader up to texts.forEach(el => {
const pattern = /function extractPdfHeader\(items, rankIdx, currentData\) \{[\s\S]*?texts\.forEach\(el => \{/;
if (pattern.test(content)) {
    console.log("Pattern matched! Performing replacement...");
    content = content.replace(pattern, newBlock);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("admin.html successfully fixed!");
} else {
    console.log("Pattern NOT found in admin.html!");
}
