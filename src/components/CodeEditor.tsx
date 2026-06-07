import { highlightMipsCode, INSTRUCTION_LIST, REGISTER_LIST, DIRECTIVE_LIST } from '@/helpers/mipsSyntax';
import React, { useMemo, useRef, useState } from 'react';
import Editor from 'react-simple-code-editor';
import type { Theme } from '../theme/themes';

const TAB = '    ';

interface CompletionState {
  candidates: string[];
  activeIdx: number;
  tokenStart: number;
  lineIdx: number;
}

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  theme: Theme;
  activeLine: number | null;
  breakpoints: Set<number>;
  onBreakpointToggle: (line: number) => void;
  errorLines?: { line: number; message: string }[];
}

export function CodeEditor({ code, setCode, theme, activeLine, breakpoints, onBreakpointToggle, errorLines = [] }: CodeEditorProps) {
  const lines = code.split('\n');
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const [completion, setCompletion] = useState<CompletionState | null>(null);

  const errorMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const e of errorLines) m.set(e.line, e.message);
    return m;
  }, [errorLines]);

  const getTextarea = (): HTMLTextAreaElement | null =>
    editorWrapperRef.current?.querySelector('textarea') ?? null;

  const computeCompletion = (value: string, selStart: number) => {
    const before = value.slice(0, selStart);
    const match = before.match(/[$.\w]*$/);
    const token = match ? match[0] : '';
    if (!token) { setCompletion(null); return; }

    const tokenStart = selStart - token.length;
    const lineIdx = (before.match(/\n/g) ?? []).length;
    const tokenLower = token.toLowerCase();

    let pool: string[];
    if (token.startsWith('$')) {
      pool = REGISTER_LIST;
    } else if (token.startsWith('.')) {
      pool = DIRECTIVE_LIST;
    } else {
      // Only suggest instructions when the token is at instruction position on the line
      const lineStart = before.lastIndexOf('\n', tokenStart - 1) + 1;
      const lineBeforeToken = before.slice(lineStart, tokenStart);
      if (!/^(\s*[A-Za-z_]\w*:\s*|\s*)$/.test(lineBeforeToken)) {
        setCompletion(null); return;
      }
      pool = INSTRUCTION_LIST;
    }

    const startsWith = pool.filter(c => c.toLowerCase().startsWith(tokenLower));
    const includes = pool.filter(c => !c.toLowerCase().startsWith(tokenLower) && c.toLowerCase().includes(tokenLower));
    const candidates = [...startsWith, ...includes].slice(0, 8);

    if (candidates.length === 0 || (candidates.length === 1 && candidates[0].toLowerCase() === tokenLower)) {
      setCompletion(null); return;
    }

    setCompletion(prev => ({
      candidates,
      activeIdx: prev && prev.candidates[0] === candidates[0] ? Math.min(prev.activeIdx, candidates.length - 1) : 0,
      tokenStart,
      lineIdx,
    }));
  };

  const acceptCompletion = (candidate: string) => {
    const ta = getTextarea();
    if (!ta || !completion) return;
    const selStart = ta.selectionStart;
    const newCode = code.slice(0, completion.tokenStart) + candidate + code.slice(selStart);
    setCode(newCode);
    const newCaret = completion.tokenStart + candidate.length;
    requestAnimationFrame(() => {
      ta.selectionStart = newCaret;
      ta.selectionEnd = newCaret;
    });
    setCompletion(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      return;
    }

    if (completion) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCompletion(c => c ? { ...c, activeIdx: (c.activeIdx + 1) % c.candidates.length } : null);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCompletion(c => c ? { ...c, activeIdx: (c.activeIdx - 1 + c.candidates.length) % c.candidates.length } : null);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        acceptCompletion(completion.candidates[completion.activeIdx]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setCompletion(null);
        return;
      }
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
        setCompletion(null);
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newText = code.slice(0, start) + TAB + code.slice(end);
      setCode(newText);
      requestAnimationFrame(() => {
        target.selectionStart = start + TAB.length;
        target.selectionEnd = start + TAB.length;
      });
    }
  };

  const handleValueChange = (value: string) => {
    setCode(value);
    requestAnimationFrame(() => {
      const ta = getTextarea();
      if (ta) computeCompletion(value, ta.selectionStart);
    });
  };

  const dropdownPos = (() => {
    if (!completion) return null;
    const lineStart = code.slice(0, completion.tokenStart).lastIndexOf('\n') + 1;
    const charsBeforeToken = completion.tokenStart - lineStart;
    return {
      top: (completion.lineIdx + 1) * 22 + 16 + 2,
      left: 16 + charsBeforeToken * 9,
    };
  })();

  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.bg,
      padding: 14,
      border: `1px solid ${theme.border}`,
    }}>
      {/* Editor shell */}
      <div style={{
        flex: 1,
        minHeight: 0,
        backgroundColor: theme.card,
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'row',
      }}>
        {/* Gutter */}
        <div style={{
          width: 52,
          backgroundColor: theme.bg,
          borderRight: `1px solid ${theme.border}`,
          paddingTop: 16,
          paddingBottom: 100,
          flexShrink: 0,
          alignSelf: 'flex-start',
          minHeight: '100%',
          userSelect: 'none',
        }}>
          {lines.map((_, i) => {
            const lineNumber = i + 1;
            const isActive = activeLine === lineNumber;
            const hasBp = breakpoints.has(lineNumber);
            const errorMsg = errorMap.get(lineNumber);
            const hasError = errorMsg !== undefined;
            return (
              <div
                key={i}
                className="gutter-line"
                onClick={() => onBreakpointToggle(lineNumber)}
                title={hasError ? errorMsg : (hasBp ? 'Remove breakpoint' : 'Add breakpoint')}
                aria-label={hasError ? `Line ${lineNumber}: ${errorMsg}` : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 4,
                  paddingLeft: 1,
                  paddingRight: 8,
                  height: 22,
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#2563eb55' : 'transparent',
                  borderLeft: hasError ? '3px solid #ef4444' : '3px solid transparent',
                }}
              >
                {/* Breakpoint dot / hover hint */}
                <span
                  className={hasBp ? undefined : 'bp-hint'}
                  style={{
                    flexShrink: 0,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: hasBp ? '#ef4444' : 'transparent',
                    transition: 'background-color 0.1s',
                  }}
                />
                {/* Line number */}
                <span style={{
                  color: isActive ? theme.text : (hasBp || hasError ? '#ef4444' : theme.subText),
                  fontSize: 12,
                  fontFamily: 'monospace',
                  lineHeight: '22px',
                  fontWeight: isActive || hasBp || hasError ? 700 : 400,
                  minWidth: 20,
                  textAlign: 'right',
                }}>
                  {lineNumber}
                </span>
              </div>
            );
          })}
        </div>

        {/* Editor input wrapper */}
        <div
          ref={editorWrapperRef}
          style={{ flex: 1, position: 'relative', minWidth: 0, '--editor-caret': theme.text, '--editor-placeholder': theme.subText } as React.CSSProperties}
          onBlur={e => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setCompletion(null);
            }
          }}
        >
          {/* Active line overlay */}
          <div style={{ position: 'absolute', top: 16, left: 0, right: 0, pointerEvents: 'none', zIndex: 0 }}>
            {lines.map((_, i) => (
              <div
                key={i}
                style={{
                  height: 22,
                  backgroundColor: activeLine === i + 1 ? '#2563eb33' : 'transparent',
                }}
              />
            ))}
          </div>

          {/* Error underline overlay */}
          {errorMap.size > 0 && (
            <div style={{ position: 'absolute', top: 16, left: 0, right: 0, pointerEvents: 'none', zIndex: 1 }}>
              {lines.map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 22,
                    borderBottom: errorMap.has(i + 1) ? '2px solid #ef4444' : 'none',
                  }}
                />
              ))}
            </div>
          )}

          <Editor
            value={code}
            onValueChange={handleValueChange}
            highlight={value => highlightMipsCode(value, theme.syntax)}
            padding={16}
            onKeyDown={handleKeyDown as any}
            placeholder="# Write MIPS assembly here..."
            textareaClassName="mips-editor-textarea"
            preClassName="mips-editor-highlight"
            style={{
              fontFamily: 'monospace',
              fontSize: 15,
              lineHeight: '22px',
              color: 'transparent',
              backgroundColor: 'transparent',
              outline: 'none',
              minHeight: '100%',
            }}
          />

          {/* Autocomplete dropdown */}
          {completion && dropdownPos && (
            <div
              role="listbox"
              aria-label="Autocomplete suggestions"
              style={{
                position: 'absolute',
                top: dropdownPos.top,
                left: dropdownPos.left,
                zIndex: 10,
                backgroundColor: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                minWidth: 120,
                overflow: 'hidden',
              }}
            >
              {completion.candidates.map((c, idx) => (
                <div
                  key={c}
                  id={`completion-option-${idx}`}
                  role="option"
                  aria-selected={idx === completion.activeIdx}
                  onMouseDown={e => { e.preventDefault(); acceptCompletion(c); }}
                  style={{
                    padding: '4px 10px',
                    fontSize: 13,
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    backgroundColor: idx === completion.activeIdx ? '#2563eb33' : 'transparent',
                    color: idx === completion.activeIdx ? theme.text : theme.subText,
                    borderBottom: idx < completion.candidates.length - 1 ? `1px solid ${theme.border}22` : 'none',
                    userSelect: 'none',
                  }}
                >
                  {c}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
