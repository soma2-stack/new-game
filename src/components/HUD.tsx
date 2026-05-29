import React, { useState, useEffect } from 'react';
import { Volume2, Shield, Settings, Play, RefreshCw, Eye, MousePointer } from 'lucide-react';
import { sound } from '../sound';

interface HUDProps {
  health: number;
  maxHealth: number;
  points: number;
  kills: number;
  currentRound: number;
  activeWeaponId: 'pistol' | 'shotgun';
  ammoClip: number;
  ammoReserve: number;
  isADS: boolean;
  isReloading: boolean;
  hitmarker: 'hit' | 'kill' | null;
  interactMessage: string | null;
  gameState: 'menu' | 'playing' | 'gameover' | 'paused' | 'loading';
  onStartGame: () => void;
  onRestartGame: () => void;
  scorePopups: Array<{ id: string; amount: number; text: string }>;
  showWaveBanner: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  health,
  maxHealth,
  points,
  kills,
  currentRound,
  activeWeaponId,
  ammoClip,
  ammoReserve,
  isADS,
  isReloading,
  hitmarker,
  interactMessage,
  gameState,
  onStartGame,
  onRestartGame,
  scorePopups,
  showWaveBanner,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'audio' | 'controls' | 'hud'>('audio');

  // Load and apply direct settings states
  const [masterVol, setMasterVol] = useState(80);
  const [sfxVol, setSFXVol] = useState(90);
  const [musicVol, setMusicVol] = useState(50);
  const [sensitivity, setSensitivity] = useState(35);
  const [fov, setFov] = useState(75);
  const [crosshairColor, setCrosshairColor] = useState('#22c55e'); // Green-500
  const [showDmgNumbers, setShowDmgNumbers] = useState(true);

  useEffect(() => {
    // Attempt to load settings from storage
    const saved = localStorage.getItem('codz_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.audio) {
          setMasterVol(parsed.audio.master ?? 80);
          setSFXVol(parsed.audio.sfx ?? 90);
          setMusicVol(parsed.audio.music ?? 50);
          sound.setMasterVolume((parsed.audio.master ?? 80) / 100);
          sound.setSFXVolume((parsed.audio.sfx ?? 90) / 100);
          sound.setMusicVolume((parsed.audio.music ?? 50) / 100);
        }
        if (parsed.controls) {
          setSensitivity(parsed.controls.sensitivity ?? 35);
        }
        if (parsed.graphics) {
          setFov(parsed.graphics.fov ?? 75);
        }
        if (parsed.gameplay) {
          setCrosshairColor(parsed.gameplay.crosshairColor ?? '#22c55e');
          setShowDmgNumbers(parsed.gameplay.damageNumbers ?? true);
        }
      } catch (e) {
        console.warn('Could not parse saved settings');
      }
    } else {
      // Set initial sound volumes to sync with local state
      sound.setMasterVolume(0.8);
      sound.setSFXVolume(0.9);
      sound.setMusicVolume(0.5);
    }
  }, []);

  const saveSettingPiece = (section: string, key: string, value: any) => {
    const fresh = localStorage.getItem('codz_settings');
    let data: any = {};
    if (fresh) {
      try { data = JSON.parse(fresh); } catch (e) {}
    }
    if (!data[section]) data[section] = {};
    data[section][key] = value;
    localStorage.setItem('codz_settings', JSON.stringify(data));
    
    // Dispatch custom event to notify 3D engine elements in real-time
    window.dispatchEvent(new CustomEvent('settings-update', { detail: data }));
  };

  const handleMasterVolChange = (val: number) => {
    setMasterVol(val);
    sound.setMasterVolume(val / 100);
    saveSettingPiece('audio', 'master', val);
  };

  const handleSFXVolChange = (val: number) => {
    setSFXVol(val);
    sound.setSFXVolume(val / 100);
    saveSettingPiece('audio', 'sfx', val);
  };

  const handleMusicVolChange = (val: number) => {
    setMusicVol(val);
    sound.setMusicVolume(val / 100);
    saveSettingPiece('audio', 'music', val);
  };

  const handleSensChange = (val: number) => {
    setSensitivity(val);
    saveSettingPiece('controls', 'sensitivity', val);
  };

  const handleFovChange = (val: number) => {
    setFov(val);
    saveSettingPiece('graphics', 'fov', val);
  };

  const handleCrosshairColorChange = (val: string) => {
    setCrosshairColor(val);
    saveSettingPiece('gameplay', 'crosshairColor', val);
  };

  const handleDmgNumbersChange = (val: boolean) => {
    setShowDmgNumbers(val);
    saveSettingPiece('gameplay', 'damageNumbers', val);
  };

  const healthPercent = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const isLowHealth = healthPercent <= 35;

  return (
    <div className="absolute inset-0 pointer-events-none select-none font-sans z-50">
      
      {/* 1. ATMOSPHERE VIGNETTE OVERLAYS & BLOOD FLASHES */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black via-transparent to-black opacity-45 z-0" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,transparent_35%,rgba(0,0,0,0.85)_100%)] z-0" />
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(139,0,0,0.25)] border-[25px] md:border-[35px] border-transparent z-40 pointer-events-none" />

      {gameState === 'playing' && isLowHealth && (
        <div 
          className="absolute inset-0 bg-radial-[circle,transparent_40%,rgba(185,28,28,0.7)_100%] animate-pulse z-40 transition-opacity duration-300 pointer-events-none"
          style={{ opacity: (1 - (healthPercent / 100)) * 0.9 }}
        />
      )}
      
      {/* 2. MAIN MENU */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-[#050505] flex flex-col items-center justify-center pointer-events-auto z-50 text-center px-4 overflow-hidden">
          {/* Walls & Perspective Simulated Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] to-[#050505] opacity-95 z-0"></div>
          <div className="absolute bottom-0 w-full h-[40%] bg-[#0a0a0a] opacity-30 z-0" style={{ backgroundImage: "radial-gradient(#222 1px, transparent 1px)", backgroundSize: "50px 50px" }}></div>
          
          {/* Chalkboard Styled Main Board */}
          <div className="relative z-10 w-full max-w-2xl bg-[#1a2e1a] border-[12px] border-[#2a1a0a] rounded-sm shadow-2xl p-6 md:p-8 flex items-center justify-center mb-8">
            <div className="absolute top-4 left-6 text-[#ffffff22] text-xs font-mono italic">Ms. Miller's Class - Oct 12</div>
            <div className="absolute bottom-4 right-6 text-[#ffffff15] text-4xl rotate-[-5deg] pointer-events-none italic font-serif">HELP US</div>
            
            <div className="text-center py-4">
              <span className="text-[11px] tracking-[0.55em] text-[#00ff00] font-bold uppercase mb-2 block drop-shadow-[0_0_10px_rgba(0,255,0,0.6)] animate-pulse">SURVIVE THE DETENTION</span>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-[#e0e0e0] uppercase border-b-4 border-red-750 pb-3 font-serif">
                DEAD <span className="text-red-600 drop-shadow-[0_0_20px_rgba(239,68,68,0.7)]">BELL</span>
              </h1>
              <p className="text-xs font-mono text-neutral-400 tracking-wider mt-2.5 uppercase">CLASSROOM OUTBREAK SURVIVAL</p>
            </div>
          </div>

          {/* Classroom Debris Simulated in Menu Sides */}
          <div className="hidden lg:block absolute bottom-[10%] left-[12%] w-48 h-32 bg-[#2a1a0a] rounded shadow-2xl transform rotate-[-15deg] skew-x-12 border border-[#3a2a1a] opacity-45 pointer-events-none"></div>
          <div className="hidden lg:block absolute bottom-[8%] right-[15%] w-40 h-28 bg-[#221a10] rounded shadow-2xl transform rotate-[10deg] skew-y-6 border border-[#3a2a1a] opacity-35 pointer-events-none"></div>

          {/* Main CTA */}
          <div className="relative z-10 flex flex-col sm:flex-row gap-4 w-full justify-center max-w-sm mb-12">
            <button 
              id="btn-play-game"
              onClick={() => {
                sound.init(); 
                onStartGame();
              }}
              className="flex items-center justify-center gap-3 bg-red-700 hover:bg-red-600 active:bg-red-800 text-white font-bold text-lg px-8 py-4 rounded-sm border-b-4 border-red-900 transition-all cursor-pointer shadow-lg shadow-red-900/30 w-full"
            >
              <Play className="fill-white" size={20} /> START OUTBREAK
            </button>

            <button 
              id="btn-open-settings"
              onClick={() => {
                sound.init();
                setShowSettings(true);
              }}
              className="flex items-center justify-center gap-2 bg-[#111111] hover:bg-[#1a1a1a] active:bg-[#050505] text-[#e0e0e0] font-bold text-base px-6 py-4 rounded-sm border border-neutral-800 transition-all cursor-pointer w-full sm:w-auto"
            >
              <Settings size={20} /> SETTINGS
            </button>
          </div>

          {/* Instruction Footer Card */}
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-black/80 border border-neutral-800 rounded backdrop-blur-md max-w-xl text-left w-full">
            <div>
              <span className="text-[10px] text-neutral-500 block uppercase tracking-wider">Movement</span>
              <span className="text-xs font-semibold text-neutral-300 font-mono">WASD / SPACE</span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 block uppercase tracking-wider">Gunplay & ADS</span>
              <span className="text-xs font-semibold text-neutral-300 font-mono">L-CLICK / R-CLICK</span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 block uppercase tracking-wider">Interact / Buy</span>
              <span className="text-xs font-semibold text-neutral-300 font-mono">E KEY</span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 block uppercase tracking-wider">Reload / Swap</span>
              <span className="text-xs font-semibold text-neutral-300 font-mono">R KEY / 1, 2 KEYS</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. LOADING OVERLAY */}
      {gameState === 'loading' && (
        <div className="absolute inset-0 bg-[#050505] flex flex-col items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-neutral-850 border-t-red-650 rounded-full animate-spin mb-4" />
            <h2 className="text-xl font-bold tracking-widest text-[#e0e0e0] uppercase animate-pulse">WARMING UP BATTLEFIELD ENGINE...</h2>
            <p className="text-xs font-mono text-neutral-500 mt-2 uppercase">Baking school map lighting & placing wall buys</p>
          </div>
        </div>
      )}

      {/* 4. SETTINGS PANEL OVERLAY */}
      {showSettings && (
        <div className="absolute inset-0 bg-[#050505]/95 flex items-center justify-center pointer-events-auto z-[60] px-4">
          <div className="bg-[#111111] border border-neutral-850 w-full max-w-lg rounded-md overflow-hidden flex flex-col max-h-[85vh] shadow-2xl">
            {/* Header */}
            <div className="bg-black border-b border-neutral-850 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="text-red-500" size={20} />
                <h3 className="font-black text-lg tracking-wide text-[#e0e0e0] uppercase">SYSTEM SETTINGS</h3>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-neutral-500 hover:text-neutral-200 font-mono text-xs cursor-pointer border border-neutral-800 rounded px-2 py-1"
              >
                CLOSE [ESC]
              </button>
            </div>

            {/* Quick Tabs */}
            <div className="flex border-b border-neutral-850 bg-black/50">
              <button
                onClick={() => setActiveTab('audio')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === 'audio' 
                    ? 'text-red-500 border-red-500 bg-neutral-900/30' 
                    : 'text-neutral-500 border-transparent hover:text-neutral-300'
                }`}
              >
                AUDIO
              </button>
              <button
                onClick={() => setActiveTab('controls')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === 'controls' 
                    ? 'text-red-500 border-red-500 bg-neutral-900/30' 
                    : 'text-neutral-500 border-transparent hover:text-neutral-300'
                }`}
              >
                CONTROLS / FOV
              </button>
              <button
                onClick={() => setActiveTab('hud')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === 'hud' 
                    ? 'text-red-500 border-red-500 bg-neutral-900/30' 
                    : 'text-neutral-500 border-transparent hover:text-neutral-300'
                }`}
              >
                GAMEPLAY / HUD
              </button>

            </div>

            {/* Config Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
              {activeTab === 'audio' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center text-sm font-semibold mb-1 text-neutral-300">
                      <label className="flex items-center gap-2"><Volume2 size={16} /> Master Output</label>
                      <span className="text-xs font-mono text-red-500">{masterVol}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={masterVol} 
                      onChange={(e) => handleMasterVolChange(Number(e.target.value))}
                      className="w-full accent-red-650 bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-sm font-semibold mb-1 text-neutral-400">
                      <label>Sound FX Volume</label>
                      <span className="text-xs font-mono text-yellow-500">{sfxVol}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={sfxVol} 
                      onChange={(e) => handleSFXVolChange(Number(e.target.value))}
                      className="w-full accent-yellow-600 bg-neutral-800 h-1 rounded-sm appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-sm font-semibold mb-1 text-neutral-400">
                      <label>Ambient Score Drone</label>
                      <span className="text-xs font-mono text-red-400">{musicVol}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={musicVol} 
                      onChange={(e) => handleMusicVolChange(Number(e.target.value))}
                      className="w-full accent-red-500 bg-neutral-800 h-1 rounded-sm appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'controls' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center text-sm font-semibold mb-1 text-neutral-300">
                      <label className="flex items-center gap-2"><MousePointer size={16} /> Mouse Look Sensitivity</label>
                      <span className="text-xs font-mono text-red-500">{sensitivity}</span>
                    </div>
                    <input 
                      type="range" 
                      min="5" max="100" 
                      value={sensitivity} 
                      onChange={(e) => handleSensChange(Number(e.target.value))}
                      className="w-full accent-red-650 bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1 uppercase">Adjusts look sensitivity in FPS stage mode</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-sm font-semibold mb-1 text-neutral-300">
                      <label className="flex items-center gap-2"><Eye size={16} /> Player Camera FOV</label>
                      <span className="text-xs font-mono text-red-500">{fov}°</span>
                    </div>
                    <input 
                      type="range" 
                      min="60" max="110" 
                      value={fov} 
                      onChange={(e) => handleFovChange(Number(e.target.value))}
                      className="w-full accent-red-650 bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1 uppercase">Higher degrees widen peripheral visibility</p>
                  </div>
                </div>
              )}

              {activeTab === 'hud' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-neutral-300 block mb-2">Tactical Crosshair Color</label>
                    <div className="flex gap-3">
                      {['#22c55e', '#ffffff', '#ef4444', '#3b82f6'].map((col) => (
                        <button
                          key={col}
                          onClick={() => handleCrosshairColorChange(col)}
                          className="w-8 h-8 rounded-full border-2 transition-all cursor-pointer"
                          style={{ 
                            backgroundColor: col, 
                            borderColor: crosshairColor === col ? '#ffffff' : 'transparent',
                            transform: crosshairColor === col ? 'scale(1.15)' : 'scale(1)'
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-850 pt-4 mt-4">
                    <div>
                      <span className="text-sm font-semibold text-neutral-300 block">Render Collision Damage Text</span>
                      <span className="text-[10px] text-neutral-500 block uppercase">Display popup points numbers directly above hit zombies</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={showDmgNumbers}
                      onChange={(e) => handleDmgNumbersChange(e.target.checked)}
                      className="w-5 h-5 accent-red-650 rounded border-neutral-800 bg-neutral-900 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-black p-4 border-t border-neutral-850 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="bg-red-700 hover:bg-red-600 text-white font-bold text-xs uppercase px-5 py-2.5 rounded-sm transition-all cursor-pointer animate-pulse"
              >
                APPLY & CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. PLAYING PAUSED POPUP PROMPT */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 bg-neutral-950/85 flex flex-col items-center justify-center pointer-events-auto z-40">
          <div className="bg-[#111111] border border-neutral-800 p-8 rounded text-center max-w-sm backdrop-blur">
            <h2 className="text-3xl font-black text-red-650 tracking-wider mb-2 uppercase">GAME PAUSED</h2>
            <p className="text-sm text-neutral-400 mb-6 uppercase">Mouse lock was interrupted. Re-engage look to continue playing.</p>
            <button 
              onClick={() => {
                const el = document.getElementById('fps-canvas-container');
                el?.requestPointerLock();
              }}
              className="px-6 py-3 bg-red-700 hover:bg-red-600 text-white text-sm font-bold uppercase tracking-wider rounded-sm cursor-pointer shadow-lg transition-all w-full animate-bounce"
            >
              CLICK HERE TO FOCUS
            </button>
          </div>
        </div>
      )}

      {/* 6. GAME OVER BOARD */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-[#050505]/98 flex flex-col items-center justify-center pointer-events-auto z-50 text-center px-4">
          <div className="max-w-md w-full p-8 bg-[#111111] border border-neutral-800 rounded shadow-2xl">
            <span className="text-[10px] text-red-600 font-bold uppercase tracking-[0.3em] block mb-2">STAGE SUMMARY</span>
            <h2 className="text-4xl md:text-5xl font-black text-[#e0e0e0] uppercase tracking-tighter mb-1 select-text">YOU DIED</h2>
            <p className="text-xs text-neutral-500 font-mono uppercase mb-6">Classroom Arena Session Terminated</p>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-black p-4 border border-neutral-800/60 rounded">
                <span className="text-[9px] text-neutral-500 block uppercase tracking-wider">Survival Score</span>
                <span className="text-2xl font-black text-[#00ff00] font-mono">{points}</span>
              </div>
              <div className="bg-black p-4 border border-neutral-800/60 rounded">
                <span className="text-[9px] text-neutral-500 block uppercase tracking-wider">Waves Survived</span>
                <span className="text-2xl font-black text-red-500 font-mono">{currentRound}</span>
              </div>
              <div className="bg-black p-4 border border-neutral-800/60 rounded col-span-2">
                <span className="text-[9px] text-neutral-500 block uppercase tracking-wider">Zombies Dispatched</span>
                <span className="text-2xl font-black text-[#e0e0e0] font-mono">{kills}</span>
              </div>
            </div>

            <button 
              onClick={onRestartGame}
              className="flex items-center justify-center gap-3 bg-red-700 hover:bg-red-600 active:bg-red-800 text-white font-bold text-lg px-8 py-4 rounded-sm border-b-4 border-red-900 transition-all cursor-pointer shadow-lg w-full"
            >
              <RefreshCw size={18} /> SURVIVE ONCE MORE
            </button>
          </div>
        </div>
      )}

      {/* 7. IN-GAME HUD STATUS OVERLAYS (ONLY ACTIVE WHEN PLAYING/PAUSED) */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <React.Fragment>
          {/* Top-Center Wave Announcer / Interact Prompts */}
          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-40 flex flex-col items-center">
            {interactMessage && (
              <div className="bg-black/90 border border-neutral-800 text-white text-xs font-bold font-mono px-4 py-2 bg-gradient-to-r from-transparent via-neutral-950/95 to-transparent shadow-lg text-center backdrop-blur-sm max-w-lg mb-4 whitespace-pro-line leading-relaxed pointer-events-auto rounded uppercase">
                {interactMessage}
              </div>
            )}
          </div>

          {/* Full Wave Start Animation Text Card */}
          {showWaveBanner && (
            <div className="absolute top-[32%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 text-center animate-pulse pointer-events-none">
              <h1 className="text-7xl font-extrabold text-[#9d0505] tracking-widest uppercase filter drop-shadow-[0_5px_15px_rgba(239,68,68,0.73)] scale-in font-serif">
                ROUND {currentRound}
              </h1>
              <p className="text-xs font-mono text-neutral-450 tracking-[0.4em] uppercase mt-1">THE SCHOOL HORDE HAS SPAWNED</p>
            </div>
          )}

          {/* Hitmarkers (Diagonal lines) around crosshair - Precise & Shorter */}
          {hitmarker && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none w-5 h-5 animate-out fade-out duration-100">
              <div className={`absolute top-0 left-0 w-1.5 h-[1.5px] rotate-45 transform-gpu ${hitmarker === 'kill' ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-neutral-300 shadow-[0_0_4px_#ffffff]'}`} />
              <div className={`absolute top-0 right-0 w-1.5 h-[1.5px] -rotate-45 transform-gpu ${hitmarker === 'kill' ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-neutral-300 shadow-[0_0_4px_#ffffff]'}`} />
              <div className={`absolute bottom-0 left-0 w-1.5 h-[1.5px] -rotate-45 transform-gpu ${hitmarker === 'kill' ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-neutral-300 shadow-[0_0_4px_#ffffff]'}`} />
              <div className={`absolute bottom-0 right-0 w-1.5 h-[1.5px] rotate-45 transform-gpu ${hitmarker === 'kill' ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-neutral-300 shadow-[0_0_4px_#ffffff]'}`} />
            </div>
          )}

          {/* Center Crosshair - Ominous Tiny Minimal Sight */}
          {!isADS && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none w-6 h-6 animate-pulse">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1.5px] h-2.5 opacity-70" style={{ backgroundColor: crosshairColor }}></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1.5px] h-2.5 opacity-70" style={{ backgroundColor: crosshairColor }}></div>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-[1.5px] opacity-70" style={{ backgroundColor: crosshairColor }}></div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-[1.5px] opacity-70" style={{ backgroundColor: crosshairColor }}></div>
              <div className="absolute w-1 h-1 rounded-full opacity-90 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: crosshairColor }} />
            </div>
          )}

          {/* HUD: Bottom Left (Points & Round Number - Black Ops Zombies inspired) */}
          <div className="absolute bottom-8 left-8 md:bottom-10 md:left-10 flex flex-col z-40 select-none pointer-events-none gap-3">
            {/* Ominous Red Round Counter */}
            <div className="flex items-center gap-4">
              <div className="text-red-650 font-extrabold text-6xl md:text-7xl font-serif filter drop-shadow-[0_0_15px_rgba(220,38,38,0.85)] tracking-tighter leading-none transition-all">
                {currentRound}
              </div>
              <div className="flex flex-col select-none">
                <span className="text-red-700 text-[10px] font-bold tracking-[0.3em] uppercase leading-none">ROUND</span>
                <span className="text-neutral-500 text-[8px] font-mono tracking-wider ml-0.5 mt-0.5 uppercase">SURVIVAL WAVE</span>
              </div>
            </div>

            {/* Neon Green Score/Points Display */}
            <div className="relative flex items-center gap-3">
              {/* Neon bright green glowing left bar marker */}
              <div className="w-1.5 h-9 bg-[#00ff00] shadow-[0_0_10px_#00ff00]" />
              
              <div className="flex flex-col">
                <div className="relative flex items-center select-text">
                  <span className="text-3xl md:text-4xl font-mono font-black text-[#00ff00] drop-shadow-[0_0_8px_rgba(0,255,0,0.65)] leading-none">
                    {points}
                  </span>
                  
                  {/* Score Modifications Cascade Popups */}
                  <div className="absolute -right-24 top-0.5 flex flex-col items-start gap-1 font-mono font-bold text-xs pointer-events-none">
                    {scorePopups.map((pop) => (
                      <span 
                        key={pop.id} 
                        className={`block animate-bounce text-xs font-bold tracking-tighter ${
                          pop.amount > 0 ? 'text-[#00ff00] drop-shadow-[0_0_6px_rgba(0,255,0,0.5)]' : 'text-red-500'
                        }`}
                      >
                        {pop.text}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Health Bar styled in Elegant Minimal Dark style */}
            <div className="flex flex-col gap-1 w-44 md:w-52 mt-1 select-none">
              <div className="flex justify-between items-center text-[9px] font-mono font-bold">
                <span className="text-red-650 tracking-widest uppercase filter drop-shadow-[0_0_4px_rgba(185,28,28,0.4)]">DEAD BELL HP</span>
                <span className="text-[#a5a5a5] tracking-wider">{health} / {maxHealth} HP</span>
              </div>
              <div className="bg-black/60 border border-neutral-850 h-1.5 rounded-sm overflow-hidden flex shadow-inner">
                <div 
                  className={`h-full transition-all duration-200 ${
                    healthPercent > 40 
                      ? 'bg-red-700 shadow-[0_0_6px_rgba(220,38,38,0.85)]' 
                      : 'bg-red-650 animate-pulse'
                  }`}
                  style={{ width: `${healthPercent}%` }}
                />
              </div>
            </div>

            {/* Passive perk/armament badges decor */}
            <div className="flex gap-1.5 mt-1">
              <div className="w-6 h-6 rounded-full border border-neutral-800 bg-[#070707] flex items-center justify-center grayscale opacity-50">
                <span className="text-[7px] font-mono text-white text-center font-bold">HP</span>
              </div>
              <div className="w-6 h-6 rounded-full border border-neutral-800 bg-[#070707] flex items-center justify-center grayscale opacity-50">
                <div className="w-1 h-3 bg-red-600 shadow-[0_0_2px_red] rounded-t-sm"></div>
              </div>
              <div className="w-6 h-6 rounded-full border border-neutral-800 bg-[#070707] flex items-center justify-center grayscale opacity-50">
                <div className="w-2.5 h-2.5 border-2 border-green-500 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* HUD: Bottom Right (Clean Black Ops Style Active Weapon info) */}
          <div className="absolute bottom-8 right-8 md:bottom-10 md:right-10 text-right z-40 select-none pointer-events-none">
            <div className="text-neutral-400 text-[11px] md:text-xs font-black uppercase tracking-[0.25em] mb-1.5 font-mono drop-shadow-[0_0_4px_rgba(255,255,255,0.15)]">
              {activeWeaponId === 'pistol' ? 'M1911 PISTOL' : 'M1014 PUMP-ACTION'}
            </div>
            
            <div className="flex items-baseline justify-end select-text gap-2">
              <div className={`text-4xl md:text-5xl font-mono font-black tracking-tighter ${isReloading ? 'text-red-500 animate-pulse text-2xl' : 'text-neutral-100'}`}>
                {isReloading ? 'RELOADING' : String(ammoClip)}
              </div>
              {!isReloading && (
                <React.Fragment>
                  <span className="text-xl md:text-2xl text-neutral-650 font-mono font-light select-none">/</span>
                  <div className="text-2xl md:text-3xl font-mono font-bold text-neutral-400">
                    {ammoReserve}
                  </div>
                </React.Fragment>
              )}
            </div>

            {/* Clean segment bar bullets indicator */}
            {!isReloading && (
              <div className="mt-2.5 flex justify-end gap-1">
                {Array.from({ length: activeWeaponId === 'pistol' ? 12 : 6 }).map((_, idx) => {
                  const isActive = idx < ammoClip;
                  return (
                    <div 
                      key={idx} 
                      className={`w-1 h-3 transition-all duration-150 rounded-sm ${
                        isActive 
                          ? 'bg-neutral-100 shadow-[0_0_2px_rgba(255,255,255,0.7)]' 
                          : 'bg-neutral-800'
                      }`} 
                    />
                  );
                })}
              </div>
            )}
          </div>
        </React.Fragment>
      )}

    </div>
  );
};
