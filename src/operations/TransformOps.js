import * as THREE from 'three';

export class TransformOps {
  // 接地（Lay Flat / Settle to Floor Y=0）
  static layFlat(mesh) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    const minY = box.min.y;
    mesh.position.y -= minY;
    mesh.updateMatrixWorld(true);
  }

  // 寸法（Bounding Box Size）を取得 (mm)
  static getDimensions(mesh) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    return size;
  }

  // 指定した寸法(mm)に変更する
  // lockAspect: 縦横比固定
  static setDimensions(mesh, targetSize, lockAspect = false, changedAxis = 'x') {
    const currentSize = this.getDimensions(mesh);
    if (currentSize.x === 0 || currentSize.y === 0 || currentSize.z === 0) return;

    if (lockAspect) {
      let ratio = 1;
      if (changedAxis === 'x') ratio = targetSize.x / currentSize.x;
      else if (changedAxis === 'y') ratio = targetSize.y / currentSize.y;
      else if (changedAxis === 'z') ratio = targetSize.z / currentSize.z;

      mesh.scale.multiplyScalar(ratio);
    } else {
      if (targetSize.x !== undefined) mesh.scale.x *= (targetSize.x / currentSize.x);
      if (targetSize.y !== undefined) mesh.scale.y *= (targetSize.y / currentSize.y);
      if (targetSize.z !== undefined) mesh.scale.z *= (targetSize.z / currentSize.z);
    }

    mesh.updateMatrixWorld(true);
  }

  // 複数オブジェクトの整列 (Align)
  // axis: 'x' | 'y' | 'z'
  // alignType: 'min' (左/下) | 'center' (中央) | 'max' (右/上)
  static align(meshes, axis = 'x', alignType = 'center') {
    if (meshes.length < 2) return;

    // 全体の境界ボックス
    const globalBox = new THREE.Box3();
    const boxes = meshes.map(mesh => {
      mesh.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(mesh);
      globalBox.union(b);
      return { mesh, box: b };
    });

    let targetCoord;
    if (alignType === 'min') {
      targetCoord = globalBox.min[axis];
    } else if (alignType === 'max') {
      targetCoord = globalBox.max[axis];
    } else { // center
      targetCoord = (globalBox.min[axis] + globalBox.max[axis]) / 2;
    }

    boxes.forEach(({ mesh, box }) => {
      let currentCoord;
      if (alignType === 'min') currentCoord = box.min[axis];
      else if (alignType === 'max') currentCoord = box.max[axis];
      else currentCoord = (box.min[axis] + box.max[axis]) / 2;

      const delta = targetCoord - currentCoord;
      mesh.position[axis] += delta;
      mesh.updateMatrixWorld(true);
    });
  }
}
