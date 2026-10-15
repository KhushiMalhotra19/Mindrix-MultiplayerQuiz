import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

function playShapesFallSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Descending cascading tones for falling shapes
    const freqs = [600, 520, 440, 360, 280, 220, 160, 110];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.3), now + idx * 0.06 + 0.22);

      gain.gain.setValueAtTime(0.001, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.23);
    });

    // Air sweep whoosh
    const bufferSize = Math.floor(ctx.sampleRate * 0.7);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      channelData[i] = (Math.random() * 2 - 1) * 0.12;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(150, now + 0.7);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.7);
  } catch (err) {
    console.error('Audio synthesis failed:', err);
  }
}

export default function BackgroundCanvas({ isLoggedIn = false, isNextPage = false }) {
  const mountRef = useRef(null);
  const isLoggedInRef = useRef(isLoggedIn);
  const isNextPageRef = useRef(isNextPage);
  const hasPlayedFallSoundRef = useRef(false);

  useEffect(() => {
    isLoggedInRef.current = isLoggedIn;
    isNextPageRef.current = isNextPage;
  }, [isLoggedIn, isNextPage]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 14;

    // 2. WebGL Renderer with Alpha transparency
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(6, 10, 8);
    scene.add(dirLight);

    // 4. Geometries & Materials (With Thin Black Line Borders for Original Mode)
    const circleGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const circleMat = new THREE.MeshToonMaterial({ color: 0x32715C });

    const diamondGeo = new THREE.OctahedronGeometry(0.6, 0);
    const diamondMat = new THREE.MeshToonMaterial({ color: 0xD32231 });

    const circleEdgesGeo = new THREE.EdgesGeometry(circleGeo);
    const diamondEdgesGeo = new THREE.EdgesGeometry(diamondGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x000000 });

    // 5. Create 60 floating particles with line borders & fall physics (Reduced for cleaner spacing)
    const PARTICLE_COUNT = 60;
    const particles = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const isCircle = i % 2 === 0;
      const mesh = new THREE.Mesh(
        isCircle ? circleGeo : diamondGeo,
        isCircle ? circleMat : diamondMat
      );

      const lineBorder = new THREE.LineSegments(
        isCircle ? circleEdgesGeo : diamondEdgesGeo,
        lineMat
      );
      mesh.add(lineBorder);

      const baseScale = 0.65 + Math.random() * 0.7;
      mesh.scale.set(baseScale, baseScale, baseScale);

      const baseX = (Math.random() - 0.5) * 28;
      const baseY = (Math.random() - 0.5) * 17;
      const baseZ = -1.5 - Math.random() * 5.0;

      mesh.position.set(baseX, baseY, baseZ);
      scene.add(mesh);

      particles.push({
        mesh,
        lineBorder,
        baseScale,
        baseX,
        baseY,
        baseZ,
        floatSpeed: 0.6 + Math.random() * 1.0,
        floatOffset: Math.random() * Math.PI * 2,
        rotSpeedX: (Math.random() - 0.5) * 0.02,
        rotSpeedY: (Math.random() - 0.5) * 0.02,
        mouseSensitivity: 0.3 + Math.random() * 0.7,
        fallVelocity: 0,
        gravity: 0.015 + Math.random() * 0.02,
      });
    }

    // 6. Mouse Interaction
    const targetMouse = { x: 0, y: 0 };
    const currentMouse = { x: 0, y: 0 };

    const handleMouseMove = (e) => {
      if (isLoggedInRef.current || isNextPageRef.current) return;
      targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 7. Handle Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 8. Animation Loop - Adaptive Modes for Project vs Multiplayer Dashboard
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const isNext = isNextPageRef.current;
      const activeLoggedIn = isLoggedInRef.current;

      // Ensure canvas is visible
      if (renderer.domElement && renderer.domElement.style.display === 'none') {
        renderer.domElement.style.display = 'block';
      }

      if (isNext) {
        // --- MULTIPLAYER DASHBOARD ONLY: 3D FIGURE-8 (INFINITY LOOP ORBIT) MOTION ---
        hasPlayedFallSoundRef.current = false;

        particles.forEach((p, idx) => {
          if (idx > 1) {
            // Hide all other shapes on the multiplayer dashboard so only 1 circle & 1 diamond exist
            p.mesh.visible = false;
            return;
          }

          p.mesh.visible = true;
          p.lineBorder.visible = false; // Borderless 3D shape

          // Scale for 3D shapes on Multiplayer Dashboard & Lobby (Circle reduced by 5% for all players)
          const targetScale = idx === 0 ? 3.99 : 4.2;
          p.mesh.scale.set(targetScale, targetScale, targetScale);

          // 3D Figure-8 (Infinity Loop) Math Path
          const speed = 0.42;
          const phaseOffset = idx === 0 ? 0 : Math.PI;
          const t = time * speed + phaseOffset;

          // Lemniscate infinity path (x = sin(t), y = sin(2t), z = depth oscillation)
          const orbitX = Math.sin(t) * 9.8;
          const orbitY = Math.sin(2 * t) * 4.6;
          const orbitZ = -2.2 + Math.cos(t) * 1.8; // 3D depth movement

          p.mesh.position.x += (orbitX - p.mesh.position.x) * 0.05;
          p.mesh.position.y += (orbitY - p.mesh.position.y) * 0.05;
          p.mesh.position.z += (orbitZ - p.mesh.position.z) * 0.05;

          p.mesh.rotation.x += 0.015;
          p.mesh.rotation.y += 0.018;
        });

        renderer.render(scene, camera);
      } else if (activeLoggedIn) {
        // --- WELCOME DASHBOARD: SHAPES FALL OUT & PLAY FALLING SOUND EFFECT ---
        if (!hasPlayedFallSoundRef.current) {
          hasPlayedFallSoundRef.current = true;
          playShapesFallSound();
        }

        let allFallen = true;

        particles.forEach((p) => {
          p.mesh.visible = true;
          p.lineBorder.visible = true;
          p.mesh.scale.set(p.baseScale, p.baseScale, p.baseScale);

          p.fallVelocity += p.gravity;
          p.mesh.position.y -= p.fallVelocity;
          p.mesh.rotation.x += 0.05;
          p.mesh.rotation.z += 0.05;

          if (p.mesh.position.y > -22) {
            allFallen = false;
          }
        });

        renderer.render(scene, camera);

        if (allFallen && renderer.domElement) {
          renderer.domElement.style.display = 'none';
        }
      } else {
        // --- LOGGED OUT / PROJECT DEFAULT VIEW: ORIGINAL FLOATING SHAPES WITH LINE BORDERS ---
        hasPlayedFallSoundRef.current = false;

        currentMouse.x += (targetMouse.x - currentMouse.x) * 0.04;
        currentMouse.y += (targetMouse.y - currentMouse.y) * 0.04;

        particles.forEach((p) => {
          p.mesh.visible = true;
          p.lineBorder.visible = true;
          p.mesh.scale.set(p.baseScale, p.baseScale, p.baseScale);

          if (p.mesh.position.y < -15) {
            p.mesh.position.y = p.baseY;
            p.fallVelocity = 0;
          }

          const floatY = Math.sin(time * p.floatSpeed + p.floatOffset) * 0.3;
          const floatX = Math.cos(time * p.floatSpeed * 0.7 + p.floatOffset) * 0.2;

          let targetX = p.baseX + floatX + currentMouse.x * p.mouseSensitivity * 1.6;
          let targetY = p.baseY + floatY + currentMouse.y * p.mouseSensitivity * 1.6;

          p.mesh.position.x += (targetX - p.mesh.position.x) * 0.05;
          p.mesh.position.y += (targetY - p.mesh.position.y) * 0.05;

          p.mesh.rotation.x += p.rotSpeedX;
          p.mesh.rotation.y += p.rotSpeedY;
        });

        renderer.render(scene, camera);
      }
    };

    animate();

    // 9. Clean up resources
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      circleGeo.dispose();
      circleMat.dispose();
      diamondGeo.dispose();
      diamondMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    />
  );
}
