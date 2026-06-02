const fs = require('fs');
let content = fs.readFileSync('admin.html', 'utf8');

// 1. Add sidebar link
const designLinkMatch = `<div class="sidebar-link" onclick="switchTab('design', this)">
                    <i class="fa fa-palette"></i> Design Studio
                </div>`;
const newDesignLink = `<div class="sidebar-link" onclick="switchTab('design', this)">
                    <i class="fa fa-palette"></i> Design Studio
                </div>
                <div class="sidebar-link" onclick="switchTab('new-design', this)">
                    <i class="fa fa-paint-brush"></i> New Design Studio (Beta)
                </div>`;
content = content.replace(designLinkMatch, newDesignLink);

// 2. Allow 'new-design' in switchTab
content = content.replace(
    `if (level === 'design' && tab !== 'design' && tab !== 'wa-sync') {`,
    `if (level === 'design' && tab !== 'design' && tab !== 'wa-sync' && tab !== 'new-design') {`
);

// 3. Move the blue box
const blueBoxStart = `<div id="section-design" class="admin-section-content">
                <div
                    style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; text-align: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">`;

const blueBoxEnd = `onmouseout="this.style.transform='scale(1)'">Open New React Studio</a>
                </div>`;

const blueBoxIndex = content.indexOf(blueBoxStart);
if (blueBoxIndex !== -1) {
    const endIndex = content.indexOf(blueBoxEnd, blueBoxIndex) + blueBoxEnd.length;
    const blueBoxContent = content.substring(blueBoxIndex + `<div id="section-design" class="admin-section-content">`.length, endIndex);
    
    // Remove the blue box from inside section-design
    const newContent = content.substring(0, blueBoxIndex + `<div id="section-design" class="admin-section-content">`.length) + 
                       content.substring(endIndex);
                       
    // Insert the new section right before section-design
    const newSection = `
            <div id="section-new-design" class="admin-section-content" style="display: none;">${blueBoxContent}
            </div>
            `;
    
    content = newContent.replace(`<div id="section-design" class="admin-section-content">`, newSection + `<div id="section-design" class="admin-section-content">`);
    console.log("Blue box moved successfully!");
} else {
    console.log("Could not find blue box to move.");
}

fs.writeFileSync('admin.html', content);
