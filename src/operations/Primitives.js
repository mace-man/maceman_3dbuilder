import * as THREE from 'three';

export class Primitives {
  static createDefaultMaterial(color = 0x3a86ff) {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.35,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });
  }

  // 接地処理（底面を Y = 0 に合わせる）
  static groundGeometry(geometry) {
    geometry.computeBoundingBox();
    const minY = geometry.boundingBox.min.y;
    geometry.translate(0, -minY, 0);
    geometry.computeVertexNormals();
    return geometry;
  }

  // 立方体 / 直方体
  static createCube(width = 30, height = 30, depth = 30, color) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    this.groundGeometry(geo);
    const mesh = new THREE.Mesh(geo, this.createDefaultMaterial(color || 0x0078d4));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = '立方体';
    return mesh;
  }

  // 円柱
  static createCylinder(radius = 15, height = 30, radialSegments = 36, color) {
    const geo = new THREE.CylinderGeometry(radius, radius, height, radialSegments);
    this.groundGeometry(geo);
    const mesh = new THREE.Mesh(geo, this.createDefaultMaterial(color || 0x107c41));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = '円柱';
    return mesh;
  }

  // 球体
  static createSphere(radius = 15, widthSegments = 32, heightSegments = 24, color) {
    const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    this.groundGeometry(geo);
    const mesh = new THREE.Mesh(geo, this.createDefaultMaterial(color || 0xd83b01));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = '球体';
    return mesh;
  }

  // 円錐
  static createCone(radius = 15, height = 30, radialSegments = 36, color) {
    const geo = new THREE.ConeGeometry(radius, height, radialSegments);
    this.groundGeometry(geo);
    const mesh = new THREE.Mesh(geo, this.createDefaultMaterial(color || 0xffb900));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = '円錐';
    return mesh;
  }

  // 角錐 (四角錐)
  static createPyramid(radius = 15, height = 30, color) {
    const geo = new THREE.ConeGeometry(radius, height, 4);
    geo.rotateY(Math.PI / 4);
    this.groundGeometry(geo);
    const mesh = new THREE.Mesh(geo, this.createDefaultMaterial(color || 0x8764b8));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = '角錐';
    return mesh;
  }

  // トーラス (ドーナツ型)
  static createTorus(radius = 16, tube = 6, radialSegments = 24, tubularSegments = 48, color) {
    const geo = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
    geo.rotateX(Math.PI / 2); // 水平にする
    this.groundGeometry(geo);
    const mesh = new THREE.Mesh(geo, this.createDefaultMaterial(color || 0xe3008c));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'トーラス';
    return mesh;
  }

  // 六角柱
  static createHexagon(radius = 15, height = 30, color) {
    const geo = new THREE.CylinderGeometry(radius, radius, height, 6);
    this.groundGeometry(geo);
    const mesh = new THREE.Mesh(geo, this.createDefaultMaterial(color || 0x00b7c3));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = '六角柱';
    return mesh;
  }

  // くさび型 (Wedge)
  static createWedge(width = 30, height = 30, depth = 30, color) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(-width / 2, height);
    shape.closePath();

    const extrudeSettings = { depth: depth, bevelEnabled: false };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    this.groundGeometry(geo);

    const mesh = new THREE.Mesh(geo, this.createDefaultMaterial(color || 0x567c8d));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'くさび';
    return mesh;
  }
}
