const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'design-studio.html');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
    if (line.includes('cleanExtractedPdfText')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
