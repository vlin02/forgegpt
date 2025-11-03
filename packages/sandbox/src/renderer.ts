import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import { Engine, Position } from "block";
import type { Block } from "block";

const HIGHLIGHT_COLOR = 0x00ffff;

export class Renderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private engine: Engine;

  private blockGeometry: THREE.BoxGeometry;
  private leverBase: THREE.BoxGeometry;
  private leverStick: THREE.BoxGeometry;
  private originGeometry: THREE.SphereGeometry;
  private originMaterial: THREE.MeshBasicMaterial;

  private meshes = new Map<string, { mesh: THREE.Mesh; material: THREE.MeshLambertMaterial }>();
  private leverMeshes = new Map<string, { group: THREE.Group; stick: THREE.Mesh; stickMaterial: THREE.MeshLambertMaterial }>();
  private dustMeshes = new Map<string, THREE.Group>();
  private cursorEdges: THREE.BoxHelper;

  private animationFrameId: number = 0;
  private highlightedBlock: any = null;
  private currentCursor: Position | null = null;

  constructor(container: HTMLElement, engine: Engine) {
    this.container = container;
    this.engine = engine;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(15, 15, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    this.setupLighting();
    this.setupWorldHelpers();

    this.blockGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    this.leverBase = new THREE.BoxGeometry(0.4, 0.1, 0.15);
    this.leverStick = new THREE.BoxGeometry(0.3, 0.06, 0.06);
    this.originGeometry = new THREE.SphereGeometry(0.2);
    this.originMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    this.cursorEdges = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)), 0x00ff00);
    this.cursorEdges.visible = false;
    this.scene.add(this.cursorEdges);

    this.animate();
  }

  private setupLighting(): void {
    const light = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(light);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);
  }

  private setupWorldHelpers(): void {
    const axesHelper = new THREE.AxesHelper(5);
    axesHelper.position.y = 0.01;
    this.scene.add(axesHelper);

    const worldSize = 10;
    const labels = [
      { text: 'E', pos: [worldSize, 0, 0] },
      { text: 'W', pos: [-worldSize, 0, 0] },
      { text: 'U', pos: [0, worldSize, 0] },
      { text: 'D', pos: [0, -worldSize, 0] },
      { text: 'S', pos: [0, 0, worldSize] },
      { text: 'N', pos: [0, 0, -worldSize] },
    ];
    labels.forEach(({ text, pos }) => {
      const sprite = this.createTextSprite(text, '#888888');
      sprite.position.set(pos[0], pos[1], pos[2]);
      this.scene.add(sprite);
    });

    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    this.scene.add(gridHelper);

    const originMarker = new THREE.Mesh(this.originGeometry, this.originMaterial);
    originMarker.position.set(0, 0, 0);
    this.scene.add(originMarker);
  }

  private createTextSprite(text: string, color: string): THREE.Sprite {
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

  private createDustShape(connectedDirs: Set<string>): THREE.Group {
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

  private getBlockColor(block: Block): number {
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

  private createMaterial(color: number): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ color });
  }

  private disposeMesh(mesh: THREE.Mesh, material: THREE.MeshLambertMaterial): void {
    mesh.geometry.dispose();
    material.dispose();
  }

  private disposeGroup(group: THREE.Group): void {
    group.children.forEach(child => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
        this.disposeMesh(child, child.material);
      }
    });
  }

  private updateScene(): void {
    const currentBlocks = new Set<string>();

    for (const [key, block] of this.engine.getAllBlocks()) {
      currentBlocks.add(key);
      const pos = Position.fromKey(key);
      const color = this.getBlockColor(block);
      const isHighlighted = block === this.highlightedBlock;

      switch (block.type) {
        case "lever":
          this.updateLever(key, block, pos, isHighlighted);
          break;
        case "dust":
          this.updateDust(key, block, pos, color, isHighlighted);
          break;
        default:
          this.updateBlock(key, pos, color, isHighlighted);
      }
    }

    this.cleanupRemovedBlocks(currentBlocks);
  }

  private updateLever(key: string, block: any, pos: Position, isHighlighted: boolean): void {
    const cached = this.leverMeshes.get(key);
    const stickColor = isHighlighted ? HIGHLIGHT_COLOR : (block.on ? 0x8b4513 : 0x654321);

    if (!cached) {
      const group = new THREE.Group();
      const base = new THREE.Mesh(this.leverBase, this.createMaterial(0x808080));
      const stickMaterial = this.createMaterial(stickColor);
      const stick = new THREE.Mesh(this.leverStick, stickMaterial);

      base.position.y = -0.45;
      stick.position.set(0, -0.3, 0);
      stick.rotation.z = block.on ? Math.PI / 4 : -Math.PI / 4;

      group.add(base, stick);
      group.position.set(pos.x, pos.y, pos.z);
      this.scene.add(group);
      this.leverMeshes.set(key, { group, stick, stickMaterial });
    } else {
      cached.stickMaterial.color.setHex(stickColor);
      cached.stick.rotation.z = block.on ? Math.PI / 4 : -Math.PI / 4;
    }
  }

  private updateDust(key: string, block: any, pos: Position, color: number, isHighlighted: boolean): void {
    const existing = this.dustMeshes.get(key);
    if (existing) {
      this.scene.remove(existing);
      this.disposeGroup(existing);
    }

    const dustColor = isHighlighted ? HIGHLIGHT_COLOR : color;
    const dustGroup = this.createDustShape(block.connectedDirs);
    dustGroup.position.set(pos.x, pos.y - 0.49, pos.z);
    dustGroup.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        child.material = this.createMaterial(dustColor);
      }
    });

    this.scene.add(dustGroup);
    this.dustMeshes.set(key, dustGroup);
  }

  private updateBlock(key: string, pos: Position, color: number, isHighlighted: boolean): void {
    const cached = this.meshes.get(key);
    if (!cached) {
      const material = this.createMaterial(color);
      const mesh = new THREE.Mesh(this.blockGeometry, material);
      mesh.position.set(pos.x, pos.y, pos.z);
      this.scene.add(mesh);
      this.meshes.set(key, { mesh, material });
    } else {
      const meshColor = isHighlighted ? HIGHLIGHT_COLOR : color;
      cached.material.color.setHex(meshColor);
    }
  }

  private cleanupRemovedBlocks(currentBlocks: Set<string>): void {
    for (const [key, cached] of this.meshes) {
      if (!currentBlocks.has(key)) {
        this.scene.remove(cached.mesh);
        this.disposeMesh(cached.mesh, cached.material);
        this.meshes.delete(key);
      }
    }

    for (const [key, cached] of this.leverMeshes) {
      if (!currentBlocks.has(key)) {
        this.scene.remove(cached.group);
        this.disposeGroup(cached.group);
        this.leverMeshes.delete(key);
      }
    }

    for (const [key, group] of this.dustMeshes) {
      if (!currentBlocks.has(key)) {
        this.scene.remove(group);
        this.disposeGroup(group);
        this.dustMeshes.delete(key);
      }
    }
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (this.currentCursor) {
      this.cursorEdges.position.set(this.currentCursor.x, this.currentCursor.y, this.currentCursor.z);
      this.cursorEdges.visible = true;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  render(): void {
    this.updateScene();
  }

  resetCamera(): void {
    this.camera.position.set(15, 15, 15);
    this.camera.lookAt(0, 0, 0);
    this.controls.reset();
  }

  setHighlight(block: any): void {
    this.highlightedBlock = block;
    this.updateScene();
  }

  setCursor(pos: Position | null): void {
    this.currentCursor = pos;
    if (!pos) {
      this.cursorEdges.visible = false;
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrameId);

    for (const cached of this.meshes.values()) {
      this.scene.remove(cached.mesh);
      this.disposeMesh(cached.mesh, cached.material);
    }
    this.meshes.clear();

    for (const cached of this.leverMeshes.values()) {
      this.scene.remove(cached.group);
      this.disposeGroup(cached.group);
    }
    this.leverMeshes.clear();

    for (const group of this.dustMeshes.values()) {
      this.scene.remove(group);
      this.disposeGroup(group);
    }
    this.dustMeshes.clear();

    this.blockGeometry.dispose();
    this.leverBase.dispose();
    this.leverStick.dispose();
    this.originGeometry.dispose();
    this.originMaterial.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

