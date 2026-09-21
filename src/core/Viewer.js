import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class Viewer {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.width = canvasContainer.clientWidth;
    this.height = canvasContainer.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x18181c);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 2000);
    this.camera.position.set(150, 160, 200);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // Orbit Controls
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.05;
    this.orbit.maxPolarAngle = Math.PI / 2 + 0.05; // 床下には潜りすぎない
    this.orbit.target.set(0, 20, 0);

    // Transform Controls
    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.size = 0.75;
    this.transformControls.space = 'world';
    this.scene.add(this.transformControls);

    // Disable orbit when transforming
    this.transformControls.addEventListener('dragging-changed', (event) => {
      this.orbit.enabled = !event.value;
    });

    // Lights
    this.setupLights();

    // Bed / Grid (3D Builder style build plate)
    this.setupBuildPlate();

    // Resize handling
    window.addEventListener('resize', () => this.onResize());

    // Animation Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(120, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 600;
    const d = 160;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x90b0e0, 0.8);
    fillLight.position.set(-100, 80, -100);
    this.scene.add(fillLight);
  }

  setupBuildPlate() {
    this.buildPlateGroup = new THREE.Group();
    this.buildPlateGroup.name = 'BuildPlateGroup';

    // Grid (200mm x 200mm, 10mm divisions)
    const gridSize = 200;
    const gridDivisions = 20;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x0078d4, 0x333340);
    gridHelper.position.y = 0.01;
    this.buildPlateGroup.add(gridHelper);

    // Sub-grid (1mm lines subtle)
    const subGrid = new THREE.GridHelper(gridSize, 200, 0x22222a, 0x22222a);
    subGrid.position.y = 0.005;
    this.buildPlateGroup.add(subGrid);

    // Shadow receiver plane
    const planeGeo = new THREE.PlaneGeometry(gridSize, gridSize);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.25 });
    const shadowPlane = new THREE.Mesh(planeGeo, planeMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0;
    shadowPlane.receiveShadow = true;
    this.buildPlateGroup.add(shadowPlane);

    // Axis indicators at origin (X: Red, Y: Green, Z: Blue)
    const axes = new THREE.AxesHelper(20);
    axes.position.y = 0.02;
    axes.renderOrder = 1;
    this.buildPlateGroup.add(axes);

    this.scene.add(this.buildPlateGroup);
  }

  setGridVisible(visible) {
    this.buildPlateGroup.visible = visible;
  }

  onResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  animate() {
    requestAnimationFrame(this.animate);
    this.orbit.update();
    this.renderer.render(this.scene, this.camera);
  }

  // Camera presets
  setView(viewName) {
    const dist = 220;
    const target = this.orbit.target;
    switch (viewName) {
      case 'top':
        this.camera.position.set(target.x, target.y + dist, target.z + 0.01);
        break;
      case 'front':
        this.camera.position.set(target.x, target.y, target.z + dist);
        break;
      case 'right':
        this.camera.position.set(target.x + dist, target.y, target.z);
        break;
      case 'left':
        this.camera.position.set(target.x - dist, target.y, target.z);
        break;
      case 'back':
        this.camera.position.set(target.x, target.y, target.z - dist);
        break;
      case 'iso':
      default:
        this.camera.position.set(target.x + 140, target.y + 140, target.z + 180);
        break;
    }
    this.camera.lookAt(target);
    this.orbit.update();
  }

  fitToView(objects) {
    if (!objects || objects.length === 0) {
      this.orbit.target.set(0, 20, 0);
      this.camera.position.set(150, 160, 200);
      this.orbit.update();
      return;
    }

    const box = new THREE.Box3();
    objects.forEach(obj => box.expandByObject(obj));

    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z, 20);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.8;
    cameraDistance = Math.max(cameraDistance, 50);

    const offset = new THREE.Vector3(1, 0.9, 1.2).normalize().multiplyScalar(cameraDistance);
    this.camera.position.copy(center).add(offset);
    this.orbit.target.copy(center);
    this.orbit.update();
  }
}
