import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { PLYExporter } from 'three/addons/exporters/PLYExporter.js';
import { zipSync, strToU8 } from 'fflate';

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

  // 3MF エクスポート (3D Manufacturing Format)
  static export3MF(objects, filename = 'model.3mf') {
    let objectXmlParts = [];
    let itemXmlParts = [];
    let objectIdCounter = 1;

    objects.forEach(mesh => {
      mesh.updateMatrixWorld(true);
      const geom = mesh.geometry.clone();
      geom.applyMatrix4(mesh.matrixWorld);

      const posAttr = geom.attributes.position;
      if (!posAttr) return;

      const objId = objectIdCounter++;
      let verticesXml = '';
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i).toFixed(4);
        const y = posAttr.getY(i).toFixed(4);
        const z = posAttr.getZ(i).toFixed(4);
        verticesXml += `          <vertex x="${x}" y="${y}" z="${z}" />\n`;
      }

      let trianglesXml = '';
      if (geom.index) {
        const indexAttr = geom.index;
        for (let i = 0; i < indexAttr.count; i += 3) {
          trianglesXml += `          <triangle v1="${indexAttr.getX(i)}" v2="${indexAttr.getX(i + 1)}" v3="${indexAttr.getX(i + 2)}" />\n`;
        }
      } else {
        for (let i = 0; i < posAttr.count; i += 3) {
          trianglesXml += `          <triangle v1="${i}" v2="${i + 1}" v3="${i + 2}" />\n`;
        }
      }

      const objName = mesh.name ? mesh.name.replace(/[<>&"]/g, '') : `Part_${objId}`;
      objectXmlParts.push(`    <object id="${objId}" name="${objName}" type="model">
      <mesh>
        <vertices>
${verticesXml}        </vertices>
        <triangles>
${trianglesXml}        </triangles>
      </mesh>
    </object>`);

      itemXmlParts.push(`    <item objectid="${objId}" />`);
    });

    const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">mace-man 3D Model</metadata>
  <metadata name="Application">mace-man 3D Builder</metadata>
  <resources>
${objectXmlParts.join('\n')}
  </resources>
  <build>
${itemXmlParts.join('\n')}
  </build>
</model>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

    const files = {
      '[Content_Types].xml': strToU8(contentTypesXml),
      '_rels/.rels': strToU8(relsXml),
      '3D/3dmodel.model': strToU8(modelXml)
    };

    const zippedData = zipSync(files);
    const blob = new Blob([zippedData], { type: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml' });
    this.downloadBlob(blob, filename.endsWith('.3mf') ? filename : `${filename}.3mf`);
  }
}
