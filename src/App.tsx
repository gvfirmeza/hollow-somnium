import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameState } from './useGameState';
import { EVOLUTIONS, PACKS, CARDS_DB, ALL_CARDS, ABOMINATIONS_DB, CHIMERAS_DB } from './constants';
import { PackOpening } from './PackOpening';
import { playSquelch, playBGM, playMeld, playTypeKey, playRebirth } from './audio';
import './index.css';

// SVG components reused
const SvgEye = ({ size = 40, color = "currentColor" }) => (<svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 50 C30 20, 70 20, 90 50 C70 80, 30 80, 10 50 Z" /><circle cx="50" cy="50" r="15" fill={color} /><path d="M50 10 L50 0 M80 20 L85 10 M20 20 L15 10 M80 80 L85 90 M20 80 L15 90 M50 90 L50 100" strokeWidth="4" /></svg>);
const SvgFleshHand = ({ size = 40, color = "currentColor" }) => (<svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"><path d="M40 90 L40 50 L20 30 L30 20 L50 40 L50 20 L60 20 L60 40 L70 10 L80 20 L65 55 L65 90 Z" /><path d="M30 80 Q20 70 20 60" strokeWidth="3" /><path d="M70 80 Q80 70 80 60" strokeWidth="3" /></svg>);
const SvgCoffeeCup = ({ size = 40, color = "currentColor" }) => (<svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"><path d="M25 40 L25 75 C25 95 75 95 75 75 L75 40 Z" /><path d="M75 50 C95 50 95 75 75 65" /><path d="M35 25 Q45 10 50 25 T65 15" strokeWidth="4" /><circle cx="50" cy="65" r="4" fill={color} /></svg>);
const SvgMindScraper = ({ size = 150, color = "currentColor" }) => (<svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20 Q50 0 80 20 Q100 50 80 80 Q50 100 20 80 Q0 50 20 20 Z" /><path d="M30 30 L70 70 M70 30 L30 70 M50 20 L50 80 M20 50 L80 50" strokeWidth="2" /><circle cx="50" cy="50" r="10" fill={color} /></svg>);
const SvgGloomHand = ({ size = 150, color = "currentColor" }) => (<svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M25 90 C10 60, 20 30, 40 20 C60 10, 80 30, 85 50 C90 70, 70 90, 50 90 Z" /><path d="M40 35 C30 40, 30 50, 40 55 C50 60, 60 50, 60 45 C60 40, 50 30, 40 35 Z" fill={color} /><circle cx="45" cy="45" r="3" fill="var(--bg-color)" /><path d="M20 90 Q30 80 25 70" strokeWidth="3" /><path d="M80 90 Q70 80 75 70" strokeWidth="3" /></svg>);

// Flesh Hand Orbit — hands arranged in a circle around the coin, facing inward
const ORBIT_RADIUS = 148;
const ORBIT_CONTAINER = 380;
const MAX_FINGERS = 15; // hard cap on purchasable fingers

const FleshHandOrbit = ({ count, tick }: { count: number; tick: number }) => {
  const cx = ORBIT_CONTAINER / 2;
  const cy = ORBIT_CONTAINER / 2;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angleDeg = (i / count) * 360;
        const angleRad = (angleDeg * Math.PI) / 180;
        const hx = cx + ORBIT_RADIUS * Math.cos(angleRad) - 14;
        const hy = cy + ORBIT_RADIUS * Math.sin(angleRad) - 14;
        const rotDeg = angleDeg - 90;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: hx,
              top: hy,
              width: 28,
              height: 28,
              transform: `rotate(${rotDeg}deg)`,
              transformOrigin: 'center',
            }}
          >
            {/* key=tick forces full remount on every tick — all hands restart animation together */}
            <div
              key={tick}
              style={{
                animation: tick > 0 ? 'handPoke 0.5s ease-out forwards' : 'none',
                width: '100%',
                height: '100%',
              }}
            >
              <SvgFleshHand size={28} color="var(--accent-primary)" />
            </div>
          </div>
        );
      })}
    </>
  );
};

function App() {
  const { state, updateState, addMoney, deductMoney } = useGameState();
  const [activeTab, setActiveTab] = useState('clicker');
  const [activePack, setActivePack] = useState<any>(null);
  const [clickScale, setClickScale] = useState(1);
  const [clicks, setClicks] = useState<any[]>([]);
  const [debugUnlocked, setDebugUnlocked] = useState(false);

  // Lore / Inventory
  const [inspectedCardId, setInspectedCardId] = useState<number | null>(null);
  const [loreText, setLoreText] = useState('');

  // Audio Context initialization flag
  const [audioStarted, setAudioStarted] = useState(false);

  // Colosseum slots (IDs of cards placed in battle)
  const [battleSlots, setBattleSlots] = useState<(number | null)[]>([null, null, null]);
  const [colosseumHits, setColosseumHits] = useState(0);

  // Shared tick for synced flesh hand animations
  const [handTick, setHandTick] = useState(0);
  const intervalMs = Math.max(500, 3000 - state.speedLevel * 500);
  useEffect(() => {
    if (state.fingers > 0) {
      const id = setInterval(() => setHandTick(t => t + 1), intervalMs);
      return () => clearInterval(id);
    }
  }, [state.fingers, state.speedLevel]);

  // Draggable dev menu
  const [devPos, setDevPos] = useState({ x: window.innerWidth - 240, y: 10 });
  const devDragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const onDevPointerDown = (e: React.PointerEvent) => {
    devDragStart.current = { mx: e.clientX, my: e.clientY, px: devPos.x, py: devPos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
  };
  const onDevPointerMove = (e: React.PointerEvent) => {
    if (!devDragStart.current) return;
    setDevPos({
      x: devDragStart.current.px + (e.clientX - devDragStart.current.mx),
      y: devDragStart.current.py + (e.clientY - devDragStart.current.my),
    });
  };
  const onDevPointerUp = (e: React.PointerEvent) => {
    devDragStart.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  // 3D card rotate
  const cardInspectRef = useRef<HTMLDivElement>(null);
  const handle3DMove = useCallback((e: React.MouseEvent) => {
      if (!cardInspectRef.current) return;
      const rect = cardInspectRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rotY = ((e.clientX - cx) / rect.width) * 30; // ±15 deg
      const rotX = -((e.clientY - cy) / rect.height) * 20; // ±10 deg
      cardInspectRef.current.style.transform = `rotateY(${rotY}deg) rotateX(${rotX}deg)`;
  }, []);

  const resetCardRotate = useCallback(() => {
    if (cardInspectRef.current) {
        cardInspectRef.current.style.transform = 'rotateY(0deg) rotateX(0deg)';
    }
  }, []);

  // Responsive scaling for the clicker
  const [orbitScale, setOrbitScale] = useState(1);
  useEffect(() => {
    const handleResize = () => {
      const scale = Math.min(1, (window.innerWidth - 40) / ORBIT_CONTAINER);
      setOrbitScale(scale);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle interaction sounds and global BGM
  const tryInitAudio = () => {
      if (!audioStarted) {
          playBGM();
          setAudioStarted(true);
      }
  };

  const currentEvolution = EVOLUTIONS[state.clickLevel] || EVOLUTIONS[0];
  const nextEvolution = EVOLUTIONS[state.clickLevel + 1];

  const handleCoinClick = (e: React.PointerEvent) => {
    tryInitAudio();
    playSquelch();
    addMoney(currentEvolution.value);
    setClickScale(0.9);
    setTimeout(() => setClickScale(1), 100);
    
    const newClick = { id: Date.now() + Math.random(), val: currentEvolution.value, x: e.clientX, y: e.clientY };
    setClicks(prev => [...prev, newClick]);
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== newClick.id)), 800);
  };

  const buyEvolution = () => { if (nextEvolution && state.money >= nextEvolution.cost) { deductMoney(nextEvolution.cost); updateState({ clickLevel: state.clickLevel + 1 }); } };
  const buyFinger = () => {
    if (state.fingers >= MAX_FINGERS) return;
    const cost = 100 * Math.pow(2, state.fingers);
    if (state.money >= cost) { deductMoney(cost); updateState({ fingers: state.fingers + 1 }); }
  };
  const buySpeed = () => { const cost = 500 * Math.pow(3, state.speedLevel); if (state.money >= cost && state.speedLevel < 5) { deductMoney(cost); updateState({ speedLevel: state.speedLevel + 1 }); } };

  const buyPack = (pack: any) => {
    if (state.money >= pack.price) {
      deductMoney(pack.price);
      setActivePack(pack);
    }
  };

  const handlePackCollect = (newCards: any[]) => {
    const newCol = { ...state.collection };
    const trulyNew: number[] = [];

    newCards.forEach(c => {
        if (!newCol[c.id]) {
            trulyNew.push(c.id);
            newCol[c.id] = 0;
        }
        newCol[c.id] += 1;
    });
    
    updateState({ 
      collection: newCol,
      newCards: [...state.newCards, ...trulyNew]
    });
    setActivePack(null);
  };

  const conductMelding = (abom: any) => {
      if (state.collection[abom.sourceId] >= 3) {
          tryInitAudio();
          playMeld();
          const newCol = { ...state.collection };
          newCol[abom.sourceId] -= 3;
          newCol[abom.id] = (newCol[abom.id] || 0) + 1;
          updateState({ collection: newCol });
      }
  };

  const conductChimeraMelding = (chimera: any) => {
      const [srcA, srcB] = chimera.sourceIds;
      if (state.collection[srcA] >= 1 && state.collection[srcB] >= 1) {
          tryInitAudio();
          playMeld();
          const newCol = { ...state.collection };
          newCol[srcA] -= 1;
          newCol[srcB] -= 1;
          newCol[chimera.id] = (newCol[chimera.id] || 0) + 1;
          updateState({ collection: newCol });
      }
  };

  const handleRebirth = () => {
      if (state.money >= 1000000) {
          playRebirth();
          const newFragments = state.soulFragments + 1;
          localStorage.removeItem('hylics_game_state_v2'); // Flush
          updateState({
              money: 0, clickLevel: 0, fingers: 0, speedLevel: 0,
              collection: {}, newCards: [], prestigeLevel: state.prestigeLevel + 1,
              soulFragments: newFragments
          });
          setBattleSlots([null, null, null]);
          setActiveTab('clicker');
      }
  };

  const changeTab = (tab: string) => {
    if (activeTab === 'binder' && tab !== 'binder') updateState({ newCards: [] });
    setActiveTab(tab);
  };

  // Inspect Card Lore typing effect
  useEffect(() => {
      if (inspectedCardId) {
          const card = ALL_CARDS.find(c => c.id === inspectedCardId);
          if (card) {
              setLoreText('');
              let i = 0;
              const intv = setInterval(() => {
                  setLoreText(card.lore.substring(0, i + 1));
                  // Play a click every 2 characters (not every single one — too fast)
                  if (i % 2 === 0) playTypeKey();
                  i++;
                  if (i >= card.lore.length) clearInterval(intv);
              }, 30);
              return () => clearInterval(intv);
          }
      }
  }, [inspectedCardId]);

  // Colosseum Combat Loop
  useEffect(() => {
      const activeFighters = battleSlots.map(id => id ? ALL_CARDS.find(c => c.id === id) : null).filter(c => c);
      if (activeFighters.length > 0) {
          const totalAttack = activeFighters.reduce((sum, c) => sum + (c?.attack || 0), 0);
          const combatIntv = setInterval(() => {
              addMoney(totalAttack);
              setColosseumHits(h => h + 1);
          }, 2000);
          return () => clearInterval(combatIntv);
      }
  }, [battleSlots, state.soulFragments]);

  const InspectedCard = ALL_CARDS.find(c => c.id === inspectedCardId);

  return (
    <div className="main-layout" onClickCapture={tryInitAudio}>
      
      {/* Dev Menu - draggable */}
      {debugUnlocked && (
      <div
        className="hylics-panel"
        style={{ ...devMenuStyle, left: devPos.x, top: devPos.y }}
        onPointerDown={onDevPointerDown}
        onPointerMove={onDevPointerMove}
        onPointerUp={onDevPointerUp}
        onPointerCancel={onDevPointerUp}
      >
          <div style={{ padding: '8px 12px', background: 'black', color: 'var(--text-highlight)', fontSize: '0.9rem', cursor: 'grab', borderBottom: '2px solid var(--hylics-border-white)', marginBottom: 5, textAlign: 'center' }}>⠿ DEBUG_MENU ⠿</div>
          <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn" onPointerDown={e => e.stopPropagation()} onClick={() => addMoney(1000000)}>+ FLESH ($1M)</button>
              <button className="btn" onPointerDown={e => e.stopPropagation()} onClick={() => {
                  const newCol = { ...state.collection };
                  ALL_CARDS.forEach(c => newCol[c.id] = (newCol[c.id] || 0) + 5);
                  updateState({ collection: newCol, money: 9999999, clickLevel: 3, fingers: 15, speedLevel: 5 });
              }}>UNLOCK ALL</button>
              <button className="btn" onPointerDown={e => e.stopPropagation()} style={{ color: '#ff4444', borderColor: '#ff4444' }} onClick={() => {
                  localStorage.removeItem('hylics_game_state_v2');
                  window.location.reload();
              }}>RESET SAVE</button>
          </div>
      </div>
      )}

      <header className="hylics-panel" style={{ marginBottom: 20 }}>
        <div style={{ padding: '15px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <h1 className="title" style={{ margin: 0, cursor: 'pointer', userSelect: 'none', textAlign: 'center' }} onDoubleClick={() => setDebugUnlocked(!debugUnlocked)}>HOLLOW·SOMNIUM</h1>
            <div className="hylics-panel" style={{ padding: '8px 20px', fontSize: '1.4rem', fontWeight: 'bold', width: 'fit-content' }}>
                FLESH: {state.money.toLocaleString()}
                {state.soulFragments > 0 && <span style={{fontSize: '0.8rem', color: 'var(--accent-secondary)', display: 'block', textAlign: 'center'}}>Prestige Multiplier x{(1 + state.soulFragments * 10)}</span>}
            </div>
        </div>
      </header>
      
      <nav className="nav-tabs">
        <button className={`btn`} style={activeTab === 'clicker' ? activeTabStyle : {}} onClick={() => changeTab('clicker')}>HARVEST</button>
        <button className={`btn`} style={activeTab === 'shop' ? activeTabStyle : {}} onClick={() => changeTab('shop')}>MERCHANT</button>
        <button className={`btn`} style={activeTab === 'binder' ? activeTabStyle : {}} onClick={() => changeTab('binder')}>
            INVENTORY {state.newCards.length > 0 && <span style={badgeStyle}>{state.newCards.length}</span>}
        </button>
        <button className={`btn`} style={activeTab === 'melding' ? activeTabStyle : {}} onClick={() => changeTab('melding')}>MELDING</button>
        <button className={`btn`} style={activeTab === 'fusions' ? activeTabStyle : {}} onClick={() => changeTab('fusions')}>FUSIONS</button>
        <button className={`btn`} style={activeTab === 'colosseum' ? activeTabStyle : {}} onClick={() => changeTab('colosseum')}>COLOSSEUM</button>
        <button className={`btn`} style={activeTab === 'rebirth' ? { ...activeTabStyle, border: '2px solid red', color: 'red' } : { border: '2px solid var(--accent-primary)', color: 'white' }} onClick={() => changeTab('rebirth')}>REBIRTH</button>
      </nav>

      <main className="hylics-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '15px', overflowY: 'auto', height: '100%', scrollbarWidth: 'thin' }}>
            {activeTab === 'clicker' && (
            <div className="clicker-layout">
                <div style={coinContainer}>
                    <p style={{ fontFamily: 'monospace', opacity: 0.7, marginBottom: 12, color: 'var(--text-highlight)' }}>// EXTRACTING...</p>

                    {/* Orbit wrapper — contains coin + orbiting hands */}
                    <div style={{
                        position: 'relative',
                        width: ORBIT_CONTAINER,
                        height: ORBIT_CONTAINER,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: `scale(${orbitScale})`,
                        transformOrigin: 'center center',
                        marginBottom: (orbitScale < 1) ? -(ORBIT_CONTAINER * (1 - orbitScale)) : 0
                    }}>
                        {/* The clickable coin */}
                        <div
                            style={{ ...coinStyle, background: 'var(--bg-color)', transform: `scale(${clickScale})` }}
                            className={clickScale < 1 ? 'clicking' : ''}
                            onPointerDown={handleCoinClick}
                        >
                            <div style={{ pointerEvents: 'none', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {state.clickLevel === 0 && <img src="/coins/coin_0.png" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />}
                                {state.clickLevel === 1 && <img src="/coins/coin_1.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />}
                                {state.clickLevel === 2 && <SvgMindScraper color={currentEvolution.color} size={180} />}
                                {state.clickLevel === 3 && <SvgGloomHand color={currentEvolution.color} size={180} />}
                            </div>
                        </div>

                        {/* Orbiting flesh hands */}
                        <FleshHandOrbit
                            count={state.fingers}
                            tick={handTick}
                        />
                    </div>

                    <div className="coin-inner" style={{ textShadow: '2px 2px 0 var(--hylics-border-dark)', fontSize: '3rem', zIndex: 10, textAlign: 'center', width: '100%' }}>
                        +{currentEvolution.value}
                    </div>

                    <h2 style={{ marginTop: 20, textDecoration: 'underline', color: currentEvolution.color, textAlign: 'center' }}>{currentEvolution.name}</h2>
                    <p style={{ marginTop: 8, fontSize: '1rem', textAlign: 'center', opacity: 0.8, maxWidth: 300 }}>
                        {state.fingers > 0
                          ? <>{state.fingers}/{MAX_FINGERS} Flesh Hand{state.fingers !== 1 ? 's' : ''} &bull; clicking every {(intervalMs / 1000).toFixed(1)}s &bull; +{currentEvolution.value * state.fingers}/click</>  
                          : <>No hands yet &mdash; buy one in Upgrades</>}
                    </p>
                </div>
                
                <div className="hylics-panel upgrades-panel">
                    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={upgradeSectionHeader}>ABILITIES / UPGRADES</div>
                        <div className="hylics-panel upgrade-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                <SvgEye color="var(--epic)" size={32} />
                                <div>
                                    <h4 style={{ fontSize: '1.1rem' }}>Transmutation</h4>
                                    <p style={{ fontSize: '0.9rem', color: '#aaa' }}>Next: {nextEvolution?.name || 'Maxed'}</p>
                                </div>
                            </div>
                            {nextEvolution ? (
                                <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '1rem' }} onClick={buyEvolution} disabled={state.money < nextEvolution.cost}>
                                    {nextEvolution.cost.toLocaleString()}
                                </button>
                            ) : (
                                <button className="btn" disabled>Maxed</button>
                            )}
                        </div>

                        <div className="hylics-panel upgrade-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                <SvgFleshHand color="var(--accent-primary)" size={32} />
                                <div>
                                    <h4 style={{ fontSize: '1.1rem' }}>Flesh Hand</h4>
                                    <p style={{ fontSize: '0.9rem', color: '#aaa' }}>Owned: {state.fingers}/{MAX_FINGERS}</p>
                                </div>
                            </div>
                            <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '1rem' }} onClick={buyFinger} disabled={state.money < 100 * Math.pow(2, state.fingers) || state.fingers >= MAX_FINGERS}>
                                {state.fingers >= MAX_FINGERS ? 'MAXED' : (100 * Math.pow(2, state.fingers)).toLocaleString()}
                            </button>
                        </div>

                        <div className="hylics-panel upgrade-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                <SvgCoffeeCup color="var(--accent-secondary)" size={32} />
                                <div>
                                    <h4 style={{ fontSize: '1.1rem' }}>Perma-Caff</h4>
                                    <p style={{ fontSize: '0.9rem', color: '#aaa' }}>Level: {state.speedLevel}/5</p>
                                </div>
                            </div>
                            <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '1rem' }} onClick={buySpeed} disabled={state.speedLevel >= 5 || state.money < 500 * Math.pow(3, state.speedLevel)}>
                                {state.speedLevel < 5 ? (500 * Math.pow(3, state.speedLevel)).toLocaleString() : 'Maxed'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {activeTab === 'shop' && (
            <div className="shop-grid">
                {PACKS.map(pack => (
                    <div key={pack.id} className="pack-card" data-affordable={state.money >= pack.price ? "true" : "false"} style={packCardStyle} onClick={() => buyPack(pack)} title={state.money < pack.price ? 'Not enough Flesh' : `Buy ${pack.name}`}>
                        <img
                            src={pack.image}
                            alt={pack.name}
                            style={{
                                width: '100%',
                                height: 280,
                                objectFit: 'cover',
                                objectPosition: 'center top',
                                display: 'block',
                                filter: state.money < pack.price ? 'grayscale(60%) brightness(0.4)' : 'brightness(1.05)',
                                transition: 'filter 0.2s, transform 0.2s',
                                cursor: state.money < pack.price ? 'not-allowed' : 'pointer',
                            }}
                        />
                        <div style={{ textAlign: 'center', paddingTop: 12, fontSize: '1.1rem', fontWeight: 'bold', color: state.money < pack.price ? '#555' : 'var(--text-highlight)', letterSpacing: 2 }}>
                            {pack.price.toLocaleString()} FLESH
                        </div>
                    </div>
                ))}
            </div>
            )}

            {activeTab === 'binder' && (
            <div className="binder-grid">
                {ALL_CARDS.map(card => {
                    const ownedCount = state.collection[card.id] || 0;
                    const isUnlocked = ownedCount > 0;
                    const isHolo = isUnlocked && (card.rarity === 'Legendary' || card.rarity === 'Epic' || card.rarity === 'Abomination');
                    const holoClass = isHolo ? ` wavy-aura ${card.rarity.toLowerCase()}` : '';

                    // Apply filters if it's an abomination
                    const filterStyle = (card as any).filter ? { filter: (card as any).filter } : {};

                    return (
                        <div key={card.id} style={{ position: 'relative', width: 170, height: 260, cursor: isUnlocked ? 'pointer' : 'default' }} onClick={() => isUnlocked && setInspectedCardId(card.id)}>
                            {state.newCards.includes(card.id) && <div className="new-badge">NEW</div>}
                            
                            <div className={`hylics-panel binder-card ${holoClass}`} style={{ width: '100%', height: '100%', padding: 10 }}>
                                {isUnlocked ? (
                                    <>
                                        <div style={{ position: 'absolute', top: 5, left: 5, background: 'black', padding: '2px 5px', zIndex: 5, border: '1px solid white' }}>x{ownedCount}</div>
                                        <img src={card.image} alt={card.name} style={{ width: '100%', height: 130, objectFit: 'cover', border: '3px solid var(--hylics-border-dark)', borderRadius: 2, ...filterStyle }} />
                                        <h4 style={{ marginTop: 10, fontSize: '1rem', textAlign: 'center', flex: 1 }}>{card.name}</h4>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-highlight)', textAlign: 'center' }}>[ ATK: {card.attack} | HP: {card.hp} ]</span>
                                    </>
                                ) : (
                                    <div className="locked-overlay">
                                        <div style={{ fontSize: '3rem', color: 'var(--hylics-blue)', textShadow: '2px 2px 0 black' }}>?</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
            )}

            {activeTab === 'melding' && (
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ marginBottom: 30 }}>THE ALCHEMICAL MELD</h2>
                    <p style={{ marginBottom: 40, color: '#aaa' }}>Sacrifice 3 identical weak minds to forge a profound Abomination.</p>
                    <div className="shop-grid">
                        {ABOMINATIONS_DB.map(abom => {
                            const ownedSource = state.collection[abom.sourceId] || 0;
                            const canMeld = ownedSource >= 3;
                            const isOwned = state.collection[abom.id] > 0;
                            return (
                                <div key={abom.id} className="hylics-panel" style={{ width: 280, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <h3 style={{ color: isOwned ? 'var(--accent-primary)' : '#555', textShadow: '2px 2px 0 black' }}>{isOwned ? abom.name : 'UNDISCOVERED'}</h3>
                                    {isOwned ? (
                                        <div className="wavy-aura">
                                            <img src={abom.image} style={{ width: 100, height: 100, borderRadius: '50%', border: '4px solid var(--hylics-border-dark)', margin: '15px 0', filter: abom.filter }} />
                                        </div>
                                    ) : (
                                        <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#111', border: '4px dashed #555', margin: '15px 0 21px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '3rem', color: '#333' }}>?</span>
                                        </div>
                                    )}
                                    <p style={{ marginBottom: 15 }}>Cost: 3x {CARDS_DB.find(c => c.id === abom.sourceId)?.name}</p>
                                    <p style={{ fontSize: '0.9rem', color: '#ffcc00', marginBottom: 15 }}>Owned: {ownedSource}</p>
                                    <button className="btn btn-primary" disabled={!canMeld} onClick={() => conductMelding(abom)}>
                                        {canMeld ? (isOwned ? `FORGE ${abom.name.toUpperCase()}` : 'FORGE UNKNOWN ABOMINATION') : 'INSUFFICIENT MATERIALS'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'fusions' && (
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ marginBottom: 30, color: '#ff00ff', textShadow: '2px 2px 0px black' }}>// CHIMERISATION PROTOCOL //</h2>
                    <p style={{ opacity: 0.8, marginBottom: 40, color: '#aaa' }}>Merge two distinct esoteric forms to manifest a Chimera. You must possess at least 1 of each required entity.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 30, alignItems: 'center' }}>
                        {CHIMERAS_DB.map(chimera => {
                            const [srcAId, srcBId] = chimera.sourceIds;
                            const srcA = ALL_CARDS.find(c => c.id === srcAId);
                            const srcB = ALL_CARDS.find(c => c.id === srcBId);
                            const countA = state.collection[srcAId] || 0;
                            const countB = state.collection[srcBId] || 0;
                            const canMeld = countA >= 1 && countB >= 1;
                            const isOwned = state.collection[chimera.id] > 0;
                            
                            return (
                                <div key={chimera.id} className="hylics-panel fusion-card" style={{ border: `4px solid ${isOwned ? '#ff00ff' : '#555'}` }}>
                                    <div className="fusion-row">
                                        {/* Cost side A */}
                                        <div style={{ textAlign: 'center', flex: 1, opacity: countA >= 1 ? 1 : 0.4 }}>
                                            <img src={srcA?.image} style={{ width: 80, height: 120, objectFit: 'cover', border: '3px solid black' }} />
                                            <div style={{ color: countA >= 1 ? '#00ff00' : 'red', fontWeight: 'bold', marginTop: 10 }}>{countA} / 1</div>
                                        </div>

                                        <div style={{ fontSize: '3rem', color: '#ff00ff', fontWeight: 'bold' }}>+</div>

                                        {/* Cost side B */}
                                        <div style={{ textAlign: 'center', flex: 1, opacity: countB >= 1 ? 1 : 0.4 }}>
                                            <img src={srcB?.image} style={{ width: 80, height: 120, objectFit: 'cover', border: '3px solid black' }} />
                                            <div style={{ color: countB >= 1 ? '#00ff00' : 'red', fontWeight: 'bold', marginTop: 10 }}>{countB} / 1</div>
                                        </div>

                                        <div style={{ fontSize: '3rem', color: '#ff00ff', fontWeight: 'bold' }}>=</div>

                                        {/* Result side */}
                                        <div style={{ textAlign: 'center', flex: 2 }}>
                                            <div className="wavy-aura" style={{ display: 'inline-block' }}>
                                                {isOwned ? (
                                                    <img src={chimera.image} style={{ width: 140, height: 210, objectFit: 'cover', border: '4px solid black', filter: chimera.filter }} />
                                                ) : (
                                                    <div style={{ width: 140, height: 210, background: '#111', border: '4px dashed #555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <span style={{ fontSize: '4rem', color: '#333' }}>?</span>
                                                    </div>
                                                )}
                                            </div>
                                            <h3 style={{ marginTop: 15, color: isOwned ? '#ff00ff' : '#555', fontSize: '1.5rem', textShadow: '2px 2px 0 black' }}>{isOwned ? chimera.name : 'UNDISCOVERED'}</h3>
                                            {isOwned && <p style={{ color: '#aaa', fontSize: '0.9rem', marginTop: 5 }}>Owned: {state.collection[chimera.id] || 0}</p>}
                                        </div>
                                    </div>
                                    <button 
                                        className="btn btn-primary" 
                                        style={{ marginTop: 25, width: '100%', padding: 15, fontSize: '1.2rem', background: canMeld ? '#111' : '#333', borderColor: canMeld ? '#ff00ff' : 'var(--hylics-border-white)' }}
                                        disabled={!canMeld}
                                        onClick={() => conductChimeraMelding(chimera)}
                                    >
                                        {canMeld ? (isOwned ? `FUSE ${chimera.name.toUpperCase()}` : 'FUSE UNKNOWN CHIMERA') : 'INSUFFICIENT MATERIALS'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'colosseum' && (
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ marginBottom: 20 }}>MIND COLOSSEUM</h2>
                    <p style={{ marginBottom: 40, color: '#aaa' }}>Assign creatures to harvest flesh continuously. (Attacks trigger every 2 seconds)</p>
                    
                    <div className="battle-slots-container">
                        {battleSlots.map((slotId, idx) => {
                            const slotCard = slotId ? ALL_CARDS.find(c => c.id === slotId) : null;
                            const filterStyle = slotCard && (slotCard as any).filter ? { filter: (slotCard as any).filter } : {};
                            
                            return (
                                <div key={idx} className="hylics-panel battle-slot">
                                    <div style={{ marginBottom: 10, color: 'var(--text-highlight)' }}>SLOT {idx + 1}</div>
                                    {slotCard ? (
                                        <>
                                            <div style={{ position: 'relative', width: 100, height: 100 }}>
                                                <img src={slotCard.image} style={{ width: 100, height: 100, border: '4px solid black', display: 'block', ...filterStyle }} />
                                                {colosseumHits > 0 && <div key={colosseumHits} className="battle-hit-overlay" />}
                                            </div>
                                            <h4 style={{ margin: '10px 0' }}>{slotCard.name}</h4>
                                            <p style={{ color: 'red' }}>ATK: {slotCard.attack}</p>
                                            <p style={{ color: 'var(--text-highlight)', fontSize: '0.9rem' }}>+{slotCard.attack} flesh/2s</p>
                                            <button className="btn" style={{ marginTop: 'auto', width: '100%', fontSize: '0.8rem' }} onClick={() => {
                                                const newSlots = [...battleSlots];
                                                newSlots[idx] = null;
                                                setBattleSlots(newSlots);
                                            }}>UNASSIGN</button>
                                        </>
                                    ) : (
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', color: '#555' }}>EMPTY</div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <h3 style={{ textDecoration: 'underline', marginBottom: 20 }}>AVAILABLE ROSTER</h3>
                    <div style={cardsGridStyle}>
                        {ALL_CARDS.filter(c => state.collection[c.id] > 0).map(card => {
                            // Can't assign if already assigned or if we assign > owned quantity (simplified: just standard owned check)
                            const assignedCount = battleSlots.filter(id => id === card.id).length;
                            const canAssign = state.collection[card.id] > assignedCount;
                            const filterStyle = (card as any).filter ? { filter: (card as any).filter } : {};

                            return (
                                <div key={card.id} className="hylics-panel" style={{ width: 100, padding: 5, textAlign: 'center', opacity: canAssign ? 1 : 0.5 }}>
                                    <img src={card.image} style={{ width: 80, height: 80, border: '2px solid black', marginBottom: 5, ...filterStyle }} />
                                    <div style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden' }}>{card.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'red', margin: '5px 0' }}>ATK: {card.attack}</div>
                                    <button className="btn btn-primary" style={{ width: '100%', padding: '2px' }} disabled={!canAssign || !battleSlots.includes(null)} onClick={() => {
                                        const emptyIdx = battleSlots.indexOf(null);
                                        if (emptyIdx !== -1) {
                                            const newSlots = [...battleSlots];
                                            newSlots[emptyIdx] = card.id;
                                            setBattleSlots(newSlots);
                                        }
                                    }}>+</button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'rebirth' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <div className="hylics-panel" style={{ padding: 40, textAlign: 'center', maxWidth: 600, border: '6px solid red' }}>
                        <h2 style={{ fontSize: '3rem', color: 'red', textShadow: '3px 3px 0px black' }}>THE FINAL NULL</h2>
                        <p style={{ fontSize: '1.2rem', margin: '30px 0', lineHeight: 1.5 }}>
                            To progress, you must destroy the mind entirely. <br/>
                            Sacrifice your massive wealth and your entire inventory to earn a permanent **Soul Fragment**. <br/>
                            Each fragment permanently multiplies all Flesh gained by massive factors.
                        </p>
                        <h3 style={{ color: 'var(--text-highlight)', marginBottom: 30 }}>Fragments Owned: {state.soulFragments}</h3>
        <button className="btn rebirth-btn" style={{ background: 'darkred', color: 'white', fontSize: '2rem', padding: '20px 40px', cursor: state.money >= 1000000 ? 'pointer' : 'not-allowed', border: '4px solid red' }} disabled={state.money < 1000000} onClick={handleRebirth}>
                            ERASE MIND (Requires 1,000,000 Flesh)
                        </button>
                    </div>
                </div>
            )}
        </div>
      </main>

      {inspectedCardId && InspectedCard && (
          <div style={modalOverlayStyle} onClick={() => setInspectedCardId(null)}>
              <div className="hylics-panel" style={inspectorPanelStyle} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-primary" style={{ position: 'absolute', top: -5, right: -5, zIndex: 10, background: 'red' }} onClick={() => setInspectedCardId(null)}>X</button>
                  <div className="inspector-content">
                      {/* 3D card with mouse-follow transform */}
                      <div className="card-3d-wrapper" onMouseMove={handle3DMove} onMouseLeave={resetCardRotate}>
                          <div className="card-3d-inner" ref={cardInspectRef}>
                              <img src={InspectedCard.image} style={{ width: 300, height: 400, objectFit: 'cover', border: '8px solid var(--hylics-border-dark)', filter: (InspectedCard as any).filter ? (InspectedCard as any).filter : 'none', pointerEvents: 'none' }} />
                          </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 250, display: 'flex', flexDirection: 'column' }}>
                          <h2 style={{ fontSize: '2.5rem', marginBottom: 10, color: 'var(--text-highlight)' }}>{InspectedCard.name}</h2>
                          <div style={{ fontSize: '1.2rem', color: '#ff5555', marginBottom: 10 }}>[ ATK: {InspectedCard.attack} | HP: {InspectedCard.hp} ]</div>
                          <div style={{ fontSize: '1rem', color: '#aaa', marginBottom: 20 }}>Rarity: {InspectedCard.rarity} &bull; Owned: {state.collection[InspectedCard.id] || 0}x</div>
                          <p style={{ fontSize: '1.2rem', lineHeight: 1.6, background: 'rgba(0,0,0,0.5)', padding: 20, border: '2px solid var(--hylics-border-white)', fontStyle: 'italic' }}>
                              {loreText}<span style={{ opacity: 0.5, animation: 'floatUpFade 1s infinite' }}>|</span>
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activePack && (
          <PackOpening packType={activePack} onOpenComplete={handlePackCollect} collection={state.collection} />
      )}

      {clicks.map(c => (
          <div key={c.id} className="floating-number" style={{ position: 'absolute', left: c.x - 10, top: c.y - 20 }}>
              +{c.val}
          </div>
      ))}
    </div>
  );
}

export default App;

// Inline styles
const activeTabStyle: React.CSSProperties = { backgroundColor: 'var(--text-main)', color: 'var(--hylics-blue)' };
const badgeStyle: React.CSSProperties = { background: 'var(--accent-primary)', color: 'white', padding: '2px 8px', fontSize: '0.9rem', marginLeft: 10, border: '2px solid black', borderRadius: 10 };
const coinContainer: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 320, paddingBottom: 20 };
const coinStyle: React.CSSProperties = { width: 250, height: 250, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '8px solid var(--text-main)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), 0 10px 0 var(--hylics-border-dark)', transition: 'transform 0.1s', userSelect: 'none', position: 'relative' };
const upgradeSectionHeader: React.CSSProperties = { color: 'var(--text-highlight)', fontWeight: 'bold', fontSize: '1.4rem', borderBottom: '2px solid var(--hylics-border-white)', paddingBottom: 10, marginBottom: 5 };
const packCardStyle: React.CSSProperties = { width: 340, maxWidth: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.15s ease' };
const devMenuStyle: React.CSSProperties = { position: 'fixed', zIndex: 9999, width: 220, cursor: 'grab', touchAction: 'none' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 };
const inspectorPanelStyle: React.CSSProperties = { width: '90%', maxWidth: 900, padding: 20, position: 'relative', overflowY: 'auto', maxHeight: '95vh' };
const cardsGridStyle: React.CSSProperties = { display: 'flex', gap: 15, flexWrap: 'wrap', justifyContent: 'center' };
