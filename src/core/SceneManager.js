import * as THREE from 'three';

export class SceneManager {
  constructor(viewer) {
    this.viewer = viewer;
    this.objects = []; // 編集可能メッシュリスト
    this.selectedObjects = []; // 選択中のオブジェクトリスト
    this.listeners = {
      selectionChanged: [],
      objectsChanged: [],
      transformChanged: []
    };

    // TransformControls のイベント監視
    this.viewer.transformControls.addEventListener('objectChange', () => {
      this.emit('transformChanged', this.selectedObjects);
    });

    this.viewer.transformControls.addEventListener('dragging-changed', (event) => {
      if (!event.value) {
        // ドラッグ終了時
        this.emit('transformChanged', this.selectedObjects);
      }
    });

    this.setupPointerRaycast();
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  // 3D空間クリックによる選択判定
  setupPointerRaycast() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let downTime = 0;
    let downPos = { x: 0, y: 0 };

    const dom = this.viewer.renderer.domElement;

    dom.addEventListener('pointerdown', (e) => {
      downTime = Date.now();
      downPos = { x: e.clientX, y: e.clientY };
    });

    dom.addEventListener('pointerup', (e) => {
      // ドラッグ操作ではなくクリックだった場合のみ選択判定
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (Date.now() - downTime > 300 || dist > 5) return;
      if (this.viewer.transformControls.dragging) return;

      const rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, this.viewer.camera);
      const intersects = raycaster.intersectObjects(this.objects, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (e.shiftKey || e.ctrlKey) {
          this.toggleSelect(hit);
        } else {
          this.select(hit);
        }
      } else {
        if (!e.shiftKey && !e.ctrlKey) {
          this.deselectAll();
        }
      }
    });
  }

  addObject(mesh) {
    if (!mesh.isMesh) return;
    this.viewer.scene.add(mesh);
    this.objects.push(mesh);
    this.select(mesh);
    this.emit('objectsChanged', this.objects);
  }

  removeObject(mesh) {
    const index = this.objects.indexOf(mesh);
    if (index !== -1) {
      this.objects.splice(index, 1);
      this.viewer.scene.remove(mesh);
      this.deselect(mesh);
      this.emit('objectsChanged', this.objects);
    }
  }

  removeSelected() {
    const toRemove = [...this.selectedObjects];
    toRemove.forEach(mesh => this.removeObject(mesh));
  }

  duplicateSelected() {
    if (this.selectedObjects.length === 0) return;
    const newMeshes = [];
    this.selectedObjects.forEach(mesh => {
      const clone = mesh.clone();
      clone.geometry = mesh.geometry.clone();
      clone.material = mesh.material.clone();
      clone.position.x += 10;
      clone.position.z += 10;
      clone.name = `${mesh.name} (コピー)`;
      this.viewer.scene.add(clone);
      this.objects.push(clone);
      newMeshes.push(clone);
    });
    this.selectedObjects = [];
    newMeshes.forEach(m => this.select(m, true));
    this.emit('objectsChanged', this.objects);
  }

  select(mesh, multi = false) {
    if (!multi) {
      this.selectedObjects = [];
    }
    if (mesh && !this.selectedObjects.includes(mesh)) {
      this.selectedObjects.push(mesh);
    }
    this.updateSelectionGizmo();
    this.emit('selectionChanged', this.selectedObjects);
  }

  deselect(mesh) {
    const idx = this.selectedObjects.indexOf(mesh);
    if (idx !== -1) {
      this.selectedObjects.splice(idx, 1);
    }
    this.updateSelectionGizmo();
    this.emit('selectionChanged', this.selectedObjects);
  }

  toggleSelect(mesh) {
    if (this.selectedObjects.includes(mesh)) {
      this.deselect(mesh);
    } else {
      this.select(mesh, true);
    }
  }

  selectAll() {
    this.selectedObjects = [...this.objects];
    this.updateSelectionGizmo();
    this.emit('selectionChanged', this.selectedObjects);
  }

  deselectAll() {
    this.selectedObjects = [];
    this.updateSelectionGizmo();
    this.emit('selectionChanged', this.selectedObjects);
  }

  updateSelectionGizmo() {
    if (this.selectedObjects.length === 1) {
      this.viewer.transformControls.attach(this.selectedObjects[0]);
    } else {
      this.viewer.transformControls.detach();
    }
  }

  setTransformMode(mode) {
    // 'translate' | 'rotate' | 'scale'
    this.viewer.transformControls.setMode(mode);
  }

  // 選択中オブジェクトのマテリアル一括変更
  setSelectedColor(hexColor) {
    this.selectedObjects.forEach(mesh => {
      if (mesh.material) {
        mesh.material.color.set(hexColor);
      }
    });
  }

  setSelectedRoughness(val) {
    this.selectedObjects.forEach(mesh => {
      if (mesh.material) {
        mesh.material.roughness = val;
      }
    });
  }

  setSelectedMetalness(val) {
    this.selectedObjects.forEach(mesh => {
      if (mesh.material) {
        mesh.material.metalness = val;
      }
    });
  }

  setSelectedWireframe(val) {
    this.selectedObjects.forEach(mesh => {
      if (mesh.material) {
        mesh.material.wireframe = val;
      }
    });
  }

  setSelectedOpacity(val) {
    this.selectedObjects.forEach(mesh => {
      if (mesh.material) {
        mesh.material.transparent = val < 1.0;
        mesh.material.opacity = val;
      }
    });
  }
}
