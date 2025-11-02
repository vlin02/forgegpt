import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import { Engine, Position } from "block";
import type { Block } from "block";

const HIGHLIGHT_COLOR = 0x00ffff;
const CONNECTED_DIRS_KEY = '__connectedDirsKey';

const connectedDirsKey = (dirs: Set<string>): string =>
  JSON.stringify(Array.from(dirs).sort());

function createTextSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = 128;
  canvas.height = 64;
  context.fillStyle = color;
  context.font = 'Bold 48px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 64, 32);
  
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.6 });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.6, 0.3, 1);
  return sprite;
}

function createDustShape(connectedDirs: Set<string>): THREE.Group {
  const group = new THREE.Group();
  const height = 0.02, width = 0.1, length = 0.5;
  
  if (connectedDirs.size === 0) {
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, height, 0.2)));
    return group;
  }
  
  Array.from(connectedDirs).forEach(dir => {
    const [x, , z] = dir.split(',').map(Number);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(
      x !== 0 ? length : width, height, z !== 0 ? length : width
    ));
    mesh.position.set(x * length / 2, 0, z * length / 2);
    group.add(mesh);
  });
  
  group.add(new THREE.Mesh(new THREE.BoxGeometry(width, height, width)));
  return group;
}

function getBlockColor(block: Block): number {
  switch (block.type) {
    case "solid": return block.power > 0 ? 0xffffff : 0x9d9d97;
    case "lever": return block.on ? 0xffff00 : 0x333333;
    case "piston": return block.extended ? 0x88ff44 : 0x556b2f;
    case "dust": {
      const ratio = block.power / 15;
      if (ratio === 0) return 0x330000;
      return (255 << 16) | (Math.floor((1 - ratio) * 100) << 8) | 0;
    }
    default: return 0xffffff;
  }
}

const createMaterial = (color: number) => new THREE.MeshLambertMaterial({ color });

export function createRenderer(
  container: HTMLElement,
  engine: Engine
): { render: () => void; dispose: () => void; resetCamera: () => void; setHighlight: (block: any) => void; setCursor: (pos: Position | null) => void } {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);

  const light = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(light);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(15, 15, 15);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Add axes helper (red=X, green=Y, blue=Z)
  const axesHelper = new THREE.AxesHelper(5);
  axesHelper.position.y = 0.01; // Slightly above grid to prevent z-fighting
  scene.add(axesHelper);

  // Create axis labels at world boundaries (20x20x20 cube)
  const labelColor = '#888888';
  const worldSize = 10;
  const labels = [
    { text: 'E', pos: [ worldSize, 0, 0 ] },
    { text: 'W', pos: [ -worldSize, 0, 0 ] },
    { text: 'U', pos: [ 0, worldSize, 0 ] },
    { text: 'D', pos: [ 0, -worldSize, 0 ] },
    { text: 'S', pos: [ 0, 0, worldSize ] },
    { text: 'N', pos: [ 0, 0, -worldSize ] },
  ];
  labels.forEach(({ text, pos }) => {
    const sprite = createTextSprite(text, labelColor);
    sprite.position.set(pos[0], pos[1], pos[2]);
    scene.add(sprite);
  });

  // Add grid on XZ plane (y=0)
  const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
  scene.add(gridHelper);

  // Add origin marker
  const originGeometry = new THREE.SphereGeometry(0.2);
  const originMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const originMarker = new THREE.Mesh(originGeometry, originMaterial);
  originMarker.position.set(0, 0, 0);
  scene.add(originMarker);

  const blockGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
  
  // Lever: gray base + brown stick
  const leverBase = new THREE.BoxGeometry(0.4, 0.1, 0.15);
  const leverStick = new THREE.BoxGeometry(0.3, 0.06, 0.06);
  
  const meshes = new Map<string, THREE.Mesh>();
  const leverMeshes = new Map<string, THREE.Group>();
  const dustMeshes = new Map<string, THREE.Group>();
  let animationFrameId: number;
  let highlightedBlock: any = null;
  
  const cursorEdges = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)), 0x00ff00);
  cursorEdges.visible = false;
  scene.add(cursorEdges);

  const disposeObject = (obj: THREE.Mesh | THREE.Group, disposeGeometry: boolean) => {
    if (obj instanceof THREE.Mesh) {
      (obj.material as THREE.MeshLambertMaterial).dispose();
    } else {
      obj.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          if (disposeGeometry) child.geometry.dispose();
          (child.material as THREE.MeshLambertMaterial).dispose();
        }
      });
    }
  };

  function updateScene(): void {
    const currentBlocks = new Set<string>();

    for (const [key, block] of (engine as any).blocks) {
      currentBlocks.add(key);
      const pos = Position.fromKey(key);
      const color = getBlockColor(block);
      const isHighlighted = block === highlightedBlock;
      
      switch (block.type) {
        case "lever": {
          let leverGroup = leverMeshes.get(key);
          const stickColor = isHighlighted ? HIGHLIGHT_COLOR : (block.on ? 0x8b4513 : 0x654321);
          
          if (!leverGroup) {
            leverGroup = new THREE.Group();
            const base = new THREE.Mesh(leverBase, createMaterial(0x808080));
            const stick = new THREE.Mesh(leverStick, createMaterial(stickColor));
            
            base.position.y = -0.45;
            stick.position.set(0, -0.3, 0);
            stick.rotation.z = block.on ? Math.PI / 4 : -Math.PI / 4;
            
            leverGroup.add(base, stick);
            leverGroup.position.set(pos.x, pos.y, pos.z);
            scene.add(leverGroup);
            leverMeshes.set(key, leverGroup);
          } else {
            const stick = leverGroup.children[1] as THREE.Mesh;
            (stick.material as THREE.MeshLambertMaterial).color.setHex(stickColor);
            stick.rotation.z = block.on ? Math.PI / 4 : -Math.PI / 4;
          }
          break;
        }
        
        case "dust": {
          let dustGroup = dustMeshes.get(key);
          const needsRebuild = !dustGroup || 
            (dustGroup.userData[CONNECTED_DIRS_KEY] !== connectedDirsKey(block.connectedDirs));
          
          if (needsRebuild) {
            if (dustGroup) {
              scene.remove(dustGroup);
              dustGroup.children.forEach(child => {
                if (child instanceof THREE.Mesh) {
                  child.geometry.dispose();
                  (child.material as THREE.MeshLambertMaterial).dispose();
                }
              });
            }
            
            dustGroup = createDustShape(block.connectedDirs);
            dustGroup.userData[CONNECTED_DIRS_KEY] = connectedDirsKey(block.connectedDirs);
            dustGroup.position.set(pos.x, pos.y - 0.49, pos.z);
            
            dustGroup.children.forEach(child => {
              if (child instanceof THREE.Mesh) {
                child.material = createMaterial(color);
              }
            });
            
            scene.add(dustGroup);
            dustMeshes.set(key, dustGroup);
          } else if (dustGroup) {
            const dustColor = isHighlighted ? HIGHLIGHT_COLOR : color;
            dustGroup.children.forEach(child => {
              if (child instanceof THREE.Mesh) {
                (child.material as THREE.MeshLambertMaterial).color.setHex(dustColor);
              }
            });
          }
          break;
        }
        
        default: {
          let mesh = meshes.get(key);
          if (!mesh) {
            mesh = new THREE.Mesh(blockGeometry, createMaterial(color));
            mesh.position.set(pos.x, pos.y, pos.z);
            scene.add(mesh);
            meshes.set(key, mesh);
          } else {
            const meshColor = isHighlighted ? HIGHLIGHT_COLOR : color;
            (mesh.material as THREE.MeshLambertMaterial).color.setHex(meshColor);
          }
        }
      }
    }

    const cleanupMeshMap = (map: Map<string, THREE.Mesh | THREE.Group>, disposeGeometry = false) => {
      for (const [key, obj] of map) {
        if (!currentBlocks.has(key)) {
          scene.remove(obj);
          disposeObject(obj, disposeGeometry);
          map.delete(key);
        }
      }
    };
    
    cleanupMeshMap(meshes as Map<string, THREE.Mesh | THREE.Group>);
    cleanupMeshMap(leverMeshes as Map<string, THREE.Mesh | THREE.Group>);
    cleanupMeshMap(dustMeshes as Map<string, THREE.Mesh | THREE.Group>, true);
  }

  let currentCursor: Position | null = null;

  function animate(): void {
    animationFrameId = requestAnimationFrame(animate);
    
    // Update cursor position
    if (currentCursor) {
      cursorEdges.position.set(currentCursor.x, currentCursor.y, currentCursor.z);
      cursorEdges.visible = true;
    }
    
    controls.update();
    renderer.render(scene, camera);
  }

  function render(): void {
    updateScene();
  }

  function resetCamera(): void {
    camera.position.set(15, 15, 15);
    camera.lookAt(0, 0, 0);
    controls.reset();
  }

  function setHighlight(block: any): void {
    highlightedBlock = block;
    updateScene();
  }

  function setCursor(pos: Position | null): void {
    currentCursor = pos;
    if (!pos) {
      cursorEdges.visible = false;
    }
  }

  animate();

  function dispose(): void {
    cancelAnimationFrame(animationFrameId);
    
    [meshes, leverMeshes, dustMeshes].forEach((map, i) => {
      for (const obj of map.values()) {
        scene.remove(obj as THREE.Object3D);
        disposeObject(obj as THREE.Mesh | THREE.Group, i === 2);
      }
      map.clear();
    });
    
    [blockGeometry, leverBase, leverStick, originGeometry].forEach(g => g.dispose());
    originMaterial.dispose();
    controls.dispose();
    renderer.dispose();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  }

  return { render, dispose, resetCamera, setHighlight, setCursor };
}

