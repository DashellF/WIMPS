import React from 'react';
import type { Theme } from '../theme/themes';
import { Skeleton } from './Skeleton';

// Shared top-nav skeleton: logo on the left, a row of pills on the right.
function NavSkeleton({ theme, padding, rightItems }: { theme: Theme; padding: string; rightItems: number }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding, borderBottom: `1px solid ${theme.border}`,
    }}>
      <Skeleton theme={theme} width={92} height={22} radius={6} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        {Array.from({ length: rightItems }).map((_, i) => (
          <Skeleton key={i} theme={theme} width={i === rightItems - 1 ? 84 : 46} height={i === rightItems - 1 ? 34 : 15} radius={i === rightItems - 1 ? 8 : 5} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------
export function HomeSkeleton({ theme }: { theme: Theme }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.bg }}>
      <NavSkeleton theme={theme} padding="16px 32px" rightItems={4} />

      {/* Hero */}
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '100px 24px 80px', gap: 18 }}>
        <Skeleton theme={theme} width="min(620px, 90%)" height={46} radius={10} />
        <Skeleton theme={theme} width="min(440px, 80%)" height={46} radius={10} />
        <Skeleton theme={theme} width="min(480px, 85%)" height={18} radius={6} style={{ marginTop: 14 }} />
        <Skeleton theme={theme} width={196} height={50} radius={10} style={{ marginTop: 24 }} />
        <div style={{ display: 'flex', gap: 26, marginTop: 6 }}>
          <Skeleton theme={theme} width={120} height={15} radius={5} />
          <Skeleton theme={theme} width={90} height={15} radius={5} />
        </div>
      </section>

      {/* Feature panel */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 32px 100px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Skeleton theme={theme} width="70%" height={30} radius={8} />
            <Skeleton theme={theme} width="100%" height={15} radius={5} style={{ marginTop: 8 }} />
            <Skeleton theme={theme} width="92%" height={15} radius={5} />
            <Skeleton theme={theme} width="80%" height={15} radius={5} />
            <Skeleton theme={theme} width={170} height={16} radius={5} style={{ marginTop: 20 }} />
          </div>
          <Skeleton theme={theme} width="min(520px, 100%)" height={300} radius={12} style={{ flex: '1 1 360px' }} />
        </div>

        {/* Capability columns */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, borderTop: `1px solid ${theme.border}`, paddingTop: 52, marginTop: 64 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton theme={theme} width="60%" height={16} radius={5} />
              <Skeleton theme={theme} width="100%" height={13} radius={4} />
              <Skeleton theme={theme} width="85%" height={13} radius={4} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Docs
// ---------------------------------------------------------------------------
export function DocsSkeleton({ theme }: { theme: Theme }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.bg }}>
      <NavSkeleton theme={theme} padding="12px 24px" rightItems={3} />
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 24px 80px' }}>
        <Skeleton theme={theme} width={120} height={30} radius={8} />
        <Skeleton theme={theme} width="min(420px, 80%)" height={15} radius={5} style={{ marginTop: 12, marginBottom: 28 }} />
        <Skeleton theme={theme} width="100%" height={46} radius={10} style={{ marginBottom: 28 }} />

        {/* Section divider */}
        <Skeleton theme={theme} width={140} height={12} radius={4} style={{ margin: '18px auto' }} />

        {/* Accordion rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} theme={theme} width="100%" height={52} radius={14} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auth (Login / Register)
// ---------------------------------------------------------------------------
export function AuthSkeleton({ theme, fields }: { theme: Theme; fields: number }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.bg, display: 'flex', flexDirection: 'column' }}>
      <NavSkeleton theme={theme} padding="16px 24px" rightItems={1} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{
          width: '100%', maxWidth: 380,
          backgroundColor: theme.card, border: `1px solid ${theme.border}`,
          borderRadius: 16, padding: 32,
        }}>
          <Skeleton theme={theme} width={130} height={26} radius={7} />
          <Skeleton theme={theme} width="80%" height={14} radius={5} style={{ marginTop: 10, marginBottom: 28 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Array.from({ length: fields }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton theme={theme} width={90} height={11} radius={4} />
                <Skeleton theme={theme} width="100%" height={40} radius={8} />
              </div>
            ))}
            <Skeleton theme={theme} width="100%" height={44} radius={8} style={{ marginTop: 4 }} />
          </div>

          <Skeleton theme={theme} width="60%" height={13} radius={4} style={{ margin: '20px auto 0' }} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IDE
// ---------------------------------------------------------------------------
export function IdeSkeleton({ theme }: { theme: Theme }) {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: theme.bg, overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', height: 48, gap: 8, padding: '0 12px',
        borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.card, flexShrink: 0,
      }}>
        <Skeleton theme={theme} width={66} height={20} radius={6} />
        <div style={{ display: 'flex', gap: 4, flex: 1, minWidth: 0 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} theme={theme} width={96} height={32} radius={6} />
          ))}
          <Skeleton theme={theme} width={28} height={28} radius={6} style={{ marginLeft: 2 }} />
          <Skeleton theme={theme} width={210} height={34} radius={8} style={{ marginLeft: 8 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton theme={theme} width={40} height={20} radius={5} />
          <Skeleton theme={theme} width={56} height={28} radius={6} />
          <Skeleton theme={theme} width={64} height={28} radius={6} />
        </div>
      </div>

      {/* Main split */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {/* Left: editor over console */}
        <div style={{ width: '75%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: '70%', display: 'flex', padding: '12px 0 12px 0', gap: 12 }}>
            {/* Gutter */}
            <div style={{ width: 34, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', paddingRight: 8 }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} theme={theme} width={14} height={12} radius={3} />
              ))}
            </div>
            {/* Code lines */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 14 }}>
              {[62, 48, 30, 70, 55, 40, 66, 52, 36, 60, 44, 58].map((w, i) => (
                <Skeleton key={i} theme={theme} width={`${w}%`} height={12} radius={3} />
              ))}
            </div>
          </div>
          {/* Console */}
          <div style={{ flex: 1, padding: 10 }}>
            <Skeleton theme={theme} width="100%" height="100%" radius={10} />
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 5, backgroundColor: theme.border, flexShrink: 0 }} />

        {/* Right: panel tabs + register rows */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 14, height: 34, alignItems: 'center', padding: '0 12px', borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.card }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} theme={theme} width={52} height={11} radius={4} />
            ))}
          </div>
          <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <Skeleton theme={theme} width={48} height={13} radius={4} />
                <Skeleton theme={theme} width={92} height={13} radius={4} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact skeleton rows for the Files drawer list (genuine async load).
export function FileRowSkeleton({ theme, count = 3 }: { theme: Theme; count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', borderRadius: 8,
            border: `1px solid ${theme.border}`,
          }}
        >
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton theme={theme} width="55%" height={13} radius={4} />
            <Skeleton theme={theme} width="32%" height={11} radius={4} />
          </div>
          <Skeleton theme={theme} width={48} height={22} radius={5} />
        </div>
      ))}
    </div>
  );
}
