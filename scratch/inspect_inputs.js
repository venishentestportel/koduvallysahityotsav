const fs = require('fs');
const content = fs.readFileSync('c:/Users/MI/OneDrive/Desktop/koduvellisahitholsv/registration.html', 'utf8');
const lines = content.split('\n');

lines.forEach((line, i) => {
    if (line.includes('<input') || line.includes('<select') || line.includes('function ')) {
        console.log(`${i+1}: ${line.trim()}`);
    }
});
