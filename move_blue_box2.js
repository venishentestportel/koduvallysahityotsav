const fs = require('fs');
let content = fs.readFileSync('admin.html', 'utf8');

const blueBoxStart = `<div id="section-design" class="admin-section-content">
                <div
                    style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; text-align: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">`;

const blueBoxEnd = `onmouseout="this.style.transform='scale(1)'">Open New React Studio</a>
                </div>`;

const searchStart = content.indexOf(blueBoxStart);
if (searchStart !== -1) {
    const searchEnd = content.indexOf(blueBoxEnd, searchStart) + blueBoxEnd.length;
    
    // Extract the inner div ONLY, not the section-design wrapper
    const innerBoxStart = content.indexOf('<div', searchStart + `<div id="section-design" class="admin-section-content">`.length);
    const innerBoxContent = content.substring(innerBoxStart, searchEnd);
    
    // The new content replaces the innerBoxContent inside section-design with nothing,
    // and prepends the new section.
    
    const pre = content.substring(0, searchStart);
    const post = content.substring(searchEnd);
    
    const newSectionHTML = `
            <!-- Section: New Design Studio Beta -->
            <div id="section-new-design" class="admin-section-content" style="display: none;">
                ${innerBoxContent}
            </div>

            <!-- Section: Design Studio -->
            <div id="section-design" class="admin-section-content">`;
            
    const finalContent = pre + newSectionHTML + post;
    
    fs.writeFileSync('admin.html', finalContent);
    console.log('Blue box successfully moved to section-new-design!');
} else {
    console.log('Failed to find blue box.');
}
