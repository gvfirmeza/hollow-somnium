import React, { useState, useEffect, useRef } from 'react';

export type TutorialStep =
  | 'click'
  | 'buy_pack'
  | 'inventory'
  | 'colosseum'
  | 'melding'
  | 'fusions'
  | 'long_term'
  | 'complete';

type StepConfig = {
  step: TutorialStep;
  title: string;
  lines: string[];
  targetId?: string;
  targetTab?: string;
  requiredClicks?: number;
  action?: 'tab_switch' | 'clicks';
};

const STEPS: StepConfig[] = [
  {
    step: 'click',
    title: 'STRIKE THE CORE',
    lines: [
      'This hollow mass is the source of all Flesh.',
      'Click it — each strike harvests raw currency.',
      'Click the orb 5 times to continue.',
    ],
    targetId: 'harvest-coin',
    requiredClicks: 5,
    action: 'clicks',
  },
  {
    step: 'buy_pack',
    title: 'OPEN A PACK',
    lines: [
      'Flesh buys packs from the MERCHANT.',
      'Inside: creatures — strange, powerful, cursed.',
      'Navigate to the MERCHANT tab to continue.',
    ],
    targetId: 'nav-shop',
    targetTab: 'shop',
    action: 'tab_switch',
  },
  {
    step: 'inventory',
    title: 'YOUR COLLECTION',
    lines: [
      'Cards you own live in the INVENTORY.',
      'Each has an ATK value — power for the Colosseum.',
      'Inspect any card to read its lore.',
      'Open the INVENTORY tab.',
    ],
    targetId: 'nav-binder',
    targetTab: 'binder',
    action: 'tab_switch',
  },
  {
    step: 'melding',
    title: 'THE ALCHEMICAL MELD',
    lines: [
      'Three identical cards can be sacrificed.',
      'The result: a stronger Abomination.',
      'Visit the MELDING tab to see recipes.',
    ],
    targetId: 'nav-melding',
    targetTab: 'melding',
    action: 'tab_switch',
  },
  {
    step: 'fusions',
    title: 'FORGE A CHIMERA',
    lines: [
      'Two different cards may fuse into a Chimera.',
      'Rarer combinations yield greater power.',
      'Open the FUSIONS tab.',
    ],
    targetId: 'nav-fusions',
    targetTab: 'fusions',
    action: 'tab_switch',
  },
  {
    step: 'colosseum',
    title: 'THE MIND COLOSSEUM',
    lines: [
      'Assign cards to battle arenas.',
      'They generate passive Flesh each cycle.',
      'Upgrade speed and unlock more slots to grow.',
      'Open the COLOSSEUM tab.',
    ],
    targetId: 'nav-colosseum',
    targetTab: 'colosseum',
    action: 'tab_switch',
  },
  {
    step: 'long_term',
    title: 'THE LONG DREAM',
    lines: [
      'Collect horrors. Forge stronger beings.',
      'When you amass 1,000,000 Flesh —',
      'you may undergo REBIRTH.',
      'Erase everything. Multiply forever.',
    ],
    targetId: 'nav-rebirth',
  },
  {
    step: 'complete',
    title: 'YOU ARE READY.',
    lines: [
      'The hollow awaits your command.',
      'A gift of Flesh to hasten your ascension.',
      'May the clay obey you.',
    ],
  },
];

type Props = {
  onComplete: () => void;
  onSkip: () => void;
  activeTab: string;
  coinClickCount: number;
  onReward: () => void;
};

export const Tutorial: React.FC<Props> = ({
  onComplete,
  onSkip,
  activeTab,
  coinClickCount,
  onReward,
}) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [fadeIn, setFadeIn] = useState(false);
  const prevClickCount = useRef(coinClickCount);
  const [clicksThisStep, setClicksThisStep] = useState(0);
  const [pulseTick, setPulseTick] = useState(0);
  const [stepReady, setStepReady] = useState(false);

  const currentStep = STEPS[stepIdx];
  const PADDING = 14;

  // Fade in on step change
  useEffect(() => {
    setFadeIn(false);
    const t = setTimeout(() => setFadeIn(true), 60);
    return () => clearTimeout(t);
  }, [stepIdx]);

  // Reset state when step changes
  useEffect(() => {
    setVisibleLines([]);
    setLineIdx(0);
    setCharIdx(0);
    setIsTyping(true);
    setStepReady(false);
    setClicksThisStep(0);
    prevClickCount.current = coinClickCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx]);

  // Typing animation
  useEffect(() => {
    if (!isTyping) return;
    const lines = currentStep.lines;
    if (lineIdx >= lines.length) {
      setIsTyping(false);
      if (currentStep.action !== 'clicks' && currentStep.action !== 'tab_switch') {
        setStepReady(true);
      }
      return;
    }
    const line = lines[lineIdx];
    const delay = charIdx === 0 && lineIdx > 0 ? 280 : 16;
    const t = setTimeout(() => {
      if (charIdx < line.length) {
        setVisibleLines(prev => {
          const next = [...prev];
          next[lineIdx] = (next[lineIdx] || '') + line[charIdx];
          return next;
        });
        setCharIdx(c => c + 1);
      } else {
        setLineIdx(l => l + 1);
        setCharIdx(0);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [isTyping, lineIdx, charIdx, currentStep]);

  // Spotlight tracking
  useEffect(() => {
    if (!currentStep.targetId) { setSpotlightRect(null); return; }
    const update = () => {
      const el = document.getElementById(currentStep.targetId!);
      if (el) setSpotlightRect(el.getBoundingClientRect());
    };
    update();
    const obs = new ResizeObserver(update);
    const el = document.getElementById(currentStep.targetId!);
    if (el) obs.observe(el);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { obs.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [currentStep.targetId, stepIdx]);

  // Pulse tick for border animation
  useEffect(() => {
    const id = setInterval(() => setPulseTick(t => t + 1), 700);
    return () => clearInterval(id);
  }, []);

  // Count coin clicks
  useEffect(() => {
    if (currentStep.action !== 'clicks') return;
    const delta = coinClickCount - prevClickCount.current;
    if (delta > 0) {
      setClicksThisStep(prev => {
        const next = prev + delta;
        if (next >= (currentStep.requiredClicks ?? 5)) setStepReady(true);
        return next;
      });
      prevClickCount.current = coinClickCount;
    }
  }, [coinClickCount, currentStep]);

  // Tab switch detection
  useEffect(() => {
    if (currentStep.action === 'tab_switch' && currentStep.targetTab && !isTyping) {
      if (activeTab === currentStep.targetTab) setStepReady(true);
    }
  }, [activeTab, currentStep, isTyping]);

  const skipTyping = () => {
    setVisibleLines(currentStep.lines);
    setLineIdx(currentStep.lines.length);
    setIsTyping(false);
    if (currentStep.action !== 'clicks' && currentStep.action !== 'tab_switch') {
      setStepReady(true);
    }
    // If already on the right tab when we skip typing
    if (currentStep.action === 'tab_switch' && currentStep.targetTab && activeTab === currentStep.targetTab) {
      setStepReady(true);
    }
  };

  const advance = () => {
    if (currentStep.step === 'complete') {
      onReward();
      onComplete();
      return;
    }
    if (!stepReady) return;
    setStepIdx(i => i + 1);
  };

  const skipAll = () => {
    onReward();
    onSkip();
  };

  const clicksProgress = Math.min(clicksThisStep, currentStep.requiredClicks ?? 5);
  const isClickStep = currentStep.action === 'clicks';
  const isTabStep = currentStep.action === 'tab_switch';
  const pulseOn = pulseTick % 2 === 0;

  return (
    <>
      {/* ── VISUAL OVERLAY: pointer-events NONE so game stays fully interactive ── */}
      <div
        style={{
          position: 'fixed', inset: 0,
          zIndex: 8000,
          pointerEvents: 'none', // NEVER block clicks — purely visual
          opacity: fadeIn ? 1 : 0,
          transition: 'opacity 0.35s',
        }}
      >
        {spotlightRect ? (
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
            <defs>
              <mask id="tut-spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={spotlightRect.left - PADDING}
                  y={spotlightRect.top - PADDING}
                  width={spotlightRect.width + PADDING * 2}
                  height={spotlightRect.height + PADDING * 2}
                  rx={4}
                  fill="black"
                />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.78)" mask="url(#tut-spotlight-mask)" />
          </svg>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)' }} />
        )}
      </div>

      {/* ── SPOTLIGHT BORDER RING (visual only) ── */}
      {spotlightRect && (
        <div
          style={{
            position: 'fixed',
            left: spotlightRect.left - PADDING,
            top: spotlightRect.top - PADDING,
            width: spotlightRect.width + PADDING * 2,
            height: spotlightRect.height + PADDING * 2,
            borderRadius: 4,
            border: `2px solid ${pulseOn ? 'var(--hylics-border-white)' : 'rgba(255,255,255,0.25)'}`,
            boxShadow: pulseOn
              ? '0 0 16px rgba(255,255,255,0.35), inset 0 0 8px rgba(255,255,255,0.08)'
              : 'none',
            transition: 'all 0.7s ease',
            zIndex: 8001,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── DIALOG PANEL ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: `translateX(-50%) translateY(${fadeIn ? 0 : 24}px)`,
          opacity: fadeIn ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.34,1.2,0.64,1), opacity 0.35s',
          zIndex: 8002,
          width: 'min(560px, 92vw)',
        }}
      >
        <div
          className="hylics-panel"
          style={{
            padding: '22px 26px 20px',
            background: 'var(--bg-color)',
            border: '3px solid var(--hylics-border-white)',
            boxShadow: '8px 8px 0 var(--hylics-border-dark), 0 0 40px rgba(0,0,0,0.9)',
            position: 'relative',
          }}
        >
          {/* Step counter badge */}
          <div style={{
            position: 'absolute', top: -1, right: -1,
            background: 'var(--hylics-border-dark)',
            border: '2px solid var(--hylics-border-white)',
            padding: '2px 10px',
            fontSize: '0.65rem',
            letterSpacing: 3,
            color: 'var(--text-highlight)',
            fontFamily: 'monospace',
          }}>
            {stepIdx + 1} / {STEPS.length}
          </div>

          {/* Title */}
          <div style={{
            fontSize: '1rem',
            fontWeight: 'bold',
            letterSpacing: 4,
            color: 'var(--text-main)',
            marginBottom: 14,
            borderBottom: '2px solid var(--hylics-border-white)',
            paddingBottom: 10,
            textShadow: '2px 2px 0 var(--hylics-border-dark)',
          }}>
            {currentStep.title}
          </div>

          {/* Typed text */}
          <div style={{ minHeight: 72, marginBottom: 16 }}>
            {visibleLines.map((line, i) => (
              <div key={i} style={{
                fontSize: '0.95rem',
                lineHeight: 1.75,
                color: i < visibleLines.length - 1 || !isTyping
                  ? 'rgba(220,220,220,0.8)'
                  : 'var(--text-main)',
                transition: 'color 0.4s',
              }}>
                {line}
                {i === visibleLines.length - 1 && isTyping && (
                  <span style={{ opacity: 0.6, fontWeight: 'bold' }}>▋</span>
                )}
              </div>
            ))}
          </div>

          {/* Click progress bar */}
          {isClickStep && (
            <div style={{ marginBottom: 14 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '0.75rem', color: 'var(--text-highlight)',
                letterSpacing: 1, marginBottom: 6,
                fontFamily: 'monospace',
              }}>
                <span>CLICKS</span>
                <span>{clicksProgress} / {currentStep.requiredClicks ?? 5}</span>
              </div>
              <div style={{
                height: 6, background: 'var(--hylics-border-dark)',
                border: '1px solid var(--hylics-border-white)',
              }}>
                <div style={{
                  height: '100%',
                  width: `${(clicksProgress / (currentStep.requiredClicks ?? 5)) * 100}%`,
                  background: 'var(--text-main)',
                  transition: 'width 0.25s ease',
                }} />
              </div>
            </div>
          )}

          {/* Tab hint */}
          {isTabStep && !stepReady && !isTyping && (
            <div style={{
              fontSize: '0.78rem',
              color: 'var(--text-highlight)',
              marginBottom: 12,
              fontFamily: 'monospace',
              letterSpacing: 1,
              opacity: 0.8,
            }}>
              ↑ Click the highlighted tab above
            </div>
          )}

          {/* Buttons row */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }}>
            <button
              onClick={skipAll}
              style={{
                background: 'transparent',
                border: '2px solid var(--hylics-border-dark)',
                color: 'rgba(255,255,255,0.3)',
                padding: '5px 14px',
                fontSize: '0.7rem',
                cursor: 'pointer',
                letterSpacing: 2,
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--hylics-border-white)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--hylics-border-dark)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
              }}
            >
              SKIP
            </button>

            <button
              className="btn btn-primary"
              onClick={isTyping ? skipTyping : advance}
              disabled={!isTyping && !stepReady}
              style={{
                padding: '6px 22px',
                fontSize: '0.85rem',
                letterSpacing: 2,
                opacity: isTyping ? 1 : (stepReady ? 1 : 0.35),
                cursor: isTyping ? 'pointer' : (stepReady ? 'pointer' : 'default'),
                transition: 'all 0.25s',
              }}
            >
              {isTyping
                ? '▶ REVEAL'
                : currentStep.step === 'complete'
                  ? '✦ CLAIM'
                  : stepReady
                    ? 'CONTINUE ›'
                    : isClickStep
                      ? `${clicksProgress}/${currentStep.requiredClicks}`
                      : 'WAITING...'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
