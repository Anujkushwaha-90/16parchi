import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface DynamicDuoScene3DProps {
  isAccepted: boolean;
  onClaspClick?: () => void;
}

export const DynamicDuoScene3D: React.FC<DynamicDuoScene3DProps> = ({
  isAccepted,
  onClaspClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 300;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.5);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 2. Romantic Lighting (Sapphire & Rose Gold)
    const ambientLight = new THREE.AmbientLight(0xfff0f5, 1.2);
    scene.add(ambientLight);

    // Boy's Cyan Sapphire Light (Left)
    const boyLight = new THREE.PointLight(0x38bdf8, 3.5, 8);
    boyLight.position.set(-2.2, 1.5, 2.0);
    scene.add(boyLight);

    // Girl's Rose Gold Light (Right)
    const girlLight = new THREE.PointLight(0xf43f5e, 3.5, 8);
    girlLight.position.set(2.2, 1.5, 2.0);
    scene.add(girlLight);

    // Central Warm Clasp Light
    const centerLight = new THREE.PointLight(
      isAccepted ? 0xfef08a : 0xf472b6,
      isAccepted ? 4.0 : 1.5,
      6
    );
    centerLight.position.set(0, 0, 1.8);
    scene.add(centerLight);

    // Main Animation Group
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    // 3. Central 3D Extruded Heart
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0.25);
    heartShape.bezierCurveTo(0, 0.45, -0.35, 0.72, -0.65, 0.72);
    heartShape.bezierCurveTo(-0.95, 0.72, -1.05, 0.35, -1.05, 0.1);
    heartShape.bezierCurveTo(-1.05, -0.3, -0.55, -0.7, 0, -1.15);
    heartShape.bezierCurveTo(0.55, -0.7, 1.05, -0.3, 1.05, 0.1);
    heartShape.bezierCurveTo(1.05, 0.35, 0.95, 0.72, 0.65, 0.72);
    heartShape.bezierCurveTo(0.35, 0.72, 0, 0.45, 0, 0.25);

    const heartGeo = new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08,
    });
    heartGeo.center();

    const heartMat = new THREE.MeshPhysicalMaterial({
      color: 0xf43f5e,
      roughness: 0.18,
      metalness: 0.4,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15,
      emissive: isAccepted ? 0xe11d48 : 0x881337,
      emissiveIntensity: isAccepted ? 0.85 : 0.35,
    });
    const heartMesh = new THREE.Mesh(heartGeo, heartMat);
    heartMesh.scale.set(0.68, 0.68, 0.68);
    stageGroup.add(heartMesh);

    // 4. Double Orbiting Golden Stardust Rings
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      metalness: 0.85,
      roughness: 0.15,
    });
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.022, 12, 48),
      ringMat
    );
    ring1.rotation.x = Math.PI / 3;
    stageGroup.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.022, 12, 48),
      ringMat
    );
    ring2.rotation.y = Math.PI / 4;
    stageGroup.add(ring2);

    // 5. Left (Boy) & Right (Girl) Glowing Energy Orbs
    const boyOrbGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const boyOrbMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });
    const boyOrb = new THREE.Mesh(boyOrbGeo, boyOrbMat);
    boyOrb.position.set(-1.4, 0, 0);
    stageGroup.add(boyOrb);

    const girlOrbGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const girlOrbMat = new THREE.MeshStandardMaterial({
      color: 0xfb7185,
      emissive: 0xf43f5e,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });
    const girlOrb = new THREE.Mesh(girlOrbGeo, girlOrbMat);
    girlOrb.position.set(1.4, 0, 0);
    stageGroup.add(girlOrb);

    // 6. Falling Rose Petals
    const petals: Array<{ mesh: THREE.Mesh; speed: number; rotSpeed: number }> =
      [];
    const petalGeo = new THREE.SphereGeometry(0.08, 6, 6);
    petalGeo.scale(1, 0.2, 1.4);
    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.45,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < 28; i++) {
      const p = new THREE.Mesh(petalGeo, petalMat);
      p.position.set(
        (Math.random() - 0.5) * 5.5,
        Math.random() * 4 - 2,
        (Math.random() - 0.5) * 3
      );
      scene.add(p);
      petals.push({
        mesh: p,
        speed: 0.01 + Math.random() * 0.018,
        rotSpeed: 0.02 + Math.random() * 0.03,
      });
    }

    // 7. Shimmering Ambient Stars Particles
    const starCount = 60;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 7;
      starPositions[i + 1] = (Math.random() - 0.5) * 5;
      starPositions[i + 2] = (Math.random() - 0.5) * 3;
    }
    starGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(starPositions, 3)
    );
    const starMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.045,
      transparent: true,
      opacity: 0.75,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // 8. Responsive Resize
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

    // 9. Animation Loop
    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Heart Float & Smooth Pulse
      heartMesh.rotation.y = Math.sin(elapsed * 1.2) * 0.35;
      heartMesh.position.y = Math.sin(elapsed * 2.0) * 0.08;
      const pulse =
        (isAccepted ? 0.72 : 0.65) + Math.sin(elapsed * 3.5) * 0.035;
      heartMesh.scale.set(pulse, pulse, pulse);

      // Rings Rotation
      ring1.rotation.z += isAccepted ? 0.018 : 0.009;
      ring2.rotation.x += isAccepted ? 0.015 : 0.008;

      // Boy & Girl Orbs: When accepted, they clasp close together
      if (isAccepted) {
        boyOrb.position.x = -0.55 + Math.sin(elapsed * 2.5) * 0.04;
        girlOrb.position.x = 0.55 - Math.sin(elapsed * 2.5) * 0.04;
      } else {
        boyOrb.position.x = -1.35 + Math.sin(elapsed * 1.5) * 0.05;
        girlOrb.position.x = 1.35 - Math.sin(elapsed * 1.5) * 0.05;
      }
      boyOrb.position.y = Math.sin(elapsed * 2.0) * 0.06;
      girlOrb.position.y = Math.sin(elapsed * 2.0 + 0.5) * 0.06;

      // Falling Petals Drift
      petals.forEach((pt) => {
        pt.mesh.position.y -= pt.speed;
        pt.mesh.rotation.x += pt.rotSpeed;
        pt.mesh.rotation.z += pt.rotSpeed * 0.8;
        if (pt.mesh.position.y < -2.2) {
          pt.mesh.position.y = 2.4;
          pt.mesh.position.x = (Math.random() - 0.5) * 5.5;
        }
      });

      // Stars gentle twinkle
      starPoints.rotation.y = elapsed * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
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
  }, [isAccepted]);

  return (
    <div
      ref={containerRef}
      onClick={onClaspClick}
      className="w-full h-64 sm:h-72 cursor-pointer relative overflow-hidden rounded-2xl select-none"
      title="Dynamic Duo Universe • Hand Clasp & Eternal Heart"
    >
      {/* Subtle indicator tag */}
      <div className="absolute top-2 right-2 z-20 px-2.5 py-0.5 rounded-full bg-black/60 border border-white/10 text-[9px] font-semibold text-pink-200 pointer-events-none backdrop-blur-sm flex items-center gap-1.5 opacity-80">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span className="text-cyan-300">Ayush</span>
        <span>🤝</span>
        <span className="text-pink-300">Palak</span>
      </div>
    </div>
  );
};
