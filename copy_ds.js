const fs = require('fs');

let admin = fs.readFileSync('admin.html', 'utf8');

// Remove login overlay completely
admin = admin.replace(/<div id="login-overlay"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '');

// Prevent crashes from missing login-overlay
admin = admin.replace(/document\.getElementById\('login-overlay'\)\.style\.display = 'none';/g, '');
admin = admin.replace(/document\.getElementById\('login-overlay'\)\.style\.opacity = '0';/g, '');

// Hide sidebar
admin = admin.replace(/<aside class="sidebar"/, '<aside class="sidebar" style="display: none;"');

// Hide admin-top-bar
admin = admin.replace(/<div class="admin-top-bar"/, '<div class="admin-top-bar" style="display: none;"');

// Make main content full width
admin = admin.replace(/<div class="main-content" style="flex: 1; padding: 2rem;">/, '<div class="main-content" style="flex: 1; padding: 2rem; width: 100%;">');

// Automatically set isLoggedIn to true so any admin checks pass
admin = admin.replace(/let isLoggedIn = false;/, 'let isLoggedIn = true;');

// Inject script at the end to force the design tab to be active and load state
const initScript = `
<script>
    document.addEventListener('DOMContentLoaded', () => {
        // Force Design Studio tab to be active
        document.querySelectorAll('.admin-section-content').forEach(s => s.classList.remove('active'));
        const designTab = document.getElementById('section-design');
        if (designTab) designTab.classList.add('active');
        
        // Hide global save button
        const saveAllBtn = document.getElementById('save-all-btn-container');
        if (saveAllBtn) saveAllBtn.style.display = 'none';

        // Manually load draft data since login is bypassed
        try {
            const draft = JSON.parse(localStorage.getItem('koduvelly_admin_draft'));
            if (draft) {
                if (typeof currentData !== 'undefined') currentData = draft.data;
                if (draft.aiTemplate) window.selectedAiTemplate = draft.aiTemplate;
            }
        } catch(e) {}

        // Load design data
        if(typeof renderPublishedPosters === 'function') renderPublishedPosters();
        if(typeof loadTemplatePicker === 'function') loadTemplatePicker();
    });
</script>
`;

admin = admin.replace(/<\/body>/, initScript + '\n</body>');

fs.writeFileSync('design-studio.html', admin);
console.log('Successfully copied and updated design-studio.html (with proper state initialization for bulk upload)');
