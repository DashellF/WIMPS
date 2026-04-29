import { JsMips, makeMipsfromSource } from '@specy/mips';

export type SimulatorState = {
  registers: { name: string; number: number; hexValue: string; decimalValue: string }[];
  output: string;
  pc: number;
};

const REGISTER_NAMES = [
  '$zero','$at','$v0','$v1','$a0','$a1','$a2','$a3',
  '$t0','$t1','$t2','$t3','$t4','$t5','$t6','$t7',
  '$s0','$s1','$s2','$s3','$s4','$s5','$s6','$s7',
  '$t8','$t9','$k0','$k1','$gp','$sp','$fp','$ra',
] as const;

// Internal state
let addrToLineMap: Map<number, number> = new Map();
let instance: JsMips = makeMipsfromSource('');
let outputBuffer = '';

function getRegisters(sim: JsMips) {
  return REGISTER_NAMES.map((name, i) => {
    const val = sim.getRegisterValue(name) >>> 0;
    return {
      name,
      number: i,
      hexValue: '0x' + val.toString(16).padStart(8, '0').toUpperCase(),
      decimalValue: val.toString(10),
    };
  });
}

function registerDefaultHandlers(sim: JsMips) {
  sim.registerHandler('printInt', (i) => { outputBuffer += String(i); });
  sim.registerHandler('printChar', (c) => { outputBuffer += c; });
  sim.registerHandler('printString', (s) => { outputBuffer += s; });
  sim.registerHandler('log', (message) => { outputBuffer += message; });
  sim.registerHandler('logLine', (message) => { outputBuffer += message + '\n'; });
  sim.registerHandler('readInt', () => 0);
  sim.registerHandler('readChar', () => '\n');
  sim.registerHandler('readString', () => '');
}

export function assemble(source: string): { ok: true; sim: JsMips } | { ok: false; error: string } {
  try {
    outputBuffer = '';
    addrToLineMap.clear();
    
    instance = makeMipsfromSource(source);
    const assembleResult = instance.assemble();

    if (assembleResult.hasErrors) {
      return { ok: false, error: assembleResult.report };
    }

    // Populate the line map using compiled statements
    const statements = instance.getCompiledStatements();
    statements.forEach((stmt) => {
      addrToLineMap.set(stmt.address, stmt.sourceLine - 1);
    });
    
    instance.initialize(true);
    registerDefaultHandlers(instance);

    return { ok: true, sim: instance };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export function getActiveLineIndex(): number | null {
  if (!instance) return null;
  const lineIndex = addrToLineMap.get(instance.programCounter);
  return lineIndex !== undefined ? lineIndex : null;
}

export function stepSim(): SimulatorState | { error: string } {
  try {
    instance.step();
    return {
      registers: getRegisters(instance),
      output: outputBuffer,
      pc: instance.programCounter,
    };
  } catch (e: any) {
    return { error: e?.message ?? String(e) };
  }
}

export function runSim(): SimulatorState | { error: string } {
  try {
    while (!instance.terminated) {
      instance.step();
    }
    return {
      registers: getRegisters(instance),
      output: outputBuffer,
      pc: instance.programCounter,
    };
  } catch (e: any) {
    return { error: e?.message ?? String(e) };
  }
}

export function resetSim() {
  outputBuffer = '';
  addrToLineMap.clear();
  instance = makeMipsfromSource('');
}

export function getState(): SimulatorState | null {
  if (!instance) return null;
  return {
    registers: getRegisters(instance),
    output: outputBuffer,
    pc: instance.programCounter,
  };
}

export function getMemoryRange(startAddr: number, wordCount: number) {
  if (!instance) return [];
  
  const memory = [];
  try {
    // Read the total number of bytes (4 bytes per word)
    const byteLength = wordCount * 4;
    const bytes = instance.readMemoryBytes(startAddr, byteLength);

    for (let i = 0; i < wordCount; i++) {
      const addr = startAddr + i * 4;
      
      // Stitch bytes (Big Endian)
      const b1 = bytes[i * 4] || 0;
      const b2 = bytes[i * 4 + 1] || 0;
      const b3 = bytes[i * 4 + 2] || 0;
      const b4 = bytes[i * 4 + 3] || 0;

      const wordValue = ((b1 << 24) | (b2 << 16) | (b3 << 8) | b4) >>> 0;

      memory.push({
        address: '0x' + addr.toString(16).toUpperCase(),
        value: '0x' + wordValue.toString(16).padStart(8, '0').toUpperCase(),
      });
    }
  } catch (e) {
    console.error("Memory read error:", e);
  }
  
  return memory;
}