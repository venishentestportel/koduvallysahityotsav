const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'design-studio.html');
const content = fs.readFileSync(filePath, 'utf8');

const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let index = 1;

while ((match = scriptRegex.exec(content)) !== null) {
    const scriptCode = match[1];
    if (!scriptCode.trim()) continue;

    if (index === 2) {
        const beforeBlock = content.substring(0, match.index);
        const startLineNum = beforeBlock.split('\n').length;
        console.log(`Block 2 starts at file line ${startLineNum}`);
        
        const lines = scriptCode.split('\n');
        console.log(`Line 1600 to 1630 of Block 2:`);
        for (let i = 1600; i < 1630; i++) {
            if (lines[i] !== undefined) {
                console.log(`${i + 1} (File line ${startLineNum + i}): ${lines[i]}`);
            }
        }
    }
    index++;
}
