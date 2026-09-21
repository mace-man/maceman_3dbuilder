import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';
import { Primitives } from '../operations/Primitives.js';

export class Importer {
  static async loadFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    switch (ext) {
      case 'stl':
        return this.loadSTL(arrayBuffer, file.name);
      case 'obj':
        return this.loadOBJ(new TextDecoder().decode(arrayBuffer), file.name);
      case 'gltf':
      case 'glb':
        return this.loadGLTF(arrayBuffer, file.name);
      case 'ply':
        return this.loadPLY(arrayBuffer, file.name);
      case '3mf':
        return this.load3MF(arrayBuffer, file.name);
      default:
        throw new Error(`未対応のファイル形式です: .${ext}`);
    }
  }

  static loadSTL(buffer, filename) {
    const loader = new STLLoader();
    const geom = loader.parse(buffer);
    geom.computeVertexNormals();
    Primitives.groundGeometry(geom);
    const mesh = new THREE.Mesh(geom, Primitives.createDefaultMaterial());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = filename.replace(/\.[^/.]+$/, '');
    return [mesh];
  }

  static loadOBJ(text, filename) {
    const loader = new OBJLoader();
    const group = loader.parse(text);
    const meshes = [];
    group.traverse((child) => {
      if (child.isMesh) {
        child.material = Primitives.createDefaultMaterial();
        child.castShadow = true;
        child.receiveShadow = true;
        child.geometry.computeVertexNormals();
        meshes.push(child);
      }
    });

    if (meshes.length === 1) {
      Primitives.groundGeometry(meshes[0].geometry);
      meshes[0].name = filename.replace(/\.[^/.]+$/, '');
      return meshes;
    }

    // グループ全体の接地
    const box = new THREE.Box3().setFromObject(group);
    group.position.y -= box.min.y;
    group.name = filename.replace(/\.[^/.]+$/, '');
    return meshes;
  }

  static loadGLTF(buffer, filename) {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.parse(buffer, '', (gltf) => {
        const meshes = [];
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (!child.material) {
              child.material = Primitives.createDefaultMaterial();
            }
            meshes.push(child);
          }
        });
        resolve(meshes);
      }, reject);
    });
  }

  static loadPLY(buffer, filename) {
    const loader = new PLYLoader();
    const geom = loader.parse(buffer);
    geom.computeVertexNormals();
    Primitives.groundGeometry(geom);
    const mesh = new THREE.Mesh(geom, Primitives.createDefaultMaterial());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = filename.replace(/\.[^/.]+$/, '');
    return [mesh];
  }

  static load3MF(buffer, filename) {
    const loader = new ThreeMFLoader();
    const group = loader.parse(buffer);
    const meshes = [];
    group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.geometry.computeVertexNormals();
        if (!child.material || child.material.length === 0) {
          child.material = Primitives.createDefaultMaterial();
        }
        meshes.push(child);
      }
    });
    return meshes;
  }
}
