// debugger.js — UI Controller
// Depends on assembler.js (assemble) and cpu.js (CPU6502)

const DEFAULT_PROGRAM = `; 6502 Counter Demo
; Fills memory $0200-$02FF with values $00-$FF
; Step through slowly or hit Run to watch it go.

    .ORG $C000

    LDA #$00        ; Load 0 into A
    LDX #$00        ; X is the loop index

LOOP:
    STA $0200,X     ; Store A at $0200+X
    CLC             ; Clear carry before add
    ADC #$01        ; Increment A by 1
    INX             ; Increment X
    BNE LOOP        ; Loop until X wraps to 0

    BRK             ; Done — signals halt
`;

// ── State ───────────────────────────────────────────────────────────────────
let cpu = new CPU6502();
let assembled = null;  // last successful assembly result
let running = false;
let runTimer = null;
let memBase = 0xC000;

// ── DOM refs ─────────────────────────────────────────────────────────────────
const editorEl    = document.getElementById('editor');
const lineNumsEl  = document.getElementById('line-nums');
const btnAssemble = document.getElementById('btn-assemble');
const btnStep     = document.getElementById('btn-step');
const btnRun      = document.getElementById('btn-run');
const btnStop     = document.getElementById('btn-stop');
const btnReset    = document.getElementById('btn-reset');
const speedEl     = document.getElementById('speed');
const speedLblEl  = document.getElementById('speed-lbl');
const statusEl    = document.getElementById('status-bar');
const memViewEl   = document.getElementById('memory-view');
const memAddrEl   = document.getElementById('mem-addr');
const memPrevEl   = document.getElementById('mem-prev');
const memNextEl   = document.getElementById('mem-next');
const memGoPCEl   = document.getElementById('mem-goto-pc');
const consoleEl   = document.getElementById('console-log');
const stackViewEl = document.getElementById('stack-view');
const btnClearLog = document.getElementById('btn-clear-log');

const regEls = {
  a:  document.getElementById('r-a'),
  x:  document.getElementById('r-x'),
  y:  document.getElementById('r-y'),
  pc: document.getElementById('r-pc'),
  sp: document.getElementById('r-sp'),
};
const flagEls = {
  n: document.getElementById('f-n'),
  v: document.getElementById('f-v'),
  b: document.getElementById('f-b'),
  d: document.getElementById('f-d'),
  i: document.getElementById('f-i'),
  z: document.getElementById('f-z'),
  c: document.getElementById('f-c'),
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function hex2(n) { return (n & 0xFF).toString(16).toUpperCase().padStart(2, '0'); }
function hex4(n) { return (n & 0xFFFF).toString(16).toUpperCase().padStart(4, '0'); }

function log(msg, cls) {
  const el = document.createElement('div');
  el.className = cls || 'log-info';
  el.textContent = '> ' + msg;
  consoleEl.appendChild(el);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function setStatus(msg, color) {
  statusEl.textContent = msg;
  statusEl.style.color = color || 'var(--muted)';
}

// ── Speed config ─────────────────────────────────────────────────────────────
function getSpeedConfig() {
  const s = parseInt(speedEl.value);
  const labels   = ['1 Hz', 'Slow', 'Medium', 'Fast', 'Turbo'];
  const configs  = [
    [1, 1000],    // 1 step/s
    [10, 100],    // ~100/s
    [100, 50],    // ~2k/s
    [1000, 16],   // ~60k/s
    [10000, 16],  // ~600k/s
  ];
  speedLblEl.textContent = labels[s - 1] || 'Medium';
  return configs[s - 1] || configs[2];
}

// ── UI Render ─────────────────────────────────────────────────────────────────
function updateRegisters() {
  regEls.a.textContent  = '$' + hex2(cpu.A);
  regEls.x.textContent  = '$' + hex2(cpu.X);
  regEls.y.textContent  = '$' + hex2(cpu.Y);
  regEls.pc.textContent = '$' + hex4(cpu.PC);
  regEls.sp.textContent = '$' + hex2(cpu.SP);

  function setFlag(el, val) {
    el.textContent = val;
    el.className = 'fv' + (val ? ' on' : '');
  }
  setFlag(flagEls.n, cpu.N);
  setFlag(flagEls.v, cpu.V);
  setFlag(flagEls.b, cpu.B);
  setFlag(flagEls.d, cpu.D);
  setFlag(flagEls.i, cpu.I);
  setFlag(flagEls.z, cpu.Z);
  setFlag(flagEls.c, cpu.C);
}

function updateStack() {
  let html = '';
  for (let i = 0; i < 6; i++) {
    const a = 0x100 | ((cpu.SP + 1 + i) & 0xFF);
    const marker = i === 0 && cpu.SP < 0xFF ? '<span class="sp-marker">→</span>' : '  ';
    html += `<div class="stack-row">${marker}<span class="stack-addr">$${hex4(a)}</span> <span class="stack-val">$${hex2(cpu.read(a))}</span></div>`;
  }
  stackViewEl.innerHTML = html;
}

function updateMemory() {
  const ROWS = 8, COLS = 16;
  const pc = cpu.PC;
  memAddrEl.textContent = '$' + hex4(memBase);
  let html = '';
  for (let r = 0; r < ROWS; r++) {
    const rowAddr = (memBase + r * COLS) & 0xFFFF;
    let row = `<span class="maddr">${hex4(rowAddr)}:</span>`;
    for (let c = 0; c < COLS; c++) {
      if (c === 8) row += '<span class="msep"> </span>';
      const byteAddr = (rowAddr + c) & 0xFFFF;
      const val = cpu.memory[byteAddr];
      const isCurrent = byteAddr === pc;
      row += ` <span class="${isCurrent ? 'mbyte cur' : 'mbyte'}">${hex2(val)}</span>`;
    }
    html += `<div class="mrow">${row}</div>`;
  }
  memViewEl.innerHTML = html;
}

function updateLineNums() {
  const lines = editorEl.value.split('\n');
  const activeLine = assembled ? assembled.addrToLine[cpu.PC] : undefined;
  let html = '';
  for (let i = 0; i < lines.length; i++) {
    html += `<span${i === activeLine ? ' class="active"' : ''}>${i + 1}</span>`;
  }
  lineNumsEl.innerHTML = html;
}

function scrollMemToPC() {
  if (cpu.PC < memBase || cpu.PC >= memBase + 128) {
    memBase = cpu.PC & 0xFFF0;
  }
}

function updateAll() {
  updateRegisters();
  updateStack();
  scrollMemToPC();
  updateMemory();
  updateLineNums();
}

// ── Sync editor scroll → line numbers ────────────────────────────────────────
editorEl.addEventListener('scroll', () => { lineNumsEl.scrollTop = editorEl.scrollTop; });
editorEl.addEventListener('input', updateLineNums);

// ── Core actions ──────────────────────────────────────────────────────────────
function doAssemble() {
  stopRun();
  const result = assemble(editorEl.value);
  if (result.errors.length) {
    result.errors.forEach(e => log(e, 'log-error'));
    setStatus('Assembly failed', 'var(--accent-alt)');
    return false;
  }
  assembled = result;
  cpu.memory.fill(0);
  cpu.load(result.bytes, result.origin);
  cpu.reset();
  const n = result.bytes.length;
  log(`Assembled ${n} byte${n !== 1 ? 's' : ''} at $${hex4(result.origin)}`, 'log-ok');
  setStatus('Ready');
  memBase = result.origin & 0xFFF0;
  btnStep.disabled = false;
  btnRun.disabled = false;
  btnReset.disabled = false;
  updateAll();
  return true;
}

function doStep() {
  if (!assembled && !doAssemble()) return;
  const res = cpu.step();
  updateAll();
  if (res.brk) {
    log('BRK — program ended', 'log-ok');
    setStatus('BRK');
    stopRun();
  } else if (res.halted) {
    log(res.reason, 'log-error');
    setStatus('Halted', 'var(--accent-alt)');
    stopRun();
  } else {
    setStatus('PC $' + hex4(cpu.PC));
  }
}

function doReset() {
  stopRun();
  if (assembled) {
    cpu.memory.fill(0);
    cpu.load(assembled.bytes, assembled.origin);
  }
  cpu.reset();
  log('Reset — PC $' + hex4(cpu.PC));
  setStatus('Reset');
  updateAll();
}

// ── Run loop ──────────────────────────────────────────────────────────────────
function runLoop() {
  const [steps, interval] = getSpeedConfig();
  let halt = false;
  for (let i = 0; i < steps; i++) {
    const res = cpu.step();
    if (res.brk) {
      log('BRK — program ended', 'log-ok');
      setStatus('BRK');
      halt = true;
      break;
    }
    if (res.halted) {
      log(res.reason, 'log-error');
      setStatus('Halted', 'var(--accent-alt)');
      halt = true;
      break;
    }
  }
  updateAll();
  if (halt) { stopRun(); return; }
  runTimer = setTimeout(runLoop, interval);
}

function startRun() {
  if (!assembled && !doAssemble()) return;
  running = true;
  btnRun.style.display  = 'none';
  btnStop.style.display = '';
  btnStep.disabled = true;
  btnAssemble.disabled = true;
  setStatus('Running…');
  runLoop();
}

function stopRun() {
  if (runTimer) { clearTimeout(runTimer); runTimer = null; }
  running = false;
  btnRun.style.display  = '';
  btnStop.style.display = 'none';
  btnStep.disabled = !assembled;
  btnAssemble.disabled = false;
}

// ── Event wiring ──────────────────────────────────────────────────────────────
btnAssemble.addEventListener('click', doAssemble);
btnStep.addEventListener('click', doStep);
btnRun.addEventListener('click', startRun);
btnStop.addEventListener('click', () => { stopRun(); setStatus('Stopped at $' + hex4(cpu.PC)); });
btnReset.addEventListener('click', doReset);

speedEl.addEventListener('input', getSpeedConfig);

memPrevEl.addEventListener('click', () => { memBase = (memBase - 128 + 65536) & 0xFFFF; updateMemory(); });
memNextEl.addEventListener('click', () => { memBase = (memBase + 128) & 0xFFFF; updateMemory(); });
memGoPCEl.addEventListener('click', () => { memBase = cpu.PC & 0xFFF0; updateMemory(); });

btnClearLog.addEventListener('click', () => { consoleEl.innerHTML = ''; });

// ── Init ──────────────────────────────────────────────────────────────────────
editorEl.value = DEFAULT_PROGRAM;
updateLineNums();
getSpeedConfig();
log('6502 Debugger ready. Click Assemble to load the program.');
setStatus('Ready');
