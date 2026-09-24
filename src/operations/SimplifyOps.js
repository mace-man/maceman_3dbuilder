import * as THREE from 'three';
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class SimplifyOps {
  /**
   * 境界エッジ（1つの面でしか使われていないエッジ＝穴の境界）の数をカウント
   * @param {THREE.BufferGeometry} geometry 
   */
  static countBoundaryEdges(geometry) {
    if (!geometry) return 0;
    const welded = this.createWeldedGeometry(geometry);
    const index = welded.getIndex();
    if (!index) return 0;

    const edgeCount = new Map();
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i);
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);
      const e1 = Math.min(a, b) + '_' + Math.max(a, b);
      const e2 = Math.min(b, c) + '_' + Math.max(b, c);
      const e3 = Math.min(c, a) + '_' + Math.max(c, a);
      edgeCount.set(e1, (edgeCount.get(e1) || 0) + 1);
      edgeCount.set(e2, (edgeCount.get(e2) || 0) + 1);
      edgeCount.set(e3, (edgeCount.get(e3) || 0) + 1);
    }

    let boundaries = 0;
    for (const count of edgeCount.values()) {
      if (count === 1) boundaries++;
    }
    return boundaries;
  }

  /**
   * 三角形メッシュの符号付き体積を算出
   * @param {THREE.BufferGeometry} geometry 
   */
  static calculateSignedVolume(geometry) {
    const pos = geometry.getAttribute('position');
    const index = geometry.getIndex();
    if (!pos || !index) return 0;

    let totalVol = 0;
    const p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), p3 = new THREE.Vector3();
    const cross = new THREE.Vector3();

    for (let i = 0; i < index.count; i += 3) {
      p1.fromBufferAttribute(pos, index.getX(i));
      p2.fromBufferAttribute(pos, index.getX(i + 1));
      p3.fromBufferAttribute(pos, index.getX(i + 2));
      cross.crossVectors(p2, p3);
      totalVol += p1.dot(cross) / 6.0;
    }
    return totalVol;
  }

  /**
   * 座標位置のみに基づいて重複頂点を溶接・結合（法線分割による面の隙間・穴を防ぐ）
   * @param {THREE.BufferGeometry} geometry 
   */
  static createWeldedGeometry(geometry) {
    const welded = new THREE.BufferGeometry();
    const pos = geometry.getAttribute('position');
    if (!pos) return geometry.clone();

    welded.setAttribute('position', pos.clone());
    if (geometry.getIndex()) {
      welded.setIndex(geometry.getIndex().clone());
    }
    return BufferGeometryUtils.mergeVertices(welded, 1e-4);
  }

  /**
   * 穴が空かず、立体が破綻しない安全な最大削減可能頂点数を探索
   * @param {THREE.BufferGeometry} weldedGeom 
   */
  static findMaxSafeRemovable(weldedGeom) {
    const totalVerts = weldedGeom.attributes.position ? weldedGeom.attributes.position.count : 0;
    const totalFaces = weldedGeom.index ? Math.floor(weldedGeom.index.count / 3) : 0;

    if (totalVerts <= 4 || totalFaces <= 4) return 0;

    const origBoundaries = this.countBoundaryEdges(weldedGeom);
    const origVol = Math.abs(this.calculateSignedVolume(weldedGeom));
    const isSolid = origBoundaries === 0 && origVol > 1e-4;

    const mod = new SimplifyModifier();

    const isSafe = (count) => {
      if (count <= 0) return true;
      try {
        const sim = mod.modify(weldedGeom, count);
        const faces = sim.index ? Math.floor(sim.index.count / 3) : 0;
        if (faces < 4) return false;

        const bounds = this.countBoundaryEdges(sim);
        // 元が閉じたメッシュの場合、穴が1つでも空いたら即座にNG
        if (isSolid && bounds > 0) return false;
        // 開いたメッシュの場合でも、境界エッジが元より増えたら穴が開いたと判定してNG
        if (!isSolid && bounds > origBoundaries) return false;

        // 体積が急激に失われてペラペラになったり面が裏返っていないか
        if (isSolid) {
          const vol = this.calculateSignedVolume(sim);
          if (vol <= 0 || (vol / origVol) < 0.12) return false;
        }

        return true;
      } catch (e) {
        return false;
      }
    };

    // 二分探索で安全な最大削減可能数を高速特定
    let low = 0;
    let high = Math.max(0, totalVerts - 4);
    let best = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (isSafe(mid)) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return best;
  }

  /**
   * 指定した段階 (0〜6) に応じて、穴が空く限界を超えないよう安全に単純化する
   * @param {THREE.BufferGeometry} geometry 
   * @param {number} level 0〜6の整数 (0: 変更なし, 6: 最も単純化)
   * @param {number|null} precomputedMaxSafe 事前計算された安全最大削減数（省略可能）
   * @returns {{ geometry: THREE.BufferGeometry, initialVerts: number, finalVerts: number, initialFaces: number, finalFaces: number, maxSafe: number, isLimitReached: boolean }}
   */
  static simplifyMeshGeometry(geometry, level = 0, precomputedMaxSafe = null) {
    const statsBefore = this.getMeshStats(geometry);

    if (level <= 0) {
      return {
        geometry: geometry.clone(),
        initialVerts: statsBefore.vertices,
        finalVerts: statsBefore.vertices,
        initialFaces: statsBefore.faces,
        finalFaces: statsBefore.faces,
        maxSafe: 0,
        isLimitReached: false
      };
    }

    // 座標位置のみでマージしてトポロジー接続を復元
    const welded = this.createWeldedGeometry(geometry);
    const maxSafe = precomputedMaxSafe !== null ? precomputedMaxSafe : this.findMaxSafeRemovable(welded);

    // 穴が空くのを防ぐため、安全に削減できる頂点がない場合は元のジオメトリを維持
    if (maxSafe <= 0) {
      return {
        geometry: geometry.clone(),
        initialVerts: statsBefore.vertices,
        finalVerts: statsBefore.vertices,
        initialFaces: statsBefore.faces,
        finalFaces: statsBefore.faces,
        maxSafe: 0,
        isLimitReached: true
      };
    }

    const clampedLevel = Math.max(0, Math.min(6, level));
    const ratio = clampedLevel / 6;
    let targetCount = Math.round(maxSafe * ratio);

    if (targetCount <= 0) {
      return {
        geometry: geometry.clone(),
        initialVerts: statsBefore.vertices,
        finalVerts: statsBefore.vertices,
        initialFaces: statsBefore.faces,
        finalFaces: statsBefore.faces,
        maxSafe,
        isLimitReached: false
      };
    }

    const origBoundaries = this.countBoundaryEdges(welded);
    const origVol = Math.abs(this.calculateSignedVolume(welded));
    const isSolid = origBoundaries === 0 && origVol > 1e-4;

    const modifier = new SimplifyModifier();
    let simplified = null;

    // 穴あき防止の安全フォールバックループ
    while (targetCount > 0) {
      try {
        const candidate = modifier.modify(welded, targetCount);
        const faces = candidate.index ? Math.floor(candidate.index.count / 3) : 0;
        const bounds = this.countBoundaryEdges(candidate);

        const boundsSafe = isSolid ? (bounds === 0) : (bounds <= origBoundaries);
        let volSafe = true;
        if (isSolid) {
          const vol = this.calculateSignedVolume(candidate);
          volSafe = (vol > 0 && (vol / origVol) >= 0.1);
        }

        if (faces >= 4 && boundsSafe && volSafe) {
          simplified = candidate;
          break;
        }
      } catch (err) {
        // 次のカウントへフォールバック
      }
      targetCount--;
    }

    if (!simplified || targetCount <= 0) {
      return {
        geometry: geometry.clone(),
        initialVerts: statsBefore.vertices,
        finalVerts: statsBefore.vertices,
        initialFaces: statsBefore.faces,
        finalFaces: statsBefore.faces,
        maxSafe,
        isLimitReached: true
      };
    }

    simplified.computeVertexNormals();
    simplified.computeBoundingBox();
    simplified.computeBoundingSphere();

    const statsAfter = this.getMeshStats(simplified);

    return {
      geometry: simplified,
      initialVerts: statsBefore.vertices,
      finalVerts: statsAfter.vertices,
      initialFaces: statsBefore.faces,
      finalFaces: statsAfter.faces,
      maxSafe,
      isLimitReached: targetCount < Math.round(maxSafe * ratio)
    };
  }

  /**
   * 頂点数とポリゴン面数を算出
   * @param {THREE.BufferGeometry} geometry 
   */
  static getMeshStats(geometry) {
    if (!geometry || !geometry.attributes.position) {
      return { vertices: 0, faces: 0 };
    }
    const vertices = geometry.attributes.position.count;
    const faces = geometry.index ? Math.floor(geometry.index.count / 3) : Math.floor(vertices / 3);
    return { vertices, faces };
  }
}
