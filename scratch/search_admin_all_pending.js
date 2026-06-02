const fs = require('fs');
const content = fs.readFileSync('c:/Users/MI/OneDrive/Desktop/koduvellisahitholsv/admin.html', 'utf8');
const lines = content.split('\n');

lines.forEach((line, i) => {
    if (line.toLowerCase().includes('pending')) {
        console.log(`${i+1}: ${line.trim()}`);
    }
});
