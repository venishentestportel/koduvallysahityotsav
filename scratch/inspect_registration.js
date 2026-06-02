const fs = require('fs');
const content = fs.readFileSync('c:/Users/MI/OneDrive/Desktop/koduvellisahitholsv/registration.html', 'utf8');
const lines = content.split('\n');

lines.forEach((line, i) => {
    if (line.includes('pending') || line.includes('queue') || line.includes('list')) {
        if (line.includes('function') || line.includes('push') || line.includes('localStorage') || line.includes('register')) {
            console.log(`${i+1}: ${line.trim()}`);
        }
    }
});
