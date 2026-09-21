import * as THREE from 'three';

export class History {
  constructor(sceneManager, maxSteps = 30) {
    this.sm = sceneManager;
    this.maxSteps = maxSteps;
    this.undoStack = [];
    this.redoStack = [];
    this.isApplying = false;

    // キーボードショートカット
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.redo();
      }
    });
  }

  // 現在の全メッシュの状態をシリアライズスナップショット化
  captureSnapshot() {
    if (this.isApplying) return;

    const snapshot = this.sm.objects.map(mesh => {
      return {
        name: mesh.name,
        geometry: mesh.geometry.clone(),
        position: mesh.position.clone(),
        rotation: mesh.rotation.clone(),
        scale: mesh.scale.clone(),
        material: mesh.material.clone()
      };
    });

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxSteps) {
      this.undoStack.shift();
    }
    this.redoStack = []; // 新規操作時はredoをクリア
  }

  undo() {
    if (this.undoStack.length === 0) return;

    // 現在の状態をredoに退避
    const current = this.sm.objects.map(mesh => ({
      name: mesh.name,
      geometry: mesh.geometry.clone(),
      position: mesh.position.clone(),
      rotation: mesh.rotation.clone(),
      scale: mesh.scale.clone(),
      material: mesh.material.clone()
    }));
    this.redoStack.push(current);

    const prevSnapshot = this.undoStack.pop();
    this.restoreSnapshot(prevSnapshot);
  }

  redo() {
    if (this.redoStack.length === 0) return;

    // 現在の状態をundoに保存
    const current = this.sm.objects.map(mesh => ({
      name: mesh.name,
      geometry: mesh.geometry.clone(),
      position: mesh.position.clone(),
      rotation: mesh.rotation.clone(),
      scale: mesh.scale.clone(),
      material: mesh.material.clone()
    }));
    this.undoStack.push(current);

    const nextSnapshot = this.redoStack.pop();
    this.restoreSnapshot(nextSnapshot);
  }

  restoreSnapshot(snapshot) {
    this.isApplying = true;
    this.sm.deselectAll();

    // シーンから全既存オブジェクトを削除
    const toRemove = [...this.sm.objects];
    toRemove.forEach(m => this.sm.removeObject(m));

    // スナップショットから再構築
    snapshot.forEach(item => {
      const mesh = new THREE.Mesh(item.geometry.clone(), item.material.clone());
      mesh.position.copy(item.position);
      mesh.rotation.copy(item.rotation);
      mesh.scale.copy(item.scale);
      mesh.name = item.name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.sm.addObject(mesh);
    });

    this.sm.deselectAll();
    this.isApplying = false;
  }
}
