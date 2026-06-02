const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'design-studio.html');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

for (let i = 4290; i < 4360; i++) {
    if (lines[i] !== undefined) {
        console.log(`${i + 1}: ${lines[i]}`);
    }
}
