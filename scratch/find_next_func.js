const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'design-studio.html');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

for (let i = 5939; i < 5999; i++) {
    if (lines[i] !== undefined) {
        console.log(`${i + 1}: ${lines[i]}`);
    }
}
