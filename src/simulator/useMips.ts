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
  sim.registerHandler('printInt', (i) => {
    outputBuffer += String(i);
  });

  sim.registerHandler('printChar', (c) => {
    outputBuffer += c;
  });

  sim.registerHandler('printString', (s) => {
    outputBuffer += s;
  });

  sim.registerHandler('log', (message) => {
    outputBuffer += message;
  });

  sim.registerHandler('logLine', (message) => {
    outputBuffer += message + '\n';
  });

  sim.registerHandler('readInt', () => 0);
  sim.registerHandler('readChar', () => '\n');
  sim.registerHandler('readString', () => '');
}

export function assemble(source: string): { ok: true; sim: JsMips } | { ok: false; error: string } {
  try {
    outputBuffer = '';
    instance = makeMipsfromSource(source);
    const assembleResult = instance.assemble();

    if (assembleResult.hasErrors) {
      return { ok: false, error: assembleResult.report };
    }

    instance.initialize(true);
    registerDefaultHandlers(instance);

    return { ok: true, sim: instance };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
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
  instance = makeMipsfromSource('');
}

export function getState(): SimulatorState | null {
  return {
    registers: getRegisters(instance),
    output: outputBuffer,
    pc: instance.programCounter,
  };
}