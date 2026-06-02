const fs = require('fs');
const content = fs.readFileSync('c:/Users/MI/OneDrive/Desktop/koduvellisahitholsv/registration.html', 'utf8');
const lines = content.split('\n');

lines.forEach((line, i) => {
    if (line.includes('localStorage')) {
        console.log(`${i+1}: ${line.trim()}`);
    }
});
