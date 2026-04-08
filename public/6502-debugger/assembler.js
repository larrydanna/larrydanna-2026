// assembler.js — 6502 Two-Pass Assembler
// assemble(sourceText) → { bytes, origin, errors, lineToAddr, addrToLine }

const OPCODE_TABLE = {
  ADC: { imm:0x69, zp:0x65, zpx:0x75, abs:0x6D, absx:0x7D, absy:0x79, indx:0x61, indy:0x71 },
  AND: { imm:0x29, zp:0x25, zpx:0x35, abs:0x2D, absx:0x3D, absy:0x39, indx:0x21, indy:0x31 },
  ASL: { acc:0x0A, zp:0x06, zpx:0x16, abs:0x0E, absx:0x1E },
  BCC: { rel:0x90 },
  BCS: { rel:0xB0 },
  BEQ: { rel:0xF0 },
  BIT: { zp:0x24, abs:0x2C },
  BMI: { rel:0x30 },
  BNE: { rel:0xD0 },
  BPL: { rel:0x10 },
  BRK: { imp:0x00 },
  BVC: { rel:0x50 },
  BVS: { rel:0x70 },
  CLC: { imp:0x18 },
  CLD: { imp:0xD8 },
  CLI: { imp:0x58 },
  CLV: { imp:0xB8 },
  CMP: { imm:0xC9, zp:0xC5, zpx:0xD5, abs:0xCD, absx:0xDD, absy:0xD9, indx:0xC1, indy:0xD1 },
  CPX: { imm:0xE0, zp:0xE4, abs:0xEC },
  CPY: { imm:0xC0, zp:0xC4, abs:0xCC },
  DEC: { zp:0xC6, zpx:0xD6, abs:0xCE, absx:0xDE },
  DEX: { imp:0xCA },
  DEY: { imp:0x88 },
  EOR: { imm:0x49, zp:0x45, zpx:0x55, abs:0x4D, absx:0x5D, absy:0x59, indx:0x41, indy:0x51 },
  INC: { zp:0xE6, zpx:0xF6, abs:0xEE, absx:0xFE },
  INX: { imp:0xE8 },
  INY: { imp:0xC8 },
  JMP: { abs:0x4C, ind:0x6C },
  JSR: { abs:0x20 },
  LDA: { imm:0xA9, zp:0xA5, zpx:0xB5, abs:0xAD, absx:0xBD, absy:0xB9, indx:0xA1, indy:0xB1 },
  LDX: { imm:0xA2, zp:0xA6, zpy:0xB6, abs:0xAE, absy:0xBE },
  LDY: { imm:0xA0, zp:0xA4, zpx:0xB4, abs:0xAC, absx:0xBC },
  LSR: { acc:0x4A, zp:0x46, zpx:0x56, abs:0x4E, absx:0x5E },
  NOP: { imp:0xEA },
  ORA: { imm:0x09, zp:0x05, zpx:0x15, abs:0x0D, absx:0x1D, absy:0x19, indx:0x01, indy:0x11 },
  PHA: { imp:0x48 },
  PHP: { imp:0x08 },
  PLA: { imp:0x68 },
  PLP: { imp:0x28 },
  ROL: { acc:0x2A, zp:0x26, zpx:0x36, abs:0x2E, absx:0x3E },
  ROR: { acc:0x6A, zp:0x66, zpx:0x76, abs:0x6E, absx:0x7E },
  RTI: { imp:0x40 },
  RTS: { imp:0x60 },
  SBC: { imm:0xE9, zp:0xE5, zpx:0xF5, abs:0xED, absx:0xFD, absy:0xF9, indx:0xE1, indy:0xF1 },
  SEC: { imp:0x38 },
  SED: { imp:0xF8 },
  SEI: { imp:0x78 },
  STA: { zp:0x85, zpx:0x95, abs:0x8D, absx:0x9D, absy:0x99, indx:0x81, indy:0x91 },
  STX: { zp:0x86, zpy:0x96, abs:0x8E },
  STY: { zp:0x84, zpx:0x94, abs:0x8C },
  TAX: { imp:0xAA },
  TAY: { imp:0xA8 },
  TSX: { imp:0xBA },
  TXA: { imp:0x8A },
  TXS: { imp:0x9A },
  TYA: { imp:0x98 },
};

const BRANCHES = new Set(['BCC','BCS','BEQ','BMI','BNE','BPL','BVC','BVS']);

// Parse a numeric literal: $hex, %binary, or decimal.
// Returns { value, byteCount: 1 or 2 } or null on failure.
function parseNumeric(str) {
  const s = str.trim();
  if (s.startsWith('$')) {
    const hex = s.slice(1);
    if (hex.length === 0) return null;
    const val = parseInt(hex, 16);
    if (isNaN(val)) return null;
    return { value: val & 0xFFFF, byteCount: hex.length <= 2 ? 1 : 2 };
  }
  if (s.startsWith('%')) {
    const val = parseInt(s.slice(1), 2);
    if (isNaN(val)) return null;
    return { value: val & 0xFF, byteCount: 1 };
  }
  if (/^\d+$/.test(s)) {
    const val = parseInt(s, 10);
    return { value: val, byteCount: val <= 255 ? 1 : 2 };
  }
  return null;
}

function isValidLabel(str) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(str);
}

// Detect addressing mode from an operand string.
// Returns { mode, value?, label? } or { mode, error: true } on parse failure.
function parseOperandMode(operand, mnemonic) {
  const s = operand.trim().replace(/\s+/g, '');
  const mn = mnemonic.toUpperCase();
  const isBranch = BRANCHES.has(mn);

  if (!s) return { mode: 'imp' };
  if (s === 'A' || s === 'a') return { mode: 'acc' };

  // Immediate: #value
  if (s.startsWith('#')) {
    const num = parseNumeric(s.slice(1));
    if (!num) return { mode: 'imm', error: true };
    return { mode: 'imm', value: num.value };
  }

  // Indirect forms: starts with (
  if (s.startsWith('(')) {
    // ($zz,X)
    const indxM = s.match(/^\((.+),\s*[Xx]\)$/);
    if (indxM) {
      const num = parseNumeric(indxM[1]);
      if (num) return { mode: 'indx', value: num.value };
      const lbl = indxM[1];
      if (isValidLabel(lbl)) return { mode: 'indx', label: lbl.toUpperCase() };
      return { mode: 'indx', error: true };
    }
    // ($zz),Y
    const indyM = s.match(/^\((.+)\),\s*[Yy]$/);
    if (indyM) {
      const num = parseNumeric(indyM[1]);
      if (num) return { mode: 'indy', value: num.value };
      const lbl = indyM[1];
      if (isValidLabel(lbl)) return { mode: 'indy', label: lbl.toUpperCase() };
      return { mode: 'indy', error: true };
    }
    // ($xxxx) — indirect for JMP
    const indM = s.match(/^\((.+)\)$/);
    if (indM) {
      const num = parseNumeric(indM[1]);
      if (num) return { mode: 'ind', value: num.value };
      const lbl = indM[1];
      if (isValidLabel(lbl)) return { mode: 'ind', label: lbl.toUpperCase() };
      return { mode: 'ind', error: true };
    }
    return { mode: 'ind', error: true };
  }

  // ,X indexed
  const xM = s.match(/^(.+),\s*[Xx]$/);
  if (xM) {
    const base = xM[1];
    const num = parseNumeric(base);
    if (num) return { mode: num.byteCount === 1 ? 'zpx' : 'absx', value: num.value };
    if (isValidLabel(base)) return { mode: 'absx', label: base.toUpperCase() };
    return { mode: 'zpx', error: true };
  }

  // ,Y indexed
  const yM = s.match(/^(.+),\s*[Yy]$/);
  if (yM) {
    const base = yM[1];
    const num = parseNumeric(base);
    if (num) return { mode: num.byteCount === 1 ? 'zpy' : 'absy', value: num.value };
    if (isValidLabel(base)) return { mode: 'absy', label: base.toUpperCase() };
    return { mode: 'zpy', error: true };
  }

  // Plain value or label
  const num = parseNumeric(s);
  if (num) {
    if (isBranch) return { mode: 'rel', value: num.value };
    return { mode: num.byteCount === 1 ? 'zp' : 'abs', value: num.value };
  }
  if (isValidLabel(s)) {
    if (isBranch) return { mode: 'rel', label: s.toUpperCase() };
    return { mode: 'abs', label: s.toUpperCase() };
  }

  return { mode: 'unknown', error: true };
}

// Byte count for each addressing mode (instruction total size).
function modeSize(mode) {
  switch (mode) {
    case 'imp': case 'acc': return 1;
    case 'imm': case 'zp': case 'zpx': case 'zpy':
    case 'indx': case 'indy': case 'rel': return 2;
    case 'abs': case 'absx': case 'absy': case 'ind': return 3;
    default: return 1;
  }
}

function assemble(source) {
  const rawLines = source.split('\n');
  const errors = [];
  const lineToAddr = {}; // source line index → assembled address
  const addrToLine = {}; // address → source line index
  const labels = {};
  let origin = 0xC000;

  // --- Tokenize all lines ---
  const parsed = rawLines.map((raw, i) => {
    const commentIdx = raw.indexOf(';');
    const line = (commentIdx >= 0 ? raw.slice(0, commentIdx) : raw).trim();
    if (!line) return null;

    // Directive (.ORG, .BYTE, etc.)
    if (line.startsWith('.')) {
      const spaceIdx = line.search(/\s/);
      const name = (spaceIdx < 0 ? line : line.slice(0, spaceIdx)).toUpperCase();
      const arg = spaceIdx < 0 ? '' : line.slice(spaceIdx + 1).trim();
      return { type: 'directive', name, arg, lineIdx: i };
    }

    // Optional label prefix: LOOP: or LOOP :
    let rest = line;
    let labelName = null;
    const labelM = rest.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    if (labelM) {
      labelName = labelM[1].toUpperCase();
      rest = rest.slice(labelM[0].length).trim();
    }

    if (!rest) return { type: 'label-only', label: labelName, lineIdx: i };

    // Mnemonic + operand
    const spaceIdx = rest.search(/\s/);
    const mnemonic = (spaceIdx < 0 ? rest : rest.slice(0, spaceIdx)).toUpperCase();
    const operand = spaceIdx < 0 ? '' : rest.slice(spaceIdx + 1).trim();

    return { type: 'instruction', label: labelName, mnemonic, operand, lineIdx: i };
  });

  // --- Pass 1: compute addresses, collect labels ---
  let addr = origin;
  for (const p of parsed) {
    if (!p) continue;

    if (p.type === 'directive') {
      if (p.name === '.ORG') {
        const num = parseNumeric(p.arg);
        if (num) { origin = num.value; addr = origin; }
        else errors.push(`Line ${p.lineIdx + 1}: Invalid .ORG argument '${p.arg}'`);
      } else if (p.name === '.BYTE') {
        p.addr = addr;
        const count = p.arg.split(',').length;
        addr += count;
      } else if (p.name === '.WORD') {
        p.addr = addr;
        const count = p.arg.split(',').length;
        addr += count * 2;
      }
      continue;
    }

    if (p.label) labels[p.label] = addr;
    if (p.type === 'label-only') continue;

    const modeInfo = parseOperandMode(p.operand, p.mnemonic);
    p.modeInfo = modeInfo;
    const size = modeSize(modeInfo.mode);
    p.addr = addr;
    lineToAddr[p.lineIdx] = addr;
    addrToLine[addr] = p.lineIdx;
    addr += size;
  }

  // --- Pass 2: encode instructions ---
  const bytes = [];

  for (const p of parsed) {
    if (!p || p.type === 'label-only') continue;

    if (p.type === 'directive') {
      if (p.name === '.BYTE') {
        for (const part of p.arg.split(',')) {
          const num = parseNumeric(part.trim());
          if (num) bytes.push(num.value & 0xFF);
          else errors.push(`Line ${p.lineIdx + 1}: Invalid .BYTE value '${part.trim()}'`);
        }
      } else if (p.name === '.WORD') {
        for (const part of p.arg.split(',')) {
          const num = parseNumeric(part.trim());
          if (num) { bytes.push(num.value & 0xFF); bytes.push((num.value >> 8) & 0xFF); }
          else errors.push(`Line ${p.lineIdx + 1}: Invalid .WORD value '${part.trim()}'`);
        }
      }
      continue;
    }

    const { mnemonic, operand, addr: instrAddr, lineIdx } = p;
    const modeInfo = p.modeInfo;

    if (modeInfo.error) {
      errors.push(`Line ${lineIdx + 1}: Cannot parse operand '${operand}'`);
      continue;
    }

    // Resolve label
    let value = modeInfo.value;
    if (modeInfo.label !== undefined) {
      if (!(modeInfo.label in labels)) {
        errors.push(`Line ${lineIdx + 1}: Undefined label '${modeInfo.label}'`);
        continue;
      }
      value = labels[modeInfo.label];
    }

    // Encode branch (relative)
    if (modeInfo.mode === 'rel') {
      const opcodes = OPCODE_TABLE[mnemonic];
      if (!opcodes || opcodes.rel === undefined) {
        errors.push(`Line ${lineIdx + 1}: ${mnemonic} does not support relative addressing`);
        continue;
      }
      const offset = value - (instrAddr + 2);
      if (offset < -128 || offset > 127) {
        errors.push(`Line ${lineIdx + 1}: Branch target out of range (offset ${offset})`);
        continue;
      }
      bytes.push(opcodes.rel, offset & 0xFF);
      continue;
    }

    const opcodes = OPCODE_TABLE[mnemonic];
    if (!opcodes) {
      errors.push(`Line ${lineIdx + 1}: Unknown mnemonic '${mnemonic}'`);
      continue;
    }

    let mode = modeInfo.mode;
    let opcode = opcodes[mode];

    // Fallback: implied → accumulator for ASL/LSR/ROL/ROR without 'A' operand
    if (opcode === undefined && mode === 'imp' && opcodes.acc !== undefined) {
      opcode = opcodes.acc;
      mode = 'acc';
    }

    if (opcode === undefined) {
      errors.push(`Line ${lineIdx + 1}: ${mnemonic} does not support ${mode} addressing mode`);
      continue;
    }

    if (mode === 'imp' || mode === 'acc') {
      bytes.push(opcode);
    } else if (mode === 'imm' || mode === 'zp' || mode === 'zpx' || mode === 'zpy' ||
               mode === 'indx' || mode === 'indy') {
      bytes.push(opcode, value & 0xFF);
    } else {
      // abs, absx, absy, ind — 2-byte little-endian operand
      bytes.push(opcode, value & 0xFF, (value >> 8) & 0xFF);
    }
  }

  return { bytes: new Uint8Array(bytes), origin, errors, lineToAddr, addrToLine };
}
