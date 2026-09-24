# mace-man 3D Builder

[![English](https://img.shields.io/badge/Language-English-blue.svg)](README.md)
[![日本語](https://img.shields.io/badge/Language-日本語-green.svg)](README-jp.md)

**mace-man 3D Builder** is a lightweight, browser-based 3D modeling and editing application inspired by Microsoft 3D Builder.  
It runs **100% locally** in your browser without any external network communication, ensuring high performance, privacy, and full offline capability.

---

## 🌟 Key Features

- **100% Offline & Private**: Zero external API or CDN requests. All 3D rendering, CSG Boolean operations, and file read/write operations execute entirely within your local browser.
- **Fluent Design Interface**: Clean, intuitive Windows 11 / 3D Builder-inspired aesthetic with glassmorphism, responsive panels, and dark mode.
- **Multilingual Support**: Switch seamlessly between **Japanese 🇯🇵 and English 🇺🇸** via the header dropdown (preference automatically saved to localStorage).
- **Advanced Mesh Editing**:
  - **Boolean Operations**: Union (Merge), Subtract (Difference), Intersect
  - **Split / Plane Slicing**: Cut models at any height and angle with automatic polygon capping (keep top, keep bottom, or split both)
  - **Lay Flat (Settle)**: Automatically snap bottom-most vertices to the build plate (`Y = 0`)
  - **Align**: Center and align multiple objects along the X / Z axes
- **Comprehensive 3D Format Support**:
  - **Import (File Picker & Drag-and-Drop)**: STL (Binary & ASCII), OBJ, 3MF, GLTF/GLB, PLY
  - **Export**: STL (Binary for 3D printing), 3MF, OBJ, GLB, PLY

---

## 🚀 Getting Started

### 💡 One-Click Launch (Recommended)
Convenient startup scripts are provided to automatically install dependencies (on first run), launch the local dev server, and open your default browser.

- **Windows (Batch file)**:  
  Double-click **`start.bat`** in File Explorer.
- **Windows (PowerShell)**:  
  ```powershell
  .\start.ps1
  ```
- **macOS / Linux / Git Bash (Shell script)**:  
  ```bash
  chmod +x start.sh  # Only needed the first time
  ./start.sh
  ```

---

### 💻 Manual CLI Launch

#### Prerequisites
- **Node.js**: v18.0 or higher (v20+ / v24+ recommended)
- **npm**: v9.0 or higher

#### 1. Install Dependencies
Run in the project root directory:

```bash
npm install
```

> **Note for Windows Users**: If you encounter an `UnauthorizedAccess` script execution policy restriction in PowerShell, use `npm.cmd install` or run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` in an administrative PowerShell terminal.

#### 2. Start Local Development Server
```bash
npm run dev
```

Once started, open the following URL in your web browser (Chrome, Edge, Firefox, etc.):
```
http://localhost:3000/
```

#### 3. Production Build (Static Bundle)
To build a static production bundle:

```bash
npm run build
```
The compiled static assets will be output to the `dist/` directory, ready to be served by any local web server.

---

## 🎮 User Guide & Features

### 1. Viewport & Camera Navigation
- **Orbit / Rotate**: Click and drag with the **Left Mouse Button**
- **Pan / Move**: Click and drag with the **Right Mouse Button**
- **Zoom**: Scroll the **Mouse Wheel**
- **Preset Views**: Switch camera angles instantly using the buttons in the "View" tab (Top, Front, Right, Isometric, Fit to View)

### 2. Adding Primitives (Insert Tab)
Easily add 3D primitives with a single click. Every generated primitive is automatically **grounded to the build plate (`Y = 0`)**:
- Cube / Box
- Cylinder
- Sphere
- Cone
- Pyramid (Square pyramid)
- Torus (Donut)
- Hexagonal Prism
- Wedge

### 3. Transforms & Dimensions (Inspector Panel)
- **3D Gizmo Modes**: Toggle via the floating toolbar at the bottom of the canvas or using hotkeys:
  - `W`: Translate (Move)
  - `E`: Rotate
  - `R`: Scale
- **Exact Dimensions (mm)**:
  - Directly enter Width (W), Height (H), and Depth (D) in millimeters in the right-hand Inspector panel.
  - Toggle the **Lock Aspect Ratio** checkbox to scale uniformly.
- **Lay Flat (Settle)**:
  - Click the **Lay Flat** button on the quick toolbar or Edit tab to immediately drop the rotated model onto the build plate floor (`Y = 0`).

### 4. Boolean Operations (Edit Tab)
Select two or more objects (hold `Shift` or `Ctrl` while clicking), then choose an operation:
- **Union (Merge)**: Combines multiple shapes into a single watertight mesh, eliminating internal geometries.
- **Subtract (Difference)**: Cuts the overlapping volume of tool objects out of the primary base object.
- **Intersect**: Retains only the shared, intersecting volume between objects.

### 5. Plane Slicing / Split (Edit Tab)
1. Select the target mesh and click **Split** in the Edit tab.
2. An interactive, semi-transparent cutting plane helper will appear.
3. Adjust the **Height** and **Angle** sliders to position the cut.
4. Select a mode: **Keep Top**, **Keep Bottom**, or **Keep Both**.
5. Click **Apply Split**. The cut surface is automatically capped with clean polygon faces.

### 6. Painting & Materials (Paint Tab)
- Real-time color picker and preset palette swatches.
- Roughness and Metalness sliders for surface finish.
- Wireframe toggle and X-Ray (translucent) preview modes.

### 7. File Import & Export (File Tab)
- **Import**: Click "Open" or simply **drag and drop** files (.stl, .obj, .3mf, .glb, .ply) directly onto the 3D canvas.
- **Export**: Export selected objects or the entire scene to `.stl` (binary format, ideal for 3D printing), `.3mf` (modern 3D manufacturing format), `.obj`, `.glb`, or `.ply`.

### 8. Keyboard Shortcuts
| Key | Action |
| :--- | :--- |
| `W` | Translate Gizmo (Move) |
| `E` | Rotate Gizmo |
| `R` | Scale Gizmo |
| `Delete` / `Backspace` | Delete selected object(s) |
| `Ctrl` + `D` | Duplicate selected object(s) |
| `Ctrl` + `Z` | Undo |
| `Ctrl` + `Y` (or `Ctrl`+`Shift`+`Z`) | Redo |
| `Shift` + Click | Multi-select / Toggle selection |

---

## 🖥️ Desktop GUI Application (Electron)

In addition to the web browser version, **mace-man 3D Builder** can be run and built as a standalone native desktop application for Windows, macOS, and Linux using **Electron**.

### 1. Run in Development Mode
```bash
npm run electron:dev
```
Launches the Vite dev server and the Electron application window with hot module replacement (HMR).

### 2. Building Standalone Executables

Build outputs are saved to the `release/` directory:

- **Windows Executables (.exe)**:
  ```bash
  npm run build:win
  ```
  - `release/mace-man 3D Builder Setup 1.1.1.exe` (NSIS Installer with desktop/start menu shortcuts)
  - `release/mace-man 3D Builder 1.1.1.exe` (Zero-install Portable Executable)

- **Linux Executables**:
  ```bash
  # Build zip archive on Windows host:
  npm run build:linux:zip

  # Build AppImage & deb on Linux host:
  npm run build:linux
  ```
  - `release/mace-man-3dbuilder-1.1.1.zip`

- **macOS Application (.dmg / .zip)**:
  ```bash
  npm run build:mac
  ```
  *(Note: macOS requires a macOS host or the included GitHub Actions CI runner to produce signed/packaged .dmg or .zip files).*

### 3. Automated Multi-Platform CI/CD with GitHub Actions
A complete workflow is provided in `.github/workflows/build.yml`. Pushing to your GitHub repository or creating a version tag (e.g. `v1.1.1`) automatically triggers native runners (`windows-latest`, `macos-latest`, `ubuntu-latest`) to build Windows `.exe`, macOS `.dmg`/`.zip`, and Linux `.AppImage`/`.deb` packages and upload them directly to GitHub Releases.

---

## 📝 Changelog

### v1.1.1
- **Fixed Paint "X-Ray (Translucent)" mode**:
  - Corrected Three.js material flags by applying `needsUpdate = true` and `depthWrite = false` on dynamic opacity changes, ensuring translucent rendering displays immediately on screen.
  - Synchronized paint toolbar controls (color picker, wireframe, and X-ray toggle) when active selection changes.
  - Enhanced traversal routines to safely apply materials across multi-material meshes and complex group hierarchies.
- **Enhanced Gizmo Uniform Scaling ("Lock Aspect Ratio")**:
  - Maintained aspect ratios when dragging single-axis (X, Y, Z) TransformControls scale handles while "Lock Aspect Ratio" is enabled.
  - Implemented seamless 3D uniform scaling when dragging 2D plane handles (XY, YZ, XZ) and the XYZ center handle based on handle projection vectors.
  - Added undo/redo history snapshot capture upon transform gizmo drag completion.

### v1.1.0
- Added multi-platform Electron desktop GUI app packaging (Windows, macOS, Linux).
- Integrated GitHub Actions automated cross-platform build and release workflow.

---

## 📁 Project Directory Structure

```
maceman_3dbuilder/
├── index.html              # Main HTML entry point (Fluent Design UI)
├── package.json            # Node.js dependencies (Three.js, three-bvh-csg, Vite)
├── vite.config.js          # Vite configuration
├── start.bat               # Windows batch launcher (double-click to run)
├── start.ps1               # Windows PowerShell launcher
├── start.sh                # macOS/Linux shell launcher
├── README.md               # English documentation
├── README-jp.md            # Japanese documentation
└── src/
    ├── main.js             # Core app orchestration and UI event handlers
    ├── style.css           # Fluent Design styling and tokens
    ├── core/
    │   ├── Viewer.js       # Three.js scene, build plate, camera, lights
    │   ├── SceneManager.js # Mesh management, selection state, raycasting
    │   └── History.js      # Undo / Redo history stack
    ├── operations/
    │   ├── Primitives.js   # 8 primitive shapes generation with floor grounding
    │   ├── BooleanOps.js   # three-bvh-csg Constructive Solid Geometry operations
    │   ├── SplitOps.js     # Plane slicing and auto-capping
    │   └── TransformOps.js # Lay Flat, millimeter dimensions, alignment
    ├── io/
    │   ├── Importer.js     # STL, OBJ, 3MF, GLTF, PLY local file loaders
    │   └── Exporter.js     # STL, OBJ, GLB, PLY file exporters
    └── ui/
        └── Notification.js # Toast notifications
```

---

## 📜 License
MIT License
