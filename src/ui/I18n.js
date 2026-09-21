// 多言語対応 (i18n) モジュール
export const translations = {
  ja: {
    // Brand & Header
    appName: 'mace-man 3D Builder',
    offlineBadge: 'オフライン完結',
    
    // Quick Actions
    undoTitle: '元に戻す (Ctrl+Z)',
    redoTitle: 'やり直す (Ctrl+Y)',
    layFlat: '接地',
    layFlatTitle: '接地 (床面 Y=0 に落とす)',
    duplicateTitle: '複製 (Ctrl+D)',
    deleteTitle: '削除 (Delete)',

    // Ribbon Tabs
    tabInsert: '挿入 (Insert)',
    tabEdit: '編集 (Edit)',
    tabPaint: 'ペイント (Paint)',
    tabView: '表示 (View)',
    tabFile: 'ファイル (File)',

    // Insert Tab
    cube: '立方体',
    cubeTitle: '立方体を追加',
    cylinder: '円柱',
    cylinderTitle: '円柱を追加',
    sphere: '球体',
    sphereTitle: '球体を追加',
    cone: '円錐',
    coneTitle: '円錐を追加',
    pyramid: '角錐',
    pyramidTitle: '角錐を追加',
    torus: 'トーラス',
    torusTitle: 'トーラスを追加',
    hexagon: '六角柱',
    hexagonTitle: '六角柱を追加',
    wedge: 'くさび',
    wedgeTitle: 'くさび型を追加',

    // Edit Tab
    union: '結合',
    unionTitle: '結合 (複数メッシュを1つに融合)',
    subtract: '型抜き',
    subtractTitle: '型抜き (選択モデルから他を削る)',
    intersect: '交差',
    intersectTitle: '交差 (重なり合った部分だけを残す)',
    split: '分割 (Split)',
    splitTitle: '平面でモデルを切断・スライス',
    alignCenter: '整列',
    alignCenterTitle: '選択オブジェクトを中央揃え',

    // Paint Tab
    colorSelect: 'カラー選択',
    colorPickerTitle: 'カラーピッカー',
    wireframe: 'ワイヤー',
    wireframeTitle: 'ワイヤーフレーム表示切替',
    xray: 'X線 (透明)',
    xrayTitle: '半透明 X線モード',

    // View Tab
    viewTop: '上面',
    viewFront: '前面',
    viewRight: '右側面',
    viewIso: '等角 (斜め)',
    viewFit: '全体表示',
    gridBed: 'グリッド床',

    // File Tab
    fileNew: '新規',
    fileNewTitle: 'シーンをクリアして新規作成',
    fileOpen: '開く (読込)',
    fileOpenTitle: 'STL, OBJ, 3MF, GLB, PLYを読込',
    exportStl: 'STL出力',
    exportStlTitle: '3Dプリンタ用STLファイルを出力',
    export3mf: '3MF出力',
    export3mfTitle: '3Dプリンタ用3MFファイルを出力',
    exportObj: 'OBJ出力',
    exportGlb: 'GLB出力',
    exportPly: 'PLY出力',

    // Floating Transform Bar
    modeTranslate: '移動',
    modeTranslateTitle: '移動 (W)',
    modeRotate: '回転',
    modeRotateTitle: '回転 (E)',
    modeScale: '拡縮',
    modeScaleTitle: '拡大縮小 (R)',

    // Split Overlay
    splitTitleHeader: '✂️ 平面分割モード',
    splitKeepTop: '上側を残す',
    splitKeepBottom: '下側を残す',
    splitKeepBoth: '両方を保持',
    splitHeight: '高さ:',
    splitAngle: '角度:',
    splitApply: '切断を実行',
    splitCancel: 'キャンセル',

    // Outliner & Inspector
    outlinerTitle: 'アイテム一覧',
    inspectorTitle: 'プロパティ',
    propName: 'オブジェクト名',
    dimensions: '寸法 (mm)',
    lockAspect: '比率維持',
    dimW: '幅 (X)',
    dimH: '高さ (Y)',
    dimD: '奥行 (Z)',
    position: '位置 (mm)',
    posX: 'X位置',
    posY: 'Y位置',
    posZ: 'Z位置',
    rotation: '回転 (度)',
    rotX: 'X軸回転',
    rotY: 'Y軸回転',
    rotZ: 'Z軸回転',
    material: 'マテリアル',
    roughness: '粗さ',
    metalness: '金属感',
    meshInfo: 'メッシュ情報',
    vertices: '頂点数:',
    triangles: 'ポリゴン面数:',
    selectPrompt: 'オブジェクトを選択するとプロパティが表示されます',
    selectedItems: '{0} 個のオブジェクトが選択されています',

    // Status Bar
    noSelection: '未選択',
    selectionCount: '選択中: {0} 個',
    totalPolygons: '総ポリゴン: {0}',
    buildPlateSize: 'ビルドプレート: 400 × 400 mm',
    controlHint: 'ドラッグで視点移動 / 右ドラッグでパン / ホイールでズーム',

    // Dialog & Notifications
    readyToast: 'mace-man 3D Builderが準備完了しました',
    addSuccess: '{0} を追加しました',
    groundSuccess: '床面(Y=0)に接地しました',
    alignSuccess: '中央に整列しました',
    alignWarning: '整列するには2つ以上のオブジェクトを選択してください',
    booleanWarning: 'ブーリアン演算には2つ以上のオブジェクトを選択してください',
    booleanSuccess: '{0}が完了しました',
    booleanUnion: '結合',
    booleanSubtract: '型抜き',
    booleanIntersect: '交差',
    booleanError: '演算処理中にエラーが発生しました',
    splitPrompt: '切断するオブジェクトを選択してください',
    splitHint: '切断平面の位置・角度を調整し、「切断を実行」をクリックしてください',
    splitSuccess: 'モデルの切断が完了しました',
    splitError: '切断処理に失敗しました',
    newSceneConfirm: '現在のモデルをすべてクリアして新規作成しますか？',
    newSceneToast: '新規シーンを作成しました',
    exportWarning: 'エクスポートするモデルがありません',
    exportSuccess: '{0}個のモデルを{1}形式で出力しました',
    loadFileSuccess: '{0} を読み込みました',
    loadFileError: 'ファイルの読み込みに失敗しました: {0}'
  },

  en: {
    // Brand & Header
    appName: 'mace-man 3D Builder',
    offlineBadge: 'Offline',
    
    // Quick Actions
    undoTitle: 'Undo (Ctrl+Z)',
    redoTitle: 'Redo (Ctrl+Y)',
    layFlat: 'Lay Flat',
    layFlatTitle: 'Lay Flat (Drop to bed Y=0)',
    duplicateTitle: 'Duplicate (Ctrl+D)',
    deleteTitle: 'Delete (Delete)',

    // Ribbon Tabs
    tabInsert: 'Insert',
    tabEdit: 'Edit',
    tabPaint: 'Paint',
    tabView: 'View',
    tabFile: 'File',

    // Insert Tab
    cube: 'Cube',
    cubeTitle: 'Add Cube',
    cylinder: 'Cylinder',
    cylinderTitle: 'Add Cylinder',
    sphere: 'Sphere',
    sphereTitle: 'Add Sphere',
    cone: 'Cone',
    coneTitle: 'Add Cone',
    pyramid: 'Pyramid',
    pyramidTitle: 'Add Pyramid',
    torus: 'Torus',
    torusTitle: 'Add Torus',
    hexagon: 'Hexagon',
    hexagonTitle: 'Add Hexagonal Prism',
    wedge: 'Wedge',
    wedgeTitle: 'Add Wedge',

    // Edit Tab
    union: 'Merge',
    unionTitle: 'Merge (Combine multiple meshes into one)',
    subtract: 'Subtract',
    subtractTitle: 'Subtract (Cut tool shapes out of base model)',
    intersect: 'Intersect',
    intersectTitle: 'Intersect (Keep overlapping volume only)',
    split: 'Split',
    splitTitle: 'Split / Slice model with cutting plane',
    alignCenter: 'Align',
    alignCenterTitle: 'Center-align selected objects',

    // Paint Tab
    colorSelect: 'Color',
    colorPickerTitle: 'Color Picker',
    wireframe: 'Wireframe',
    wireframeTitle: 'Toggle Wireframe display',
    xray: 'X-Ray',
    xrayTitle: 'Translucent X-Ray mode',

    // View Tab
    viewTop: 'Top',
    viewFront: 'Front',
    viewRight: 'Right',
    viewIso: 'Isometric',
    viewFit: 'Fit View',
    gridBed: 'Grid Bed',

    // File Tab
    fileNew: 'New',
    fileNewTitle: 'Clear scene and create new',
    fileOpen: 'Open',
    fileOpenTitle: 'Import STL, OBJ, 3MF, GLB, PLY',
    exportStl: 'Export STL',
    exportStlTitle: 'Export binary STL for 3D printing',
    export3mf: 'Export 3MF',
    export3mfTitle: 'Export 3MF file for 3D printing',
    exportObj: 'Export OBJ',
    exportGlb: 'Export GLB',
    exportPly: 'Export PLY',

    // Floating Transform Bar
    modeTranslate: 'Move',
    modeTranslateTitle: 'Move (W)',
    modeRotate: 'Rotate',
    modeRotateTitle: 'Rotate (E)',
    modeScale: 'Scale',
    modeScaleTitle: 'Scale (R)',

    // Split Overlay
    splitTitleHeader: '✂️ Plane Slicing Mode',
    splitKeepTop: 'Keep Top',
    splitKeepBottom: 'Keep Bottom',
    splitKeepBoth: 'Keep Both',
    splitHeight: 'Height:',
    splitAngle: 'Angle:',
    splitApply: 'Apply Split',
    splitCancel: 'Cancel',

    // Outliner & Inspector
    outlinerTitle: 'Items',
    inspectorTitle: 'Properties',
    propName: 'Object Name',
    dimensions: 'Dimensions (mm)',
    lockAspect: 'Lock Aspect',
    dimW: 'Width (X)',
    dimH: 'Height (Y)',
    dimD: 'Depth (Z)',
    position: 'Position (mm)',
    posX: 'X Position',
    posY: 'Y Position',
    posZ: 'Z Position',
    rotation: 'Rotation (deg)',
    rotX: 'X Rotation',
    rotY: 'Y Rotation',
    rotZ: 'Z Rotation',
    material: 'Material',
    roughness: 'Roughness',
    metalness: 'Metalness',
    meshInfo: 'Mesh Info',
    vertices: 'Vertices:',
    triangles: 'Triangles:',
    selectPrompt: 'Select an object to view properties',
    selectedItems: '{0} objects selected',

    // Status Bar
    noSelection: 'No selection',
    selectionCount: 'Selected: {0}',
    totalPolygons: 'Total Polygons: {0}',
    buildPlateSize: 'Build Plate: 400 × 400 mm',
    controlHint: 'Drag to rotate / Right-drag to pan / Wheel to zoom',

    // Dialog & Notifications
    readyToast: 'mace-man 3D Builder is ready',
    addSuccess: 'Added {0}',
    groundSuccess: 'Grounded to bed (Y=0)',
    alignSuccess: 'Aligned to center',
    alignWarning: 'Select 2 or more objects to align',
    booleanWarning: 'Select 2 or more objects for boolean operation',
    booleanSuccess: '{0} completed',
    booleanUnion: 'Merge',
    booleanSubtract: 'Subtract',
    booleanIntersect: 'Intersect',
    booleanError: 'An error occurred during boolean operation',
    splitPrompt: 'Select an object to split',
    splitHint: 'Adjust cutting plane height/angle, then click Apply Split',
    splitSuccess: 'Model cut successfully',
    splitError: 'Failed to split model',
    newSceneConfirm: 'Clear all models and create a new scene?',
    newSceneToast: 'New scene created',
    exportWarning: 'No models to export',
    exportSuccess: 'Exported {0} model(s) as {1}',
    loadFileSuccess: 'Loaded {0}',
    loadFileError: 'Failed to load file: {0}'
  }
};

export class I18n {
  static currentLang = localStorage.getItem('app_language') || 'ja';
  static listeners = [];

  static setLanguage(lang) {
    if (translations[lang]) {
      this.currentLang = lang;
      localStorage.setItem('app_language', lang);
      this.applyTranslations();
      this.listeners.forEach(cb => cb(lang));
    }
  }

  static t(key, ...args) {
    const langDict = translations[this.currentLang] || translations.ja;
    let text = langDict[key] || translations.ja[key] || key;
    args.forEach((arg, index) => {
      text = text.replace(new RegExp(`\\{${index}\\}`, 'g'), arg);
    });
    return text;
  }

  static onChange(cb) {
    this.listeners.push(cb);
  }

  static applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.setAttribute('title', this.t(key));
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', this.t(key));
    });

    const langSelect = document.getElementById('lang-select');
    if (langSelect && langSelect.value !== this.currentLang) {
      langSelect.value = this.currentLang;
    }
  }
}
