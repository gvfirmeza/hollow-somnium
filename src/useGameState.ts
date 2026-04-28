import { useState, useEffect } from 'react';
import { EVOLUTIONS } from './constants';

type GameState = {
  money: number;
  clickLevel: number;
  fingers: number;
  speedLevel: number;
  collection: Record<number, number>; // Maps ID to quantity
  newCards: number[];
  prestigeLevel: number;
  soulFragments: number;
  unlockedColosseum: boolean;
  colosseumSlots: number;
  colosseumSpeedLevel: number;
  clickPowerLevel: number;
  fusionHistory: { cardAId: number, cardBId: number, resultId: number | null, success: boolean, timestamp: number }[];
  tutorialCompleted: boolean;
};

const DEFAULT_STATE: GameState = {
  money: 0,
  clickLevel: 0,
  fingers: 0,
  speedLevel: 0,
  collection: {},
  newCards: [],
  prestigeLevel: 0,
  soulFragments: 0,
  unlockedColosseum: false,
  colosseumSlots: 1,
  colosseumSpeedLevel: 0,
  clickPowerLevel: 0,
  fusionHistory: [],
  tutorialCompleted: false,
};

export function useGameState() {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem('hylics_game_state_v2'); // New schema key
    if (saved) {
      try {
        return { ...DEFAULT_STATE, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_STATE;
      }
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    localStorage.setItem('hylics_game_state_v2', JSON.stringify(state));
  }, [state]);

  const updateState = (updates: Partial<GameState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const addMoney = (amount: number) => {
    // Multiply incoming flesh by prestige
    const multiplier = 1 + (state.soulFragments * 10);
    setState(prev => ({ ...prev, money: prev.money + Math.round(amount * multiplier) }));
  };

  const deductMoney = (amount: number) => {
    setState(prev => ({ ...prev, money: Math.max(0, prev.money - amount) }));
  };

  // Passive income — each hand generates the same value as the current coin
  useEffect(() => {
    if (state.fingers > 0) {
        const intervalTime = Math.max(500, 3000 - state.speedLevel * 500);
        const clickPower = 1 + state.clickPowerLevel;
        const milestoneBonus = EVOLUTIONS[state.clickLevel]?.value ?? 1;
        const totalPower = clickPower * milestoneBonus;

        const interval = setInterval(() => {
            const multiplier = 1 + (state.soulFragments * 10);
            setState(prev => ({ 
                ...prev, 
                money: prev.money + Math.round(prev.fingers * totalPower * multiplier) 
            }));
        }, intervalTime);
        return () => clearInterval(interval);
    }
  }, [state.fingers, state.speedLevel, state.soulFragments, state.clickLevel]);

  return { state, updateState, addMoney, deductMoney };
}
