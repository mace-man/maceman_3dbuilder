import * as THREE from 'three';
import { Evaluator, Brush, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class BooleanOps {
  static getEvaluator() {
    if (!this._evaluator) {
      this._evaluator = new Evaluator();
      this._evaluator.useGroups = false;
    }
    return this._evaluator;
  }

  // メッシュからBrushを構築（ワールド行列をベイク）
  static meshToBrush(mesh) {
    mesh.updateMatrixWorld(true);
    let geom = mesh.geometry.clone();
    geom.applyMatrix4(mesh.matrixWorld);
    
    // three-bvh-csg はインデックス付き・重複頂点マージ済みジオメトリで最も安定して動作
    if (!geom.index) {
      try {
        geom = BufferGeometryUtils.mergeVertices(geom, 1e-4);
      } catch (e) {
        // フォールバック
      }
    }

    const brush = new Brush(geom, mesh.material ? mesh.material.clone() : new THREE.MeshStandardMaterial());
    brush.updateMatrixWorld(true);
    return brush;
  }

  // 結合 (Union / Merge)
  static union(targetMesh, toolMeshes) {
    const evaluator = this.getEvaluator();
    let currentBrush = this.meshToBrush(targetMesh);

    for (const tool of toolMeshes) {
      const toolBrush = this.meshToBrush(tool);
      currentBrush = evaluator.evaluate(currentBrush, toolBrush, ADDITION);
    }

    return this.finishResultMesh(currentBrush, targetMesh, '結合モデル');
  }

  // 型抜き / 差分 (Subtract) - target から tools を削る
  static subtract(targetMesh, toolMeshes) {
    const evaluator = this.getEvaluator();
    let currentBrush = this.meshToBrush(targetMesh);

    for (const tool of toolMeshes) {
      const toolBrush = this.meshToBrush(tool);
      currentBrush = evaluator.evaluate(currentBrush, toolBrush, SUBTRACTION);
    }

    return this.finishResultMesh(currentBrush, targetMesh, '型抜きモデル');
  }

  // 交差 (Intersect) - target と tool の重なり部分
  static intersect(targetMesh, toolMesh) {
    const evaluator = this.getEvaluator();
    const brushA = this.meshToBrush(targetMesh);
    const brushB = this.meshToBrush(toolMesh);

    const resultBrush = evaluator.evaluate(brushA, brushB, INTERSECTION);
    return this.finishResultMesh(resultBrush, targetMesh, '交差モデル');
  }

  // 結果BrushからクリーンなMeshを作成
  static finishResultMesh(brush, originalMesh, defaultName) {
    const geom = brush.geometry;
    geom.computeVertexNormals();
    geom.computeBoundingBox();

    // ワールド座標原点にリセットしたメッシュとする
    let mat;
    if (Array.isArray(originalMesh.material)) {
      mat = originalMesh.material.map(m => m.clone());
    } else if (originalMesh.material && typeof originalMesh.material.clone === 'function') {
      mat = originalMesh.material.clone();
    } else {
      mat = new THREE.MeshStandardMaterial({ color: 0x0078d4, roughness: 0.35, metalness: 0.15 });
    }

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = originalMesh.name ? `${originalMesh.name} (${defaultName})` : defaultName;
    return mesh;
  }
}
