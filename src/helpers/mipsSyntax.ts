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

const instructions = new Set([
  "add", "addi", "addu", "addiu",
  "sub", "subu",
  "mul", "mult", "multu", "div", "divu",
  "and", "andi", "or", "ori", "xor", "xori", "nor",
  "slt", "slti", "sltu", "sltiu",
  "sll", "srl", "sra",
  "lw", "sw", "lb", "sb", "lh", "sh",
  "li", "la", "move",
  "beq", "bne", "bgt", "bge", "blt", "ble",
  "j", "jr", "jal",
  "syscall",
]);

const registers = new Set([
  "$zero", "$0",
  "$at",
  "$v0", "$v1",
  "$a0", "$a1", "$a2", "$a3",
  "$t0", "$t1", "$t2", "$t3", "$t4", "$t5", "$t6", "$t7",
  "$s0", "$s1", "$s2", "$s3", "$s4", "$s5", "$s6", "$s7",
  "$t8", "$t9",
  "$k0", "$k1",
  "$gp", "$sp", "$fp", "$ra",
]);

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