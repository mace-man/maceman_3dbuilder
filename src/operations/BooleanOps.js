import * as THREE from 'three';
import { Evaluator, Brush, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';

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
    const geom = mesh.geometry.clone();
    geom.applyMatrix4(mesh.matrixWorld);
    
    // インデックスがない場合は付与
    let indexedGeom = geom;
    if (!geom.index) {
      // three-bvh-csg はインデックス付きジオメトリを推奨
      // 必要に応じて生成
    }

    const brush = new Brush(indexedGeom, mesh.material.clone());
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
    const mesh = new THREE.Mesh(geom, originalMesh.material.clone());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = originalMesh.name ? `${originalMesh.name} (${defaultName})` : defaultName;
    return mesh;
  }
}
