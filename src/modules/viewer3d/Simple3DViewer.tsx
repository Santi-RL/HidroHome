import { useEffect, useRef } from 'react';
import { Box, Text } from '@mantine/core';
import * as THREE from 'three';
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
  const animationRef = useRef<number | null>(null);
  const network = useNetwork();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 240;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(6, 6, 10);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
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

    const planeGeometry = new THREE.PlaneGeometry(40, 40);
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = Math.PI / 2;
    plane.position.y = -0.1;
    scene.add(plane);

    const grid = new THREE.GridHelper(20, 20, 0x94a3b8, 0xcbd5f5);
    scene.add(grid);

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      rendererRef.current.setSize(newWidth, newHeight);
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
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

  return (
    <Box
      ref={containerRef}
      h={240}
      style={{
        borderRadius: 8,
        border: '1px solid var(--mantine-color-gray-4)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {network.nodes.length === 0 && (
        <Text size="sm" c="dimmed" style={{ position: 'absolute', left: 16, top: 16 }}>
          Agrega elementos en 2D para verlos en 3D.
        </Text>
      )}
    </Box>
  );
}
