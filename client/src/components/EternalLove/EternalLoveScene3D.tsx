import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface EternalLoveScene3DProps {
  theme: 'dark' | 'light';
  onCupidClick?: () => void;
  triggerBurst?: boolean;
}

export const EternalLoveScene3D: React.FC<EternalLoveScene3DProps> = ({
  theme,
  onCupidClick,
  triggerBurst,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cupidRef = useRef<THREE.Group | null>(null);
  const heartsGroupRef = useRef<THREE.Group | null>(null);
  const petalsRef = useRef<Array<{ mesh: THREE.Mesh; speed: number; rotX: number; rotY: number; rotZ: number }>>([]);
  const butterfliesRef = useRef<Array<{ group: THREE.Group; leftWing: THREE.Mesh; rightWing: THREE.Mesh; pathOffset: number }>>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // 2. Lighting System
    const ambientLight = new THREE.AmbientLight(theme === 'dark' ? 0xff8fa3 : 0xffd1dc, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, theme === 'dark' ? 1.5 : 2.0);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const heartPointLight = new THREE.PointLight(
      theme === 'dark' ? 0xf43f5e : 0xf472b6,
      theme === 'dark' ? 2.5 : 1.8,
      15
    );
    heartPointLight.position.set(0, 1, 3);
    scene.add(heartPointLight);

    // 3. Extruded 3D Heart Geometry Generator
    const createHeartGeometry = (scale: number = 1) => {
      const heartShape = new THREE.Shape();
      const x = 0;
      const y = 0;
      heartShape.moveTo(x + 0.25, y + 0.25);
      heartShape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.2, y, x, y);
      heartShape.bezierCurveTo(x - 0.3, y, x - 0.3, y + 0.35, x - 0.3, y + 0.35);
      heartShape.bezierCurveTo(x - 0.3, y + 0.55, x - 0.1, y + 0.77, x + 0.25, y + 0.95);
      heartShape.bezierCurveTo(x + 0.6, y + 0.77, x + 0.8, y + 0.55, x + 0.8, y + 0.35);
      heartShape.bezierCurveTo(x + 0.8, y + 0.35, x + 0.8, y, x + 0.5, y);
      heartShape.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);

      const extrudeSettings = {
        depth: 0.18 * scale,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.06 * scale,
        bevelThickness: 0.06 * scale,
      };

      const geo = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
      geo.center();
      return geo;
    };

    // 4. Floating 3D Hearts Field
    const heartsGroup = new THREE.Group();
    heartsGroupRef.current = heartsGroup;
    scene.add(heartsGroup);

    const heartMat = new THREE.MeshPhysicalMaterial({
      color: theme === 'dark' ? 0xe11d48 : 0xf43f5e,
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      transmission: 0.2,
      ior: 1.4,
    });

    const floatingHearts: Array<{ mesh: THREE.Mesh; basePos: THREE.Vector3; freq: number; speed: number }> = [];
    const heartGeo = createHeartGeometry(0.7);

    for (let i = 0; i < 9; i++) {
      const mesh = new THREE.Mesh(heartGeo, heartMat);
      const angle = (i / 9) * Math.PI * 2;
      const radius = 3.6 + Math.random() * 2.2;
      const pos = new THREE.Vector3(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 4.5,
        (Math.random() - 0.5) * 2.5
      );
      mesh.position.copy(pos);
      mesh.rotation.z = Math.PI; // Invert to point downwards
      mesh.scale.setScalar(0.4 + Math.random() * 0.45);
      heartsGroup.add(mesh);
      floatingHearts.push({
        mesh,
        basePos: pos.clone(),
        freq: 1.0 + Math.random() * 1.5,
        speed: 0.6 + Math.random() * 0.8,
      });
    }

    // 5. Falling Rose Petals
    const petalGeo = new THREE.PlaneGeometry(0.24, 0.32, 2, 2);
    // Curl the petal
    const posAttr = petalGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const z = Math.sin((posAttr.getY(i) + 0.16) * 10) * 0.05;
      posAttr.setZ(i, z);
    }
    petalGeo.computeVertexNormals();

    const petalMat = new THREE.MeshStandardMaterial({
      color: theme === 'dark' ? 0xbe123c : 0xf43f5e,
      side: THREE.DoubleSide,
      roughness: 0.4,
    });

    const petals: Array<{ mesh: THREE.Mesh; speed: number; rotX: number; rotY: number; rotZ: number }> = [];
    const petalCount = window.innerWidth < 640 ? 18 : 36;

    for (let i = 0; i < petalCount; i++) {
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(
        (Math.random() - 0.5) * 12,
        Math.random() * 10 - 5,
        (Math.random() - 0.5) * 4
      );
      petal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      scene.add(petal);
      petals.push({
        mesh: petal,
        speed: 0.015 + Math.random() * 0.02,
        rotX: (Math.random() - 0.5) * 0.03,
        rotY: (Math.random() - 0.5) * 0.03,
        rotZ: (Math.random() - 0.5) * 0.03,
      });
    }
    petalsRef.current = petals;

    // 6. Fluttering 3D Butterflies
    const createButterfly = (colorHex: number) => {
      const bGroup = new THREE.Group();
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.bezierCurveTo(0.1, 0.2, 0.3, 0.3, 0.4, 0.15);
      wingShape.bezierCurveTo(0.4, 0.0, 0.2, -0.1, 0, -0.1);

      const wingGeo = new THREE.ShapeGeometry(wingShape);
      const wingMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        roughness: 0.3,
        metalness: 0.2,
      });

      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.scale.x = -1;

      bGroup.add(leftWing);
      bGroup.add(rightWing);
      return { group: bGroup, leftWing, rightWing };
    };

    const butterflies: Array<{ group: THREE.Group; leftWing: THREE.Mesh; rightWing: THREE.Mesh; pathOffset: number }> = [];
    const bColors = [0xfb7185, 0xe879f9, 0xfcd34d];

    for (let i = 0; i < 3; i++) {
      const b = createButterfly(bColors[i % bColors.length]);
      b.group.scale.setScalar(0.7);
      scene.add(b.group);
      butterflies.push({
        ...b,
        pathOffset: i * (Math.PI * 2 / 3),
      });
    }
    butterfliesRef.current = butterflies;

    // 7. Original 3D Cupid Companion
    const cupidGroup = new THREE.Group();
    cupidRef.current = cupidGroup;

    // Body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffe4e6,
      roughness: 0.3,
    });
    const bodyGeo = new THREE.SphereGeometry(0.32, 16, 16);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    cupidGroup.add(bodyMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headMesh.position.y = 0.44;
    cupidGroup.add(headMesh);

    // Golden Halo
    const haloGeo = new THREE.TorusGeometry(0.18, 0.025, 8, 24);
    const haloMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfde047,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.rotation.x = Math.PI / 2;
    haloMesh.position.set(0, 0.72, 0);
    cupidGroup.add(haloMesh);

    // Wings
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    });
    const cWingShape = new THREE.Shape();
    cWingShape.moveTo(0, 0);
    cWingShape.bezierCurveTo(0.2, 0.3, 0.4, 0.4, 0.45, 0.2);
    cWingShape.bezierCurveTo(0.4, 0.0, 0.2, -0.15, 0, -0.05);
    const cWingGeo = new THREE.ShapeGeometry(cWingShape);

    const cLeftWing = new THREE.Mesh(cWingGeo, wingMat);
    cLeftWing.position.set(-0.15, 0.15, -0.2);
    cLeftWing.scale.setScalar(0.75);

    const cRightWing = new THREE.Mesh(cWingGeo, wingMat);
    cRightWing.position.set(0.15, 0.15, -0.2);
    cRightWing.scale.set(-0.75, 0.75, 0.75);

    cupidGroup.add(cLeftWing);
    cupidGroup.add(cRightWing);

    // Cupid's Golden Love Heart in hand
    const cupidHeartGeo = createHeartGeometry(0.28);
    const cupidHeartMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xf43f5e,
      emissiveIntensity: 0.5,
      roughness: 0.2,
    });
    const cupidHeartMesh = new THREE.Mesh(cupidHeartGeo, cupidHeartMat);
    cupidHeartMesh.position.set(0.25, 0.1, 0.25);
    cupidHeartMesh.rotation.z = Math.PI;
    cupidGroup.add(cupidHeartMesh);

    // Position Cupid in the upper right floating gently
    cupidGroup.position.set(width < 768 ? 2.2 : 3.8, 1.8, 2.5);
    scene.add(cupidGroup);

    // 8. Twinkling Stardust Field
    const starCount = 120;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 16;
      starPositions[i + 1] = (Math.random() - 0.5) * 12;
      starPositions[i + 2] = (Math.random() - 0.5) * 8;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: theme === 'dark' ? 0xffd1dc : 0xffffff,
      size: 0.06,
      transparent: true,
      opacity: 0.8,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // 9. Resize Listener
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (cupidGroup) {
        cupidGroup.position.x = w < 768 ? 2.0 : 3.8;
      }
    };
    window.addEventListener('resize', handleResize);

    // 10. Animation Loop
    let clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // 10a. Animate Floating Hearts
      floatingHearts.forEach(({ mesh, basePos, freq, speed }) => {
        mesh.position.y = basePos.y + Math.sin(elapsedTime * freq) * 0.4;
        mesh.rotation.y = elapsedTime * speed * 0.8;
        mesh.rotation.x = Math.sin(elapsedTime * 0.5) * 0.2;
      });

      // 10b. Animate Falling Rose Petals
      petals.forEach((p) => {
        p.mesh.position.y -= p.speed;
        p.mesh.position.x += Math.sin(elapsedTime + p.mesh.position.y) * 0.008;
        p.mesh.rotation.x += p.rotX;
        p.mesh.rotation.y += p.rotY;
        p.mesh.rotation.z += p.rotZ;

        // Reset if fallen below screen
        if (p.mesh.position.y < -5.5) {
          p.mesh.position.y = 5.5;
          p.mesh.position.x = (Math.random() - 0.5) * 12;
        }
      });

      // 10c. Animate Butterflies
      butterflies.forEach(({ group, leftWing, rightWing, pathOffset }) => {
        const t = elapsedTime * 0.8 + pathOffset;
        group.position.x = Math.sin(t) * 3.2;
        group.position.y = Math.cos(t * 1.5) * 1.6 + 0.5;
        group.position.z = Math.sin(t * 0.7) * 1.2;

        const wingFlap = Math.sin(elapsedTime * 14) * 0.65;
        leftWing.rotation.y = wingFlap;
        rightWing.rotation.y = -wingFlap;

        group.rotation.y = Math.sin(t) * 0.5;
      });

      // 10d. Animate Cupid Companion
      if (cupidGroup) {
        cupidGroup.position.y = 1.8 + Math.sin(elapsedTime * 1.6) * 0.18;
        cupidGroup.rotation.y = Math.sin(elapsedTime * 0.9) * 0.2;
        haloMesh.rotation.z = elapsedTime * 1.2;

        const cWingFlap = Math.sin(elapsedTime * 8) * 0.35;
        cLeftWing.rotation.y = cWingFlap;
        cRightWing.rotation.y = -cWingFlap;
      }

      // 10e. Gentle camera drift
      camera.position.x = Math.sin(elapsedTime * 0.2) * 0.3;
      camera.position.y = Math.cos(elapsedTime * 0.25) * 0.2;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // 11. Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      heartGeo.dispose();
      petalGeo.dispose();
      bodyGeo.dispose();
      headGeo.dispose();
      haloGeo.dispose();
      starGeo.dispose();
    };
  }, [theme]);

  // Handle Cupid Click Animation
  const handleCupidClick = () => {
    if (cupidRef.current) {
      cupidRef.current.rotation.y += Math.PI * 2;
    }
    onCupidClick?.();
  };

  return (
    <div
      ref={containerRef}
      onClick={handleCupidClick}
      title="Eternal Love 3D Universe — Tap Cupid to release love sparkles!"
      className="absolute inset-0 pointer-events-auto overflow-hidden z-0 select-none cursor-pointer"
      style={{ touchAction: 'none' }}
    />
  );
};

