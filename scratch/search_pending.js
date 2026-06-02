const fs = require('fs');
const path = require('path');

function searchDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== '.wwebjs_cache' && file !== 'whatsapp-session') {
                searchDir(fullPath);
            }
        } else if (file.endsWith('.html') || file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('pending_registrations')) {
                const lines = content.split('\n');
                lines.forEach((line, i) => {
                    if (line.includes('pending_registrations')) {
                        console.log(`${fullPath}:${i+1}: ${line.trim()}`);
                    }
                });
            }
        }
    });
}

searchDir('c:/Users/MI/OneDrive/Desktop/koduvellisahitholsv');
