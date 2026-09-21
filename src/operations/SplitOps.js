import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';

export class SplitOps {
  // 切断用カッティングボックスの作成
  // planePosition: 平面上の中心点, planeNormal: 平面の法線ベクトル (正規化済み)
  static createCuttingBrush(planePosition, planeNormal, keepTop) {
    const boxSize = 2000;
    const boxGeo = new THREE.BoxGeometry(boxSize, boxSize, boxSize);

    // 平面の法線方向に向ける回転
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, planeNormal);

    // keepTop が true の場合、下半分を削るため、ボックスの中心を planePosition - normal * (boxSize / 2) に置く
    // keepTop が false の場合、上半分を削るため、ボックスの中心を planePosition + normal * (boxSize / 2) に置く
    const offset = planeNormal.clone().multiplyScalar((keepTop ? -1 : 1) * (boxSize / 2));
    const boxPos = planePosition.clone().add(offset);

    boxGeo.applyQuaternion(quat);
    boxGeo.translate(boxPos.x, boxPos.y, boxPos.z);

    const brush = new Brush(boxGeo, new THREE.MeshBasicMaterial());
    brush.updateMatrixWorld(true);
    return brush;
  }

  // 対象メッシュから指定平面で分割を実行
  // mode: 'top' | 'bottom' | 'both'
  static splitMesh(targetMesh, planePosition, planeNormal, mode = 'both') {
    const evaluator = new Evaluator();
    evaluator.useGroups = false;

    targetMesh.updateMatrixWorld(true);
    const targetGeom = targetMesh.geometry.clone();
    targetGeom.applyMatrix4(targetMesh.matrixWorld);
    const targetBrush = new Brush(targetGeom, targetMesh.material.clone());
    targetBrush.updateMatrixWorld(true);

    const results = [];

    // 上側を残す、または両方
    if (mode === 'top' || mode === 'both') {
      const cutBrushBottom = this.createCuttingBrush(planePosition, planeNormal, true);
      const topResult = evaluator.evaluate(targetBrush, cutBrushBottom, SUBTRACTION);
      topResult.geometry.computeVertexNormals();
      topResult.geometry.computeBoundingBox();

      const topMesh = new THREE.Mesh(topResult.geometry, targetMesh.material.clone());
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      topMesh.name = `${targetMesh.name || 'モデル'} (上部)`;
      results.push(topMesh);
    }

    // 下側を残す、または両方
    if (mode === 'bottom' || mode === 'both') {
      const cutBrushTop = this.createCuttingBrush(planePosition, planeNormal, false);
      const bottomResult = evaluator.evaluate(targetBrush, cutBrushTop, SUBTRACTION);
      bottomResult.geometry.computeVertexNormals();
      bottomResult.geometry.computeBoundingBox();

      const bottomMesh = new THREE.Mesh(bottomResult.geometry, targetMesh.material.clone());
      bottomMesh.castShadow = true;
      bottomMesh.receiveShadow = true;
      bottomMesh.name = `${targetMesh.name || 'モデル'} (下部)`;
      results.push(bottomMesh);
    }

    return results;
  }

  // 切断用プレビュー平面ヘルパーの作成
  static createSlicePlaneHelper() {
    const group = new THREE.Group();
    group.name = 'SlicePlaneHelper';

    // 半透明の平面
    const size = 160;
    const planeGeo = new THREE.PlaneGeometry(size, size);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x0078d4,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.rotation.x = -Math.PI / 2; // デフォルトで水平
    group.add(planeMesh);

    // 外枠ライン
    const edges = new THREE.EdgesGeometry(planeGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00bcf2, linewidth: 2 });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    wireframe.rotation.x = -Math.PI / 2;
    group.add(wireframe);

    // 法線矢印
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      25,
      0x00ff88,
      8,
      5
    );
    group.add(arrow);

    group.visible = false;
    return group;
  }
}
