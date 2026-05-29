import { useState, useCallback, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'paused' | 'loading'>('menu');
  
  // Game states managed at top level to feed the HUD in real-time
  const [health, setHealth] = useState(100);
  const [maxHealth] = useState(100);
  const [points, setPoints] = useState(500);
  const [kills, setKills] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  
  const [activeWeaponId, setActiveWeaponId] = useState<'pistol' | 'shotgun'>('pistol');
  const [ammoClip, setAmmoClip] = useState(12);
  const [ammoReserve, setAmmoReserve] = useState(60);
  
  const [isADS, setIsADS] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  
  const [hitmarker, setHitmarker] = useState<'hit' | 'kill' | null>(null);
  const [interactMessage, setInteractMessage] = useState<string | null>(null);
  const [scorePopups, setScorePopups] = useState<Array<{ id: string; amount: number; text: string }>>([]);
  const [showWaveBanner, setShowWaveBanner] = useState(false);

  // Score popups feedback cascade
  const addScorePopup = useCallback((amount: number, text: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setScorePopups(prev => [...prev, { id, amount, text }]);
    setTimeout(() => {
      setScorePopups(prev => prev.filter(p => p.id !== id));
    }, 1200);
  }, []);

  const handleStartGame = useCallback(() => {
    setGameState('loading');
    
    // Warm up the 3D grid, reset state parameters
    setHealth(100);
    setPoints(500);
    setKills(0);
    setCurrentRound(1);
    setActiveWeaponId('pistol');
    setAmmoClip(12);
    setAmmoReserve(60);
    setIsADS(false);
    setIsReloading(false);

    setTimeout(() => {
      setGameState('playing');
    }, 800);
  }, []);

  const handleRestartGame = useCallback(() => {
    // Soft reset state metrics
    handleStartGame();
  }, [handleStartGame]);

  // Capture window level pointer lock changes and sync pause states
  useEffect(() => {
    const handleLockChange = () => {
      const isLocked = document.pointerLockElement === document.getElementById('fps-canvas-container');
      if (!isLocked && gameState === 'playing') {
        setGameState('paused');
      } else if (isLocked && gameState === 'paused') {
        setGameState('playing');
      }
    };

    document.addEventListener('pointerlockchange', handleLockChange);
    return () => {
      document.removeEventListener('pointerlockchange', handleLockChange);
    };
  }, [gameState]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 flex select-none">
      
      {/* 3D WebGL Canvas Layer */}
      {gameState !== 'menu' && (
        <div className="absolute inset-0 w-full h-full z-10 pointer-events-auto">
          <GameCanvas
            gameState={gameState}
            setGameState={setGameState}
            health={health}
            setHealth={setHealth}
            points={points}
            setPoints={setPoints}
            kills={kills}
            setKills={setKills}
            currentRound={currentRound}
            setCurrentRound={setCurrentRound}
            activeWeaponId={activeWeaponId}
            setActiveWeaponId={setActiveWeaponId}
            ammoClip={ammoClip}
            setAmmoClip={setAmmoClip}
            ammoReserve={ammoReserve}
            setAmmoReserve={setAmmoReserve}
            isADS={isADS}
            setIsADS={setIsADS}
            isReloading={isReloading}
            setIsReloading={setIsReloading}
            setHitmarker={setHitmarker}
            setInteractMessage={setInteractMessage}
            addScorePopup={addScorePopup}
            setShowWaveBanner={setShowWaveBanner}
          />
        </div>
      )}

      {/* 2D HTML/CSS Core HUD Overlay & Systems Interface */}
      <div className="absolute inset-0 w-full h-full z-20 pointer-events-none">
        <HUD
          health={health}
          maxHealth={maxHealth}
          points={points}
          kills={kills}
          currentRound={currentRound}
          activeWeaponId={activeWeaponId}
          ammoClip={ammoClip}
          ammoReserve={ammoReserve}
          isADS={isADS}
          isReloading={isReloading}
          hitmarker={hitmarker}
          interactMessage={interactMessage}
          gameState={gameState}
          onStartGame={handleStartGame}
          onRestartGame={handleRestartGame}
          scorePopups={scorePopups}
          showWaveBanner={showWaveBanner}
        />
      </div>

    </div>
  );
}
