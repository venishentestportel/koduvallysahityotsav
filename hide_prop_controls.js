const fs = require('fs');

const files = ['admin.html', 'design-studio.html', 'design-studio2.html'];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');

    // Prevent prop-controls from showing and pushing the workspace down
    content = content.replace(/document\.getElementById\('prop-controls'\)\.style\.display = 'block';/g, "// document.getElementById('prop-controls').style.display = 'block'; // Disabled to prevent workspace shift");

    fs.writeFileSync(file, content);
    console.log("Updated", file);
}
