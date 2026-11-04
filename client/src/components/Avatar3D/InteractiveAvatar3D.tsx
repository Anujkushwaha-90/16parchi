import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface InteractiveAvatar3DProps {
  modelUrl?: string;
  className?: string;
  theme?: 'dark' | 'light';
  showBackgroundGlow?: boolean;
  glowColor?: string;
  onInteract?: () => void;
  variant?: 'portrait' | 'duo-stage';
  scale?: number;
}

export const InteractiveAvatar3D: React.FC<InteractiveAvatar3DProps> = ({
  modelUrl = '/models/avatar.glb',
  className = 'w-full h-full min-h-[260px]',
  theme = 'dark',
  showBackgroundGlow = true,
  glowColor = '#f43f5e',
  onInteract,
  variant = 'portrait',
  scale = 1.0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    // Camera precisely calibrated to the digital human's head (y: 1.68) and hoodie shoulders (y: 1.48)
    if (variant === 'duo-stage') {
      camera.position.set(0, 1.58, 1.35);
      camera.lookAt(0, 1.52, 0);
    } else {
      camera.position.set(0, 1.68, 0.82);
      camera.lookAt(0, 1.64, 0);
    }

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // 2. Cinematic Dual-Rim Lighting (Matches Reference Image)
    // Deep Indigo/Purple Ambient Base
    const ambientLight = new THREE.AmbientLight(0x190e2e, 1.1);
    scene.add(ambientLight);

    // Soft Warm Cinematic Key Light on Face
    const keyLight = new THREE.DirectionalLight(0xfff3e8, 2.2);
    keyLight.position.set(0.3, 2.1, 2.0);
    scene.add(keyLight);

    // Soft Lavender Fill Light (reduces harsh facial shadows)
    const fillLight = new THREE.DirectionalLight(0xc4b5fd, 0.85);
    fillLight.position.set(-0.8, 1.5, 1.6);
    scene.add(fillLight);

    // Left Rim Light: Vibrant Neon Magenta / Electric Pink
    const magentaRim = new THREE.PointLight(0xff007f, 4.8, 7.5);
    magentaRim.position.set(-2.2, 2.1, -1.0);
    scene.add(magentaRim);

    // Right Rim Light: Electric Cyan / Neon Azure
    const cyanRim = new THREE.PointLight(0x00f0ff, 4.8, 7.5);
    cyanRim.position.set(2.2, 2.1, -1.0);
    scene.add(cyanRim);

    // Hair Top Highlight
    const topLight = new THREE.PointLight(0xfdf4ff, 1.5, 4.0);
    topLight.position.set(0, 2.8, -0.2);
    scene.add(topLight);

    // 3. Avatar Rigging References
    let headBone: THREE.Object3D | null = null;
    let neckBone: THREE.Object3D | null = null;
    let spineBone: THREE.Object3D | null = null;
    let leftEyeBone: THREE.Object3D | null = null;
    let rightEyeBone: THREE.Object3D | null = null;

    let headInitialRot = new THREE.Euler();
    let neckInitialRot = new THREE.Euler();
    let spineInitialRot = new THREE.Euler();
    let spineInitialPos = new THREE.Vector3();
    let leftEyeInitialRot = new THREE.Euler();
    let rightEyeInitialRot = new THREE.Euler();

    // Morph Target References
    const morphMeshes: Array<{
      mesh: THREE.Mesh;
      blinkLIndex?: number;
      blinkRIndex?: number;
      smileLIndex?: number;
      smileRIndex?: number;
      smileIndex?: number;
      browUpIndex?: number;
      eyeWideIndex?: number;
    }> = [];

    // Tracking Interpolation Variables
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let isHovered = false;
    let isInteracting = false;
    let nodProgress = 0;
    let smileCurrent = 0.15;
    let smileTarget = 0.15;

    // Blinking State Machine
    let nextBlinkTime = 2.0 + Math.random() * 2.5;
    let isBlinking = false;
    let blinkDuration = 0.17;
    let blinkElapsed = 0;
    let blinkValue = 0;

    // Micro-Saccade Gaze
    let saccadeOffset = { x: 0, y: 0 };
    let nextSaccadeTime = 1.2;

    // 4. Load High-End Digital Human Avatar GLB
    const loader = new GLTFLoader();
    let avatarModel: THREE.Group | null = null;

    loader.load(
      modelUrl,
      (gltf) => {
        avatarModel = gltf.scene;
        avatarModel.scale.set(scale, scale, scale);
        avatarModel.position.set(0, 0, 0);

        // Find rigged humanoid bones
        avatarModel.traverse((child) => {
          if (child.name === 'Head') {
            headBone = child;
            headInitialRot = child.rotation.clone();
          } else if (child.name === 'Neck') {
            neckBone = child;
            neckInitialRot = child.rotation.clone();
          } else if (child.name === 'Spine2' || child.name === 'Spine1') {
            if (!spineBone) {
              spineBone = child;
              spineInitialRot = child.rotation.clone();
              spineInitialPos = child.position.clone();
            }
          } else if (child.name === 'LeftEye') {
            leftEyeBone = child;
            leftEyeInitialRot = child.rotation.clone();
          } else if (child.name === 'RightEye') {
            rightEyeBone = child;
            rightEyeInitialRot = child.rotation.clone();
          }

          // Inspect and Optimize Materials & Morph Targets
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const dict = mesh.morphTargetDictionary;
            if (dict) {
              morphMeshes.push({
                mesh,
                blinkLIndex: dict['eyeBlinkLeft'] ?? dict['eyesClosed'],
                blinkRIndex: dict['eyeBlinkRight'] ?? dict['eyesClosed'],
                smileLIndex: dict['mouthSmileLeft'],
                smileRIndex: dict['mouthSmileRight'],
                smileIndex: dict['mouthSmile'],
                browUpIndex: dict['browInnerUp'],
                eyeWideIndex: dict['eyeWideLeft'] ?? dict['eyeWideRight'],
              });
            }

            // Material Fine-Tuning for Cinematic Digital Human
            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;

              // Dark voluminous hair catching magenta & cyan rim highlights
              if (mesh.name.toLowerCase().includes('hair')) {
                mat.roughness = 0.72;
                mat.metalness = 0.15;
              }
              // Black premium hoodie & jacket with realistic fabric detail
              else if (
                mesh.name.toLowerCase().includes('look') ||
                mesh.name.toLowerCase().includes('outfit') ||
                mesh.name.toLowerCase().includes('hoodie')
              ) {
                mat.roughness = 0.88;
                mat.metalness = 0.05;
              }
              // Deep expressive brown eyes with realistic corneal gloss
              else if (mesh.name.toLowerCase().includes('eye')) {
                mat.roughness = 0.08;
                mat.metalness = 0.12;
              }
              // Natural smooth human skin
              else if (
                mesh.name.toLowerCase().includes('head') ||
                mesh.name.toLowerCase().includes('body')
              ) {
                mat.roughness = 0.52;
                mat.metalness = 0.02;
              }

              mat.needsUpdate = true;
            }
          }
        });

        scene.add(avatarModel);
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('Failed to load Digital Human Avatar:', err);
        setLoadError('Failed to load avatar 3D model');
        setLoading(false);
      }
    );

    // 5. Mouse / Pointer & Touch Event Handlers
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const clientX =
        'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY =
        'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const relX = (clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const relY = (clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

      mouse.targetX = THREE.MathUtils.clamp(relX, -1.3, 1.3);
      mouse.targetY = THREE.MathUtils.clamp(relY, -1.3, 1.3);
    };

    const handlePointerEnter = () => {
      isHovered = true;
      smileTarget = 0.65; // Warm, confident smile on hover
    };

    const handlePointerLeave = () => {
      isHovered = false;
      smileTarget = 0.15; // Natural subtle resting smile
      mouse.targetX = 0;
      mouse.targetY = 0;
    };

    const handleAvatarClick = () => {
      isInteracting = true;
      nodProgress = 1.0; // Trigger nod animation
      smileTarget = 0.85; // Radiant smile on interaction
      setTimeout(() => {
        isInteracting = false;
        smileTarget = isHovered ? 0.65 : 0.15;
      }, 700);

      onInteract?.();
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    container.addEventListener('mouseenter', handlePointerEnter);
    container.addEventListener('mouseleave', handlePointerLeave);
    container.addEventListener('click', handleAvatarClick);
    container.addEventListener('touchstart', handlePointerMove as any, {
      passive: true,
    });
    container.addEventListener('touchmove', handlePointerMove as any, {
      passive: true,
    });

    // 6. Responsive Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // 7. High-Precision Animation Loop
    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      const motionScale = prefersReducedMotion ? 0.25 : 1.0;
      const lerpSpeed = prefersReducedMotion ? 0.05 : 0.08;

      // Cursor Smooth Lerp
      mouse.x = THREE.MathUtils.lerp(mouse.x, mouse.targetX, lerpSpeed);
      mouse.y = THREE.MathUtils.lerp(mouse.y, mouse.targetY, lerpSpeed);

      // Micro-Saccade Gaze (human pupils naturally dart slightly)
      nextSaccadeTime -= delta;
      if (nextSaccadeTime <= 0) {
        nextSaccadeTime = 1.0 + Math.random() * 2.2;
        saccadeOffset.x = (Math.random() - 0.5) * 0.05;
        saccadeOffset.y = (Math.random() - 0.5) * 0.03;
      }

      // Idle Breathing & Micro-Sway
      const breathingSine = Math.sin(elapsed * 1.8);
      const swayYaw = Math.sin(elapsed * 0.9) * 0.025 * motionScale;
      const swayPitch = Math.cos(elapsed * 1.2) * 0.018 * motionScale;

      // Natural Autonomous Eye Blinking
      nextBlinkTime -= delta;
      if (nextBlinkTime <= 0 && !isBlinking) {
        isBlinking = true;
        blinkElapsed = 0;
        blinkDuration = 0.16 + Math.random() * 0.06;
      }

      if (isBlinking) {
        blinkElapsed += delta;
        const progress = blinkElapsed / blinkDuration;
        if (progress < 0.5) {
          blinkValue = THREE.MathUtils.lerp(0, 1, progress * 2);
        } else if (progress < 1.0) {
          blinkValue = THREE.MathUtils.lerp(1, 0, (progress - 0.5) * 2);
        } else {
          blinkValue = 0;
          isBlinking = false;
          const doubleBlink = Math.random() < 0.15;
          nextBlinkTime = doubleBlink ? 0.2 : 2.8 + Math.random() * 2.4;
        }
      }

      // Smooth Smile Lerp
      smileCurrent = THREE.MathUtils.lerp(smileCurrent, smileTarget, 0.09);

      // Handle Nod Interaction
      let nodOffsetPitch = 0;
      if (nodProgress > 0) {
        nodProgress -= delta * 2.2;
        if (nodProgress < 0) nodProgress = 0;
        nodOffsetPitch = Math.sin((1 - nodProgress) * Math.PI * 2) * 0.12;
      }

      // Biomechanical Bone Rotations
      const maxYaw = 0.48 * motionScale;
      const maxPitch = 0.32 * motionScale;

      const targetYaw = mouse.x * maxYaw + swayYaw;
      const targetPitch = -mouse.y * maxPitch + swayPitch + nodOffsetPitch;

      if (headBone) {
        headBone.rotation.y = headInitialRot.y + targetYaw * 0.6;
        headBone.rotation.x = headInitialRot.x + targetPitch * 0.6;
        headBone.rotation.z = headInitialRot.z - mouse.x * 0.05 * motionScale;
      }

      if (neckBone) {
        neckBone.rotation.y = neckInitialRot.y + targetYaw * 0.25;
        neckBone.rotation.x = neckInitialRot.x + targetPitch * 0.25;
      }

      if (spineBone) {
        spineBone.rotation.y = spineInitialRot.y + targetYaw * 0.15;
        spineBone.rotation.x = spineInitialRot.x + targetPitch * 0.1;
        spineBone.position.y =
          spineInitialPos.y + breathingSine * 0.007 * motionScale;
      }

      // Eye Tracking
      const eyeYaw =
        mouse.x * (maxYaw * 0.42) + saccadeOffset.x * motionScale;
      const eyePitch =
        -mouse.y * (maxPitch * 0.38) + saccadeOffset.y * motionScale;

      if (leftEyeBone) {
        leftEyeBone.rotation.y = leftEyeInitialRot.y + eyeYaw;
        leftEyeBone.rotation.x = leftEyeInitialRot.x + eyePitch;
      }
      if (rightEyeBone) {
        rightEyeBone.rotation.y = rightEyeInitialRot.y + eyeYaw;
        rightEyeBone.rotation.x = rightEyeInitialRot.x + eyePitch;
      }

      // Facial Blendshapes / Morph Targets
      morphMeshes.forEach((item) => {
        const inf = item.mesh.morphTargetInfluences;
        if (!inf) return;

        if (item.blinkLIndex !== undefined) inf[item.blinkLIndex] = blinkValue;
        if (item.blinkRIndex !== undefined) inf[item.blinkRIndex] = blinkValue;

        if (item.smileIndex !== undefined) inf[item.smileIndex] = smileCurrent;
        if (item.smileLIndex !== undefined)
          inf[item.smileLIndex] = smileCurrent;
        if (item.smileRIndex !== undefined)
          inf[item.smileRIndex] = smileCurrent;

        if (item.browUpIndex !== undefined) {
          const browTarget = isHovered || isInteracting ? 0.32 : 0.06;
          inf[item.browUpIndex] = THREE.MathUtils.lerp(
            inf[item.browUpIndex] || 0,
            browTarget,
            0.08
          );
        }

        if (item.eyeWideIndex !== undefined) {
          const wideTarget = isHovered ? 0.18 : 0;
          inf[item.eyeWideIndex] = THREE.MathUtils.lerp(
            inf[item.eyeWideIndex] || 0,
            wideTarget,
            0.08
          );
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // 8. Cleanup and Resource Disposal
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('mouseenter', handlePointerEnter);
      container.removeEventListener('mouseleave', handlePointerLeave);
      container.removeEventListener('click', handleAvatarClick);
      container.removeEventListener('touchstart', handlePointerMove as any);
      container.removeEventListener('touchmove', handlePointerMove as any);
      resizeObserver.disconnect();

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else if (m.material) {
            m.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl, variant, scale, glowColor, prefersReducedMotion]);

  return (
    <div className={`relative select-none ${className}`}>
      {/* Background Soft Glow (Magenta & Cyan Ambient Atmosphere) */}
      {showBackgroundGlow && (
        <div
          className="absolute inset-0 pointer-events-none rounded-full blur-3xl opacity-50 animate-pulse transition-opacity duration-700"
          style={{
            background: `radial-gradient(circle at 35% 40%, rgba(244,63,94,0.3) 0%, transparent 60%), radial-gradient(circle at 65% 40%, rgba(56,189,248,0.3) 0%, transparent 60%)`,
          }}
        />
      )}

      {/* Loading Placeholder */}
      {loading && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10 transition-opacity rounded-2xl">
          <div className="w-9 h-9 rounded-full border-2 border-pink-500 border-t-cyan-400 animate-spin mb-2" />
          <span className="text-[11px] font-bold text-pink-200 tracking-wider uppercase animate-pulse">
            Rendering Digital Human...
          </span>
        </div>
      )}

      {/* Error Fallback */}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-rose-300 bg-black/60 p-4 text-center rounded-2xl">
          <span>{loadError}</span>
        </div>
      )}

      {/* Interactive Three.js Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-pointer relative z-10"
        title="Interactive 3D Digital Human • Move cursor to look around • Hover or Click to interact!"
      />

      {/* Subtle cursor tracking hint */}
      <div className="absolute bottom-1 right-2 pointer-events-none z-20 text-[9px] font-semibold text-stone-400/80 bg-black/50 px-2 py-0.5 rounded-full border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
        Move cursor to track ✨
      </div>
    </div>
  );
};
