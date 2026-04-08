// cpu.js — 6502 CPU Emulator
// All 56 standard opcodes, all 13 addressing modes.
// Includes the indirect JMP page-boundary bug for accuracy.

function CPU6502() {
  this.memory = new Uint8Array(65536);
  this.A = 0;
  this.X = 0;
  this.Y = 0;
  this.PC = 0xC000;
  this.SP = 0xFF;
  // Status flags (each 0 or 1)
  this.N = 0; // Negative
  this.V = 0; // Overflow
  this.B = 0; // Break
  this.D = 0; // Decimal (not implemented — BCD ignored)
  this.I = 1; // Interrupt disable
  this.Z = 0; // Zero
  this.C = 0; // Carry
}

CPU6502.prototype.read = function(addr) {
  return this.memory[addr & 0xFFFF];
};

CPU6502.prototype.write = function(addr, val) {
  this.memory[addr & 0xFFFF] = val & 0xFF;
};

CPU6502.prototype.push = function(val) {
  this.write(0x100 | this.SP, val);
  this.SP = (this.SP - 1) & 0xFF;
};

CPU6502.prototype.pop = function() {
  this.SP = (this.SP + 1) & 0xFF;
  return this.read(0x100 | this.SP);
};

// Pack status flags into P register byte
CPU6502.prototype.getP = function() {
  return (this.N << 7) | (this.V << 6) | (1 << 5) | (this.B << 4) |
         (this.D << 3) | (this.I << 2) | (this.Z << 1) | this.C;
};

// Unpack P register byte into status flags
CPU6502.prototype.setP = function(val) {
  this.N = (val >> 7) & 1;
  this.V = (val >> 6) & 1;
  this.B = (val >> 4) & 1;
  this.D = (val >> 3) & 1;
  this.I = (val >> 2) & 1;
  this.Z = (val >> 1) & 1;
  this.C = val & 1;
};

// Set N and Z based on result, return masked 8-bit value
CPU6502.prototype.setNZ = function(val) {
  val &= 0xFF;
  this.N = (val >> 7) & 1;
  this.Z = val === 0 ? 1 : 0;
  return val;
};

// Copy bytes into memory starting at origin, set reset vector
CPU6502.prototype.load = function(bytes, origin) {
  for (let i = 0; i < bytes.length; i++) {
    this.memory[(origin + i) & 0xFFFF] = bytes[i];
  }
  this.memory[0xFFFC] = origin & 0xFF;
  this.memory[0xFFFD] = (origin >> 8) & 0xFF;
};

// Reset CPU state, load PC from reset vector
CPU6502.prototype.reset = function() {
  this.A = 0; this.X = 0; this.Y = 0;
  this.SP = 0xFF;
  this.N = 0; this.V = 0; this.B = 0; this.D = 0; this.I = 1; this.Z = 0; this.C = 0;
  const lo = this.memory[0xFFFC];
  const hi = this.memory[0xFFFD];
  this.PC = (lo | (hi << 8)) || 0xC000;
};

// Execute one instruction. Returns { halted, brk, reason? }
CPU6502.prototype.step = function() {
  const cpu = this;
  const pc0 = cpu.PC; // address of this instruction for error reporting

  const opcode = cpu.read(cpu.PC);
  cpu.PC = (cpu.PC + 1) & 0xFFFF;

  // Addressing mode helpers — each reads operand byte(s) and advances PC
  function imm()     { const v = cpu.read(cpu.PC); cpu.PC = (cpu.PC + 1) & 0xFFFF; return v; }
  function zpAddr()  { return imm(); }
  function zpxAddr() { return (imm() + cpu.X) & 0xFF; }
  function zpyAddr() { return (imm() + cpu.Y) & 0xFF; }
  function absAddr() { const lo = imm(); const hi = imm(); return lo | (hi << 8); }
  function absxAddr(){ return (absAddr() + cpu.X) & 0xFFFF; }
  function absyAddr(){ return (absAddr() + cpu.Y) & 0xFFFF; }
  function indxAddr() {
    const base = (imm() + cpu.X) & 0xFF;
    return cpu.read(base) | (cpu.read((base + 1) & 0xFF) << 8);
  }
  function indyAddr() {
    const base = imm();
    const ptr = cpu.read(base) | (cpu.read((base + 1) & 0xFF) << 8);
    return (ptr + cpu.Y) & 0xFFFF;
  }
  function indAddr() {
    // 6502 page-boundary bug: wraps within the same page
    const ptr = absAddr();
    const lo = cpu.read(ptr);
    const hi = cpu.read((ptr & 0xFF00) | ((ptr + 1) & 0xFF));
    return lo | (hi << 8);
  }

  function branch(cond) {
    const offset = imm();
    if (cond) {
      const rel = offset >= 0x80 ? offset - 0x100 : offset;
      cpu.PC = (cpu.PC + rel) & 0xFFFF;
    }
  }

  function adc(val) {
    const r = cpu.A + val + cpu.C;
    cpu.V = ((~(cpu.A ^ val) & (cpu.A ^ r)) & 0x80) ? 1 : 0;
    cpu.C = r > 0xFF ? 1 : 0;
    cpu.A = cpu.setNZ(r);
  }

  function sbc(val) { adc(val ^ 0xFF); } // SBC via ADC complement

  function compare(reg, val) {
    reg &= 0xFF; val &= 0xFF;
    const r = (reg - val) & 0xFF;
    cpu.C = reg >= val ? 1 : 0;
    cpu.N = (r >> 7) & 1;
    cpu.Z = r === 0 ? 1 : 0;
  }

  function asl(v) { cpu.C = (v >> 7) & 1; return cpu.setNZ((v << 1) & 0xFF); }
  function lsr(v) { cpu.C = v & 1; return cpu.setNZ(v >> 1); }
  function rol(v) { const c = cpu.C; cpu.C = (v >> 7) & 1; return cpu.setNZ(((v << 1) | c) & 0xFF); }
  function ror(v) { const c = cpu.C; cpu.C = v & 1; return cpu.setNZ(((v >> 1) | (c << 7)) & 0xFF); }

  switch (opcode) {
    // ── LDA ────────────────────────────────────────────────
    case 0xA9: cpu.A = cpu.setNZ(imm()); break;
    case 0xA5: cpu.A = cpu.setNZ(cpu.read(zpAddr())); break;
    case 0xB5: cpu.A = cpu.setNZ(cpu.read(zpxAddr())); break;
    case 0xAD: cpu.A = cpu.setNZ(cpu.read(absAddr())); break;
    case 0xBD: cpu.A = cpu.setNZ(cpu.read(absxAddr())); break;
    case 0xB9: cpu.A = cpu.setNZ(cpu.read(absyAddr())); break;
    case 0xA1: cpu.A = cpu.setNZ(cpu.read(indxAddr())); break;
    case 0xB1: cpu.A = cpu.setNZ(cpu.read(indyAddr())); break;
    // ── LDX ────────────────────────────────────────────────
    case 0xA2: cpu.X = cpu.setNZ(imm()); break;
    case 0xA6: cpu.X = cpu.setNZ(cpu.read(zpAddr())); break;
    case 0xB6: cpu.X = cpu.setNZ(cpu.read(zpyAddr())); break;
    case 0xAE: cpu.X = cpu.setNZ(cpu.read(absAddr())); break;
    case 0xBE: cpu.X = cpu.setNZ(cpu.read(absyAddr())); break;
    // ── LDY ────────────────────────────────────────────────
    case 0xA0: cpu.Y = cpu.setNZ(imm()); break;
    case 0xA4: cpu.Y = cpu.setNZ(cpu.read(zpAddr())); break;
    case 0xB4: cpu.Y = cpu.setNZ(cpu.read(zpxAddr())); break;
    case 0xAC: cpu.Y = cpu.setNZ(cpu.read(absAddr())); break;
    case 0xBC: cpu.Y = cpu.setNZ(cpu.read(absxAddr())); break;
    // ── STA ────────────────────────────────────────────────
    case 0x85: cpu.write(zpAddr(),  cpu.A); break;
    case 0x95: cpu.write(zpxAddr(), cpu.A); break;
    case 0x8D: cpu.write(absAddr(), cpu.A); break;
    case 0x9D: cpu.write(absxAddr(),cpu.A); break;
    case 0x99: cpu.write(absyAddr(),cpu.A); break;
    case 0x81: cpu.write(indxAddr(),cpu.A); break;
    case 0x91: cpu.write(indyAddr(),cpu.A); break;
    // ── STX ────────────────────────────────────────────────
    case 0x86: cpu.write(zpAddr(),  cpu.X); break;
    case 0x96: cpu.write(zpyAddr(), cpu.X); break;
    case 0x8E: cpu.write(absAddr(), cpu.X); break;
    // ── STY ────────────────────────────────────────────────
    case 0x84: cpu.write(zpAddr(),  cpu.Y); break;
    case 0x94: cpu.write(zpxAddr(), cpu.Y); break;
    case 0x8C: cpu.write(absAddr(), cpu.Y); break;
    // ── Transfers ──────────────────────────────────────────
    case 0xAA: cpu.X  = cpu.setNZ(cpu.A);  break; // TAX
    case 0xA8: cpu.Y  = cpu.setNZ(cpu.A);  break; // TAY
    case 0x8A: cpu.A  = cpu.setNZ(cpu.X);  break; // TXA
    case 0x98: cpu.A  = cpu.setNZ(cpu.Y);  break; // TYA
    case 0xBA: cpu.X  = cpu.setNZ(cpu.SP); break; // TSX
    case 0x9A: cpu.SP = cpu.X; break;              // TXS (no flags)
    // ── Stack ──────────────────────────────────────────────
    case 0x48: cpu.push(cpu.A);           break; // PHA
    case 0x08: cpu.push(cpu.getP());      break; // PHP
    case 0x68: cpu.A = cpu.setNZ(cpu.pop()); break; // PLA
    case 0x28: cpu.setP(cpu.pop());       break; // PLP
    // ── ADC ────────────────────────────────────────────────
    case 0x69: adc(imm()); break;
    case 0x65: adc(cpu.read(zpAddr())); break;
    case 0x75: adc(cpu.read(zpxAddr())); break;
    case 0x6D: adc(cpu.read(absAddr())); break;
    case 0x7D: adc(cpu.read(absxAddr())); break;
    case 0x79: adc(cpu.read(absyAddr())); break;
    case 0x61: adc(cpu.read(indxAddr())); break;
    case 0x71: adc(cpu.read(indyAddr())); break;
    // ── SBC ────────────────────────────────────────────────
    case 0xE9: sbc(imm()); break;
    case 0xE5: sbc(cpu.read(zpAddr())); break;
    case 0xF5: sbc(cpu.read(zpxAddr())); break;
    case 0xED: sbc(cpu.read(absAddr())); break;
    case 0xFD: sbc(cpu.read(absxAddr())); break;
    case 0xF9: sbc(cpu.read(absyAddr())); break;
    case 0xE1: sbc(cpu.read(indxAddr())); break;
    case 0xF1: sbc(cpu.read(indyAddr())); break;
    // ── AND ────────────────────────────────────────────────
    case 0x29: cpu.A = cpu.setNZ(cpu.A & imm()); break;
    case 0x25: cpu.A = cpu.setNZ(cpu.A & cpu.read(zpAddr())); break;
    case 0x35: cpu.A = cpu.setNZ(cpu.A & cpu.read(zpxAddr())); break;
    case 0x2D: cpu.A = cpu.setNZ(cpu.A & cpu.read(absAddr())); break;
    case 0x3D: cpu.A = cpu.setNZ(cpu.A & cpu.read(absxAddr())); break;
    case 0x39: cpu.A = cpu.setNZ(cpu.A & cpu.read(absyAddr())); break;
    case 0x21: cpu.A = cpu.setNZ(cpu.A & cpu.read(indxAddr())); break;
    case 0x31: cpu.A = cpu.setNZ(cpu.A & cpu.read(indyAddr())); break;
    // ── ORA ────────────────────────────────────────────────
    case 0x09: cpu.A = cpu.setNZ(cpu.A | imm()); break;
    case 0x05: cpu.A = cpu.setNZ(cpu.A | cpu.read(zpAddr())); break;
    case 0x15: cpu.A = cpu.setNZ(cpu.A | cpu.read(zpxAddr())); break;
    case 0x0D: cpu.A = cpu.setNZ(cpu.A | cpu.read(absAddr())); break;
    case 0x1D: cpu.A = cpu.setNZ(cpu.A | cpu.read(absxAddr())); break;
    case 0x19: cpu.A = cpu.setNZ(cpu.A | cpu.read(absyAddr())); break;
    case 0x01: cpu.A = cpu.setNZ(cpu.A | cpu.read(indxAddr())); break;
    case 0x11: cpu.A = cpu.setNZ(cpu.A | cpu.read(indyAddr())); break;
    // ── EOR ────────────────────────────────────────────────
    case 0x49: cpu.A = cpu.setNZ(cpu.A ^ imm()); break;
    case 0x45: cpu.A = cpu.setNZ(cpu.A ^ cpu.read(zpAddr())); break;
    case 0x55: cpu.A = cpu.setNZ(cpu.A ^ cpu.read(zpxAddr())); break;
    case 0x4D: cpu.A = cpu.setNZ(cpu.A ^ cpu.read(absAddr())); break;
    case 0x5D: cpu.A = cpu.setNZ(cpu.A ^ cpu.read(absxAddr())); break;
    case 0x59: cpu.A = cpu.setNZ(cpu.A ^ cpu.read(absyAddr())); break;
    case 0x41: cpu.A = cpu.setNZ(cpu.A ^ cpu.read(indxAddr())); break;
    case 0x51: cpu.A = cpu.setNZ(cpu.A ^ cpu.read(indyAddr())); break;
    // ── BIT ────────────────────────────────────────────────
    case 0x24: { const m = cpu.read(zpAddr());  cpu.Z=(cpu.A&m)?0:1; cpu.N=(m>>7)&1; cpu.V=(m>>6)&1; break; }
    case 0x2C: { const m = cpu.read(absAddr()); cpu.Z=(cpu.A&m)?0:1; cpu.N=(m>>7)&1; cpu.V=(m>>6)&1; break; }
    // ── ASL ────────────────────────────────────────────────
    case 0x0A: cpu.A = asl(cpu.A); break;
    case 0x06: { const a=zpAddr();  cpu.write(a, asl(cpu.read(a))); break; }
    case 0x16: { const a=zpxAddr(); cpu.write(a, asl(cpu.read(a))); break; }
    case 0x0E: { const a=absAddr(); cpu.write(a, asl(cpu.read(a))); break; }
    case 0x1E: { const a=absxAddr();cpu.write(a, asl(cpu.read(a))); break; }
    // ── LSR ────────────────────────────────────────────────
    case 0x4A: cpu.A = lsr(cpu.A); break;
    case 0x46: { const a=zpAddr();  cpu.write(a, lsr(cpu.read(a))); break; }
    case 0x56: { const a=zpxAddr(); cpu.write(a, lsr(cpu.read(a))); break; }
    case 0x4E: { const a=absAddr(); cpu.write(a, lsr(cpu.read(a))); break; }
    case 0x5E: { const a=absxAddr();cpu.write(a, lsr(cpu.read(a))); break; }
    // ── ROL ────────────────────────────────────────────────
    case 0x2A: cpu.A = rol(cpu.A); break;
    case 0x26: { const a=zpAddr();  cpu.write(a, rol(cpu.read(a))); break; }
    case 0x36: { const a=zpxAddr(); cpu.write(a, rol(cpu.read(a))); break; }
    case 0x2E: { const a=absAddr(); cpu.write(a, rol(cpu.read(a))); break; }
    case 0x3E: { const a=absxAddr();cpu.write(a, rol(cpu.read(a))); break; }
    // ── ROR ────────────────────────────────────────────────
    case 0x6A: cpu.A = ror(cpu.A); break;
    case 0x66: { const a=zpAddr();  cpu.write(a, ror(cpu.read(a))); break; }
    case 0x76: { const a=zpxAddr(); cpu.write(a, ror(cpu.read(a))); break; }
    case 0x6E: { const a=absAddr(); cpu.write(a, ror(cpu.read(a))); break; }
    case 0x7E: { const a=absxAddr();cpu.write(a, ror(cpu.read(a))); break; }
    // ── INC ────────────────────────────────────────────────
    case 0xE6: { const a=zpAddr();  cpu.write(a, cpu.setNZ(cpu.read(a)+1)); break; }
    case 0xF6: { const a=zpxAddr(); cpu.write(a, cpu.setNZ(cpu.read(a)+1)); break; }
    case 0xEE: { const a=absAddr(); cpu.write(a, cpu.setNZ(cpu.read(a)+1)); break; }
    case 0xFE: { const a=absxAddr();cpu.write(a, cpu.setNZ(cpu.read(a)+1)); break; }
    case 0xE8: cpu.X = cpu.setNZ(cpu.X + 1); break; // INX
    case 0xC8: cpu.Y = cpu.setNZ(cpu.Y + 1); break; // INY
    // ── DEC ────────────────────────────────────────────────
    case 0xC6: { const a=zpAddr();  cpu.write(a, cpu.setNZ(cpu.read(a)-1)); break; }
    case 0xD6: { const a=zpxAddr(); cpu.write(a, cpu.setNZ(cpu.read(a)-1)); break; }
    case 0xCE: { const a=absAddr(); cpu.write(a, cpu.setNZ(cpu.read(a)-1)); break; }
    case 0xDE: { const a=absxAddr();cpu.write(a, cpu.setNZ(cpu.read(a)-1)); break; }
    case 0xCA: cpu.X = cpu.setNZ(cpu.X - 1); break; // DEX
    case 0x88: cpu.Y = cpu.setNZ(cpu.Y - 1); break; // DEY
    // ── CMP ────────────────────────────────────────────────
    case 0xC9: compare(cpu.A, imm()); break;
    case 0xC5: compare(cpu.A, cpu.read(zpAddr())); break;
    case 0xD5: compare(cpu.A, cpu.read(zpxAddr())); break;
    case 0xCD: compare(cpu.A, cpu.read(absAddr())); break;
    case 0xDD: compare(cpu.A, cpu.read(absxAddr())); break;
    case 0xD9: compare(cpu.A, cpu.read(absyAddr())); break;
    case 0xC1: compare(cpu.A, cpu.read(indxAddr())); break;
    case 0xD1: compare(cpu.A, cpu.read(indyAddr())); break;
    // ── CPX ────────────────────────────────────────────────
    case 0xE0: compare(cpu.X, imm()); break;
    case 0xE4: compare(cpu.X, cpu.read(zpAddr())); break;
    case 0xEC: compare(cpu.X, cpu.read(absAddr())); break;
    // ── CPY ────────────────────────────────────────────────
    case 0xC0: compare(cpu.Y, imm()); break;
    case 0xC4: compare(cpu.Y, cpu.read(zpAddr())); break;
    case 0xCC: compare(cpu.Y, cpu.read(absAddr())); break;
    // ── Branches ───────────────────────────────────────────
    case 0x90: branch(cpu.C === 0); break; // BCC
    case 0xB0: branch(cpu.C === 1); break; // BCS
    case 0xF0: branch(cpu.Z === 1); break; // BEQ
    case 0x30: branch(cpu.N === 1); break; // BMI
    case 0xD0: branch(cpu.Z === 0); break; // BNE
    case 0x10: branch(cpu.N === 0); break; // BPL
    case 0x50: branch(cpu.V === 0); break; // BVC
    case 0x70: branch(cpu.V === 1); break; // BVS
    // ── Jumps ──────────────────────────────────────────────
    case 0x4C: cpu.PC = absAddr(); break; // JMP abs
    case 0x6C: cpu.PC = indAddr(); break; // JMP ind
    // ── JSR ────────────────────────────────────────────────
    case 0x20: {
      const target = absAddr();
      const ret = (cpu.PC - 1) & 0xFFFF; // last byte of JSR instruction
      cpu.push((ret >> 8) & 0xFF);
      cpu.push(ret & 0xFF);
      cpu.PC = target;
      break;
    }
    // ── RTS ────────────────────────────────────────────────
    case 0x60: {
      const lo = cpu.pop();
      const hi = cpu.pop();
      cpu.PC = ((lo | (hi << 8)) + 1) & 0xFFFF;
      break;
    }
    // ── RTI ────────────────────────────────────────────────
    case 0x40: {
      cpu.setP(cpu.pop());
      const lo = cpu.pop();
      const hi = cpu.pop();
      cpu.PC = lo | (hi << 8);
      break;
    }
    // ── BRK ────────────────────────────────────────────────
    case 0x00: {
      cpu.PC = (cpu.PC + 1) & 0xFFFF; // skip padding byte
      cpu.push((cpu.PC >> 8) & 0xFF);
      cpu.push(cpu.PC & 0xFF);
      cpu.B = 1;
      cpu.push(cpu.getP());
      cpu.I = 1;
      const lo = cpu.read(0xFFFE);
      const hi = cpu.read(0xFFFF);
      cpu.PC = lo | (hi << 8);
      return { halted: false, brk: true };
    }
    // ── Flag instructions ───────────────────────────────────
    case 0x18: cpu.C = 0; break; // CLC
    case 0x38: cpu.C = 1; break; // SEC
    case 0xD8: cpu.D = 0; break; // CLD
    case 0xF8: cpu.D = 1; break; // SED
    case 0x58: cpu.I = 0; break; // CLI
    case 0x78: cpu.I = 1; break; // SEI
    case 0xB8: cpu.V = 0; break; // CLV
    // ── NOP ────────────────────────────────────────────────
    case 0xEA: break;
    // ── Unknown opcode ─────────────────────────────────────
    default: {
      const hex = opcode.toString(16).toUpperCase().padStart(2, '0');
      const addr = pc0.toString(16).toUpperCase().padStart(4, '0');
      return { halted: true, brk: false, reason: `Unknown opcode $${hex} at $${addr}` };
    }
  }

  return { halted: false, brk: false };
};
