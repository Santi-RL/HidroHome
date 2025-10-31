import { useEffect, useRef } from 'react';
import { ActionIcon, Box, Group, Stack, Text } from '@mantine/core';
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconMinus,
  IconPlus,
  IconRefresh,
} from '@tabler/icons-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useNetwork } from '../../shared/state/editorStore';
import { getCatalogItem } from '../../shared/constants/catalog';

const scalePosition = (value: number) => value / 50;

const createPipeMesh = (start: THREE.Vector3, end: THREE.Vector3, color: string) => {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  if (length === 0) return null;

  const geometry = new THREE.CylinderGeometry(0.05, 0.05, length, 8);
  const material = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  mesh.position.copy(midpoint);

  const up = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize());
  mesh.setRotationFromQuaternion(quaternion);
  return mesh;
};

export function Simple3DViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationRef = useRef<number | null>(null);
  const network = useNetwork();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(12, 12, 20); // Centered on the grid (gridWidth/2, height, gridHeight/2 + offset)
    camera.lookAt(new THREE.Vector3(12, 0, 7)); // Look at center of grid
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.6);
    directional.position.set(6, 10, 4);
    scene.add(directional);

    // Grid dimensions to match 2D canvas (1200px x 720px with 50px spacing)
    const gridWidth = 24; // 1200px / 50
    const gridHeight = 14; // 720px / 50
    const gridDivisions = 24; // Number of grid lines (matches 50px spacing in 2D)
    
    const planeGeometry = new THREE.PlaneGeometry(gridWidth, gridHeight);
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = Math.PI / 2;
    plane.position.y = -0.1;
    plane.position.x = gridWidth / 2;
    plane.position.z = gridHeight / 2;
    scene.add(plane);

    const grid = new THREE.GridHelper(gridWidth, gridDivisions, 0x94a3b8, 0xcbd5f5);
    grid.position.x = gridWidth / 2;
    grid.position.z = gridHeight / 2;
    scene.add(grid);

    // Add OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 3;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth > 0 && newHeight > 0) {
        rendererRef.current.setSize(newWidth, newHeight);
        cameraRef.current.aspect = newWidth / newHeight;
        cameraRef.current.updateProjectionMatrix();
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Force initial resize after layout is complete
    setTimeout(() => handleResize(), 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      renderer.dispose();
      container.removeChild(renderer.domElement);
      rendererRef.current = null;
      cameraRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const existing = scene.getObjectByName('network');
    if (existing) {
      scene.remove(existing);
      existing.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((mat: THREE.Material) => mat.dispose());
          } else if (object.material) {
            (object.material as THREE.Material).dispose();
          }
        }
      });
    }

    const group = new THREE.Group();
    group.name = 'network';

    network.links.forEach((link) => {
      const fromNode = network.nodes.find((node) => node.id === link.from);
      const toNode = network.nodes.find((node) => node.id === link.to);
      if (!fromNode || !toNode) return;

      const start = new THREE.Vector3(
        scalePosition(fromNode.position.x),
        link.type === 'pump' ? 0.5 : 0.2,
        scalePosition(fromNode.position.y),
      );
      const end = new THREE.Vector3(
        scalePosition(toNode.position.x),
        link.type === 'pump' ? 0.5 : 0.2,
        scalePosition(toNode.position.y),
      );
      const color = link.deviceId ? getCatalogItem(link.deviceId)?.color ?? '#0f172a' : '#0f172a';
      const pipe = createPipeMesh(start, end, color);
      if (pipe) {
        group.add(pipe);
      }
    });

    network.nodes.forEach((node) => {
      const catalogItem = node.deviceId ? getCatalogItem(node.deviceId) : undefined;
      const color = catalogItem?.color ?? '#2563eb';
      const geometry =
        node.type === 'tank'
          ? new THREE.CylinderGeometry(0.5, 0.5, 1.2, 16)
          : new THREE.BoxGeometry(0.6, 0.6, 0.6);
      const material = new THREE.MeshStandardMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        scalePosition(node.position.x),
        node.type === 'tank' ? 0.6 : 0.3,
        scalePosition(node.position.y),
      );
      group.add(mesh);
    });

    scene.add(group);
  }, [network]);

  // Camera control functions
  const handleZoomIn = () => {
    if (!controlsRef.current || !cameraRef.current) return;
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const distance = controls.getDistance();
    const moveDistance = distance * 0.2;
    
    if (distance - moveDistance >= controls.minDistance) {
      camera.position.addScaledVector(direction, moveDistance);
      controls.update();
    }
  };

  const handleZoomOut = () => {
    if (!controlsRef.current || !cameraRef.current) return;
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const distance = controls.getDistance();
    const moveDistance = distance * 0.2;
    
    if (distance + moveDistance <= controls.maxDistance) {
      camera.position.addScaledVector(direction, -moveDistance);
      controls.update();
    }
  };

  const handlePan = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!controlsRef.current || !cameraRef.current) return;
    const panSpeed = 0.5;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    
    const offset = new THREE.Vector3();
    
    switch (direction) {
      case 'up':
        offset.copy(camera.up).multiplyScalar(panSpeed);
        break;
      case 'down':
        offset.copy(camera.up).multiplyScalar(-panSpeed);
        break;
      case 'left':
        offset.crossVectors(camera.up, camera.getWorldDirection(new THREE.Vector3())).multiplyScalar(panSpeed);
        break;
      case 'right':
        offset.crossVectors(camera.up, camera.getWorldDirection(new THREE.Vector3())).multiplyScalar(-panSpeed);
        break;
    }
    
    camera.position.add(offset);
    controls.target.add(offset);
    controls.update();
  };

  const handleReset = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    
    // Reset to initial position centered on grid
    camera.position.set(12, 12, 20);
    controls.target.set(12, 0, 7);
    controls.update();
  };

  return (
    <Box
      ref={containerRef}
      h="100%"
      w="100%"
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {network.nodes.length === 0 && (
        <Text size="sm" c="dimmed" style={{ position: 'absolute', left: 16, top: 16, zIndex: 10 }}>
          Agrega elementos en 2D para verlos en 3D.
        </Text>
      )}
      
      {/* Control buttons */}
      <Box
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 10,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 8,
          padding: 8,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Stack gap={8}>
          {/* Pan controls */}
          <Box>
            <Group gap={4} justify="center">
              <Box style={{ width: 32 }} />
              <ActionIcon
                variant="light"
                size="sm"
                onClick={() => handlePan('up')}
                aria-label="Mover hacia arriba"
              >
                <IconArrowUp size={16} />
              </ActionIcon>
              <Box style={{ width: 32 }} />
            </Group>
            <Group gap={4} justify="center">
              <ActionIcon
                variant="light"
                size="sm"
                onClick={() => handlePan('left')}
                aria-label="Mover hacia la izquierda"
              >
                <IconArrowLeft size={16} />
              </ActionIcon>
              <ActionIcon
                variant="filled"
                color="blue"
                size="sm"
                onClick={handleReset}
                aria-label="Resetear vista"
              >
                <IconRefresh size={16} />
              </ActionIcon>
              <ActionIcon
                variant="light"
                size="sm"
                onClick={() => handlePan('right')}
                aria-label="Mover hacia la derecha"
              >
                <IconArrowRight size={16} />
              </ActionIcon>
            </Group>
            <Group gap={4} justify="center">
              <Box style={{ width: 32 }} />
              <ActionIcon
                variant="light"
                size="sm"
                onClick={() => handlePan('down')}
                aria-label="Mover hacia abajo"
              >
                <IconArrowDown size={16} />
              </ActionIcon>
              <Box style={{ width: 32 }} />
            </Group>
          </Box>
          
          {/* Zoom controls */}
          <Group gap={4} justify="center">
            <ActionIcon
              variant="light"
              size="sm"
              onClick={handleZoomOut}
              aria-label="Alejar"
            >
              <IconMinus size={16} />
            </ActionIcon>
            <ActionIcon
              variant="light"
              size="sm"
              onClick={handleZoomIn}
              aria-label="Acercar"
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Group>
        </Stack>
      </Box>
    </Box>
  );
}
