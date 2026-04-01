import React, { useState, useRef, useEffect } from 'react';
import { CARDS_DB } from './constants';
import { playTear, playSwipe } from './audio';

type PackOpeningProps = {
  packType: any;
  onOpenComplete: (cards: any[]) => void;
  collection: Record<number, number>;
};

export const PackOpening: React.FC<PackOpeningProps> = ({ packType, onOpenComplete, collection }) => {
  const [ripProgress, setRipProgress] = useState(0);
  const [isRipDragging, setIsRipDragging] = useState(false);
  const [opened, setOpened] = useState(false);
  
  const [revealedCards, setRevealedCards] = useState<any[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);

  // Swipe logic for cards
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ripProgress >= 100 && !opened) {
      setOpened(true);
      playTear();
      generateCards();
    }
  }, [ripProgress, opened]);

  const generateCards = () => {
    const newCards = [];
    for (let i = 0; i < 5; i++) {
        const pool = CARDS_DB.filter(c => packType.pulls.some((r: any) => r.name === c.rarity));
        const randomIndex = Math.floor(Math.random() * pool.length);
        const card = pool[randomIndex] || CARDS_DB[0];
        newCards.push({ ...card, uniqueInstanceId: Math.random() });
    }
    
    // Sort by rarity: Common -> Rare -> Epic -> Legendary
    const rarityOrder: Record<string, number> = {
        'Common': 1, 'Rare': 2, 'Epic': 3, 'Legendary': 4
    };
    newCards.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);
    setRevealedCards(newCards);
  };

  const handleRipDown = (e: React.PointerEvent) => {
    if (opened) return;
    setIsRipDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleRipMove = (e: React.PointerEvent) => {
    if (!isRipDragging || opened || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setRipProgress(progress);
  };

  const handleRipUp = (e: React.PointerEvent) => {
    setIsRipDragging(false);
    try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
    
    if (ripProgress < 90 && !opened) {
      setRipProgress(0);
    } else if (!opened) {
      setRipProgress(100);
    }
  };

  const handleSkip = () => {
      if (!opened) {
          setOpened(true);
          generateCards();
      }
      setRevealIndex(999);
  };

  // Card Swipe Handlers
  const handleCardPointerDown = (e: React.PointerEvent) => {
      if (isFadingOut) return;
      setDragStartX(e.clientX);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleCardPointerMove = (e: React.PointerEvent) => {
      if (dragStartX === null || isFadingOut) return;
      setDragX(e.clientX - dragStartX);
  };

  const handleCardPointerUp = (e: React.PointerEvent) => {
      if (dragStartX === null || isFadingOut) return;
      
      if (Math.abs(dragX) > 80) {
          setIsFadingOut(true);
          playSwipe();
          setTimeout(() => {
              setRevealIndex(prev => prev + 1);
              setDragX(0);
              setIsFadingOut(false);
          }, 300); // 300ms fade duration
      } else {
          // Snap back
          setDragX(0);
      }
      setDragStartX(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch(err) {}
  };

  const tiltAngle = (ripProgress / 100) * 3; // Natural subtle 3 degrees tilt

  return (
    <div style={overlayStyle}>
      {!opened ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ ...packStyle, border: 'none', transform: `rotate(${tiltAngle}deg)` }} ref={containerRef}>
                {/* Single Solid Pack Image */}
                <div style={{ 
                    ...packHalfBase, 
                    backgroundImage: `url(${packType.image})`, 
                    backgroundPosition: 'center',
                    zIndex: 1
                }} />
                
                {/* The Growing Crack Line */}
                <div style={{ 
                    position: 'absolute', top: '50%', left: 0, 
                    width: `${ripProgress}%`, height: 8,
                    background: '#000',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)',
                    zIndex: 2, pointerEvents: 'none',
                    clipPath: 'polygon(0% 20%, 5% 80%, 10% 30%, 15% 70%, 20% 20%, 25% 90%, 30% 10%, 35% 80%, 40% 30%, 45% 70%, 50% 20%, 55% 90%, 60% 30%, 65% 70%, 70% 30%, 75% 90%, 80% 20%, 85% 70%, 90% 30%, 95% 80%, 100% 50%)',
                    transition: 'width 0.1s ease-out'
                }} />

                {/* Rip Guide Arrow */}
                <div style={{ ...tearStripBgStyle, backgroundColor: 'transparent', width: '100%', height: 100, top: '40%', left: 0, zIndex: 10 }}>
                    <div 
                        style={{ ...tearHandleStyle, left: `calc(${ripProgress}% - 40px)`, opacity: ripProgress > 5 ? 0 : 1, transition: 'opacity 0.3s', zIndex: 20 }}
                        onPointerDown={handleRipDown}
                        onPointerMove={handleRipMove}
                        onPointerUp={handleRipUp}
                        onPointerCancel={handleRipUp}
                    >
                        &gt;&gt;
                    </div>
                </div>
            </div>
            
            <button className="btn" style={{ marginTop: 40, padding: '10px 30px', background: 'rgba(50,50,50,0.8)', color: 'white' }} onClick={handleSkip}>
                FORCE EXTRACT &gt;&gt;
            </button>
        </div>
      ) : (
        <div style={revealContainerStyle}>
            {/* Final Drop Animation for Pack Fragments */}
            {revealIndex === 0 && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="pack-drop-half" style={{ 
                        width: 'min(320px, 90vw)', height: 'min(420px, 70vh)', 
                        backgroundImage: `url(${packType.image})`, backgroundSize: 'cover',
                        clipPath: `polygon(0% 0%, 100% 0%, 100% 50%, 75% 49%, 50% 51%, 25% 49%, 0% 50%)`, // Top Half
                        animation: 'packDropLeft 1.2s forwards' 
                    }} />
                    <div className="pack-drop-half" style={{ 
                        width: 'min(320px, 90vw)', height: 'min(420px, 70vh)', 
                        backgroundImage: `url(${packType.image})`, backgroundSize: 'cover',
                        clipPath: `polygon(0% 50%, 25% 49%, 50% 51%, 75% 49%, 100% 50%, 100% 100%, 0% 100%)`, // Bottom Half
                        animation: 'packDropRight 1.2s forwards',
                        position: 'absolute'
                    }} />
                </div>
            )}
            
            {revealIndex < revealedCards.length ? (
                // Show current card
                <div style={singleCardRevealContainer}>
                    {(() => {
                        const c = revealedCards[revealIndex];
                        const isHolo = c.rarity === 'Legendary' || c.rarity === 'Epic';
                        const holoClass = isHolo ? ` wavy-aura ${c.rarity.toLowerCase()}` : '';
                        const isNew = !collection[c.id];

                        // The card gently tilts while dragged, but immediately fades out when thrown
                        const cardTransform = `translateX(${dragX * 0.5}px) rotate(${dragX * 0.05}deg)`;
                        const opacity = isFadingOut ? 0 : 1;

                        return (
                            <div key={c.uniqueInstanceId} style={{ position: 'relative', width: 'min(260px, 80vw)', height: 'min(380px, 60vh)' }}>
                                {isNew && <div className="hylics-panel" style={newBadgeStyle}>NEW!</div>}
                                <div 
                                    className={`hylics-panel card-reveal ${holoClass}`} 
                                    style={{ ...cardStyle, transform: cardTransform, opacity, transition: isFadingOut || dragStartX === null ? 'all 0.3s ease' : 'none', cursor: 'grab', touchAction: 'none' }}
                                    onPointerDown={handleCardPointerDown}
                                    onPointerMove={handleCardPointerMove}
                                    onPointerUp={handleCardPointerUp}
                                    onPointerCancel={handleCardPointerUp}
                                >
                                    <div style={{ padding: '15px', pointerEvents: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                        <img src={c.image} alt={c.name} style={imgStyle} draggable={false} />
                                        <h3 style={{ marginTop: 20, fontSize: '1.5rem', textAlign: 'center' }}>{c.name}</h3>
                                        <p style={{ color: 'var(--text-highlight)', fontSize: '1rem', textAlign: 'center' }}>[ {c.rarity.toUpperCase()} ]</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                    
                    <div className="hylics-panel" style={{ marginTop: 30, padding: '10px 20px', fontWeight: 'bold', color: 'var(--text-highlight)', letterSpacing: 2 }}>
                        {'< SWIPE TO NEXT >'}
                    </div>
                    
                    <button className="btn" style={{ marginTop: 20, padding: '8px 20px', background: 'transparent', border: '2px solid #555', color: '#888' }} onClick={handleSkip}>
                        SKIP ALL &gt;&gt;
                    </button>
                </div>
            ) : (
                // Summary screen
                <div className="hylics-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 30, marginTop: 20 }}>
                    <div style={{ width: '100%', marginBottom: 20, fontSize: '1.5rem', textAlign: 'center', color: 'var(--text-highlight)' }}>EXTRACTION SUMMARY</div>
                    <div style={cardsGridStyle}>
                        {revealedCards.map((c) => {
                            const isHolo = c.rarity === 'Legendary' || c.rarity === 'Epic';
                            const holoClass = isHolo ? ` wavy-aura ${c.rarity.toLowerCase()}` : '';
                            const isNew = !collection[c.id];
                            
                            return (
                                <div key={c.uniqueInstanceId} style={{ position: 'relative', width: 120, height: 180 }}>
                                    {isNew && <div style={{ ...newBadgeStyle, transform: 'scale(0.7)', top: -10, right: -10 }}>NEW!</div>}
                                    <div className={`hylics-panel ${holoClass}`} style={{ ...cardStyle, width: '100%', height: '100%', padding: 5 }}>
                                        <img src={c.image} alt={c.name} style={{ width: '100%', height: 100, objectFit: 'cover', border: '2px solid var(--hylics-border-dark)' }} />
                                        <h3 style={{ marginTop: 10, fontSize: '0.9rem', textAlign: 'center', lineHeight: 1 }}>{c.name}</h3>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    <button className="btn btn-primary" style={{ marginTop: 30, padding: '10px 30px' }} onClick={() => onOpenComplete(revealedCards)}>
                        CLOSE MENU
                    </button>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, // Dark moody overlay
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
};

const packHalfBase: React.CSSProperties = {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    backgroundSize: 'cover', backgroundPosition: 'center',
    transition: 'transform 0.1s ease-out',
};

const packStyle: React.CSSProperties = {
    width: 'min(320px, 90vw)', height: 'min(420px, 70vh)',
    display: 'flex', flexDirection: 'column',
    position: 'relative', overflow: 'visible', // Visible to allow separation
    transformOrigin: 'center center', transition: 'transform 0.1s ease-out'
};

const tearStripBgStyle: React.CSSProperties = {
    position: 'absolute', top: 120, left: -10, right: -10, height: 50,
};

const tearHandleStyle: React.CSSProperties = {
    position: 'absolute', top: -5, width: 60, height: 60,
    backgroundColor: 'var(--text-main)', border: '4px solid var(--hylics-border-dark)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'black', fontWeight: 'bold', cursor: 'grab', userSelect: 'none',
    touchAction: 'none'
};

const revealContainerStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 800
};

const singleCardRevealContainer: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 20
};

const cardsGridStyle: React.CSSProperties = {
    display: 'flex', gap: 15, flexWrap: 'wrap', justifyContent: 'center'
};

const cardStyle: React.CSSProperties = {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    position: 'absolute', top: 0, left: 0
};

const imgStyle: React.CSSProperties = {
    width: '100%', height: '60%', objectFit: 'cover', border: '4px solid var(--hylics-border-dark)'
};

const newBadgeStyle: React.CSSProperties = {
  position: 'absolute', top: -15, right: -15, background: 'var(--accent-primary)',
  color: 'white', fontWeight: 'bold', padding: '6px 12px',
  fontSize: '1rem', zIndex: 10, border: '3px solid black'
};
