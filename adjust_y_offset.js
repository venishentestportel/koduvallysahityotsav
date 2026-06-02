const fs = require('fs');
const files = ['admin.html', 'design-studio.html', 'design-studio2.html'];

for (const file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(
            /(let y = \(textEl\.offsetTop \+ borderTop \+ paddingTop\) \* ratioY \+ \(fontSize \* )0\.12\);/g,
            '$10.25);'
        );
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
}
