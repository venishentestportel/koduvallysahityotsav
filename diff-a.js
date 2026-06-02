<script>

        // --- WhatsApp Integration for Registration Manager ---
        async function loadWhatsAppTargets() {
            try {
                const [chatsRes, contactsRes] = await Promise.all([
                    fetch(`${window.WA_BACKEND_URL || 'https://koduvelly-backend.onrender.com'}/chats`),
                    fetch(`${window.WA_BACKEND_URL || 'https://koduvelly-backend.onrender.com'}/contacts`)
                ]);
                const chatsData = await chatsRes.json();
                const contactsData = await contactsRes.json();
                
                let allItems = [];
                if (chatsData.success) allItems = [...chatsData.chats];
                if (contactsData.success) {
                    const chatIds = new Set(allItems.map(c => c.id));
                    contactsData.contacts.forEach(contact => {
                        if (!chatIds.has(contact.id)) allItems.push(contact);
                    });
                }
                
                const container = document.getElementById('whatsapp-targets-container');
                if(!container) return; // if not on admin page
                
                container.innerHTML = '';
                
                if (allItems.length === 0) {
                    container.innerHTML = '<div style="color: #666; font-size: 0.9rem;">No contacts found. Make sure WhatsApp backend is running.</div>';
                    return;
                }

                // Load saved selections from backend
                let savedTargets = [];
                try {
                    const savedRes = await fetch(`${window.WA_BACKEND_URL || 'https://koduvelly-backend.onrender.com'}/whatsapp-targets`);
                    if (savedRes.ok) {
                        const savedData = await savedRes.json();
                        if (savedData.success) savedTargets = savedData.targets;
                    }
                } catch(e){}
                
                const saveSelection = async () => {
                    const checked = Array.from(document.querySelectorAll('.wa-target-checkbox:checked')).map(cb => cb.value);
                    try {
                        await fetch(`${window.WA_BACKEND_URL || 'https://koduvelly-backend.onrender.com'}/whatsapp-targets`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ targets: checked })
                        });
                    } catch(e) {}
                };
                
                allItems.forEach(item => {
                    const div = document.createElement('div');
                    div.style.display = 'flex';
                    div.style.alignItems = 'center';
                    div.style.gap = '8px';
                    
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.className = 'wa-target-checkbox';
                    cb.value = item.id;
                    cb.id = 'wa-target-' + item.id;
                    if (savedTargets.includes(item.id)) cb.checked = true;
                    
                    cb.addEventListener('change', saveSelection);
                    
                    const lbl = document.createElement('label');
                    lbl.htmlFor = cb.id;
                    lbl.innerText = item.name + (item.isGroup ? ' (Group)' : '');
                    lbl.style.cursor = 'pointer';
                    lbl.style.fontSize = '0.9rem';
                    
                    div.appendChild(cb);
                    div.appendChild(lbl);
                    container.appendChild(div);
                });
            } catch (err) {
                console.error('WhatsApp Target Load Error:', err);
                const container = document.getElementById('whatsapp-targets-container');
                if(container) container.innerHTML = '<div style="color: red; font-size: 0.9rem;">Failed to load contacts. Is the WhatsApp backend running? <button onclick="loadWhatsAppTargets()" class="btn" style="padding:2px 8px; font-size:0.8rem;">Retry</button></div>';
            }
        }
        
        // Load targets when the admin panel loads
        setTimeout(loadWhatsAppTargets, 2000);

        // --- Copy & Paste Logic ---
        let clipboardText = null;

        document.addEventListener('keydown', function(e) {
            // Ignore if user is typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            // Copy (Ctrl+C)
            if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyC' || e.key.toLowerCase() === 'c')) {
                if (selectedText) {
                    clipboardText = {
                        text: selectedText.innerText,
                        color: selectedText.style.color,
                        fontSize: selectedText.style.fontSize,
                        fontFamily: selectedText.style.fontFamily,
                        left: selectedText.offsetLeft,
                        top: selectedText.offsetTop
                    };
                }
            }

            // Paste (Ctrl+V)
            if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyV' || e.key.toLowerCase() === 'v')) {
                if (clipboardText) {
                    const canvas = document.getElementById('design-canvas');
                    const textEl = document.createElement('div');
                    textEl.className = 'draggable-text';
                    textEl.innerText = clipboardText.text;
                    textEl.style.position = 'absolute'; // Critical for correct placement
                    textEl.style.left = (clipboardText.left + 20) + 'px'; // Offset slightly
                    textEl.style.top = (clipboardText.top + 20) + 'px';
                    textEl.style.fontSize = clipboardText.fontSize;
                    textEl.style.color = clipboardText.color;
                    textEl.style.fontFamily = clipboardText.fontFamily;

                    textEl.onmousedown = function (ev) {
                        selectText(textEl);
                        startDragging(ev, textEl);
                    };

                    canvas.appendChild(textEl);
                    selectText(textEl);
                    
                    // Update clipboard offset so multiple pastes don't stack directly on top
                    clipboardText.left += 20;
                    clipboardText.top += 20;
                }
            }

            // Delete / Backspace
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedText) {
                    deleteSelectedText();
                }
            }
        });
    </script>