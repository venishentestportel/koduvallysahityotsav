const fs = require('fs');

const files = ['admin.html', 'design-studio.html', 'design-studio2.html'];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');

    // Remove hover events for popover
    content = content.replace(/\/\/ Hover events for popover\s*textEl\.addEventListener\('mouseenter', \(\) => {\s*showPopoverForText\(textEl\);\s*}\);\s*textEl\.addEventListener\('mouseleave', \(\) => {\s*hidePopoverWithDelay\(\);\s*}\);/g, '// Hover events removed to enforce strict click-to-lock behavior');

    fs.writeFileSync(file, content);
    console.log("Updated", file);
}
