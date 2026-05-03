import { JsMips, makeMipsfromSource } from '@specy/mips';

export type SimulatorState = {
  registers: { name: string; number: number; hexValue: string; decimalValue: string }[];
  output: string;
  pc: number;
  isWaiting: boolean;
  terminated: boolean;
};

const REGISTER_NAMES = [
  '$zero','$at','$v0','$v1','$a0','$a1','$a2','$a3',
  '$t0','$t1','$t2','$t3','$t4','$t5','$t6','$t7',
  '$s0','$s1','$s2','$s3','$s4','$s5','$s6','$s7',
  '$t8','$t9','$k0','$k1','$gp','$sp','$fp','$ra',
] as const;

// --- Module-level state ---
let source = '';
let instance: JsMips = makeMipsfromSource('');

/**
 * All inputs the user has ever submitted this session, in order.
 * When a new input arrives we re-initialize and replay the whole
 * program so the simulator always has every value available up-front.
 */
let allInputs: string[] = [];

/**
 * Cursor into allInputs for the current execution.
 * Each read syscall advances this by one.
 */
let inputCursor = 0;

/**
 * True when the last run stopped because a read syscall fired
 * but inputCursor had no more values.
 */
let isBlockedForInput = false;

let outputBuffer = '';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/**
 * Wire up all syscall handlers on `instance`.
 * Called every time we (re-)initialize the simulator.
 *
 * Read handlers pull from allInputs[inputCursor].
 * If there is nothing there they set isBlockedForInput and return a
 * sentinel — the caller (runLoop) will notice the flag and stop
 * immediately so the bad return value never actually matters.
 */
function registerHandlers(sim: JsMips) {
  sim.registerHandler('printInt',    (i) => { outputBuffer += String(i); });
  sim.registerHandler('printFloat',  (f) => { outputBuffer += String(f); });
  sim.registerHandler('printDouble', (d) => { outputBuffer += String(d); });
  sim.registerHandler('printString', (s) => { outputBuffer += s; });
  sim.registerHandler('printChar',   (c) => { outputBuffer += c; });

  sim.registerHandler('readInt', () => {
    if (inputCursor < allInputs.length) {
      return parseInt(allInputs[inputCursor++], 10) || 0;
    }
    isBlockedForInput = true;
    return 0; // sentinel – execution stops before this is used
  });

  sim.registerHandler('readString', () => {
    if (inputCursor < allInputs.length) {
      return allInputs[inputCursor++] ?? '';
    }
    isBlockedForInput = true;
    return ''; // sentinel
  });

  sim.registerHandler('readChar', () => {
    if (inputCursor < allInputs.length) {
      const s = allInputs[inputCursor++] ?? '';
      return s.charAt(0);
    }
    isBlockedForInput = true;
    return '';
  });

  sim.registerHandler('readFloat', () => {
    if (inputCursor < allInputs.length) {
      return parseFloat(allInputs[inputCursor++]) || 0;
    }
    isBlockedForInput = true;
    return 0;
  });

  sim.registerHandler('readDouble', () => {
    if (inputCursor < allInputs.length) {
      return parseFloat(allInputs[inputCursor++]) || 0;
    }
    isBlockedForInput = true;
    return 0;
  });
}

/**
 * Re-create and re-initialize `instance` from the stored source,
 * then reset the input cursor so replay starts from the first input.
 */
function reinitialize(): boolean {
  instance = makeMipsfromSource(source);
  const result = instance.assemble();
  if (result.hasErrors) return false;
  instance.initialize(true);
  registerHandlers(instance);
  inputCursor = 0;
  return true;
}

/**
 * Run the simulator until it terminates or needs more input.
 * Returns the resulting state.
 */
function runLoop(): SimulatorState {
  isBlockedForInput = false;
  while (!instance.terminated && !isBlockedForInput) {
    instance.step();
  }
  return getState();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function assemble(src: string) {
  source = src;
  outputBuffer = '';
  allInputs = [];
  inputCursor = 0;
  isBlockedForInput = false;

  instance = makeMipsfromSource(source);
  const result = instance.assemble();
  if (result.hasErrors) return { ok: false, error: result.report };

  instance.initialize(true);
  registerHandlers(instance);
  return { ok: true };
}

export function getState(): SimulatorState {
  return {
    registers: getRegisters(instance),
    output: outputBuffer,
    pc: instance.programCounter,
    isWaiting: isBlockedForInput,
    terminated: instance.terminated,
  };
}

export function runSim(): SimulatorState {
  if (!source || instance.terminated) return getState();
  return runLoop();
}

export function stepSim(): SimulatorState {
  if (instance.terminated) return getState();
  isBlockedForInput = false;
  instance.step();
  return getState();
}

/**
 * Feed one or more whitespace-separated tokens as user input.
 *
 * Strategy:
 *   1. Append new tokens to allInputs.
 *   2. Reinitialize + replay silently (output suppressed) until we
 *      reach the same point the user was at — i.e. we've consumed
 *      exactly as many reads as before PLUS the new ones.
 *   3. Swap in the real output and continue running.
 *
 * This way the simulator state is always consistent and the read
 * syscalls always see a real value, never a sentinel.
 */
export function feedInput(rawInput: string): SimulatorState {
  const tokens = rawInput.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return getState();

  allInputs.push(...tokens);

  // Replay from the top with all inputs available.
  // We suppress output during replay to avoid duplicating it,
  // then restore the real accumulated output afterwards.
  const previousOutput = outputBuffer;
  outputBuffer = '';

  if (!reinitialize()) return getState(); // assemble failed – shouldn't happen

  // Run silently; the handlers will consume inputs in order.
  // We stop as soon as inputs run out (blocked again) or program ends.
  const state = runLoop();

  // If the replay consumed all inputs and stopped waiting,
  // the output now reflects the full run up to this point.
  // Keep it. If we're waiting again (program needs yet more input),
  // that's also fine — outputBuffer has everything printed so far.
  // Either way we do NOT want the previous output since it's already
  // included in the fresh replay.
  //
  // Edge-case: if reinitialize somehow produced no output at all
  // (e.g. program printed nothing before first read), fall back to
  // the previous output so the console doesn't blank out.
  if (outputBuffer === '' && previousOutput !== '') {
    outputBuffer = previousOutput;
  }

  return state;
}

export function resetSim() {
  source = '';
  outputBuffer = '';
  allInputs = [];
  inputCursor = 0;
  isBlockedForInput = false;
  instance = makeMipsfromSource('');
}

export function getMemoryRange(startAddr: number, wordCount: number) {
  if (!instance) return [];
  const memory = [];
  try {
    const bytes = instance.readMemoryBytes(startAddr, wordCount * 4);
    for (let i = 0; i < wordCount; i++) {
      const addr = startAddr + i * 4;
      const wordValue =
        ((bytes[i * 4] << 24) | (bytes[i * 4 + 1] << 16) | (bytes[i * 4 + 2] << 8) | bytes[i * 4 + 3]) >>> 0;
      memory.push({
        address: '0x' + addr.toString(16).toUpperCase(),
        value: '0x' + wordValue.toString(16).padStart(8, '0').toUpperCase(),
      });
    }
  } catch (e) {
    console.error(e);
  }
  return memory;
}