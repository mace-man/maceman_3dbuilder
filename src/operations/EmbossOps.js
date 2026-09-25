import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { BooleanOps } from './BooleanOps.js';

export class EmbossOps {
  /**
   * テキストから THREE.Shape 配列を生成 (Canvas 2D + 堅牢な Marching Squares 等値線追跡)
   * 日本語、漢字、かな、英数、記号、絵文字などあらゆる文字に対応
   */
  static createShapesFromText(text, options = {}) {
    const {
      fontFamily = 'sans-serif',
      fontSize = 90,
      fontWeight = 'bold',
      fontStyle = 'normal'
    } = options;

    const trimmed = (text !== undefined && text !== null && text.trim() !== '') ? text.trim() : '3D';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const fontStr = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.font = fontStr;

    const metrics = ctx.measureText(trimmed);
    const textWidth = Math.max(20, Math.ceil(metrics.width));
    const textHeight = Math.max(20, Math.ceil(fontSize * 1.3));

    const pad = 16;
    canvas.width = textWidth + pad * 2;
    canvas.height = textHeight + pad * 2;

    // 背景は真っ黒
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 文字列を白で中央に描画
    ctx.font = fontStr;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(trimmed, canvas.width / 2, canvas.height / 2);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return this.bitmapToShapes(imgData, canvas.width, canvas.height, false);
  }

  /**
   * プリセット形状の THREE.Shape 配列を生成
   */
  static createShapesFromPreset(shapeType) {
    const shape = new THREE.Shape();

    switch (shapeType) {
      case 'heart': {
        const x = 0, y = -10;
        shape.moveTo(x, y + 15);
        shape.bezierCurveTo(x, y + 25, x - 25, y + 35, x - 25, y + 15);
        shape.bezierCurveTo(x - 25, y - 5, x - 10, y - 20, x, y - 35);
        shape.bezierCurveTo(x + 10, y - 20, x + 25, y - 5, x + 25, y + 15);
        shape.bezierCurveTo(x + 25, y + 35, x, y + 25, x, y + 15);
        break;
      }
      case 'star': {
        const points = 5;
        const outerRadius = 30;
        const innerRadius = 13;
        for (let i = 0; i < points * 2; i++) {
          const r = (i % 2 === 0) ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / points - Math.PI / 2;
          const px = Math.cos(angle) * r;
          const py = -Math.sin(angle) * r;
          if (i === 0) shape.moveTo(px, py);
          else shape.lineTo(px, py);
        }
        shape.closePath();
        break;
      }
      case 'circle': {
        const r = 25;
        shape.absarc(0, 0, r, 0, Math.PI * 2, false);
        break;
      }
      case 'square': {
        const s = 25;
        const radius = 5;
        shape.moveTo(-s + radius, -s);
        shape.lineTo(s - radius, -s);
        shape.quadraticCurveTo(s, -s, s, -s + radius);
        shape.lineTo(s, s - radius);
        shape.quadraticCurveTo(s, s, s - radius, s);
        shape.lineTo(-s + radius, s);
        shape.quadraticCurveTo(-s, s, -s, s - radius);
        shape.lineTo(-s, -s + radius);
        shape.quadraticCurveTo(-s, -s, -s + radius, -s);
        break;
      }
      case 'hexagon': {
        const r = 28;
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) shape.moveTo(px, py);
          else shape.lineTo(px, py);
        }
        shape.closePath();
        break;
      }
      case 'arrow': {
        shape.moveTo(0, 30);
        shape.lineTo(25, 5);
        shape.lineTo(12, 5);
        shape.lineTo(12, -30);
        shape.lineTo(-12, -30);
        shape.lineTo(-12, 5);
        shape.lineTo(-25, 5);
        shape.closePath();
        break;
      }
      case 'check': {
        shape.moveTo(-25, -2);
        shape.lineTo(-10, -22);
        shape.lineTo(26, 22);
        shape.lineTo(18, 28);
        shape.lineTo(-10, -10);
        shape.lineTo(-18, 0);
        shape.closePath();
        break;
      }
      case 'smile': {
        const r = 28;
        shape.absarc(0, 0, r, 0, Math.PI * 2, false);

        const eyeLeft = new THREE.Path();
        eyeLeft.absarc(-10, 8, 3.5, 0, Math.PI * 2, true);
        shape.holes.push(eyeLeft);

        const eyeRight = new THREE.Path();
        eyeRight.absarc(10, 8, 3.5, 0, Math.PI * 2, true);
        shape.holes.push(eyeRight);

        const mouth = new THREE.Path();
        mouth.absarc(0, -2, 14, Math.PI * 1.15, Math.PI * 1.85, false);
        mouth.absarc(0, -6, 12, Math.PI * 1.85, Math.PI * 1.15, true);
        shape.holes.push(mouth);
        break;
      }
      default: {
        return this.createShapesFromPreset('star');
      }
    }

    return [shape];
  }

  /**
   * 画像から THREE.Shape 配列を生成
   */
  static async createShapesFromImage(imageSource, invert = false) {
    let img;
    if (typeof imageSource === 'string') {
      img = await this.loadImage(imageSource);
    } else if (imageSource instanceof HTMLImageElement) {
      img = imageSource;
    } else {
      throw new Error('Unsupported image source');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const maxDim = 300;
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    const pad = 10;
    canvas.width = w + pad * 2;
    canvas.height = h + pad * 2;

    ctx.fillStyle = invert ? '#ffffff' : '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, pad, pad, w, h);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return this.bitmapToShapes(imgData, canvas.width, canvas.height, invert);
  }

  /**
   * SVG 文字列から THREE.Shape 配列を生成
   */
  static createShapesFromSVG(svgString) {
    const loader = new SVGLoader();
    const svgData = loader.parse(svgString);
    const shapes = [];

    for (const path of svgData.paths) {
      const generated = SVGLoader.createShapes(path);
      shapes.push(...generated);
    }

    if (shapes.length === 0) {
      throw new Error('No shapes found in SVG');
    }

    return shapes;
  }

  static loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error('Failed to load image: ' + url));
      img.src = url;
    });
  }

  /**
   * 2値ビットマップ画像から Marching Squares により正確な THREE.Shape 配列を構築
   */
  static bitmapToShapes(imgData, width, height, invert = false) {
    const data = imgData.data;
    const binary = new Uint8Array(width * height);
    const threshold = 90;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const a = data[idx + 3];
        let isForeground = false;
        if (a >= 32) {
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          isForeground = lum >= threshold;
        }
        if (invert) isForeground = !isForeground;
        binary[y * width + x] = isForeground ? 1 : 0;
      }
    }

    // 1. 等値線エッジの抽出
    const edges = this.extractMarchingSquaresEdges(binary, width, height);
    if (edges.length === 0) {
      return [this.createDefaultFallbackShape()];
    }

    // 2. エッジを閉じたループに組み立て
    const rawLoops = this.assembleLoops(edges);
    if (rawLoops.length === 0) {
      return [this.createDefaultFallbackShape()];
    }

    // 3. Three.js 座標系 (Y上向き) に反転し、RDP単純化と面積計算
    const processedLoops = [];
    for (const raw of rawLoops) {
      // Y反転: (x, height - y)
      const converted = raw.map(p => ({ x: p.x, y: height - p.y }));
      const simplified = this.simplifyPolygonRDP(converted, 1.0);
      if (simplified.length >= 3) {
        const area = this.calculateSignedArea(simplified);
        // 面積が極小のゴミ・ノイズを除去
        if (Math.abs(area) >= 12) {
          processedLoops.push({
            points: simplified,
            area,
            isOuter: area > 0 // CCW (反時計回り) が外側
          });
        }
      }
    }

    if (processedLoops.length === 0) {
      return [this.createDefaultFallbackShape()];
    }

    // 外側ループと穴ループに分類
    const outerLoops = processedLoops.filter(l => l.isOuter);
    const holeLoops = processedLoops.filter(l => !l.isOuter);

    if (outerLoops.length === 0) {
      return [this.createDefaultFallbackShape()];
    }

    // 面積の大きい順にソート
    outerLoops.sort((a, b) => b.area - a.area);

    const shapes = [];

    for (const outer of outerLoops) {
      const shape = new THREE.Shape();
      const pts = outer.points;

      shape.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        shape.lineTo(pts[i].x, pts[i].y);
      }
      shape.closePath();

      // この外側ループに含まれる穴を探索
      for (let hIdx = holeLoops.length - 1; hIdx >= 0; hIdx--) {
        const hole = holeLoops[hIdx];
        if (this.isPointInsidePolygon(hole.points[0], outer.points)) {
          const holePath = new THREE.Path();
          const hpts = hole.points;
          holePath.moveTo(hpts[0].x, hpts[0].y);
          for (let j = 1; j < hpts.length; j++) {
            holePath.lineTo(hpts[j].x, hpts[j].y);
          }
          holePath.closePath();
          shape.holes.push(holePath);

          holeLoops.splice(hIdx, 1);
        }
      }

      shapes.push(shape);
    }

    return shapes;
  }

  /**
   * 前景 (1) を左側に見ながら進む Marching Squares エッジ抽出
   */
  static extractMarchingSquaresEdges(binary, width, height) {
    const edges = [];

    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const tl = binary[y * width + x];
        const tr = binary[y * width + (x + 1)];
        const bl = binary[(y + 1) * width + x];
        const br = binary[(y + 1) * width + (x + 1)];

        const caseIdx = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
        if (caseIdx === 0 || caseIdx === 15) continue;

        const top = { x: x + 0.5, y: y };
        const right = { x: x + 1, y: y + 0.5 };
        const bottom = { x: x + 0.5, y: y + 1 };
        const left = { x: x, y: y + 0.5 };

        switch (caseIdx) {
          case 1:  edges.push([bottom, left]); break;
          case 2:  edges.push([right, bottom]); break;
          case 3:  edges.push([right, left]); break;
          case 4:  edges.push([top, right]); break;
          case 5:  edges.push([top, right]); edges.push([bottom, left]); break;
          case 6:  edges.push([top, bottom]); break;
          case 7:  edges.push([top, left]); break;
          case 8:  edges.push([left, top]); break;
          case 9:  edges.push([bottom, top]); break;
          case 10: edges.push([left, top]); edges.push([right, bottom]); break;
          case 11: edges.push([right, top]); break;
          case 12: edges.push([left, right]); break;
          case 13: edges.push([bottom, right]); break;
          case 14: edges.push([left, bottom]); break;
        }
      }
    }

    return edges;
  }

  /**
   * 有向エッジから閉じたポリゴンループを結合
   */
  static assembleLoops(edges) {
    const key = (p) => `${Math.round(p.x * 2)},${Math.round(p.y * 2)}`;
    const map = new Map();

    for (let i = 0; i < edges.length; i++) {
      const k = key(edges[i][0]);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push({ start: edges[i][0], end: edges[i][1], index: i });
    }

    const loops = [];
    const used = new Uint8Array(edges.length);

    for (let i = 0; i < edges.length; i++) {
      if (used[i]) continue;
      const loop = [];
      used[i] = 1;
      loop.push(edges[i][0]);

      let currEnd = edges[i][1];
      let steps = edges.length + 10;
      while (steps-- > 0) {
        loop.push(currEnd);
        if (key(currEnd) === key(loop[0])) break;
        const k = key(currEnd);
        const list = map.get(k);
        let next = null;
        if (list) {
          for (const cand of list) {
            if (!used[cand.index]) {
              next = cand;
              break;
            }
          }
        }
        if (!next) break;
        used[next.index] = 1;
        currEnd = next.end;
      }

      if (key(currEnd) === key(loop[0]) && loop.length >= 4) {
        loop.pop(); // 始点と重複する末尾を除去
        loops.push(loop);
      }
    }

    return loops;
  }

  /**
   * 多角形の符号付き面積 (Shoelace formula)
   * Three.js 座標系 (Y上向き) において、CCW (反時計回り) は正、CW (時計回り) は負
   */
  static calculateSignedArea(pts) {
    let area = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += pts[i].x * pts[j].y;
      area -= pts[j].x * pts[i].y;
    }
    return area / 2;
  }

  static isPointInsidePolygon(point, polygon) {
    let inside = false;
    const x = point.x, y = point.y;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  static simplifyPolygonRDP(points, tolerance = 1.0) {
    if (points.length <= 3) return points;

    const sqTolerance = tolerance * tolerance;

    function getSqSegmentDistance(p, p1, p2) {
      let x = p1.x, y = p1.y, dx = p2.x - x, dy = p2.y - y;
      if (dx !== 0 || dy !== 0) {
        const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
          x = p2.x; y = p2.y;
        } else if (t > 0) {
          x += dx * t; y += dy * t;
        }
      }
      dx = p.x - x; dy = p.y - y;
      return dx * dx + dy * dy;
    }

    function simplifyDPStep(pts, first, last, sqTol, simplified) {
      let maxSqDist = sqTol;
      let index = 0;
      for (let i = first + 1; i < last; i++) {
        const sqDist = getSqSegmentDistance(pts[i], pts[first], pts[last]);
        if (sqDist > maxSqDist) {
          index = i;
          maxSqDist = sqDist;
        }
      }
      if (maxSqDist > sqTol) {
        if (index - first > 1) simplifyDPStep(pts, first, index, sqTol, simplified);
        simplified.push(pts[index]);
        if (last - index > 1) simplifyDPStep(pts, index, last, sqTol, simplified);
      }
    }

    const last = points.length - 1;
    const simplified = [points[0]];
    simplifyDPStep(points, 0, last, sqTolerance, simplified);
    simplified.push(points[last]);

    return simplified;
  }

  /**
   * 形状配列から押し出し 3D メッシュ (ExtrudeMesh) を構築
   */
  static createExtrudeMesh(shapes, options = {}) {
    const {
      depth = 3,
      bevelEnabled = false,
      color = 0x0078d4
    } = options;

    const extrudeSettings = {
      steps: 1,
      depth: Math.max(0.2, depth),
      bevelEnabled: !!bevelEnabled,
      bevelThickness: 0.2,
      bevelSize: 0.2,
      bevelSegments: 1
    };

    const geom = new THREE.ExtrudeGeometry(shapes, extrudeSettings);
    geom.center(); // 中心を原点 (0, 0, 0) に
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.35,
      metalness: 0.15,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'エンボスプレビュー';

    return mesh;
  }

  /**
   * 対象オブジェクトの各面（Top, Front, Back, Left, Right, Bottom）への配置位置と回転姿勢を計算
   */
  static getFacePlacement(targetMesh, face = 'top', offset = 0) {
    targetMesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(targetMesh);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const position = center.clone();
    const rotation = new THREE.Euler(0, 0, 0, 'XYZ');

    switch (face) {
      case 'top':
        position.y = box.max.y + offset;
        rotation.x = -Math.PI / 2; // XY平面を上に向ける
        break;
      case 'bottom':
        position.y = box.min.y - offset;
        rotation.x = Math.PI / 2;
        break;
      case 'front':
        position.z = box.max.z + offset;
        rotation.x = 0;
        rotation.y = 0;
        break;
      case 'back':
        position.z = box.min.z - offset;
        rotation.x = 0;
        rotation.y = Math.PI;
        break;
      case 'left':
        position.x = box.min.x - offset;
        rotation.y = -Math.PI / 2;
        break;
      case 'right':
        position.x = box.max.x + offset;
        rotation.y = Math.PI / 2;
        break;
    }

    return { position, rotation, boxSize: size };
  }

  static createDefaultFallbackShape() {
    const shape = new THREE.Shape();
    const s = 15;
    shape.moveTo(-s, -s);
    shape.lineTo(s, -s);
    shape.lineTo(s, s);
    shape.lineTo(-s, s);
    shape.closePath();
    return shape;
  }

  /**
   * エンボス適用 (BooleanOps を利用して対象モデルと結合または型抜き)
   */
  static applyEmboss(targetMesh, embossMesh, mode = 'emboss') {
    if (mode === 'emboss') {
      return BooleanOps.union(targetMesh, [embossMesh]);
    } else {
      return BooleanOps.subtract(targetMesh, [embossMesh]);
    }
  }
}
