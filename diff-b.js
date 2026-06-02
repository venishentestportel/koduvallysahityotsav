<script>



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