# 6502 Debugger Project

## Overview
The idea is to create a Single Page Application (SPA) debugger for the 6502 processor.

### Is this a good idea?
**Yes.** It is a very doable project. It involves four main components:
1.  **The UI:** A text editor for assembly and buttons for controls.
2.  **The Parser:** A converter that turns Assembly text (e.g., `LDA #$01`) into Machine Code (Hex/Binary) that the CPU understands.
3.  **The Core:** The emulator logic that fetches, decodes, and executes the machine code instructions.
4.  **The IO:** A way to load binary files and visualize the memory/state of the processor.

---

## UI Design

### 1. The Editor Component
We need a custom "Line Number + Text" overlay. This allows using a raw HTML `<textarea>` for input while adding the visual polish of line numbers.

**HTML Structure:**
```html
<div class="editor-wrapper">
    <div id="line-numbers" class="line-numbers">
        1
    </div>
    <textarea id="code-editor" spellcheck="false" placeholder=".ORG $C000&#10;LDA #$01&#10;STA $0200"></textarea>
</div>
```

**CSS (Make sure the fonts and heights match):**
```css
.editor-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 400px;
    border: 1px solid #444;
    background: #222;
    position: relative;
    font-family: 'Courier New', Courier, monospace;
}

.line-numbers {
    width: 40px;
    background: #111;
    color: #888;
    text-align: right;
    padding: 10px 5px;
    border-right: 1px solid #444;
    user-select: none;
    overflow: hidden;
}

#code-editor {
    flex-grow: 1;
    background: #222;
    color: #ddd;
    border: none;
    resize: none;
    padding: 10px;
    outline: none;
    white-space: pre;
    overflow-y: scroll;
}
```

**JavaScript (For the Line Numbers):**
```javascript
const editor = document.getElementById('code-editor');
const lineNumbers = document.getElementById('line-numbers');

function updateLineNumbers() {
    const lines = editor.value.split('\n').length;
    lineNumbers.innerHTML = Array(lines).fill(0).map((_, i) => i + 1).join('<br>');
}

editor.addEventListener('input', updateLineNumbers);
editor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editor.scrollTop;
});

updateLineNumbers(); // Run on load
```

### 2. The Control Panel
This goes below the editor. Buttons to control the emulation loop.

**HTML Structure:**
```html
<div class="controls">
    <button id="btn-run" class="btn primary">▶ Run</button>
    <button id="btn-step" class="btn">⏯ Step</button>
    <button id="btn-reset" class="btn secondary">↺ Reset</button>
</div>
```

**CSS:**
```css
.controls {
    margin-top: 10px;
    display: flex;
    gap: 10px;
}

.btn {
    padding: 8px 16px;
    background: #333;
    color: white;
    border: 1px solid #555;
    cursor: pointer;
    font-family: inherit;
}

.btn.primary { background: #0066cc; border-color: #004499; }
.btn:hover { filter: brightness(1.2); }
```

### 3. Loading Code
Handling "Pasting" or "Loading via button".

**HTML:**
```html
<div class="io-controls">
    <button id="btn-load-file">📂 Load Binary</button>
    <input type="file" id="file-input" accept=".bin,.asm" style="display:none">
</div>
```

**JavaScript:**
```javascript
const fileInput = document.getElementById('file-input');
const btnLoad = document.getElementById('btn-load-file');

btnLoad.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        // 1. Get the binary data (Uint8Array)
        const buffer = event.target.result;
        const data = new Uint8Array(buffer);

        // 2. Dump into memory (Assuming you have a 'memory' array in your emulator logic)
        // e.g. copy(data, memoryArray, Math.min(data.length, memoryArray.length));
        
        // 3. Update UI to show it loaded
        console.log("Loaded", data.length, "bytes into memory at $0000");
    };
    reader.readAsArrayBuffer(file);
});
```

## Integration
1. User pastes 6502 Assembly into `#code-editor`.
2. User clicks **"Run"**.
3. JS parses text -> converts to Hex.
4. Hex bytes pushed into CPU `Memory`.
5. Emulator loop starts (using `requestAnimationFrame` or `setTimeout`) fetching and executing instructions.