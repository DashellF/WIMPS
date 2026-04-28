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
];

function getRegisters(sim: JsMips) {
  return REGISTER_NAMES.map((name, i) => {
    const val = sim.getRegisterValue(name as any) >>> 0; // unsigned
    return {
      name,
      number: i,
      hexValue: '0x' + val.toString(16).padStart(8, '0').toUpperCase(),
      decimalValue: val.toString(10),
    };
  });
}

let instance = makeMipsfromSource('')

export function assemble(source: string): { ok: true; sim: JsMips } | { ok: false; error: string } {
  try {
    instance = makeMipsfromSource(source);
    // ⚠️ only one instance allowed at a time per @specy/mips docs
    instance.assemble();
    instance.initialize(true);
    return { ok: true, sim: instance };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export function stepSim(): SimulatorState | { error: string } {
  if (!instance) return { error: 'No program assembled.' };
  try {
    instance.step();
    return {
      registers: getRegisters(instance),
      output: '',
      pc: instance.programCounter,
    };
  } catch (e: any) {
    return { error: e?.message ?? String(e) };
  }
}

export function runSim(onOutput: (line: string) => void): SimulatorState | { error: string } {
  if (!instance) return { error: 'No program assembled.' };
  try {
    while (!instance.terminated) {
      instance.step();
    }
    return {
      registers: getRegisters(instance),
      output: '',
      pc: instance.programCounter,
    };
  } catch (e: any) {
    return { error: e?.message ?? String(e) };
  }
}

export function resetSim() {
  instance = makeMipsfromSource('');
}

export function getState(): SimulatorState | null {
  if (!instance) return null;
  return {
    registers: getRegisters(instance),
    output: '',
    pc: instance.programCounter,
  };
}