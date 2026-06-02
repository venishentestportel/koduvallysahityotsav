const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    'admin.html',
    'design-studio.html',
    'design-studio2.html',
    'registration.html',
    'diff-a.js',
    'script.js'
];

filesToUpdate.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Add the BACKEND_URL variable to the top of the script tag or file if it's JS
        // But to be safe, we'll just replace the literal string with a variable that defaults to the hosted URL
        
        // Replaces fetch('http://localhost:3001/...') -> fetch(`${window.WA_BACKEND_URL || 'https://koduvelly-backend.onrender.com'}/...`)
        content = content.replace(/['"`]http:\/\/localhost:3001([^'"`]*)['"`]/g, "`${window.WA_BACKEND_URL || 'https://koduvelly-backend.onrender.com'}$1`");
        
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    } else {
        console.log(`File not found: ${file}`);
    }
});
