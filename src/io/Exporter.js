import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { PLYExporter } from 'three/addons/exporters/PLYExporter.js';

export class Exporter {
  static downloadBlob(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  // エクスポート用の一時オブジェクトまたはグループの作成
  static prepareExportObject(objects) {
    if (objects.length === 1) {
      return objects[0];
    }
    const group = new THREE.Group();
    objects.forEach(obj => {
      group.add(obj.clone());
    });
    return group;
  }

  // STL エクスポート (バイナリ)
  static exportSTL(objects, filename = 'model.stl', binary = true) {
    const exporter = new STLExporter();
    const target = this.prepareExportObject(objects);
    const result = exporter.parse(target, { binary });
    const blob = new Blob([result], { type: binary ? 'application/octet-stream' : 'text/plain' });
    this.downloadBlob(blob, filename.endsWith('.stl') ? filename : `${filename}.stl`);
  }

  // OBJ エクスポート
  static exportOBJ(objects, filename = 'model.obj') {
    const exporter = new OBJExporter();
    const target = this.prepareExportObject(objects);
    const result = exporter.parse(target);
    const blob = new Blob([result], { type: 'text/plain' });
    this.downloadBlob(blob, filename.endsWith('.obj') ? filename : `${filename}.obj`);
  }

  // GLB / GLTF エクスポート
  static exportGLTF(objects, filename = 'model.glb', binary = true) {
    const exporter = new GLTFExporter();
    const target = this.prepareExportObject(objects);
    exporter.parse(
      target,
      (result) => {
        let blob;
        if (binary) {
          blob = new Blob([result], { type: 'application/octet-stream' });
        } else {
          blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        }
        const ext = binary ? '.glb' : '.gltf';
        this.downloadBlob(blob, filename.replace(/\.[^/.]+$/, '') + ext);
      },
      (error) => {
        console.error('GLTF Export error:', error);
      },
      { binary }
    );
  }

  // PLY エクスポート
  static exportPLY(objects, filename = 'model.ply', binary = true) {
    const exporter = new PLYExporter();
    const target = this.prepareExportObject(objects);
    exporter.parse(
      target,
      (result) => {
        const blob = new Blob([result], { type: binary ? 'application/octet-stream' : 'text/plain' });
        this.downloadBlob(blob, filename.endsWith('.ply') ? filename : `${filename}.ply`);
      },
      { binary }
    );
  }
}
