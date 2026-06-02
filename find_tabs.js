const fs = require('fs');
const s = fs.readFileSync('admin.html', 'utf8');
const lines = s.split('\n');

console.log('Sidebar li tags:');
lines.forEach(l => {
    if (l.includes('<li') && l.includes('onclick')) console.log(l.trim());
});

console.log('\nSearch for showTab or switchTab or showSection:');
lines.forEach((l, i) => {
    if (l.match(/(showTab|switchTab|showSection|changeTab)/)) {
        console.log(i + 1, l.trim());
    }
});
