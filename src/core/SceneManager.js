import * as THREE from 'three';

export class SceneManager {
  constructor(viewer) {
    this.viewer = viewer;
    this.objects = []; // 編集可能メッシュリスト
    this.selectedObjects = []; // 選択中のオブジェクトリスト
    this.lockAspect = true;
    this.scaleStart = null;
    this.listeners = {
      selectionChanged: [],
      objectsChanged: [],
      transformChanged: [],
      transformEnd: []
    };

    // TransformControls のイベント監視
    this.viewer.transformControls.addEventListener('objectChange', () => {
      const tc = this.viewer.transformControls;
      const object = tc.object;
      if (tc.mode === 'scale' && this.lockAspect && object) {
        if (!this.scaleStart) {
          this.scaleStart = object.scale.clone();
        }
        this.applyUniformScale(tc, object);
      }
      this.emit('transformChanged', this.selectedObjects);
    });

    this.viewer.transformControls.addEventListener('dragging-changed', (event) => {
      const tc = this.viewer.transformControls;
      const object = tc.object;
      if (event.value) {
        // ドラッグ開始
        if (tc.mode === 'scale' && object) {
          this.scaleStart = object.scale.clone();
        }
      } else {
        // ドラッグ終了
        this.scaleStart = null;
        this.emit('transformEnd', this.selectedObjects);
        this.emit('transformChanged', this.selectedObjects);
      }
    });

    this.setupPointerRaycast();
  }

  // 比率維持スケール適用
  applyUniformScale(tc, object) {
    const start = this.scaleStart;
    if (!start) return;

    const axis = tc.axis;
    let ratio = 1;

    // 平面ハンドル (XY, YZ, XZ) または 全軸ハンドル (XYZ) の場合:
    // pointStart から pointEnd への正射影比率を用いて、平面上でのドラッグにスムーズかつ正確に追従
    const isPlaneOrAll = axis && (axis.length >= 2 || axis === 'XYZ');
    if (isPlaneOrAll && tc.pointStart && tc.pointEnd && tc.pointStart.lengthSq() > 1e-6) {
      ratio = tc.pointEnd.dot(tc.pointStart) / tc.pointStart.lengthSq();
    } else if (axis === 'X') {
      ratio = Math.abs(start.x) > 1e-6 ? object.scale.x / start.x : 1;
    } else if (axis === 'Y') {
      ratio = Math.abs(start.y) > 1e-6 ? object.scale.y / start.y : 1;
    } else if (axis === 'Z') {
      ratio = Math.abs(start.z) > 1e-6 ? object.scale.z / start.z : 1;
    } else {
      // フォールバック
      const rx = Math.abs(start.x) > 1e-6 ? object.scale.x / start.x : 1;
      const ry = Math.abs(start.y) > 1e-6 ? object.scale.y / start.y : 1;
      const rz = Math.abs(start.z) > 1e-6 ? object.scale.z / start.z : 1;
      const dx = (axis && axis.includes('X')) ? Math.abs(rx - 1) : -1;
      const dy = (axis && axis.includes('Y')) ? Math.abs(ry - 1) : -1;
      const dz = (axis && axis.includes('Z')) ? Math.abs(rz - 1) : -1;
      if (dx >= dy && dx >= dz) ratio = rx;
      else if (dy >= dx && dy >= dz) ratio = ry;
      else ratio = rz;
    }

    if (Number.isFinite(ratio)) {
      ratio = Math.max(0.001, ratio);
      object.scale.set(
        start.x * ratio,
        start.y * ratio,
        start.z * ratio
      );
      object.updateMatrixWorld(true);
    }
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

  // オブジェクト配下の全メッシュのマテリアルに関数を適用
  applyMaterial(callback) {
    this.selectedObjects.forEach(obj => {
      obj.traverse(child => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => callback(mat, child));
          } else {
            callback(child.material, child);
          }
        }
      });
    });
  }

  // 選択中オブジェクトの代表マテリアルを取得（UI反映用）
  getSelectedMaterial() {
    if (this.selectedObjects.length === 0) return null;
    let foundMat = null;
    this.selectedObjects[0].traverse(child => {
      if (!foundMat && child.isMesh && child.material) {
        foundMat = Array.isArray(child.material) ? child.material[0] : child.material;
      }
    });
    return foundMat;
  }

  // 選択中オブジェクトのマテリアル一括変更
  setSelectedColor(hexColor) {
    this.applyMaterial(mat => {
      if (mat.color) {
        mat.color.set(hexColor);
      }
    });
  }

  setSelectedRoughness(val) {
    this.applyMaterial(mat => {
      mat.roughness = val;
    });
  }

  setSelectedMetalness(val) {
    this.applyMaterial(mat => {
      mat.metalness = val;
    });
  }

  setSelectedWireframe(val) {
    this.applyMaterial(mat => {
      mat.wireframe = val;
      mat.needsUpdate = true;
    });
  }

  setSelectedOpacity(val) {
    const isTransparent = val < 1.0;
    this.applyMaterial(mat => {
      mat.transparent = isTransparent;
      mat.opacity = val;
      mat.depthWrite = !isTransparent;
      mat.needsUpdate = true;
    });
  }
}
