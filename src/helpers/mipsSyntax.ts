export type SyntaxTokenType =
  | "instruction"
  | "register"
  | "number"
  | "label"
  | "comment"
  | "string"
  | "directive"
  | "text";

export type SyntaxToken = {
  text: string;
  type: SyntaxTokenType;
};

// ---------------------------------------------------------------------------
// Canonical reference tables (single source of truth for docs + highlighter)
// ---------------------------------------------------------------------------

export interface InstructionDoc {
  syntax: string;
  mnemonic: string;
  type: 'R' | 'I' | 'J' | 'P';
  desc: string;
  example?: string;
}

export interface SyscallDoc {
  code: string;
  args: string;
  desc: string;
}

export interface RegisterDoc {
  name: string;
  number: string;
  convention: string;
}

export interface DirectiveDoc {
  directive: string;
  desc: string;
}

export const INSTRUCTIONS: InstructionDoc[] = [
  { syntax: 'add $d,$s,$t',    mnemonic: 'add',    type: 'R', desc: 'Signed addition; traps on overflow' },
  { syntax: 'addu $d,$s,$t',   mnemonic: 'addu',   type: 'R', desc: 'Unsigned addition; no overflow trap' },
  { syntax: 'addi $t,$s,imm',  mnemonic: 'addi',   type: 'I', desc: 'Add sign-extended immediate' },
  { syntax: 'addiu $t,$s,imm', mnemonic: 'addiu',  type: 'I', desc: 'Add immediate, unsigned' },
  { syntax: 'sub $d,$s,$t',    mnemonic: 'sub',    type: 'R', desc: 'Signed subtract' },
  { syntax: 'subu $d,$s,$t',   mnemonic: 'subu',   type: 'R', desc: 'Unsigned subtract' },
  { syntax: 'mul $d,$s,$t',    mnemonic: 'mul',    type: 'R', desc: 'Multiply, result to $d (pseudo)' },
  { syntax: 'mult $s,$t',      mnemonic: 'mult',   type: 'R', desc: 'Signed multiply → HI:LO' },
  { syntax: 'multu $s,$t',     mnemonic: 'multu',  type: 'R', desc: 'Unsigned multiply → HI:LO' },
  { syntax: 'div $s,$t',       mnemonic: 'div',    type: 'R', desc: 'Signed divide; quotient→LO, rem→HI' },
  { syntax: 'divu $s,$t',      mnemonic: 'divu',   type: 'R', desc: 'Unsigned divide' },
  { syntax: 'mfhi $d',         mnemonic: 'mfhi',   type: 'R', desc: 'Move HI to register' },
  { syntax: 'mflo $d',         mnemonic: 'mflo',   type: 'R', desc: 'Move LO to register' },
  { syntax: 'and $d,$s,$t',    mnemonic: 'and',    type: 'R', desc: 'Bitwise AND' },
  { syntax: 'andi $t,$s,imm',  mnemonic: 'andi',   type: 'I', desc: 'Bitwise AND with zero-extended imm' },
  { syntax: 'or $d,$s,$t',     mnemonic: 'or',     type: 'R', desc: 'Bitwise OR' },
  { syntax: 'ori $t,$s,imm',   mnemonic: 'ori',    type: 'I', desc: 'Bitwise OR with zero-extended imm' },
  { syntax: 'xor $d,$s,$t',    mnemonic: 'xor',    type: 'R', desc: 'Bitwise XOR' },
  { syntax: 'xori $t,$s,imm',  mnemonic: 'xori',   type: 'I', desc: 'Bitwise XOR with zero-extended imm' },
  { syntax: 'nor $d,$s,$t',    mnemonic: 'nor',    type: 'R', desc: 'Bitwise NOR' },
  { syntax: 'sll $d,$t,sa',    mnemonic: 'sll',    type: 'R', desc: 'Shift left logical' },
  { syntax: 'srl $d,$t,sa',    mnemonic: 'srl',    type: 'R', desc: 'Shift right logical' },
  { syntax: 'sra $d,$t,sa',    mnemonic: 'sra',    type: 'R', desc: 'Shift right arithmetic' },
  { syntax: 'slt $d,$s,$t',    mnemonic: 'slt',    type: 'R', desc: 'Set $d=1 if $s < $t (signed)' },
  { syntax: 'sltu $d,$s,$t',   mnemonic: 'sltu',   type: 'R', desc: 'Unsigned version of slt' },
  { syntax: 'slti $t,$s,imm',  mnemonic: 'slti',   type: 'I', desc: 'Set if less than immediate (signed)' },
  { syntax: 'sltiu $t,$s,imm', mnemonic: 'sltiu',  type: 'I', desc: 'Set if less than unsigned immediate' },
  { syntax: 'lw $t,off($s)',   mnemonic: 'lw',     type: 'I', desc: 'Load word from memory' },
  { syntax: 'sw $t,off($s)',   mnemonic: 'sw',     type: 'I', desc: 'Store word to memory' },
  { syntax: 'lh $t,off($s)',   mnemonic: 'lh',     type: 'I', desc: 'Load halfword, sign-extend' },
  { syntax: 'lhu $t,off($s)',  mnemonic: 'lhu',    type: 'I', desc: 'Load halfword, zero-extend' },
  { syntax: 'sh $t,off($s)',   mnemonic: 'sh',     type: 'I', desc: 'Store halfword' },
  { syntax: 'lb $t,off($s)',   mnemonic: 'lb',     type: 'I', desc: 'Load byte, sign-extend' },
  { syntax: 'lbu $t,off($s)',  mnemonic: 'lbu',    type: 'I', desc: 'Load byte, zero-extend' },
  { syntax: 'sb $t,off($s)',   mnemonic: 'sb',     type: 'I', desc: 'Store byte' },
  { syntax: 'lui $t,imm',      mnemonic: 'lui',    type: 'I', desc: 'Load upper 16 bits of register' },
  { syntax: 'beq $s,$t,lbl',   mnemonic: 'beq',    type: 'I', desc: 'Branch if equal' },
  { syntax: 'bne $s,$t,lbl',   mnemonic: 'bne',    type: 'I', desc: 'Branch if not equal' },
  { syntax: 'blt $s,$t,lbl',   mnemonic: 'blt',    type: 'I', desc: 'Branch if less than (pseudo)' },
  { syntax: 'bgt $s,$t,lbl',   mnemonic: 'bgt',    type: 'I', desc: 'Branch if greater than (pseudo)' },
  { syntax: 'ble $s,$t,lbl',   mnemonic: 'ble',    type: 'I', desc: 'Branch if ≤ (pseudo)' },
  { syntax: 'bge $s,$t,lbl',   mnemonic: 'bge',    type: 'I', desc: 'Branch if ≥ (pseudo)' },
  { syntax: 'beqz $s,lbl',     mnemonic: 'beqz',   type: 'I', desc: 'Branch if $s == 0 (pseudo)' },
  { syntax: 'bnez $s,lbl',     mnemonic: 'bnez',   type: 'I', desc: 'Branch if $s != 0 (pseudo)' },
  { syntax: 'j label',         mnemonic: 'j',      type: 'J', desc: 'Unconditional jump' },
  { syntax: 'jal label',       mnemonic: 'jal',    type: 'J', desc: 'Jump and link; saves PC+4 to $ra' },
  { syntax: 'jr $s',           mnemonic: 'jr',     type: 'R', desc: 'Jump to address in register' },
  { syntax: 'jalr $s',         mnemonic: 'jalr',   type: 'R', desc: 'Jump and link via register' },
  { syntax: 'syscall',         mnemonic: 'syscall',type: 'R', desc: 'System call — behavior depends on $v0' },
  { syntax: 'li $t,imm',       mnemonic: 'li',     type: 'P', desc: 'Load immediate (pseudo)' },
  { syntax: 'la $t,label',     mnemonic: 'la',     type: 'P', desc: 'Load address (pseudo)' },
  { syntax: 'move $d,$s',      mnemonic: 'move',   type: 'P', desc: 'Copy register (pseudo)' },
  { syntax: 'nop',             mnemonic: 'nop',    type: 'P', desc: 'No operation (pseudo)' },
];

export const SYSCALLS: SyscallDoc[] = [
  { code: '1',  args: '$v0=1, $a0=int',       desc: 'Print integer' },
  { code: '2',  args: '$v0=2, $f12=float',    desc: 'Print float' },
  { code: '3',  args: '$v0=3, $f12=double',   desc: 'Print double' },
  { code: '4',  args: '$v0=4, $a0=addr',      desc: 'Print null-terminated string' },
  { code: '5',  args: '$v0=5 → $v0=int',      desc: 'Read integer from console' },
  { code: '6',  args: '$v0=6 → $f0=float',    desc: 'Read float from console' },
  { code: '7',  args: '$v0=7 → $f0=double',   desc: 'Read double from console' },
  { code: '8',  args: '$v0=8 → string',       desc: 'Read string from console' },
  { code: '10', args: '$v0=10',               desc: 'Exit program' },
  { code: '11', args: '$v0=11, $a0=char',     desc: 'Print character' },
  { code: '12', args: '$v0=12 → $v0=char',    desc: 'Read character from console' },
];

export const REGISTERS: RegisterDoc[] = [
  { name: '$zero / $0', number: '0',          convention: 'Always zero. Writes are discarded.' },
  { name: '$at / $1',   number: 'Assembler',  convention: 'Reserved for assembler' },
  { name: '$v0–$v1',    number: '2–3',        convention: 'Function return values / syscall code' },
  { name: '$a0–$a3',    number: '4–7',        convention: 'Function arguments' },
  { name: '$t0–$t9',    number: '8–15,24–25', convention: 'Temporaries; caller-saved' },
  { name: '$s0–$s7',    number: '16–23',      convention: 'Saved temporaries; callee-saved' },
  { name: '$k0–$k1',    number: '26–27',      convention: 'Reserved for OS kernel' },
  { name: '$gp',        number: '28',         convention: 'Global pointer' },
  { name: '$sp',        number: '29',         convention: 'Stack pointer' },
  { name: '$fp',        number: '30',         convention: 'Frame pointer' },
  { name: '$ra',        number: '31',         convention: 'Return address' },
];

export const DIRECTIVES: DirectiveDoc[] = [
  { directive: '.data',        desc: 'Begin data segment' },
  { directive: '.text',        desc: 'Begin code segment' },
  { directive: '.globl label', desc: 'Make label globally visible' },
  { directive: '.word n',      desc: 'Allocate one or more 32-bit words' },
  { directive: '.half n',      desc: 'Allocate one or more 16-bit halfwords' },
  { directive: '.byte n',      desc: 'Allocate one or more bytes' },
  { directive: '.ascii "s"',   desc: 'Store string (no null terminator)' },
  { directive: '.asciiz "s"',  desc: 'Store null-terminated string' },
  { directive: '.float n',     desc: 'Allocate a single-precision float' },
  { directive: '.double n',    desc: 'Allocate a double-precision float' },
  { directive: '.space n',     desc: 'Allocate n bytes of zero-filled space' },
  { directive: '.align n',     desc: 'Align next datum to 2ⁿ byte boundary' },
];

// Flat lists for autocomplete (Feature 5)
export const INSTRUCTION_LIST: string[] = INSTRUCTIONS.map(i => i.mnemonic);
export const DIRECTIVE_LIST: string[] = DIRECTIVES.map(d => d.directive.split(' ')[0]);
export const REGISTER_LIST: string[] = [
  '$zero', '$0',
  '$at',
  '$v0', '$v1',
  '$a0', '$a1', '$a2', '$a3',
  '$t0', '$t1', '$t2', '$t3', '$t4', '$t5', '$t6', '$t7',
  '$s0', '$s1', '$s2', '$s3', '$s4', '$s5', '$s6', '$s7',
  '$t8', '$t9',
  '$k0', '$k1',
  '$gp', '$sp', '$fp', '$ra',
];

// ---------------------------------------------------------------------------
// Tokenizer sets (derived from canonical tables above)
// ---------------------------------------------------------------------------

const instructions = new Set(INSTRUCTION_LIST);
const registers = new Set(REGISTER_LIST);

export function tokenizeMipsLine(line: string): SyntaxToken[] {
  const commentIndex = line.indexOf("#");
  const code = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
  const comment = commentIndex >= 0 ? line.slice(commentIndex) : "";

  const tokens: SyntaxToken[] = [];

  const regex =
    /("[^"]*"|'[^']*'|\.[A-Za-z_]\w*|\$[A-Za-z0-9]+|-?0x[0-9a-fA-F]+|-?\d+|[A-Za-z_]\w*:|[A-Za-z_]\w*|\s+|.)/g;

  for (const match of code.matchAll(regex)) {
    const text = match[0];
    const lower = text.toLowerCase();

    if (/^\s+$/.test(text)) {
      tokens.push({ text, type: "text" });
    } else if (/^["']/.test(text)) {
      tokens.push({ text, type: "string" });
    } else if (instructions.has(lower)) {
      tokens.push({ text, type: "instruction" });
    } else if (registers.has(lower)) {
      tokens.push({ text, type: "register" });
    } else if (/^\.[A-Za-z_]\w*$/.test(text)) {
      tokens.push({ text, type: "directive" });
    } else if (/^[A-Za-z_]\w*:$/.test(text)) {
      tokens.push({ text, type: "label" });
    } else if (/^-?(0x[0-9a-fA-F]+|\d+)$/.test(text)) {
      tokens.push({ text, type: "number" });
    } else {
      tokens.push({ text, type: "text" });
    }
  }

  if (comment) {
    tokens.push({ text: comment, type: "comment" });
  }

  return tokens;
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export function highlightMipsCode(
  code: string,
  colors: Record<SyntaxTokenType, string>
) {
  return code
    .split('\n')
    .map((line) =>
      tokenizeMipsLine(line)
        .map((token) => {
          const color = colors[token.type] ?? colors.text;
          return `<span style="color:${color}">${escapeHtml(token.text)}</span>`;
        })
        .join('')
    )
    .join('\n');
}
