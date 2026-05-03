import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { PageWrapper } from '@/components/PageWrapper';
import Cookies from 'js-cookie';
import { clearAuthToken, getAuthToken } from '../helpers/authStorage';
import type { Theme } from '../theme/themes';
import { THEMES } from '../theme/themes';

// ---------------------------------------------------------------------------
// Theme switch (unchanged from original)
// ---------------------------------------------------------------------------
interface ThemeSwitchProps { isDark: boolean; toggle: () => void; }

const ThemeSwitch = ({ isDark, toggle }: ThemeSwitchProps) => {
  const slideAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: isDark ? 1 : 0, duration: 150, useNativeDriver: false }).start();
  }, [isDark]);
  const thumbPosition = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [4, 30] });
  const trackBg     = slideAnim.interpolate({ inputRange: [0, 1], outputRange: ['#ffffff', '#2563eb'] });
  const trackBorder = slideAnim.interpolate({ inputRange: [0, 1], outputRange: ['#cbd5e1', '#2563eb'] });
  const thumbBg     = slideAnim.interpolate({ inputRange: [0, 1], outputRange: ['#94a3b8', '#ffffff'] });
  const iconColor   = slideAnim.interpolate({ inputRange: [0, 1], outputRange: ['#ffffff', '#2563eb'] });
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={toggle}>
      <Animated.View style={[styles.switchTrack, { backgroundColor: trackBg, borderColor: trackBorder }]}>
        <Animated.View style={[styles.switchThumb, { backgroundColor: thumbBg, transform: [{ translateX: thumbPosition }] }]}>
          <Animated.Text style={[styles.switchIcon, { color: iconColor, paddingLeft: isDark ? 1 : 0 }]}>
            {isDark ? '☾' : '☼'}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// Logout symbol (from IdeScreen)
// ---------------------------------------------------------------------------
const LogoutSymbol = ({ color = '#ffffff' }: { color?: string }) => (
  <View style={{ width: 24, height: 18, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ position: 'absolute', right: 4, width: 12, height: 18, borderTopWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderColor: color }} />
    <View style={{ position: 'absolute', right: 16, top: 0, width: 2, height: 5, backgroundColor: color }} />
    <View style={{ position: 'absolute', right: 16, bottom: 0, width: 2, height: 5, backgroundColor: color }} />
    <Text style={{ position: 'absolute', right: 8, transform: [{ translateY: -2 }], color: color, fontWeight: '700', fontSize: 16, lineHeight: 18 }}>←</Text>
  </View>
);

// ---------------------------------------------------------------------------
// Accordion
// ---------------------------------------------------------------------------
interface AccordionProps {
  title: string;
  children: React.ReactNode;
  theme: Theme;
  badge?: string;
}

const Accordion = ({ title, children, theme, badge }: AccordionProps) => {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    Animated.timing(anim, { toValue: open ? 0 : 1, duration: 180, useNativeDriver: false }).start();
    setOpen(p => !p);
  };

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

  return (
    <View style={[accStyles.wrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <TouchableOpacity activeOpacity={0.75} onPress={toggle} style={accStyles.header}>
        <View style={accStyles.headerLeft}>
          <Animated.Text style={[accStyles.chevron, { color: '#2563eb', transform: [{ rotate }] }]}>›</Animated.Text>
          <Text style={[accStyles.title, { color: theme.text }]}>{title}</Text>
        </View>
        {badge && (
          <View style={[accStyles.badge, { backgroundColor: '#2563eb22', borderColor: '#2563eb55' }]}>
            <Text style={[accStyles.badgeText, { color: '#2563eb' }]}>{badge}</Text>
          </View>
        )}
      </TouchableOpacity>
      {open && <View style={[accStyles.body, { borderTopColor: theme.border }]}>{children}</View>}
    </View>
  );
};

const accStyles = StyleSheet.create({
  wrap:       { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  chevron:    { fontSize: 20, fontWeight: '700', lineHeight: 22, width: 16 },
  title:      { fontSize: 15, fontWeight: '700' },
  body:       { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12, borderTopWidth: 1 },
  badge:      { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:  { fontSize: 11, fontWeight: '700' },
});

// ---------------------------------------------------------------------------
// SectionHeader (WIMPS / MIPS divider)
// ---------------------------------------------------------------------------
const SectionHeader = ({ label, theme }: { label: string; theme: Theme }) => (
  <View style={[shStyles.row, { borderColor: theme.border }]}>
    <View style={[shStyles.line, { backgroundColor: theme.border }]} />
    <Text style={[shStyles.label, { color: theme.subText }]}>{label}</Text>
    <View style={[shStyles.line, { backgroundColor: theme.border }]} />
  </View>
);
const shStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 12 },
  line:  { flex: 1, height: 1 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
});

// ---------------------------------------------------------------------------
// Inline code chip
// ---------------------------------------------------------------------------
const Code = ({ children, theme }: { children: string; theme: Theme }) => (
  <Text style={[codeStyles.chip, { backgroundColor: theme.border + '55', color: '#2563eb' }]}>{children}</Text>
);
const codeStyles = StyleSheet.create({
  chip: { fontFamily: 'monospace', fontSize: 12, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
});

// ---------------------------------------------------------------------------
// Monospace code block
// ---------------------------------------------------------------------------
const CodeBlock = ({ children, theme }: { children: string; theme: Theme }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    <Text style={[cbStyles.block, { backgroundColor: theme.border + '33', color: theme.consoleText ?? theme.text }]}>
      {children}
    </Text>
  </ScrollView>
);
const cbStyles = StyleSheet.create({
  block: { fontFamily: 'monospace', fontSize: 12, lineHeight: 19, borderRadius: 10, padding: 14, marginTop: 8 },
});

// ---------------------------------------------------------------------------
// Small table helper
// ---------------------------------------------------------------------------
interface TableProps { rows: [string, string, string?][]; headers: string[]; theme: Theme; }
const MiniTable = ({ rows, headers, theme }: TableProps) => (
  <View style={[tblStyles.wrap, { borderColor: theme.border }]}>
    <View style={[tblStyles.row, { backgroundColor: theme.border + '44' }]}>
      {headers.map(h => <Text key={h} style={[tblStyles.head, { color: theme.text, flex: h === headers[0] ? 1.2 : 2 }]}>{h}</Text>)}
    </View>
    {rows.map(([a, b, c], i) => (
      <View key={i} style={[tblStyles.row, i % 2 === 0 ? {} : { backgroundColor: theme.border + '22' }]}>
        <Text style={[tblStyles.cell, tblStyles.mono, { color: '#2563eb', flex: 1.2 }]}>{a}</Text>
        <Text style={[tblStyles.cell, tblStyles.mono, { color: theme.subText, flex: 2 }]}>{b}</Text>
        {c !== undefined && <Text style={[tblStyles.cell, { color: theme.subText, flex: 2 }]}>{c}</Text>}
      </View>
    ))}
  </View>
);
const tblStyles = StyleSheet.create({
  wrap: { borderRadius: 10, borderWidth: 1, overflow: 'hidden', marginTop: 8 },
  row:  { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8 },
  head: { fontSize: 11, fontWeight: '800', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8 },
  cell: { fontSize: 12, lineHeight: 18 },
  mono: { fontFamily: 'monospace' },
});

// ---------------------------------------------------------------------------
// Body text helper
// ---------------------------------------------------------------------------
const Body = ({ children, theme }: { children: string; theme: Theme }) => (
  <Text style={{ color: theme.subText, fontSize: 14, lineHeight: 22 }}>{children}</Text>
);

// ---------------------------------------------------------------------------
// QuadHex program
// ---------------------------------------------------------------------------
const QUADHEX_SOURCE = `# QuadHex — like FizzBuzz, but for 4, 6, and 24
# Prints 1..40:
#   divisible by 24 → "QuadHex"
#   divisible by  6 → "Hex"
#   divisible by  4 → "Quad"
#   otherwise       → the number

.data
str_quad:   .asciiz "Quad"
str_hex:    .asciiz "Hex"
str_quadhex:.asciiz "QuadHex"
str_newline:.asciiz "\\n"

.text
.globl main
main:
    li   $t0, 1          # counter i = 1
    li   $t1, 40         # limit

loop:
    bgt  $t0, $t1, done  # if i > 40, exit

    # check divisible by 24
    li   $t2, 24
    div  $t0, $t2
    mfhi $t3
    beqz $t3, print_quadhex

    # check divisible by 6
    li   $t2, 6
    div  $t0, $t2
    mfhi $t3
    beqz $t3, print_hex

    # check divisible by 4
    li   $t2, 4
    div  $t0, $t2
    mfhi $t3
    beqz $t3, print_quad

    # print number
    li   $v0, 1
    move $a0, $t0
    syscall
    j    next

print_quadhex:
    li   $v0, 4
    la   $a0, str_quadhex
    syscall
    j    next

print_hex:
    li   $v0, 4
    la   $a0, str_hex
    syscall
    j    next

print_quad:
    li   $v0, 4
    la   $a0, str_quad
    syscall

next:
    li   $v0, 4
    la   $a0, str_newline
    syscall
    addi $t0, $t0, 1
    j    loop

done:
    li   $v0, 10
    syscall`;

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const SYSCALLS: [string, string, string][] = [
  ['1',  '$v0=1, $a0=int',       'Print integer'],
  ['2',  '$v0=2, $f12=float',    'Print float'],
  ['3',  '$v0=3, $f12=double',   'Print double'],
  ['4',  '$v0=4, $a0=addr',      'Print null-terminated string'],
  ['5',  '$v0=5 → $v0=int',      'Read integer from console'],
  ['6',  '$v0=6 → $f0=float',    'Read float from console'],
  ['7',  '$v0=7 → $f0=double',   'Read double from console'],
  ['8',  '$v0=8 → string',       'Read string from console'],
  ['10', '$v0=10',               'Exit program'],
  ['11', '$v0=11, $a0=char',     'Print character'],
  ['12', '$v0=12 → $v0=char',    'Read character from console'],
];

const REGISTERS: [string, string, string][] = [
  ['$zero / $0', '0',          'Always zero — writes ignored'],
  ['$at / $1',   'Assembler',  'Reserved for assembler'],
  ['$v0–$v1',    '2–3',        'Function return values / syscall code'],
  ['$a0–$a3',    '4–7',        'Function arguments'],
  ['$t0–$t9',    '8–15,24–25', 'Temporaries — not preserved across calls'],
  ['$s0–$s7',    '16–23',      'Saved temporaries — preserved across calls'],
  ['$k0–$k1',    '26–27',      'Reserved for OS kernel'],
  ['$gp',        '28',         'Global pointer'],
  ['$sp',        '29',         'Stack pointer'],
  ['$fp',        '30',         'Frame pointer'],
  ['$ra',        '31',         'Return address'],
];

const INSTRUCTIONS: [string, string, string][] = [
  // Arithmetic
  ['add $d,$s,$t',   'R',  'Signed addition; traps on overflow'],
  ['addu $d,$s,$t',  'R',  'Unsigned addition; no overflow trap'],
  ['addi $t,$s,imm', 'I',  'Add sign-extended immediate'],
  ['addiu $t,$s,imm','I',  'Add immediate, unsigned'],
  ['sub $d,$s,$t',   'R',  'Signed subtract'],
  ['subu $d,$s,$t',  'R',  'Unsigned subtract'],
  ['mul $d,$s,$t',   'R',  'Multiply, result to $d (pseudo)'],
  ['mult $s,$t',     'R',  'Signed multiply → HI:LO'],
  ['multu $s,$t',    'R',  'Unsigned multiply → HI:LO'],
  ['div $s,$t',      'R',  'Signed divide; quotient→LO, rem→HI'],
  ['divu $s,$t',     'R',  'Unsigned divide'],
  ['mfhi $d',        'R',  'Move HI to register'],
  ['mflo $d',        'R',  'Move LO to register'],
  // Logic
  ['and $d,$s,$t',   'R',  'Bitwise AND'],
  ['andi $t,$s,imm', 'I',  'Bitwise AND with zero-extended imm'],
  ['or $d,$s,$t',    'R',  'Bitwise OR'],
  ['ori $t,$s,imm',  'I',  'Bitwise OR with zero-extended imm'],
  ['xor $d,$s,$t',   'R',  'Bitwise XOR'],
  ['nor $d,$s,$t',   'R',  'Bitwise NOR'],
  ['sll $d,$t,sa',   'R',  'Shift left logical'],
  ['srl $d,$t,sa',   'R',  'Shift right logical'],
  ['sra $d,$t,sa',   'R',  'Shift right arithmetic'],
  // Compare
  ['slt $d,$s,$t',   'R',  'Set $d=1 if $s < $t (signed)'],
  ['sltu $d,$s,$t',  'R',  'Unsigned version of slt'],
  ['slti $t,$s,imm', 'I',  'Set if less than immediate (signed)'],
  // Memory
  ['lw $t,off($s)',  'I',  'Load word from memory'],
  ['sw $t,off($s)',  'I',  'Store word to memory'],
  ['lh $t,off($s)',  'I',  'Load halfword, sign-extend'],
  ['lhu $t,off($s)', 'I',  'Load halfword, zero-extend'],
  ['sh $t,off($s)',  'I',  'Store halfword'],
  ['lb $t,off($s)',  'I',  'Load byte, sign-extend'],
  ['lbu $t,off($s)', 'I',  'Load byte, zero-extend'],
  ['sb $t,off($s)',  'I',  'Store byte'],
  ['lui $t,imm',     'I',  'Load upper 16 bits of register'],
  // Branch / Jump
  ['beq $s,$t,lbl',  'I',  'Branch if equal'],
  ['bne $s,$t,lbl',  'I',  'Branch if not equal'],
  ['blt $s,$t,lbl',  'I',  'Branch if less than (pseudo)'],
  ['bgt $s,$t,lbl',  'I',  'Branch if greater than (pseudo)'],
  ['ble $s,$t,lbl',  'I',  'Branch if ≤ (pseudo)'],
  ['bge $s,$t,lbl',  'I',  'Branch if ≥ (pseudo)'],
  ['beqz $s,lbl',    'I',  'Branch if $s == 0 (pseudo)'],
  ['bnez $s,lbl',    'I',  'Branch if $s != 0 (pseudo)'],
  ['j label',        'J',  'Unconditional jump'],
  ['jal label',      'J',  'Jump and link — saves PC+4 to $ra'],
  ['jr $s',          'R',  'Jump to address in register'],
  ['jalr $s',        'R',  'Jump and link via register'],
  // Pseudo
  ['li $t,imm',      'P',  'Load immediate (pseudo)'],
  ['la $t,label',    'P',  'Load address (pseudo)'],
  ['move $d,$s',     'P',  'Copy register (pseudo)'],
  ['nop',            'P',  'No operation (pseudo)'],
];

const DIRECTIVES: [string, string][] = [
  ['.data',        'Begin data segment'],
  ['.text',        'Begin code segment'],
  ['.globl label', 'Make label globally visible'],
  ['.word n',      'Allocate one or more 32-bit words'],
  ['.half n',      'Allocate one or more 16-bit halfwords'],
  ['.byte n',      'Allocate one or more bytes'],
  ['.ascii "s"',   'Store string (no null terminator)'],
  ['.asciiz "s"',  'Store null-terminated string'],
  ['.float n',     'Allocate a single-precision float'],
  ['.double n',    'Allocate a double-precision float'],
  ['.space n',     'Allocate n bytes of zero-filled space'],
  ['.align n',     'Align next datum to 2ⁿ byte boundary'],
];

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function DocsScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [search, setSearch] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const activeTheme = isDarkMode ? THEMES.dark : THEMES.light;
  const tStyles = useMemo(() => getThemeStyles(activeTheme), [activeTheme]);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    Cookies.set('theme', next ? 'dark' : 'light', { expires: 365 });
  };

  useEffect(() => {
    const saved = Cookies.get('theme');
    if (saved) setIsDarkMode(saved === 'dark');
  }, []);

  // --- Auth detection (mirrors IdeScreen) ---
  useEffect(() => {
    const checkAuth = async () => {
      const token = await getAuthToken();
      setIsLoggedIn(!!token);
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    await clearAuthToken();
    setIsLoggedIn(false);
  };

  const q = search.trim().toLowerCase();

  // Filter instructions, syscalls, directives by search query
  const filteredInstructions = useMemo(() =>
    q ? INSTRUCTIONS.filter(([syn, , desc]) => syn.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) : INSTRUCTIONS,
    [q]);

  const filteredSyscalls = useMemo(() =>
    q ? SYSCALLS.filter(([num, args, desc]) => num.includes(q) || args.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) : SYSCALLS,
    [q]);

  const filteredDirectives = useMemo(() =>
    q ? DIRECTIVES.filter(([dir, desc]) => dir.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) : DIRECTIVES,
    [q]);

  const t = activeTheme;

  return (
    <PageWrapper>
      <SafeAreaView style={tStyles.safeArea}>
        <StatusBar barStyle={activeTheme.statusBarStyle as any} />
        <View style={tStyles.container}>

          {/* Top bar */}
          <View style={styles.topBar}>
            <Image
              source={isDarkMode
                ? require('../../assets/images/WIMPS_dark.png')
                : require('../../assets/images/WIMPS_light.png')}
              style={styles.logo}
            />
            <View style={styles.topBarActions}>
              <ThemeSwitch isDark={isDarkMode} toggle={toggleTheme} />
              <TouchableOpacity style={tStyles.secondaryButton} onPress={() => router.push('/')}>
                <Text style={tStyles.secondaryButtonText}>IDE</Text>
              </TouchableOpacity>
              {isLoggedIn ? (
                <TouchableOpacity
                  style={[styles.primaryButton, { paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center', alignItems: 'center' }]}
                  onPress={handleLogout}
                >
                  <LogoutSymbol color="#ffffff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/login')}>
                  <Text style={styles.primaryButtonText}>Login</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Page header */}
          <View style={tStyles.pageHeader}>
            <Text style={tStyles.pageTitle}>Documentation</Text>
            <Text style={tStyles.pageSubtitle}>Everything you need to write MIPS assembly in WIMPS</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* ── WIMPS ── */}
            <SectionHeader label="WIMPS" theme={t} />

            <Accordion title="Getting Started" theme={t}>
              <Body theme={t}>
                {'Write your MIPS assembly code in the Editor panel. The toolbar at the top of the editor gives you four actions:\n\n• Assemble — parses and assembles your source. Errors appear in the Console.\n• Run — executes the assembled program until it terminates or waits for input.\n• Step — executes one instruction at a time so you can watch registers change.\n• Reset — clears execution state and output. You will need to Assemble again before running.'}
              </Body>
            </Accordion>

            <Accordion title="Editor & Tabs" theme={t}>
              <Body theme={t}>
                {'The editor supports multiple files via tabs. Click the + button to open a new tab. Double-tap a tab name to rename it. Click ✕ to close a tab (a minimum of one tab is always kept open).\n\nUse the ↑ button to upload a .asm, .s, or .txt file from your device. Use the ↓ button to download the active file.'}
              </Body>
            </Accordion>

            <Accordion title="Registers Panel" theme={t}>
              <Body theme={t}>
                {'All 32 MIPS general-purpose registers are shown on the right. Values update live after every Step or Run. Use the Hex / Dec toggle at the top of the panel to switch display format between hexadecimal and decimal.'}
              </Body>
            </Accordion>

            <Accordion title="Console & Input" theme={t}>
              <Body theme={t}>
                {'Program output (print syscalls) appears in the Console panel. When your program issues a read syscall (e.g. read integer, read string), the console shows [WAITING FOR INPUT...] and the input bar at the bottom activates.\n\nType your value and press Enter or tap SEND. Multiple space-separated tokens are queued so programs that read several values in a row work correctly.'}
              </Body>
            </Accordion>

            <Accordion title="Memory View" theme={t}>
              <Body theme={t}>
                {'The Memory View panel shows a snapshot of the data segment starting at 0x10010000 (the default .data base address in MIPS). It displays 20 words, updated after every Run or Step.'}
              </Body>
            </Accordion>

            <Accordion title="Layout & Panels" theme={t}>
              <Body theme={t}>
                {'On wide screens you can drag the dividers between panels to resize them. Each panel can be minimised using its − button; minimised panels collapse to a title bar and can be restored from the tray at the top. On narrow screens the four panels (Editor, Console, Registers, Memory) are accessible via the tab bar at the bottom.'}
              </Body>
            </Accordion>

            {/* ── MIPS ── */}
            <SectionHeader label="MIPS Assembly" theme={t} />

            {/* Search bar */}
            <View style={[styles.searchBar, { backgroundColor: t.card, borderColor: t.border }]}>
              <Text style={{ color: t.subText, marginRight: 8, fontSize: 14 }}>⌕</Text>
              <TextInput
                style={{ flex: 1, color: t.text, fontFamily: 'monospace', fontSize: 13 }}
                placeholder="Search instructions, syscalls, directives…"
                placeholderTextColor={t.subText}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={{ color: t.subText, fontSize: 16, paddingLeft: 8 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <Accordion title="Program Structure" theme={t}>
              <Body theme={t}>
                {'A MIPS program is split into two segments:\n\n.data — declares labelled memory (strings, integers, arrays).\n.text — contains executable instructions.\n\nExecution begins at the label "main". Always end your program with the exit syscall ($v0 = 10) to terminate cleanly.'}
              </Body>
              <CodeBlock theme={t}>{`.data
msg: .asciiz "Hello, WIMPS!\\n"

.text
.globl main
main:
    li   $v0, 4          # print string
    la   $a0, msg
    syscall

    li   $v0, 10         # exit
    syscall`}</CodeBlock>
            </Accordion>

            <Accordion title={`Instructions${q && filteredInstructions.length !== INSTRUCTIONS.length ? ` (${filteredInstructions.length} results)` : ''}`} theme={t} badge={`${INSTRUCTIONS.length}`}>
              <Body theme={t}>{'R = register, I = immediate, J = jump, P = pseudo-instruction (expanded by assembler).'}</Body>
              <MiniTable
                theme={t}
                headers={['Syntax', 'Fmt', 'Description']}
                rows={filteredInstructions.map(([s, f, d]) => [s, f, d])}
              />
              {filteredInstructions.length === 0 && (
                <Text style={{ color: t.subText, marginTop: 8, fontStyle: 'italic' }}>No matching instructions.</Text>
              )}
            </Accordion>

            <Accordion title={`Syscalls${q && filteredSyscalls.length !== SYSCALLS.length ? ` (${filteredSyscalls.length} results)` : ''}`} theme={t} badge={`${SYSCALLS.length}`}>
              <Body theme={t}>{'Load the syscall code into $v0, arguments into $a0 / $f12 as specified, then execute syscall.'}</Body>
              <MiniTable
                theme={t}
                headers={['Code', 'Arguments / Return', 'Action']}
                rows={filteredSyscalls}
              />
              {filteredSyscalls.length === 0 && (
                <Text style={{ color: t.subText, marginTop: 8, fontStyle: 'italic' }}>No matching syscalls.</Text>
              )}
            </Accordion>

            <Accordion title={`Directives${q && filteredDirectives.length !== DIRECTIVES.length ? ` (${filteredDirectives.length} results)` : ''}`} theme={t} badge={`${DIRECTIVES.length}`}>
              <MiniTable
                theme={t}
                headers={['Directive', 'Description']}
                rows={filteredDirectives}
              />
              {filteredDirectives.length === 0 && (
                <Text style={{ color: t.subText, marginTop: 8, fontStyle: 'italic' }}>No matching directives.</Text>
              )}
            </Accordion>

            <Accordion title="Registers Reference" theme={t} badge="32">
              <MiniTable
                theme={t}
                headers={['Name', 'Number(s)', 'Convention']}
                rows={REGISTERS}
              />
            </Accordion>

            <Accordion title="Memory Layout" theme={t}>
              <Body theme={t}>{'MIPS memory is divided into fixed segments (typical MARS/WIMPS defaults):'}</Body>
              <MiniTable
                theme={t}
                headers={['Segment', 'Address range']}
                rows={[
                  ['Text',         '0x00400000 – 0x0FFFFFFF'],
                  ['Data (.data)', '0x10010000 – 0x1003FFFF'],
                  ['Heap',         '0x10040000 (grows up)  '],
                  ['Stack',        '0x7FFFFFFC (grows down)'],
                ]}
              />
              <Text style={{ color: t.subText, fontSize: 13, marginTop: 10, lineHeight: 20 }}>
                {'Words are 4 bytes and must be word-aligned (address divisible by 4). Halfwords must be 2-byte aligned. Misaligned accesses will cause an exception.'}
              </Text>
            </Accordion>

            <Accordion title="Calling Convention" theme={t}>
              <Body theme={t}>
                {'When calling a function with jal:\n\n• Pass arguments in $a0–$a3 (up to four words).\n• The callee saves $s0–$s7, $fp, and $ra on the stack if it uses them.\n• Results are returned in $v0–$v1.\n• $t0–$t9 are caller-saved — assume they are clobbered across calls.\n\nTypical function prologue / epilogue:'}
              </Body>
              <CodeBlock theme={t}>{`func:
    addi $sp, $sp, -8    # allocate frame
    sw   $ra, 4($sp)     # save return address
    sw   $s0, 0($sp)     # save $s0

    # ... body ...

    lw   $s0, 0($sp)     # restore
    lw   $ra, 4($sp)
    addi $sp, $sp, 8     # free frame
    jr   $ra`}</CodeBlock>
            </Accordion>

            <Accordion title="QuadHex — Tester Program" theme={t} badge="example">
              <Body theme={t}>
                {'QuadHex is a FizzBuzz-style program to practice loops, division (div / mfhi), branching, and syscalls all at once.\n\nRules for 1 → 40:\n  • divisible by 24 → print "QuadHex"\n  • divisible by  6 → print "Hex"\n  • divisible by  4 → print "Quad"\n  • otherwise       → print the number\n\nPaste it into the editor and hit Assemble → Run.'}
              </Body>
              <CodeBlock theme={t}>{QUADHEX_SOURCE}</CodeBlock>
            </Accordion>

          </ScrollView>
        </View>
      </SafeAreaView>
    </PageWrapper>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const getThemeStyles = (theme: Theme) => StyleSheet.create({
  safeArea:            { flex: 1, backgroundColor: theme.bg },
  container:           { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  secondaryButton:     { borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.btnBg },
  secondaryButtonText: { color: theme.text, fontWeight: '600' },
  pageHeader:          { marginBottom: 20 },
  pageTitle:           { color: theme.text, fontSize: 24, fontWeight: '700' },
  pageSubtitle:        { color: theme.subText, fontSize: 14, marginTop: 4 },
});

const styles = StyleSheet.create({
  topBar:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 },
  logo:          { width: 240, height: 44, resizeMode: 'contain' },
  topBarActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  primaryButton: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  primaryButtonText: { color: '#ffffff', fontWeight: '600' },
  scrollContent: { paddingBottom: 32 },
  searchBar:     { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  switchTrack:   { width: 58, height: 32, borderRadius: 16, borderWidth: 2, justifyContent: 'center' },
  switchThumb:   { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  switchIcon:    { fontSize: 12, fontWeight: 'bold', lineHeight: 14 },
});