import * as THREE from 'three';
import { Viewer } from './core/Viewer.js';
import { SceneManager } from './core/SceneManager.js';
import { History } from './core/History.js';
import { Primitives } from './operations/Primitives.js';
import { BooleanOps } from './operations/BooleanOps.js';
import { SplitOps } from './operations/SplitOps.js';
import { TransformOps } from './operations/TransformOps.js';
import { Importer } from './io/Importer.js';
import { Exporter } from './io/Exporter.js';
import { Notification } from './ui/Notification.js';
import { I18n } from './ui/I18n.js';

class App {
  constructor() {
    // 言語設定初期化
    I18n.applyTranslations();
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
      langSelect.value = I18n.currentLang;
      langSelect.addEventListener('change', (e) => {
        I18n.setLanguage(e.target.value);
      });
    }

    I18n.onChange(() => {
      this.updateOutliner();
      this.updateInspector();
      this.updateStatusBar();
    });

    const container = document.getElementById('viewport');
    this.viewer = new Viewer(container);
    this.sm = new SceneManager(this.viewer);
    this.history = new History(this.sm);

    // スライス状態
    this.sliceActive = false;
    this.sliceTarget = null;
    this.sliceMode = 'both';
    this.sliceHelper = SplitOps.createSlicePlaneHelper();
    this.viewer.scene.add(this.sliceHelper);

    this.bindEvents();
    this.setupDropZone();

    // 初期サンプルオブジェクトを追加
    const initialCube = Primitives.createCube(30, 30, 30, 0x0078d4);
    this.sm.addObject(initialCube);
    this.history.captureSnapshot();

    Notification.success(I18n.t('readyToast'));
  }

  bindEvents() {
    // 1. タブ切り替え
    const tabs = document.querySelectorAll('.ribbon-tab');
    const panels = {
      'tab-insert': document.getElementById('tab-insert'),
      'tab-edit': document.getElementById('tab-edit'),
      'tab-paint': document.getElementById('tab-paint'),
      'tab-view': document.getElementById('tab-view'),
      'tab-file': document.getElementById('tab-file')
    };

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        Object.keys(panels).forEach(key => {
          panels[key].style.display = (key === target) ? 'flex' : 'none';
        });
      });
    });

    // 2. クイックアクション & ショートカット
    document.getElementById('btn-quick-undo').addEventListener('click', () => this.history.undo());
    document.getElementById('btn-quick-redo').addEventListener('click', () => this.history.redo());
    document.getElementById('btn-quick-layflat').addEventListener('click', () => this.applyLayFlat());
    document.getElementById('btn-quick-duplicate').addEventListener('click', () => {
      this.history.captureSnapshot();
      this.sm.duplicateSelected();
    });
    document.getElementById('btn-quick-delete').addEventListener('click', () => {
      this.history.captureSnapshot();
      this.sm.removeSelected();
    });

    // キーボードDeleteキー
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        this.history.captureSnapshot();
        this.sm.removeSelected();
      } else if (e.key.toLowerCase() === 'w') {
        this.setTransformMode('translate');
      } else if (e.key.toLowerCase() === 'e') {
        this.setTransformMode('rotate');
      } else if (e.key.toLowerCase() === 'r') {
        this.setTransformMode('scale');
      }
    });

    // 3. 挿入（プリミティブ）
    const addPrimitive = (creator, defaultKey) => {
      this.history.captureSnapshot();
      const mesh = creator();
      // 言語に応じた名称設定
      if (defaultKey) {
        mesh.name = I18n.t(defaultKey);
      }
      mesh.position.x = (Math.random() - 0.5) * 20;
      mesh.position.z = (Math.random() - 0.5) * 20;
      this.sm.addObject(mesh);
      Notification.info(I18n.t('addSuccess', mesh.name));
    };

    document.getElementById('add-cube').addEventListener('click', () => addPrimitive(() => Primitives.createCube(), 'cube'));
    document.getElementById('add-cylinder').addEventListener('click', () => addPrimitive(() => Primitives.createCylinder(), 'cylinder'));
    document.getElementById('add-sphere').addEventListener('click', () => addPrimitive(() => Primitives.createSphere(), 'sphere'));
    document.getElementById('add-cone').addEventListener('click', () => addPrimitive(() => Primitives.createCone(), 'cone'));
    document.getElementById('add-pyramid').addEventListener('click', () => addPrimitive(() => Primitives.createPyramid(), 'pyramid'));
    document.getElementById('add-torus').addEventListener('click', () => addPrimitive(() => Primitives.createTorus(), 'torus'));
    document.getElementById('add-hexagon').addEventListener('click', () => addPrimitive(() => Primitives.createHexagon(), 'hexagon'));
    document.getElementById('add-wedge').addEventListener('click', () => addPrimitive(() => Primitives.createWedge(), 'wedge'));

    // 4. トランスフォームモード切り替え
    const modeBtns = {
      translate: document.getElementById('btn-mode-translate'),
      rotate: document.getElementById('btn-mode-rotate'),
      scale: document.getElementById('btn-mode-scale')
    };

    Object.keys(modeBtns).forEach(mode => {
      modeBtns[mode].addEventListener('click', () => this.setTransformMode(mode));
    });

    // 5. 編集ツール（ブーリアン演算）
    document.getElementById('btn-union').addEventListener('click', () => this.applyBoolean('union'));
    document.getElementById('btn-subtract').addEventListener('click', () => this.applyBoolean('subtract'));
    document.getElementById('btn-intersect').addEventListener('click', () => this.applyBoolean('intersect'));

    // 接地 & 整列
    document.getElementById('btn-layflat').addEventListener('click', () => this.applyLayFlat());
    document.getElementById('btn-align-center').addEventListener('click', () => {
      if (this.sm.selectedObjects.length >= 2) {
        this.history.captureSnapshot();
        TransformOps.align(this.sm.selectedObjects, 'x', 'center');
        TransformOps.align(this.sm.selectedObjects, 'z', 'center');
        this.sm.emit('transformChanged', this.sm.selectedObjects);
        Notification.success(I18n.t('alignSuccess'));
      } else {
        Notification.warning(I18n.t('alignWarning'));
      }
    });

    // 6. スライス（分割）
    document.getElementById('btn-start-split').addEventListener('click', () => this.startSplit());
    document.getElementById('btn-split-apply').addEventListener('click', () => this.applySplit());
    document.getElementById('btn-split-cancel').addEventListener('click', () => this.cancelSplit());

    const splitModeBtns = {
      top: document.getElementById('btn-split-mode-top'),
      bottom: document.getElementById('btn-split-mode-bottom'),
      both: document.getElementById('btn-split-mode-both')
    };
    Object.keys(splitModeBtns).forEach(mode => {
      splitModeBtns[mode].addEventListener('click', () => {
        Object.values(splitModeBtns).forEach(b => b.classList.remove('active'));
        splitModeBtns[mode].classList.add('active');
        this.sliceMode = mode;
      });
    });

    document.getElementById('split-height-slider').addEventListener('input', (e) => {
      this.updateSlicePlane();
    });
    document.getElementById('split-angle-slider').addEventListener('input', (e) => {
      this.updateSlicePlane();
    });

    // 7. ペイント
    const colorInput = document.getElementById('paint-color');
    colorInput.addEventListener('input', (e) => {
      this.sm.setSelectedColor(e.target.value);
    });

    document.querySelectorAll('.preset-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const color = dot.dataset.color;
        colorInput.value = color;
        this.sm.setSelectedColor(color);
      });
    });

    document.getElementById('mat-roughness').addEventListener('input', (e) => {
      this.sm.setSelectedRoughness(parseFloat(e.target.value));
    });
    document.getElementById('mat-metalness').addEventListener('input', (e) => {
      this.sm.setSelectedMetalness(parseFloat(e.target.value));
    });

    const btnWireframe = document.getElementById('btn-toggle-wireframe');
    btnWireframe.addEventListener('click', () => {
      if (this.sm.selectedObjects.length === 0) {
        Notification.warning(I18n.t('selectPrompt'));
        return;
      }
      const mat = this.sm.getSelectedMaterial();
      const nextWireframe = mat ? !mat.wireframe : !btnWireframe.classList.contains('active');
      this.sm.setSelectedWireframe(nextWireframe);
      btnWireframe.classList.toggle('active', nextWireframe);
    });

    const btnXray = document.getElementById('btn-toggle-xray');
    btnXray.addEventListener('click', () => {
      if (this.sm.selectedObjects.length === 0) {
        Notification.warning(I18n.t('selectPrompt'));
        return;
      }
      const mat = this.sm.getSelectedMaterial();
      const isCurrentlyXray = mat ? (mat.transparent && mat.opacity < 1.0) : btnXray.classList.contains('active');
      const nextXray = !isCurrentlyXray;
      this.sm.setSelectedOpacity(nextXray ? 0.45 : 1.0);
      btnXray.classList.toggle('active', nextXray);
    });

    // 8. 表示
    document.getElementById('view-top').addEventListener('click', () => this.viewer.setView('top'));
    document.getElementById('view-front').addEventListener('click', () => this.viewer.setView('front'));
    document.getElementById('view-right').addEventListener('click', () => this.viewer.setView('right'));
    document.getElementById('view-iso').addEventListener('click', () => this.viewer.setView('iso'));
    document.getElementById('view-fit').addEventListener('click', () => this.viewer.fitToView(this.sm.objects));

    let gridVisible = true;
    document.getElementById('btn-toggle-grid').addEventListener('click', (e) => {
      gridVisible = !gridVisible;
      e.currentTarget.classList.toggle('active', gridVisible);
      this.viewer.setGridVisible(gridVisible);
    });

    // 9. ファイル入出力
    document.getElementById('btn-new-scene').addEventListener('click', () => {
      if (confirm(I18n.t('newSceneConfirm'))) {
        this.history.captureSnapshot();
        const toRemove = [...this.sm.objects];
        toRemove.forEach(m => this.sm.removeObject(m));
        Notification.info(I18n.t('newSceneToast'));
      }
    });

    const fileInput = document.getElementById('file-input');
    document.getElementById('btn-import-file').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      if (e.target.files.length > 0) {
        await this.handleFile(e.target.files[0]);
        fileInput.value = '';
      }
    });

    document.getElementById('btn-export-stl').addEventListener('click', () => this.exportModel('stl'));
    document.getElementById('btn-export-3mf').addEventListener('click', () => this.exportModel('3mf'));
    document.getElementById('btn-export-obj').addEventListener('click', () => this.exportModel('obj'));
    document.getElementById('btn-export-glb').addEventListener('click', () => this.exportModel('glb'));
    document.getElementById('btn-export-ply').addEventListener('click', () => this.exportModel('ply'));

    // 10. インスペクタープロパティの双方向バインド
    this.setupInspectorBindings();

    // 11. イベントリッスン
    this.sm.on('selectionChanged', () => {
      this.updateOutliner();
      this.updateInspector();
      this.updatePaintUI();
      this.updateStatusBar();
    });

    this.sm.on('objectsChanged', () => {
      this.updateOutliner();
      this.updateInspector();
      this.updatePaintUI();
      this.updateStatusBar();
    });

    this.sm.on('transformChanged', () => {
      this.updateInspector();
    });

    this.sm.on('transformEnd', () => {
      this.history.captureSnapshot();
    });
  }

  setTransformMode(mode) {
    this.sm.setTransformMode(mode);
    const modeBtns = {
      translate: document.getElementById('btn-mode-translate'),
      rotate: document.getElementById('btn-mode-rotate'),
      scale: document.getElementById('btn-mode-scale')
    };
    Object.keys(modeBtns).forEach(k => modeBtns[k].classList.remove('active'));
    if (modeBtns[mode]) modeBtns[mode].classList.add('active');
  }

  applyLayFlat() {
    if (this.sm.selectedObjects.length === 0) {
      Notification.warning(I18n.t('splitPrompt'));
      return;
    }
    this.history.captureSnapshot();
    this.sm.selectedObjects.forEach(mesh => {
      TransformOps.layFlat(mesh);
    });
    this.sm.emit('transformChanged', this.sm.selectedObjects);
    Notification.success(I18n.t('groundSuccess'));
  }

  // ブーリアン演算
  applyBoolean(opType) {
    const selected = this.sm.selectedObjects;
    if (selected.length < 2) {
      Notification.warning(I18n.t('booleanWarning'));
      return;
    }

    this.history.captureSnapshot();
    try {
      const target = selected[0];
      const tools = selected.slice(1);
      let resultMesh;

      if (opType === 'union') {
        resultMesh = BooleanOps.union(target, tools);
      } else if (opType === 'subtract') {
        resultMesh = BooleanOps.subtract(target, tools);
      } else if (opType === 'intersect') {
        resultMesh = BooleanOps.intersect(target, tools[0]);
      }

      // 既存メッシュを削除して結果を追加
      selected.forEach(m => this.sm.removeObject(m));
      this.sm.addObject(resultMesh);
      const opName = opType === 'union' ? I18n.t('booleanUnion') : opType === 'subtract' ? I18n.t('booleanSubtract') : I18n.t('booleanIntersect');
      Notification.success(I18n.t('booleanSuccess', opName));
    } catch (err) {
      console.error(err);
      Notification.error(I18n.t('booleanError'));
    }
  }

  // スライス（分割）開始
  startSplit() {
    if (this.sm.selectedObjects.length === 0) {
      Notification.warning(I18n.t('splitPrompt'));
      return;
    }

    this.sliceTarget = this.sm.selectedObjects[0];
    this.sliceActive = true;
    document.getElementById('split-controls').classList.remove('hidden');

    const box = new THREE.Box3().setFromObject(this.sliceTarget);
    const heightSlider = document.getElementById('split-height-slider');
    heightSlider.min = box.min.y;
    heightSlider.max = box.max.y;
    heightSlider.value = (box.min.y + box.max.y) / 2;

    this.sliceHelper.visible = true;
    this.updateSlicePlane();
    Notification.info(I18n.t('splitHint'));
  }

  updateSlicePlane() {
    if (!this.sliceActive || !this.sliceTarget) return;

    const y = parseFloat(document.getElementById('split-height-slider').value);
    const angleDeg = parseFloat(document.getElementById('split-angle-slider').value);
    const angleRad = THREE.MathUtils.degToRad(angleDeg);

    this.sliceTarget.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.sliceTarget);
    const center = new THREE.Vector3();
    box.getCenter(center);

    this.sliceHelper.position.set(center.x, y, center.z);
    this.sliceHelper.rotation.set(0, 0, angleRad);
  }

  applySplit() {
    if (!this.sliceActive || !this.sliceTarget) return;

    this.history.captureSnapshot();
    try {
      const planePos = this.sliceHelper.position.clone();
      const planeNormal = new THREE.Vector3(0, 1, 0).applyEuler(this.sliceHelper.rotation).normalize();

      const newMeshes = SplitOps.splitMesh(this.sliceTarget, planePos, planeNormal, this.sliceMode);

      this.sm.removeObject(this.sliceTarget);
      newMeshes.forEach(m => this.sm.addObject(m));

      Notification.success(I18n.t('splitSuccess'));
    } catch (err) {
      console.error(err);
      Notification.error(I18n.t('splitError'));
    } finally {
      this.cancelSplit();
    }
  }

  cancelSplit() {
    this.sliceActive = false;
    this.sliceTarget = null;
    this.sliceHelper.visible = false;
    document.getElementById('split-controls').classList.add('hidden');
  }

  // ファイル入出力
  async handleFile(file) {
    try {
      this.history.captureSnapshot();
      const meshes = await Importer.loadFile(file);
      meshes.forEach(m => this.sm.addObject(m));
      this.viewer.fitToView(this.sm.objects);
      Notification.success(I18n.t('loadFileSuccess', file.name));
    } catch (err) {
      console.error(err);
      Notification.error(I18n.t('loadFileError', err.message));
    }
  }

  setupDropZone() {
    const dropArea = document.getElementById('viewport');
    ['dragenter', 'dragover'].forEach(name => {
      dropArea.addEventListener(name, (e) => {
        e.preventDefault();
        dropArea.style.outline = '2px dashed var(--accent-color)';
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropArea.addEventListener(name, (e) => {
        e.preventDefault();
        dropArea.style.outline = 'none';
      });
    });

    dropArea.addEventListener('drop', async (e) => {
      if (e.dataTransfer.files.length > 0) {
        for (const file of e.dataTransfer.files) {
          await this.handleFile(file);
        }
      }
    });
  }

  exportModel(format) {
    const targets = this.sm.selectedObjects.length > 0 ? this.sm.selectedObjects : this.sm.objects;
    if (targets.length === 0) {
      Notification.warning(I18n.t('exportWarning'));
      return;
    }

    const defaultName = targets.length === 1 ? targets[0].name : 'model';

    switch (format) {
      case 'stl':
        Exporter.exportSTL(targets, `${defaultName}.stl`, true);
        break;
      case '3mf':
        Exporter.export3MF(targets, `${defaultName}.3mf`);
        break;
      case 'obj':
        Exporter.exportOBJ(targets, `${defaultName}.obj`);
        break;
      case 'glb':
        Exporter.exportGLTF(targets, `${defaultName}.glb`, true);
        break;
      case 'ply':
        Exporter.exportPLY(targets, `${defaultName}.ply`, true);
        break;
    }
    Notification.success(I18n.t('exportSuccess', targets.length, format.toUpperCase()));
  }

  // UI同期
  updateOutliner() {
    const list = document.getElementById('item-list');
    list.innerHTML = '';
    document.getElementById('item-count').textContent = `(${this.sm.objects.length})`;

    this.sm.objects.forEach(mesh => {
      const item = document.createElement('div');
      item.className = 'outliner-item';
      if (this.sm.selectedObjects.includes(mesh)) {
        item.classList.add('selected');
      }

      const nameWrap = document.createElement('div');
      nameWrap.className = 'item-name-wrap';
      nameWrap.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        <span>${mesh.name || 'Model'}</span>
      `;

      const actions = document.createElement('div');
      actions.className = 'item-actions';

      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn-mini';
      delBtn.title = I18n.t('deleteTitle');
      delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.history.captureSnapshot();
        this.sm.removeObject(mesh);
      });

      actions.appendChild(delBtn);
      item.appendChild(nameWrap);
      item.appendChild(actions);

      item.addEventListener('click', (e) => {
        if (e.shiftKey || e.ctrlKey) {
          this.sm.toggleSelect(mesh);
        } else {
          this.sm.select(mesh);
        }
      });

      list.appendChild(item);
    });
  }

  setupInspectorBindings() {
    const propName = document.getElementById('prop-name');
    const dimX = document.getElementById('dim-x');
    const dimY = document.getElementById('dim-y');
    const dimZ = document.getElementById('dim-z');
    const lockAspect = document.getElementById('lock-aspect');

    const posX = document.getElementById('pos-x');
    const posY = document.getElementById('pos-y');
    const posZ = document.getElementById('pos-z');

    const rotX = document.getElementById('rot-x');
    const rotY = document.getElementById('rot-y');
    const rotZ = document.getElementById('rot-z');

    propName.addEventListener('change', (e) => {
      if (this.sm.selectedObjects.length === 1) {
        this.sm.selectedObjects[0].name = e.target.value;
        this.updateOutliner();
      }
    });

    const updateDims = (axis, val) => {
      if (this.sm.selectedObjects.length === 1) {
        const mesh = this.sm.selectedObjects[0];
        const current = TransformOps.getDimensions(mesh);
        const target = current.clone();
        target[axis] = Math.max(0.1, val);
        TransformOps.setDimensions(mesh, target, lockAspect.checked, axis);
        this.updateInspector();
      }
    };

    lockAspect.addEventListener('change', (e) => {
      this.sm.lockAspect = e.target.checked;
    });
    this.sm.lockAspect = lockAspect.checked;

    dimX.addEventListener('change', (e) => updateDims('x', parseFloat(e.target.value)));
    dimY.addEventListener('change', (e) => updateDims('y', parseFloat(e.target.value)));
    dimZ.addEventListener('change', (e) => updateDims('z', parseFloat(e.target.value)));

    posX.addEventListener('change', (e) => {
      if (this.sm.selectedObjects.length === 1) {
        this.sm.selectedObjects[0].position.x = parseFloat(e.target.value);
      }
    });
    posY.addEventListener('change', (e) => {
      if (this.sm.selectedObjects.length === 1) {
        this.sm.selectedObjects[0].position.y = parseFloat(e.target.value);
      }
    });
    posZ.addEventListener('change', (e) => {
      if (this.sm.selectedObjects.length === 1) {
        this.sm.selectedObjects[0].position.z = parseFloat(e.target.value);
      }
    });

    rotX.addEventListener('change', (e) => {
      if (this.sm.selectedObjects.length === 1) {
        this.sm.selectedObjects[0].rotation.x = THREE.MathUtils.degToRad(parseFloat(e.target.value));
      }
    });
    rotY.addEventListener('change', (e) => {
      if (this.sm.selectedObjects.length === 1) {
        this.sm.selectedObjects[0].rotation.y = THREE.MathUtils.degToRad(parseFloat(e.target.value));
      }
    });
    rotZ.addEventListener('change', (e) => {
      if (this.sm.selectedObjects.length === 1) {
        this.sm.selectedObjects[0].rotation.z = THREE.MathUtils.degToRad(parseFloat(e.target.value));
      }
    });
  }

  updateInspector() {
    const content = document.getElementById('inspector-content');
    const empty = document.getElementById('inspector-empty');

    if (this.sm.selectedObjects.length === 1) {
      content.style.display = 'block';
      empty.style.display = 'none';

      const mesh = this.sm.selectedObjects[0];
      document.getElementById('prop-name').value = mesh.name || '';

      const dims = TransformOps.getDimensions(mesh);
      document.getElementById('dim-x').value = dims.x.toFixed(1);
      document.getElementById('dim-y').value = dims.y.toFixed(1);
      document.getElementById('dim-z').value = dims.z.toFixed(1);

      document.getElementById('pos-x').value = mesh.position.x.toFixed(1);
      document.getElementById('pos-y').value = mesh.position.y.toFixed(1);
      document.getElementById('pos-z').value = mesh.position.z.toFixed(1);

      document.getElementById('rot-x').value = THREE.MathUtils.radToDeg(mesh.rotation.x).toFixed(1);
      document.getElementById('rot-y').value = THREE.MathUtils.radToDeg(mesh.rotation.y).toFixed(1);
      document.getElementById('rot-z').value = THREE.MathUtils.radToDeg(mesh.rotation.z).toFixed(1);

      const mat = this.sm.getSelectedMaterial();
      if (mat && mat.roughness !== undefined) {
        document.getElementById('mat-roughness').value = mat.roughness;
        document.getElementById('mat-metalness').value = mat.metalness;
      }

      // 頂点数・面数
      const geom = mesh.geometry;
      const vertCount = geom.attributes.position ? geom.attributes.position.count : 0;
      const faceCount = geom.index ? geom.index.count / 3 : vertCount / 3;
      document.getElementById('mesh-vertices').textContent = vertCount.toLocaleString();
      document.getElementById('mesh-triangles').textContent = Math.floor(faceCount).toLocaleString();
    } else {
      content.style.display = 'none';
      empty.style.display = 'block';
      empty.textContent = this.sm.selectedObjects.length > 1
        ? I18n.t('selectedItems', this.sm.selectedObjects.length)
        : I18n.t('selectPrompt');
    }
  }

  updatePaintUI() {
    const btnWireframe = document.getElementById('btn-toggle-wireframe');
    const btnXray = document.getElementById('btn-toggle-xray');
    const colorInput = document.getElementById('paint-color');

    const mat = this.sm.getSelectedMaterial();
    if (mat) {
      if (btnWireframe) {
        btnWireframe.classList.toggle('active', Boolean(mat.wireframe));
      }
      if (btnXray) {
        btnXray.classList.toggle('active', Boolean(mat.transparent && mat.opacity < 1.0));
      }
      if (colorInput && mat.color) {
        colorInput.value = '#' + mat.color.getHexString();
      }
    } else {
      if (btnWireframe) btnWireframe.classList.remove('active');
      if (btnXray) btnXray.classList.remove('active');
    }
  }

  updateStatusBar() {
    const selCount = this.sm.selectedObjects.length;
    document.getElementById('status-selection').textContent = selCount > 0 ? I18n.t('selectionCount', selCount) : I18n.t('noSelection');

    let totalTris = 0;
    this.sm.objects.forEach(mesh => {
      const geom = mesh.geometry;
      if (geom.attributes && geom.attributes.position) {
        totalTris += geom.index ? geom.index.count / 3 : geom.attributes.position.count / 3;
      }
    });
    document.getElementById('status-stats').textContent = I18n.t('totalPolygons', Math.floor(totalTris).toLocaleString());
  }
}

// 起動
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
