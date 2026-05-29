import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { sound } from '../sound';
import { Zombie, Barricade, WallBuy, BuyableDoor } from '../types';

interface GameCanvasProps {
  gameState: 'menu' | 'playing' | 'gameover' | 'paused' | 'loading';
  setGameState: React.Dispatch<React.SetStateAction<'menu' | 'playing' | 'gameover' | 'paused' | 'loading'>>;
  health: number;
  setHealth: React.Dispatch<React.SetStateAction<number>>;
  points: number;
  setPoints: React.Dispatch<React.SetStateAction<number>>;
  kills: number;
  setKills: React.Dispatch<React.SetStateAction<number>>;
  currentRound: number;
  setCurrentRound: React.Dispatch<React.SetStateAction<number>>;
  activeWeaponId: 'pistol' | 'shotgun';
  setActiveWeaponId: React.Dispatch<React.SetStateAction<'pistol' | 'shotgun'>>;
  ammoClip: number;
  setAmmoClip: React.Dispatch<React.SetStateAction<number>>;
  ammoReserve: number;
  setAmmoReserve: React.Dispatch<React.SetStateAction<number>>;
  isADS: boolean;
  setIsADS: React.Dispatch<React.SetStateAction<boolean>>;
  isReloading: boolean;
  setIsReloading: React.Dispatch<React.SetStateAction<boolean>>;
  setHitmarker: React.Dispatch<React.SetStateAction<'hit' | 'kill' | null>>;
  setInteractMessage: React.Dispatch<React.SetStateAction<string | null>>;
  addScorePopup: (amount: number, text: string) => void;
  setShowWaveBanner: React.Dispatch<React.SetStateAction<boolean>>;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  setGameState,
  health,
  setHealth,
  points,
  setPoints,
  kills,
  setKills,
  currentRound,
  setCurrentRound,
  activeWeaponId,
  setActiveWeaponId,
  ammoClip,
  setAmmoClip,
  ammoReserve,
  setAmmoReserve,
  isADS,
  setIsADS,
  isReloading,
  setIsReloading,
  setHitmarker,
  setInteractMessage,
  addScorePopup,
  setShowWaveBanner,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Inventory and Owned Weapons States
  const weaponsOwnedRef = useRef<string[]>(['pistol']);
  const weaponAmmoRef = useRef({
    pistol: { clip: 12, reserve: 60, maxClip: 12, maxReserve: 120 },
    shotgun: { clip: 0, reserve: 0, maxClip: 6, maxReserve: 48 },
  });
  
  // Refs to share reactive state with the Three.js render loop without overhead
  const stateRef = useRef({
    gameState,
    health,
    points,
    kills,
    currentRound,
    activeWeaponId,
    ammoClip,
    ammoReserve,
    isADS,
    isReloading,
    mouseSensitivity: 0.002,
    fov: 75,
    crosshairColor: '#22c55e',
    damageNumbers: true,
  });

  // Sync state changes into ref for rendering threads
  useEffect(() => {
    stateRef.current.gameState = gameState;
    stateRef.current.health = health;
    stateRef.current.points = points;
    stateRef.current.kills = kills;
    stateRef.current.currentRound = currentRound;
    stateRef.current.activeWeaponId = activeWeaponId;
    stateRef.current.ammoClip = ammoClip;
    stateRef.current.ammoReserve = ammoReserve;
    stateRef.current.isADS = isADS;
    stateRef.current.isReloading = isReloading;
  }, [gameState, health, points, kills, currentRound, activeWeaponId, ammoClip, ammoReserve, isADS, isReloading]);

  useEffect(() => {
    // Listen for settings changes via modern custom events
    const handleSettingsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const data = customEvent.detail;
      if (data) {
        if (data.controls?.sensitivity) {
          stateRef.current.mouseSensitivity = (data.controls.sensitivity / 10000) * 0.6;
        }
        if (data.graphics?.fov) {
          stateRef.current.fov = data.graphics.fov;
        }
        if (data.gameplay) {
          stateRef.current.crosshairColor = data.gameplay.crosshairColor ?? '#22c55e';
          stateRef.current.damageNumbers = data.gameplay.damageNumbers !== false;
        }
      }
    };

    window.addEventListener('settings-update', handleSettingsUpdate);
    
    // Read initial settings from localStorage if available
    const initial = localStorage.getItem('codz_settings');
    if (initial) {
      try {
        const parsed = JSON.parse(initial);
        if (parsed.controls?.sensitivity) {
          stateRef.current.mouseSensitivity = (parsed.controls.sensitivity / 10000) * 0.6;
        }
        if (parsed.graphics?.fov) {
          stateRef.current.fov = parsed.graphics.fov;
        }
        if (parsed.gameplay) {
          stateRef.current.crosshairColor = parsed.gameplay.crosshairColor ?? '#22c55e';
          stateRef.current.damageNumbers = parsed.gameplay.damageNumbers !== false;
        }
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('settings-update', handleSettingsUpdate);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- SETUP THREEJS VIEWPORT ---
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0f11);
    // Dark moody volumetric classroom fog
    scene.fog = new THREE.FogExp2(0x090a0c, 0.026);

    const camera = new THREE.PerspectiveCamera(stateRef.current.fov, width / height, 0.1, 150);
    const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: false });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Clear initial container children
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // --- PROCEDURAL TEXTURES ---
    const generateNoiseTexture = (r: number, g: number, b: number) => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      
      // Base color
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(0, 0, size, size);
      
      // Noise overlay
      for (let i = 0; i < 20000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const alpha = Math.random() * 0.15;
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
      
      // Cracks and grunge
      ctx.strokeStyle = `rgba(30, 24, 20, 0.25)`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        let sx = Math.random() * size;
        let sy = Math.random() * size;
        ctx.moveTo(sx, sy);
        for (let j = 0; j < 4; j++) {
          sx += (Math.random() - 0.5) * 60;
          sy += (Math.random() - 0.5) * 60;
          ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return texture;
    };

    const generateWoodTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      
      // Wood base brown
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(0, 0, 256, 256);
      
      // Fiber lines
      ctx.strokeStyle = '#5c3a1a';
      ctx.lineWidth = 2;
      for (let i = 0; i < 256; i += 6) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.bezierCurveTo(80, i + Math.sin(i)*15, 170, i - Math.cos(i)*15, 256, i);
        ctx.stroke();
      }
      return new THREE.CanvasTexture(canvas);
    };

    const wallTex = generateNoiseTexture(88, 92, 94);
    wallTex.repeat.set(4, 2);
    const floorTex = generateNoiseTexture(45, 48, 50);
    floorTex.repeat.set(6, 6);
    const woodTex = generateWoodTexture();

    // --- MATERIALS ---
    const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95, metalness: 0.05 });
    const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8, metalness: 0.1 });
    const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.9 });
    const woodMaterial = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 });
    const blackMetalMaterial = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.5, metalness: 0.8 });
    const chalkboardMaterial = new THREE.MeshStandardMaterial({ color: 0x133c1d, roughness: 0.9 }); // School dark green boards
    const emissionGreen = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const bloodSplashMat = new THREE.MeshBasicMaterial({ color: 0x991b1b, transparent: true, opacity: 0.85 });

    // --- MAP BUILDING BLOCK COORDINATES ---
    const CLASSROOM_W = 28;
    const CLASSROOM_D = 24;
    const WALL_H = 4.5;
    
    // Connected Hallway dimensions
    const HALLWAY_W = 32;
    const HALLWAY_D = 10;
    const HALLWAY_X_CENTER = 30; // Hallway sits past the buyable door

    // Lights group list to trigger flicker
    const halogenLights: { mesh: THREE.Mesh; light: THREE.PointLight; basePower: number }[] = [];

    // --- STATIC MAP CONSTRUCTION ---
    // 1. Classroom Floor
    const classroomFloorMesh = new THREE.Mesh(new THREE.PlaneGeometry(CLASSROOM_W, CLASSROOM_D), floorMaterial);
    classroomFloorMesh.rotation.x = -Math.PI / 2;
    classroomFloorMesh.receiveShadow = true;
    scene.add(classroomFloorMesh);

    // 2. Classroom Ceiling
    const classroomCeilingMesh = new THREE.Mesh(new THREE.PlaneGeometry(CLASSROOM_W, CLASSROOM_D), ceilingMaterial);
    classroomCeilingMesh.rotation.x = Math.PI / 2;
    classroomCeilingMesh.position.y = WALL_H;
    scene.add(classroomCeilingMesh);

    // Classroom Walls: North Wall (facing hallway/split)
    // The doorway will sit centered on the East Wall (x = +14)

    // West Wall
    const westWallMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, WALL_H, CLASSROOM_D), wallMaterial);
    westWallMesh.position.set(-CLASSROOM_W/2, WALL_H/2, 0);
    westWallMesh.receiveShadow = true;
    westWallMesh.castShadow = true;
    scene.add(westWallMesh);

    // East Wall Split (To connect doorway to Hallway at z = 0, size of door is 4 units)
    let doorZSize = 4;
    const eastWallNorth = new THREE.Mesh(new THREE.BoxGeometry(0.5, WALL_H, (CLASSROOM_D - doorZSize) / 2), wallMaterial);
    eastWallNorth.position.set(CLASSROOM_W/2, WALL_H/2, -(CLASSROOM_D + doorZSize) / 4);
    eastWallNorth.receiveShadow = true;
    eastWallNorth.castShadow = true;
    scene.add(eastWallNorth);

    const eastWallSouth = new THREE.Mesh(new THREE.BoxGeometry(0.5, WALL_H, (CLASSROOM_D - doorZSize) / 2), wallMaterial);
    eastWallSouth.position.set(CLASSROOM_W/2, WALL_H/2, (CLASSROOM_D + doorZSize) / 4);
    eastWallSouth.receiveShadow = true;
    eastWallSouth.castShadow = true;
    scene.add(eastWallSouth);

    // North Wall
    const northWallMesh = new THREE.Mesh(new THREE.BoxGeometry(CLASSROOM_W, WALL_H, 0.5), wallMaterial);
    northWallMesh.position.set(0, WALL_H/2, -CLASSROOM_D/2);
    northWallMesh.receiveShadow = true;
    northWallMesh.castShadow = true;
    scene.add(northWallMesh);

    // South Wall
    const southWallMesh = new THREE.Mesh(new THREE.BoxGeometry(CLASSROOM_W, WALL_H, 0.5), wallMaterial);
    southWallMesh.position.set(0, WALL_H/2, CLASSROOM_D/2);
    southWallMesh.receiveShadow = true;
    southWallMesh.castShadow = true;
    scene.add(southWallMesh);

    // 3. Hallway Setup (Slightly shifted past the classroom wall)
    // Floor
    const hallwayFloorMesh = new THREE.Mesh(new THREE.PlaneGeometry(HALLWAY_W, HALLWAY_D), floorMaterial);
    hallwayFloorMesh.rotation.x = -Math.PI / 2;
    hallwayFloorMesh.position.set(HALLWAY_X_CENTER, 0, 0);
    hallwayFloorMesh.receiveShadow = true;
    scene.add(hallwayFloorMesh);

    // Ceiling
    const hallwayCeilingMesh = new THREE.Mesh(new THREE.PlaneGeometry(HALLWAY_W, HALLWAY_D), ceilingMaterial);
    hallwayCeilingMesh.rotation.x = Math.PI / 2;
    hallwayCeilingMesh.position.set(HALLWAY_X_CENTER, WALL_H, 0);
    scene.add(hallwayCeilingMesh);

    // Hallway East Wall (deep end)
    const hallwayEastWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, WALL_H, HALLWAY_D), wallMaterial);
    hallwayEastWall.position.set(HALLWAY_X_CENTER + HALLWAY_W/2, WALL_H/2, 0);
    hallwayEastWall.receiveShadow = true;
    scene.add(hallwayEastWall);

    // Hallway North Wall
    const hallwayNorthWall = new THREE.Mesh(new THREE.BoxGeometry(HALLWAY_W, WALL_H, 0.5), wallMaterial);
    hallwayNorthWall.position.set(HALLWAY_X_CENTER, WALL_H/2, -HALLWAY_D/2);
    hallwayNorthWall.receiveShadow = true;
    scene.add(hallwayNorthWall);

    // Hallway South Wall
    const hallwaySouthWall = new THREE.Mesh(new THREE.BoxGeometry(HALLWAY_W, WALL_H, 0.5), wallMaterial);
    hallwaySouthWall.position.set(HALLWAY_X_CENTER, WALL_H/2, HALLWAY_D/2);
    hallwaySouthWall.receiveShadow = true;
    scene.add(hallwaySouthWall);

    // --- PROPS CREATION ---
    // Chalkboard on the North Wall of Classroom
    const cbFrame = new THREE.Mesh(new THREE.BoxGeometry(12, 2.2, 0.15), blackMetalMaterial);
    cbFrame.position.set(0, 2.1, -CLASSROOM_D/2 + 0.12);
    scene.add(cbFrame);
    
    const cbPanel = new THREE.Mesh(new THREE.BoxGeometry(11.6, 1.9, 0.05), chalkboardMaterial);
    cbPanel.position.set(0, 2.1, -CLASSROOM_D/2 + 0.2);
    cbPanel.receiveShadow = true;
    scene.add(cbPanel);

    // Teacher Desk
    const teacherDeskGroup = new THREE.Group();
    const deskTopMat = woodMaterial;
    const tdTop = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.1, 1.6), deskTopMat);
    tdTop.position.y = 0.95;
    tdTop.castShadow = true;
    teacherDeskGroup.add(tdTop);

    const tdBody = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.9, 1.3), blackMetalMaterial);
    tdBody.position.y = 0.45;
    tdBody.castShadow = true;
    teacherDeskGroup.add(tdBody);

    // Add laptop on teacher desk
    const laptopGroup = new THREE.Group();
    const lBase = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.28), blackMetalMaterial);
    lBase.position.y = 1.01;
    laptopGroup.add(lBase);
    const lScreen = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.02), blackMetalMaterial);
    lScreen.position.set(0, 1.15, -0.13);
    lScreen.rotation.x = -0.28;
    laptopGroup.add(lScreen);
    const emissionS = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.24), new THREE.MeshBasicMaterial({ color: 0x22d3ee, side: THREE.DoubleSide }));
    emissionS.position.set(0, 1.15, -0.115);
    emissionS.rotation.x = -0.28;
    laptopGroup.add(emissionS);
    laptopGroup.position.set(-0.6, 0, 0);
    teacherDeskGroup.add(laptopGroup);

    teacherDeskGroup.position.set(0, 0, -CLASSROOM_D/2 + 4.5);
    scene.add(teacherDeskGroup);

    // Classroom lighting fixtures (Procedural Fluorescent boxes)
    const addHalogenBox = (x: number, y: number, z: number, colorHex: number = 0xf0f5ff, powerValue: number = 3.2) => {
      const g = new THREE.Group();
      const casing = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.15, 0.4), blackMetalMaterial);
      casing.position.set(x, y - 0.075, z);
      g.add(casing);
      
      const glass = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.05, 0.3), new THREE.MeshBasicMaterial({ color: colorHex }));
      glass.position.set(x, y - 0.15, z);
      g.add(glass);

      // Brighter light with larger spread radius (22 units) to illuminate classrooms properly
      const light = new THREE.PointLight(colorHex, powerValue, 25);
      light.position.set(x, y - 0.3, z);
      light.castShadow = true;
      light.shadow.bias = -0.0015;
      light.shadow.mapSize.width = 512;
      light.shadow.mapSize.height = 512;
      scene.add(light);

      halogenLights.push({ mesh: glass, light, basePower: powerValue });
      scene.add(g);
    };

    // Place lights in classroom with high visibility white emission
    addHalogenBox(-7, WALL_H, -6, 0xfff3e2, 3.4); // Brighter cozy warm fluorescent
    addHalogenBox(7, WALL_H, -6, 0xfff3e2, 3.4);
    addHalogenBox(-7, WALL_H, 6, 0xfff3e2, 3.4);
    addHalogenBox(7, WALL_H, 6, 0xfff3e2, 3.4);

    // Hallway fluorescent box with distinctive emergency light tones
    addHalogenBox(23, WALL_H, 0, 0xff3a1a, 3.8); // Creepy red hallway indicator
    addHalogenBox(37, WALL_H, 0, 0x1da1f2, 3.2); // Cyan emergency end light

    // Persistent warm ambient light to prevent pitch blackness and make details clearly legible
    const ambientLight = new THREE.AmbientLight(0xfff0e4, 0.28);
    scene.add(ambientLight);

    // Spooky ambient moonbeam pouring from window barricades pointing inside the room
    const addWindowMoonlight = (x: number, y: number, z: number, targetX: number, targetZ: number) => {
      const spotLight = new THREE.SpotLight(0x55aaee, 5.0, 24, Math.PI / 4, 0.4, 0.6);
      spotLight.position.set(x, y + 2.0, z);
      const targetObj = new THREE.Object3D();
      targetObj.position.set(targetX, 0, targetZ);
      scene.add(targetObj);
      spotLight.target = targetObj;
      spotLight.castShadow = true;
      spotLight.shadow.bias = -0.0015;
      spotLight.shadow.mapSize.width = 512;
      spotLight.shadow.mapSize.height = 512;
      scene.add(spotLight);
    };

    // Moonlight cones flowing through windows for aesthetic CoD Zombies style rays of light
    addWindowMoonlight(-10, WALL_H/2, -CLASSROOM_D/2 + 0.1, -6, -4);
    addWindowMoonlight(10, WALL_H/2, -CLASSROOM_D/2 + 0.1, 6, -4);
    addWindowMoonlight(-10, WALL_H/2, CLASSROOM_D/2 - 0.1, -6, 4);
    addWindowMoonlight(10, WALL_H/2, CLASSROOM_D/2 - 0.1, 6, 4);

    // Ambient mood lighting (creepy green/cyan/dark tones)
    const subLight = new THREE.DirectionalLight(0x334466, 0.7);
    subLight.position.set(5, 10, -5);
    scene.add(subLight);

    // Student Desks Grid (Multiple rows of student desks and chairs)
    const deskRows = 3;
    const deskCols = 4;
    const xSpacing = 4.5;
    const zSpacing = 4.2;
    const leftStart = -((deskCols - 1) * xSpacing) / 2;
    const frontStart = -1.2;

    const classroomObstacles: THREE.Box3[] = [];

    const createStudentDesk = (posX: number, posZ: number, isTipped: boolean = false) => {
      const g = new THREE.Group();
      
      // Desk slab
      const topMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.9), woodMaterial);
      topMesh.position.y = 0.72;
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      g.add(topMesh);

      // Steel frame
      const frameY = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.7), blackMetalMaterial);
      frameY.position.y = 0.63;
      frameY.castShadow = true;
      g.add(frameY);

      // Legs
      const legGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.68, 6);
      const legL1 = new THREE.Mesh(legGeom, blackMetalMaterial);
      legL1.position.set(-0.68, 0.34, -0.36);
      legL1.castShadow = true;
      g.add(legL1);

      const legR1 = legL1.clone();
      legR1.position.set(0.68, 0.34, -0.36);
      g.add(legR1);

      const legL2 = legL1.clone();
      legL2.position.set(-0.68, 0.34, 0.36);
      g.add(legL2);

      const legR2 = legL1.clone();
      legR2.position.set(0.68, 0.34, 0.36);
      g.add(legR2);

      // Simple Chair
      const chairGroup = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.7), woodMaterial);
      seat.position.y = 0.42;
      seat.castShadow = true;
      chairGroup.add(seat);

      const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.05), woodMaterial);
      chairBack.position.set(0, 0.68, -0.32);
      chairBack.castShadow = true;
      chairGroup.add(chairBack);

      const frameBack = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), blackMetalMaterial);
      frameBack.position.set(-0.32, 0.375, -0.32);
      frameBack.castShadow = true;
      chairGroup.add(frameBack);

      const frameBackR = frameBack.clone();
      frameBackR.position.x = 0.32;
      chairGroup.add(frameBackR);

      chairGroup.position.set(0, 0, 0.85);
      g.add(chairGroup);

      if (isTipped) {
        g.rotation.z = Math.PI / 2.3;
        g.rotation.x = 0.3;
        g.position.set(posX, 0.1, posZ);
      } else {
        g.position.set(posX, 0, posZ);
      }

      scene.add(g);

      // Register collision box representing individual desk units
      const dBox = new THREE.Box3().setFromObject(g);
      classroomObstacles.push(dBox);
    };

    // Instantiate desk grid
    for (let row = 0; row < deskRows; row++) {
      for (let col = 0; col < deskCols; col++) {
        const px = leftStart + col * xSpacing;
        const pz = frontStart + row * zSpacing;
        // Tip one random table over completely to enhance school outbreak horror design
        const tipTable = row === 1 && col === 1;
        createStudentDesk(px, pz, tipTable);
      }
    }

    // Add cluttered scattered papers on the floor
    const paperGeom = new THREE.PlaneGeometry(0.35, 0.25);
    const paperMat = new THREE.MeshBasicMaterial({ color: 0xdcdcdc, side: THREE.DoubleSide });
    for (let i = 0; i < 24; i++) {
      const pm = new THREE.Mesh(paperGeom, paperMat);
      // Random coordinates inside classroom limits
      pm.position.set(
        (Math.random() - 0.5) * (CLASSROOM_W - 4),
        0.01,
        (Math.random() - 0.5) * (CLASSROOM_D - 4)
      );
      pm.rotation.x = -Math.PI / 2;
      pm.rotation.z = Math.random() * Math.PI;
      scene.add(pm);
    }

    // --- HALLWAY LOCKERS ---
    // Creepy teal metallic lockers stretching along hallway north and south bounds
    const createLockerSet = (xPos: number, zPos: number, isNorth: boolean) => {
      const group = new THREE.Group();
      const width = 1.1;
      const height = 3.6;
      const depth = 0.95;

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({ color: 0x1f3c4d, roughness: 0.65, metalness: 0.4 })
      );
      base.position.y = height / 2;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);

      // Vent lines and door handles
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.4, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xcca43b, metalness: 0.9 })
      );
      handle.position.set(width / 2.5, height / 2, depth / 1.95);
      group.add(handle);

      group.position.set(xPos, 0, zPos);
      if (!isNorth) {
        group.rotation.y = Math.PI;
      }
      scene.add(group);
      
      const coll = new THREE.Box3().setFromObject(group);
      classroomObstacles.push(coll);
    };

    // Locker rows north and south
    for(let lx = HALLWAY_X_CENTER - 11; lx <= HALLWAY_X_CENTER + 11; lx += 2.4) {
      if (Math.abs(lx - 25) > 1.5) { // Leave space around buyable door output
        createLockerSet(lx, -HALLWAY_D/2 + 0.52, true);
        createLockerSet(lx + 0.6, HALLWAY_D/2 - 0.52, false);
      }
    }

    // --- WINDOWS WITH REPAIRABLE BARRICADES ---
    // Barricades prevent immediate zombie intrusion. Spawning walks to barricades. Destroying boards first.
    const barricadeDetails: Barricade[] = [];
    
    // --- PARTICLE / IMPACT SPRAY DETAILS POOL ---
    const particleList: { mesh: THREE.Mesh; vel: THREE.Vector3; age: number; maxAge: number }[] = [];
    const bulletTracers: { mesh: THREE.Line; age: number; maxAge: number }[] = [];

    // --- DEAD BELL CINEMATIC GROUND SPAWNERS ---
    const groundSpawners = [
      { x: -10.0, z: -8.0, label: 'Classroom NW' },
      { x: 10.0, z: -8.0, label: 'Classroom NE' },
      { x: -10.0, z: 8.0, label: 'Classroom SW' },
      { x: 10.0, z: 8.0, label: 'Classroom SE' },
      { x: -6.0, z: 1.0, label: 'Classroom West Side' },
      { x: 6.0, z: -1.0, label: 'Classroom East Side' },
      { x: 23.5, z: -4.0, label: 'Hallway North' },
      { x: 21.0, z: 4.0, label: 'Hallway South' }
    ];

    const triggerGravelEruption = (pos: THREE.Vector3) => {
      const pGeom = new THREE.BoxGeometry(0.06, 0.06, 0.06);
      const dirtMat = new THREE.MeshStandardMaterial({ color: 0x221a11, roughness: 0.95 }); // dark floor tile / soil debris
      for (let i = 0; i < 4; i++) {
        const p = new THREE.Mesh(pGeom, dirtMat);
        p.position.set(pos.x + (Math.random() - 0.5) * 1.2, 0.02, pos.z + (Math.random() - 0.5) * 1.2);
        scene.add(p);
        
        particleList.push({
          mesh: p,
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 1.5,
            Math.random() * 2.0 + 1.2,
            (Math.random() - 0.5) * 1.5
          ),
          age: 0,
          maxAge: 0.6 + Math.random() * 0.4
        });
      }
    };

    // Dynamic obstacle mapping from map structures
    // Add peripheral boundary bounds to avoid getting clipped outside classroom walls
    const mapBoundingLimits = {
      minX: -CLASSROOM_W / 2 + 0.65,
      maxX: CLASSROOM_W / 2 - 0.65,
      minZ: -CLASSROOM_D / 2 + 0.65,
      maxZ: CLASSROOM_D / 2 - 0.65,
      
      // Hallway bounding box
      hallMinX: 14.5,
      hallMaxX: HALLWAY_X_CENTER + HALLWAY_W/2 - 0.65,
      hallMinZ: -HALLWAY_D / 2 + 0.65,
      hallMaxZ: HALLWAY_D / 2 - 0.65,
    };

    // --- EXPONENTIAL SHOTGUN WALL BUY SETUP ---
    const addShotgunWallbuy = (): WallBuy => {
      const g = new THREE.Group();
      
      // Floating glowing label green
      const buySign = new THREE.Group();
      const wallSign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.45), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.8 }));
      buySign.add(wallSign);
      
      const frameBuy = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.5, 0.02), emissionGreen);
      frameBuy.position.z = -0.01;
      buySign.add(frameBuy);
      
      buySign.position.set(0, 0.4, 0);
      g.add(buySign);

      // Render actual shotgun model replica on wall
      const shotgunG = new THREE.Group();
      const barrels = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 5), blackMetalMaterial);
      barrels.rotation.x = Math.PI / 2;
      barrels.position.y = 0.05;
      shotgunG.add(barrels);
      
      const pumpHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.4, 8), woodMaterial);
      pumpHandle.rotation.x = Math.PI / 2;
      pumpHandle.position.set(0, 0.03, -0.1);
      shotgunG.add(pumpHandle);

      const woodenButt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.55), woodMaterial);
      woodenButt.position.set(0, -0.05, 0.45);
      woodenButt.rotation.x = -0.15;
      shotgunG.add(woodenButt);

      shotgunG.position.set(0, 0.0, 0.05);
      g.add(shotgunG);

      // Positioning wall buy on classroom West Wall
      const wallBuyX = -CLASSROOM_W / 2 + 0.35;
      const wallBuyY = 1.7;
      const wallBuyZ = -1.5;
      
      g.position.set(wallBuyX, wallBuyY, wallBuyZ);
      g.rotation.y = Math.PI / 2; // Face inwards
      scene.add(g);

      return {
        id: 'wall-shotgun',
        weaponId: 'shotgun',
        position: [wallBuyX, wallBuyY, wallBuyZ],
        rotationY: Math.PI / 2,
        price: 700,
        purchased: false,
        textMesh: g
      };
    };

    const shotgunWallBuy = addShotgunWallbuy();

    // --- SOLID BUYABLE DOOR OBSTACLE SYSTEM ---
    const buildBuyableDoor = (): BuyableDoor => {
      const g = new THREE.Group();

      // Double side swinging doors on classroom Exit Border (x = 14)
      const width = 0.25;
      const height = 3.6;
      const dLength = 4.0;

      const doorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, dLength),
        new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.8, metalness: 0.1 })
      );
      doorMesh.position.y = height / 2;
      doorMesh.castShadow = true;
      g.add(doorMesh);

      // Large glowing green floating text banner above buyable doors matching standard specs
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 128;
      const sc = signCanvas.getContext('2d')!;
      sc.fillStyle = 'rgba(0,0,0,0.85)';
      sc.fillRect(0,0,512,128);
      sc.strokeStyle = '#22c55e';
      sc.lineWidth = 6;
      sc.strokeRect(4,4,504,120);
      sc.fillStyle = '#22c55e';
      sc.font = 'bold 38px Courier New';
      sc.textAlign = 'center';
      sc.fillText('DOOR', 256, 45);
      sc.font = 'bold 28px Courier New';
      sc.fillText('Press E to Open [$1200]', 256, 95);

      const signTex = new THREE.CanvasTexture(signCanvas);
      const buySignOverlay = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, 0.75),
        new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide, transparent: true })
      );
      buySignOverlay.position.set(-0.25, 3.2, 0);
      buySignOverlay.rotation.y = -Math.PI / 2; // Facing the classroom player
      g.add(buySignOverlay);

      // Sits on classroom eastern doorway threshold
      const dX = CLASSROOM_W / 2;
      const dY = 0;
      const dZ = 0;

      g.position.set(dX, dY, dZ);
      scene.add(g);

      return {
        id: 'door-classroom-exit',
        price: 1200,
        position: [dX, dY, dZ],
        rotationY: 0,
        width,
        height,
        purchased: false,
        group: g,
        doorMesh,
        sinkOffset: 0
      };
    };

    const classroomExitDoor = buildBuyableDoor();

    // Register active door blocker collision
    let doorBlockerBox = new THREE.Box3().setFromObject(classroomExitDoor.doorMesh!);

    // --- ZOMBIES H Horde IMPLEMENTATION ---
    const activeZombiesList: Zombie[] = [];
    const zombieGroup = new THREE.Group();
    scene.add(zombieGroup);

    // Create zombie 3D meshes and configure starting coordinates
    const designZombieMesh = (colorHex: number): THREE.Group => {
      const g = new THREE.Group();
      
      const headG = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshStandardMaterial({ color: 0xcca483, roughness: 0.8 }));
      headG.position.y = 1.55;
      headG.castShadow = true;
      g.add(headG);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.3), new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.9 }));
      torso.position.y = 1.0;
      torso.castShadow = true;
      g.add(torso);

      // Glowing crimson zombie eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), eyeMat);
      eyeL.position.set(-0.1, 1.58, 0.175);
      g.add(eyeL);

      const eyeR = eyeL.clone();
      eyeR.position.x = 0.1;
      g.add(eyeR);

      // Attack arms
      const armMat = new THREE.MeshStandardMaterial({ color: 0xcca483, roughness: 0.8 });
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.14), armMat);
      armL.position.set(-0.35, 1.15, 0.25);
      armL.rotation.x = -Math.PI / 2.1; // Forward stretch zombie walk
      armL.castShadow = true;
      g.add(armL);

      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.14), armMat);
      armR.position.set(0.35, 1.15, 0.25);
      armR.rotation.x = -Math.PI / 1.95;
      armR.castShadow = true;
      g.add(armR);

      // Tattered school jeans
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.25), new THREE.MeshStandardMaterial({ color: 0x1d2c3d, roughness: 0.9 }));
      legs.position.y = 0.355;
      legs.castShadow = true;
      g.add(legs);

      return g;
    };

    const spawnSingleZombie = (spawnerIdx: number) => {
      const spawnPoint = groundSpawners[spawnerIdx];
      if (!spawnPoint) return;

      const colors = [0x5f3f3f, 0x485a48, 0x3d4352];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const zombieMesh = designZombieMesh(randomColor);

      // Start the zombie crawling out of the floor plane
      zombieMesh.position.set(spawnPoint.x, -1.8, spawnPoint.z);
      
      // Face towards the player
      const dirVector = new THREE.Vector3().subVectors(camera.position, zombieMesh.position).normalize();
      const angle = Math.atan2(dirVector.x, dirVector.z);
      zombieMesh.rotation.y = angle;

      zombieGroup.add(zombieMesh);

      // Configure health and scale dynamic properties
      const healthMult = 1.0 + (stateRef.current.currentRound - 1) * 0.45;
      const startHealth = Math.floor(100 * healthMult);
      const isRunner = stateRef.current.currentRound >= 3 && Math.random() < Math.min(0.15 * stateRef.current.currentRound, 0.7);
      
      const actualSpeed = isRunner 
        ? 2.15 + Math.random() * 0.4 
        : 1.1 + Math.random() * 0.35;

      const crawlStartOffset = Math.random() * Math.PI;

      activeZombiesList.push({
        id: `z-${Math.random().toString(36).substr(2, 9)}`,
        mesh: zombieMesh,
        health: startHealth,
        maxHealth: startHealth,
        speed: actualSpeed,
        damage: isRunner ? 12 : 20,
        scoreReward: 10,
        lastAttackTime: 0,
        state: 'spawning', // Rising through floor
        spawnerIndex: spawnerIdx,
        animTime: crawlStartOffset
      });
    };

    // Trigger next wave mechanics
    let roundTransitionActive = false;
    let roundKillsRemaining = 0;
    let zombiesLeftToSpawn = 0;
    let spawnTimer = 0;

    const startNextRoundWave = () => {
      if (roundTransitionActive) return;
      roundTransitionActive = true;
      
      // Display large wave transition overlay card plus atmospheric synth sound
      setShowWaveBanner(true);
      sound.playWaveStart();

      setTimeout(() => {
        setShowWaveBanner(false);
        roundTransitionActive = false;
        
        // Spawn sizing equation matching cod formulas
        const zCount = Math.floor(8 + stateRef.current.currentRound * 3.5);
        zombiesLeftToSpawn = zCount;
        roundKillsRemaining = zCount;
        spawnTimer = 0;
      }, 4000);
    };

    // Trigger initial round spawning setup
    startNextRoundWave();

    // --- BLOOD EXPLOSION SPLASH FX ---
    const triggerBloodExplosion = (pos: THREE.Vector3) => {
      const pGeom = new THREE.BoxGeometry(0.04, 0.04, 0.04);
      for (let i = 0; i < 8; i++) {
        const p = new THREE.Mesh(pGeom, bloodSplashMat);
        p.position.copy(pos);
        scene.add(p);
        
        particleList.push({
          mesh: p,
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 2.5,
            Math.random() * 3.0 + 1.0,
            (Math.random() - 0.5) * 2.5
          ),
          age: 0,
          maxAge: 0.5 + Math.random() * 0.4
        });
      }
    };

    const triggerBulletTracer = (start: THREE.Vector3, end: THREE.Vector3) => {
      const material = new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2, transparent: true, opacity: 0.85 });
      const pointsList = [start.clone(), end.clone()];
      const geom = new THREE.BufferGeometry().setFromPoints(pointsList);
      const line = new THREE.Line(geom, material);
      scene.add(line);
      bulletTracers.push({
        mesh: line,
        age: 0,
        maxAge: 0.08
      });
    };

    // Dynamic 3D Floating Combat Damage Numbers Above Zombies (Arcade classic styling)
    const floatingDmgNumbers: { element: HTMLSpanElement; pos: THREE.Vector3; age: number; maxAge: number }[] = [];

    const createFloatingDamageNumber = (pos: THREE.Vector3, amount: number) => {
      if (!stateRef.current.damageNumbers) return;
      const el = document.createElement('span');
      el.className = 'absolute font-black text-xs md:text-sm font-mono pointer-events-none select-none z-30 transition-all duration-300 transform -translate-x-1/2 text-red-500 text-shadow-[0_1px_5px_rgba(0,0,0,0.9)]';
      el.textContent = `-${amount}`;
      document.body.appendChild(el);
      
      floatingDmgNumbers.push({
        element: el,
        pos: pos.clone(),
        age: 0,
        maxAge: 0.75
      });
    };

    // --- PLAYER STATS / CHARACTER RIGID ENGINE ---
    const pVelocity = new THREE.Vector3();
    const pDirection = new THREE.Vector3();
    const posOffsetAdjust = new THREE.Vector3();

    // Spawn coordinate centered in classroom
    camera.position.set(0, 1.65, 2.5);

    let lastInteractionPulse = 0;

    let pYaw = 0;
    let pPitch = 0;
    const recoilOffset = { x: 0, y: 0 };
    const maxRecoilOffset = { x: 0, y: 0 };

    // --- CONTROLLER BINDINGS ---
    const keysMap: Record<string, boolean> = {};

    const handlePointerLock = () => {
      if (stateRef.current.gameState === 'playing') {
        containerRef.current?.requestPointerLock();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== containerRef.current) return;
      if (stateRef.current.gameState !== 'playing') return;

      const sensMult = stateRef.current.isADS ? 0.45 : 1.0;
      const lookDeltaX = e.movementX * stateRef.current.mouseSensitivity * sensMult;
      const lookDeltaY = e.movementY * stateRef.current.mouseSensitivity * sensMult;

      pYaw -= lookDeltaX;
      pPitch -= lookDeltaY;
      pPitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pPitch));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keysMap[e.code] = true;

      if (e.code === 'KeyR' && !stateRef.current.isReloading) {
        // Trigger manual weapon reload mechanism
        triggerWeaponReload();
      }

      if (e.code === 'KeyE' && stateRef.current.gameState === 'playing') {
        processInteractEvent();
      }

      // Quick hotkeys weapon swap matching standard console stats
      if (e.code === 'Digit1' && stateRef.current.activeWeaponId !== 'pistol') {
        swapWeapon('pistol');
      }
      if (e.code === 'Digit2' && stateRef.current.activeWeaponId !== 'shotgun') {
        swapWeapon('shotgun');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysMap[e.code] = false;
    };

    // --- FIREWEAPON LOGIC ---
    let fireCooldownLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== containerRef.current) return;
      if (stateRef.current.gameState !== 'playing') return;

      if (e.button === 0) {
        // LEFT CLICK: Shoot Weapon
        triggerShootWeapon();
      }
      if (e.button === 2) {
        // RIGHT CLICK: Aim Down Sights
        setIsADS(true);
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        setIsADS(false);
      }
    };

    const triggerShootWeapon = () => {
      if (fireCooldownLeft > 0 || stateRef.current.isReloading) return;
      if (stateRef.current.ammoClip <= 0) {
        sound.playReloadClick(0.3); // trigger dry fire click
        return;
      }

      const id = stateRef.current.activeWeaponId;
      setAmmoClip(prev => {
        const next = Math.max(0, prev - 1);
        stateRef.current.ammoClip = next;
        weaponAmmoRef.current[id].clip = next;
        return next;
      });

      // SFX
      if (id === 'pistol') {
        sound.playPistol();
        fireCooldownLeft = 0.25; // 250ms fire rate
        // Add random slight look recoil kickback
        maxRecoilOffset.y += 0.035;
        maxRecoilOffset.x += (Math.random() - 0.5) * 0.02;
      } else {
        sound.playShotgun();
        fireCooldownLeft = 0.85; // 850ms fire rate
        maxRecoilOffset.y += 0.088;
        maxRecoilOffset.x += (Math.random() - 0.5) * 0.04;
      }

      // --- FX OVERLAYS ---
      // 1. Muzzle flash 3D cylinder
      const flashGeo = new THREE.CylinderGeometry(0.01, 0.08, 0.22, 6);
      flashGeo.rotateX(Math.PI / 2);
      const flash = new THREE.Mesh(flashGeo, new THREE.MeshBasicMaterial({ color: 0xffe285, transparent: true, opacity: 0.9 }));
      flash.position.set(0.12, -0.11, -0.44);
      camera.add(flash);
      setTimeout(() => camera.remove(flash), 50);

      // 2. Perform Raycasting hit tests
      const raycaster = new THREE.Raycaster();
      const numPellets = id === 'shotgun' ? 7 : 1;
      const spreadParam = stateRef.current.isADS ? 0.015 : (id === 'shotgun' ? 0.065 : 0.022);

      for (let i = 0; i < numPellets; i++) {
        const targetDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        // Apply slight inaccurate spread deviation
        if (i > 0 || id === 'shotgun') {
          targetDir.x += (Math.random() - 0.5) * spreadParam;
          targetDir.y += (Math.random() - 0.5) * spreadParam;
          targetDir.z += (Math.random() - 0.5) * spreadParam;
          targetDir.normalize();
        }

        raycaster.set(camera.position, targetDir);

        // Check objects hits in zombie groups
        const possibleGroupHits = raycaster.intersectObjects(zombieGroup.children, true);
        if (possibleGroupHits.length > 0) {
          const hit = possibleGroupHits[0];
          let parentMesh: THREE.Object3D | null = hit.object;
          
          // Climb up hierarchy to find master Zombie Group Object3D
          while (parentMesh && parentMesh.parent && parentMesh.parent !== zombieGroup) {
            parentMesh = parentMesh.parent;
          }

          if (parentMesh) {
            const zId = parentMesh.uuid;
            const targetZ = activeZombiesList.find(z => z.mesh.uuid === zId);
            
            if (targetZ && targetZ.health > 0) {
              const baseDmg = id === 'pistol' ? 24 : 18; // Shotgun deals pellet damage
              targetZ.health -= baseDmg;

              // Register points and play impact sounds
              triggerZombieHit(targetZ, baseDmg, hit.point);
            }
          }
        } else {
          // Trigger default wall spark tracer line endpoint
          const tracerDest = camera.position.clone().add(targetDir.multiplyScalar(22));
          triggerBulletTracer(camera.position.clone().add(new THREE.Vector3(0.12, -0.15, -0.45).applyQuaternion(camera.quaternion)), tracerDest);
        }
      }
    };

    const triggerZombieHit = (z: Zombie, val: number, point: THREE.Vector3) => {
      sound.playHitmarker();
      setHitmarker('hit');
      setTimeout(() => setHitmarker(null), 100);

      triggerBloodExplosion(point);
      createFloatingDamageNumber(point, val);
      triggerBulletTracer(camera.position.clone().add(new THREE.Vector3(0.12, -0.15, -0.45).applyQuaternion(camera.quaternion)), point);

      // Score points additions
      setPoints(prev => {
        const next = prev + 10;
        stateRef.current.points = next;
        return next;
      });
      addScorePopup(10, `+10 PTS`);

      if (z.health <= 0) {
        // Dispatched zombie! Add kill bonus
        setPoints(prev => {
          const next = prev + 60;
          stateRef.current.points = next;
          return next;
        });
        addScorePopup(60, `+60 DISPATCH`);
        setKills(prev => {
          const next = prev + 1;
          stateRef.current.kills = next;
          return next;
        });

        // Kill Animation
        zombieGroup.remove(z.mesh);
        activeZombiesList.splice(activeZombiesList.indexOf(z), 1);
        roundKillsRemaining = Math.max(0, roundKillsRemaining - 1);

        // Play zombie collapse death sfx
        sound.playHitImpact();

        // Check if wave is cleared
        if (roundKillsRemaining <= 0 && zombiesLeftToSpawn <= 0) {
          stateRef.current.currentRound++;
          setCurrentRound(stateRef.current.currentRound);
          startNextRoundWave();
        }
      }
    };

    const triggerWeaponReload = () => {
      const id = stateRef.current.activeWeaponId;
      const maxClip = id === 'pistol' ? 12 : 6;
      if (stateRef.current.ammoClip === maxClip || stateRef.current.ammoReserve <= 0) return;

      setIsReloading(true);
      sound.playReloadClick(0.85);

      setTimeout(() => {
        const needed = maxClip - stateRef.current.ammoClip;
        const insert = Math.min(needed, stateRef.current.ammoReserve);
        
        const newClip = stateRef.current.ammoClip + insert;
        const newReserve = stateRef.current.ammoReserve - insert;

        setAmmoClip(newClip);
        stateRef.current.ammoClip = newClip;

        setAmmoReserve(newReserve);
        stateRef.current.ammoReserve = newReserve;

        // Persist back to inventory IMMEDIATELY!
        weaponAmmoRef.current[id].clip = newClip;
        weaponAmmoRef.current[id].reserve = newReserve;

        setIsReloading(false);
        sound.playReloadClick(1.2);
      }, id === 'pistol' ? 1500 : 2200);
    };

    const swapWeapon = (target: 'pistol' | 'shotgun') => {
      if (stateRef.current.isReloading) return;
      
      // Prevent players from switching to weapons they do not own!
      if (!weaponsOwnedRef.current.includes(target)) {
        return;
      }

      // Save current weapon's ammo state before switching!
      const current = stateRef.current.activeWeaponId;
      weaponAmmoRef.current[current].clip = stateRef.current.ammoClip;
      weaponAmmoRef.current[current].reserve = stateRef.current.ammoReserve;

      // Switch active weapon
      setActiveWeaponId(target);
      stateRef.current.activeWeaponId = target;
      
      // Load target weapon's ammo state!
      const targetAmmo = weaponAmmoRef.current[target];
      setAmmoClip(targetAmmo.clip);
      stateRef.current.ammoClip = targetAmmo.clip;
      setAmmoReserve(targetAmmo.reserve);
      stateRef.current.ammoReserve = targetAmmo.reserve;
      
      // Trigger visual model switch
      updateActiveGunModel(target);

      sound.playReloadClick(0.7);
    };

    // --- INTERACT PROMPT SENSORS & TRIGGER LOGIC ---
    const processInteractEvent = () => {
      // 1. Barricade repairing is completely removed!

      // 2. Buy shotgun wall buy or refill ammo
      const distanceToWallbuy = camera.position.distanceTo(new THREE.Vector3(...shotgunWallBuy.position));
      if (distanceToWallbuy <= 2.45) {
        // If they already own the shotgun, Wall Buy REFILLS shotgun reserve ammo for $350 instead of buying it again
        if (weaponsOwnedRef.current.includes('shotgun')) {
          const refillPrice = 350;
          if (stateRef.current.points >= refillPrice) {
            setPoints(p => {
              const next = p - refillPrice;
              stateRef.current.points = next;
              return next;
            });
            addScorePopup(-refillPrice, `-$350 AMMO REFILL`);
            
            // Set max reserve
            const targetAmmo = weaponAmmoRef.current['shotgun'];
            const maxReserve = targetAmmo.maxReserve;
            
            targetAmmo.reserve = maxReserve;
            if (stateRef.current.activeWeaponId === 'shotgun') {
              setAmmoReserve(maxReserve);
              stateRef.current.ammoReserve = maxReserve;
            }
            sound.playBuy();
          } else {
            sound.playReloadClick(0.35); // reject beep
          }
        } else {
          // Buying shotgun for the first time
          if (stateRef.current.points >= shotgunWallBuy.price) {
            setPoints(p => {
              const next = p - shotgunWallBuy.price;
              stateRef.current.points = next;
              return next;
            });
            addScorePopup(-shotgunWallBuy.price, `-$700 SHOTGUN`);
            shotgunWallBuy.purchased = true;
            weaponsOwnedRef.current.push('shotgun'); // Add to inventory OWNED!
            
            // Initialize shotgun ammo state inside persistent ref
            weaponAmmoRef.current.shotgun.clip = 6;
            weaponAmmoRef.current.shotgun.reserve = 24;

            sound.playBuy();
            swapWeapon('shotgun');
          } else {
            sound.playReloadClick(0.35); // reject beep
          }
        }
        return;
      }

      // 3. Purchase buyable door to access hallway
      const distanceToDoor = camera.position.distanceTo(new THREE.Vector3(...classroomExitDoor.position));
      if (distanceToDoor <= 3.2 && !classroomExitDoor.purchased) {
        if (stateRef.current.points >= classroomExitDoor.price) {
          setPoints(p => {
            const next = p - classroomExitDoor.price;
            stateRef.current.points = next;
            return next;
          });
          addScorePopup(-classroomExitDoor.price, `-$1200 HALLWAY UNLOCKED`);
          classroomExitDoor.purchased = true;
          sound.playBuy();
          
          // Smoothly remove the door barrier
          // Door Group is removed from collision bounds below
          classroomExitDoor.sinkOffset = 0.01;
        } else {
          sound.playReloadClick(0.35);
        }
      }
    };

    // Listen on container interactions
    containerRef.current.addEventListener('click', handlePointerLock);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    // Dynamic weapon positioning sway inside camera frame
    const activeGunModel = new THREE.Group();

    // Function to dynamically design and replace the weapon model in the group
    const updateActiveGunModel = (weaponId: 'pistol' | 'shotgun') => {
      // Clear out previous meshes securely
      while (activeGunModel.children.length > 0) {
        activeGunModel.remove(activeGunModel.children[0]);
      }

      if (weaponId === 'pistol') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.28), blackMetalMaterial);
        body.position.set(0.12, -0.15, -0.45);
        activeGunModel.add(body);
        
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.045), blackMetalMaterial);
        grip.position.set(0.12, -0.22, -0.42);
        grip.rotation.x = 0.25;
        activeGunModel.add(grip);
      } else {
        // Render a gorgeous pump-action shotgun model for FPS view
        const barrels = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.54), blackMetalMaterial);
        barrels.position.set(0.12, -0.13, -0.56);
        activeGunModel.add(barrels);

        const pump = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.056, 0.18), woodMaterial);
        pump.position.set(0.12, -0.15, -0.46);
        activeGunModel.add(pump);

        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.065, 0.24), blackMetalMaterial);
        receiver.position.set(0.12, -0.14, -0.32);
        activeGunModel.add(receiver);

        const woodenButt = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.09, 0.25), woodMaterial);
        woodenButt.position.set(0.12, -0.19, -0.18);
        woodenButt.rotation.x = -0.12;
        activeGunModel.add(woodenButt);
      }
    };

    updateActiveGunModel('pistol');

    camera.add(activeGunModel);
    
    // Add dynamic weapon flashlight bound straight to the client viewport camera
    const flashlight = new THREE.SpotLight(0xfffdf4, 4.2, 26, Math.PI / 4.5, 0.45, 0.82);
    flashlight.position.set(0.12, -0.15, -0.4); // Sits right alongside the gun body
    flashlight.castShadow = true;
    flashlight.shadow.bias = -0.0015;
    flashlight.shadow.mapSize.width = 512;
    flashlight.shadow.mapSize.height = 512;
    camera.add(flashlight);

    // Build static target anchor forward in virtual space to orient the light cone
    const flashlightTarget = new THREE.Object3D();
    flashlightTarget.position.set(0.12, -0.15, -10.0);
    camera.add(flashlightTarget);
    flashlight.target = flashlightTarget;

    scene.add(camera);

    // --- MAIN HIGH FREQUENCY TICK / PHYSICS RENDER LOOP ---
    const clock = new THREE.Clock();
    let animFrameId: number;

    const gameTick = () => {
      animFrameId = requestAnimationFrame(gameTick);
      if (stateRef.current.gameState !== 'playing') {
        renderer.render(scene, camera);
        return;
      }

      const d = Math.min(clock.getDelta(), 0.1); // Clamp physics lag
      const time = clock.getElapsedTime();

      // Decrement firearm fire rates
      if (fireCooldownLeft > 0) {
        fireCooldownLeft -= d;
      }

      // --- 1. SINK BUYABLE DOOR MODEL ANIMATION ---
      if (classroomExitDoor.purchased && classroomExitDoor.group.position.y > -WALL_H) {
        classroomExitDoor.group.position.y -= d * 3.5; // Smooth sink sliding down animation
        if (classroomExitDoor.group.position.y <= -WALL_H) {
          scene.remove(classroomExitDoor.group);
        }
      }

      // --- 2. PLAYER LOOK INTERPOLATIONS & CAM CAMERA RIG ---
      // Recoil kick smooth recovery
      recoilOffset.x = THREE.MathUtils.lerp(recoilOffset.x, maxRecoilOffset.x, d * 18);
      recoilOffset.y = THREE.MathUtils.lerp(recoilOffset.y, maxRecoilOffset.y, d * 18);
      maxRecoilOffset.x = THREE.MathUtils.lerp(maxRecoilOffset.x, 0, d * 12);
      maxRecoilOffset.y = THREE.MathUtils.lerp(maxRecoilOffset.y, 0, d * 12);

      camera.rotation.order = 'YXZ';
      camera.rotation.y = pYaw + recoilOffset.x;
      camera.rotation.x = pPitch + recoilOffset.y;

      // Adjust field of view smoothly depending on Aim Down Sight toggle
      const fovGoal = stateRef.current.isADS ? stateRef.current.fov - 15 : stateRef.current.fov;
      camera.fov = THREE.MathUtils.lerp(camera.fov, fovGoal, d * 15);
      camera.updateProjectionMatrix();

      // Gun recoil translation kickback animation
      const targetGunX = stateRef.current.isADS ? 0.0 : 0.13;
      const targetGunY = stateRef.current.isADS ? -0.1 : -0.15;
      const targetGunZ = stateRef.current.isADS ? -0.32 : -0.45;
      
      activeGunModel.position.x = THREE.MathUtils.lerp(activeGunModel.position.x, targetGunX, d * 12);
      activeGunModel.position.y = THREE.MathUtils.lerp(activeGunModel.position.y, targetGunY, d * 12);
      activeGunModel.position.z = THREE.MathUtils.lerp(activeGunModel.position.z, targetGunZ, d * 12);

      // --- 3. CLASSROOM ACCELERATIONS MOTION ENGINE ---
      const moveFwd = keysMap.KeyW ? 1 : keysMap.KeyS ? -1 : 0;
      const moveRight = keysMap.KeyD ? 1 : keysMap.KeyA ? -1 : 0;
      const sprinting = keysMap.ShiftLeft && moveFwd > 0 && !stateRef.current.isADS;

      pDirection.set(0, 0, 0);
      const camYawCos = Math.cos(pYaw);
      const camYawSin = Math.sin(pYaw);

      if (moveFwd !== 0) {
        // Project direction locked on floor plane
        pDirection.x += -camYawSin * moveFwd;
        pDirection.z += -camYawCos * moveFwd;
      }
      if (moveRight !== 0) {
        pDirection.x += camYawCos * moveRight;
        pDirection.z += -camYawSin * moveRight;
      }
      pDirection.normalize();

      const calculatedBaseSpeed = sprinting ? 7.2 : 4.4;
      pVelocity.x = pDirection.x * calculatedBaseSpeed;
      pVelocity.z = pDirection.z * calculatedBaseSpeed;

      // Vertical gravity
      if (camera.position.y > 1.65) {
        pVelocity.y -= 18.0 * d;
      } else {
        pVelocity.y = 0;
        camera.position.y = 1.65;
        if (keysMap.Space && stateRef.current.gameState === 'playing') {
          pVelocity.y = 5.2; // Jump force kick
        }
      }

      // Translate coordinates smoothly
      camera.position.x += pVelocity.x * d;
      camera.position.y += pVelocity.y * d;
      camera.position.z += pVelocity.z * d;

      // --- 4. MAP COLLISION DECISION SOLVER ---
      // Hard bounds limits to avoid getting out of maps
      const limit = mapBoundingLimits;
      
      if (classroomExitDoor.purchased) {
        // Classroom + Door transitional zone + Hallway zone form ONE single connected playable space!
        // Rebuilt the collision boundaries cleanly to remove any invisible walls and teleport logic.
        const inClassroom = camera.position.x <= 13.2;
        const inHallway = camera.position.x >= 14.3;
        
        if (inClassroom) {
          camera.position.x = Math.max(limit.minX, camera.position.x);
          camera.position.z = Math.max(limit.minZ, Math.min(limit.maxZ, camera.position.z));
        } else if (inHallway) {
          camera.position.x = Math.min(limit.hallMaxX, camera.position.x);
          camera.position.z = Math.max(limit.hallMinZ, Math.min(limit.hallMaxZ, camera.position.z));
        } else {
          // Transitional doorway zone (13.2 < x < 14.3)
          // Allow full natural passage, clamping Z to the door width aperture
          camera.position.z = Math.max(-1.75, Math.min(1.75, camera.position.z));
        }
      } else {
        // Locked inside main classroom bounds
        camera.position.x = Math.max(limit.minX, Math.min(limit.maxX, camera.position.x));
        camera.position.z = Math.max(limit.minZ, Math.min(limit.maxZ, camera.position.z));

        // Prevent walking past exit door threshold if locked
        if (camera.position.x > 13.15) {
          camera.position.x = 13.15;
        }
      }

      // Check simple radial collisions with student tables
      classroomObstacles.forEach(obs => {
        const pRadius = 0.5;
        const testPos = new THREE.Vector3(camera.position.x, 0.4, camera.position.z);
        if (obs.containsPoint(testPos)) {
          // Push player backwards
          const delta = new THREE.Vector3().subVectors(testPos, obs.getCenter(new THREE.Vector3())).normalize();
          camera.position.x += delta.x * 0.15;
          camera.position.z += delta.z * 0.15;
        }
      });

      // --- 5. ZOMBIE SPANNER & PATH GENERATION CONTROL ---
      if (zombiesLeftToSpawn > 0 && !roundTransitionActive) {
        spawnTimer += d;
        if (spawnTimer >= 1.85) { // Spawn every 1.85 seconds
          spawnTimer = 0;
          // Determine active ground spawners based on door purchase
          const maxSpawnIndex = classroomExitDoor.purchased ? 8 : 6;
          const spawnerIdx = Math.floor(Math.random() * maxSpawnIndex);
          spawnSingleZombie(spawnerIdx);
          zombiesLeftToSpawn = Math.max(0, zombiesLeftToSpawn - 1);
        }
      }

      // --- 6. UNDEAD MOTION AI & GROUND CRAWL REVOLUTION ---
      activeZombiesList.forEach(z => {
        z.animTime += d;

        if (z.state === 'spawning') {
          // Creepy ground rise crawling animation
          if (z.mesh.position.y < 0.0) {
            z.mesh.position.y += 1.0 * d; // rise slow & cinematic
            
            // Spawn debris popping out from floor while breaking surface
            if (Math.random() < 0.15) {
              triggerGravelEruption(z.mesh.position);
            }

            // Ominous zombie crawl animation (swinging arms dynamically up/down)
            const climbSway = Math.sin(z.animTime * 8.0);
            z.mesh.children[3].rotation.x = -Math.PI / 3 + climbSway * 0.8; // Left Arm crawls
            z.mesh.children[4].rotation.x = -Math.PI / 3 - climbSway * 0.8; // Right arm crawls
          } else {
            z.mesh.position.y = 0.0;
            z.state = 'chasing';
          }
        } else {
          // Under active pursuit tracking player coordinates
          const dirToPlayer = new THREE.Vector3().subVectors(camera.position, z.mesh.position);
          dirToPlayer.y = 0; // lock vector on floor plane
          const distanceToPlayer = dirToPlayer.length();
          dirToPlayer.normalize();

          // Smooth rotation looking at the player
          z.mesh.lookAt(new THREE.Vector3(camera.position.x, 0.0, camera.position.z));

          if (distanceToPlayer > 1.1) {
            z.mesh.position.addScaledVector(dirToPlayer, z.speed * d);
            // Walk animation: simple offset sin wave swaying shoulder limbs
            const walkSway = Math.sin(z.animTime * 6.5);
            z.mesh.children[3].rotation.x = -Math.PI / 1.8 + walkSway * 0.15; // Left Arm swing
            z.mesh.children[4].rotation.x = -Math.PI / 1.8 - walkSway * 0.15; // Right Arm swing
          } else {
            // Close attack contact!
            const attackInt = time - z.lastAttackTime;
            if (attackInt >= 1.25) {
              z.lastAttackTime = time;
              // Swipe arms animation
              z.mesh.children[3].rotation.x = -Math.PI / 0.8;
              setTimeout(() => {
                if (z.mesh && z.mesh.children[3]) {
                  z.mesh.children[3].rotation.x = -Math.PI / 1.81;
                }
              }, 200);

              // Inflict player damage
              setHealth(prev => {
                const updated = Math.max(0, prev - z.damage);
                stateRef.current.health = updated;
                // Red screen thump sound
                sound.playHitImpact();
                if (updated <= 0) {
                  // Game over!
                  setGameState('gameover');
                  document.exitPointerLock();
                }
                return updated;
              });
            }
          }
        }
      });

      // --- 7. BIND INTERACTION HOVER HUD ALERTS ---
      let matchLabel: string | null = null;
      const ticks = time;

      if (ticks - lastInteractionPulse >= 0.18) {
        lastInteractionPulse = ticks;

        // Proximity checks
        const checkDoor = camera.position.distanceTo(new THREE.Vector3(...classroomExitDoor.position));
        const checkBuy = camera.position.distanceTo(new THREE.Vector3(...shotgunWallBuy.position));
        const checkBar = barricadeDetails.find(b => {
          const distance = camera.position.distanceTo(new THREE.Vector3(...b.position));
          return distance <= 2.22 && b.planks < b.maxPlanks;
        });

        if (checkBar) {
          matchLabel = `REPAIR SENSORS [E]\n+20 SCORE BONUS`;
        } else if (checkBuy && !shotgunWallBuy.purchased) {
          matchLabel = `BUY M1014 SHOTGUN_ [E]\nPRICE: $700`;
        } else if (checkDoor <= 3.2 && !classroomExitDoor.purchased) {
          matchLabel = `PERFORM CLASSROOM OUTLET BUY [E]\nACCESS HALLWAY: $1200\n`;
        }
        setInteractMessage(matchLabel);
      }

      // --- 8. REPAIR DUST COLLISION FLICKERS & PARTICLES ---
      // Randomly flick neon fluorescent tubes occasionally to enhance spooky vibe
      halogenLights.forEach(item => {
        if (Math.random() < 0.005) { // 0.5% chance per frame
          item.mesh.visible = false;
          item.light.power = 0.05;
          setTimeout(() => {
            item.mesh.visible = true;
            item.light.power = item.basePower * 9.5; // restore halogen discharge
          }, 60 + Math.random() * 120);
        }
      });

      // Render pool blood particles fade limits
      particleList.forEach(p => {
        p.age += d;
        p.vel.y -= 9.8 * d; // gravity
        p.mesh.position.addScaledVector(p.vel, d);
        if (p.mesh.position.y < 0.01) {
          p.mesh.position.y = 0.012; // smear on tile Floor
          p.vel.set(0, 0, 0);
        }
        if (p.age >= p.maxAge) {
          scene.remove(p.mesh);
        }
      });
      // Eliminate spent blood sprays
      const survivors = particleList.filter(p => p.age < p.maxAge);
      particleList.length = 0;
      particleList.push(...survivors);

      // Fade spent laser tracer lines
      bulletTracers.forEach(line => {
        line.age += d;
        if (line.age >= line.maxAge) {
          scene.add(line.mesh); // Toggle remove
          scene.remove(line.mesh);
        }
      });
      const traceSurvivors = bulletTracers.filter(l => l.age < l.maxAge);
      bulletTracers.length = 0;
      bulletTracers.push(...traceSurvivors);

      // Calculate Floating damage screens
      floatingDmgNumbers.forEach(item => {
        item.age += d;
        item.pos.y += d * 1.1; // Float upward
        
        // Translate 3D location coordinate into 2D display offset
        const screenPos = item.pos.clone().project(camera);
        const screenX = (screenPos.x *  .5 + .5) * width;
        const screenY = (screenPos.y * -.5 + .5) * height;

        item.element.style.left = `${screenX}px`;
        item.element.style.top = `${screenY}px`;
        item.element.style.opacity = `${THREE.MathUtils.lerp(1, 0, item.age / item.maxAge)}`;

        if (item.age >= item.maxAge) {
          item.element.remove();
        }
      });
      const textSurvivors = floatingDmgNumbers.filter(f => f.age < f.maxAge);
      floatingDmgNumbers.length = 0;
      floatingDmgNumbers.push(...textSurvivors);

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(gameTick);

    // Dynamic resized stages responsive adjustments
    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    // --- GRACEFUL DESTROY & MEMORY LEAKS PREVENTER ---
    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      
      containerRef.current?.removeEventListener('click', handlePointerLock);

      // Sweep outstanding floating dom tags
      floatingDmgNumbers.forEach(f => f.element.remove());

      // Sweep three context
      renderer.dispose();
    };
  }, [gameState]);

  return <div id="fps-canvas-container" ref={containerRef} className="w-full h-full block relative cursor-crosshair bg-neutral-950 pointer-events-auto" />;
};
