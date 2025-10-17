# three-tunnel

`three-tunnel` is a tunnel & grouting library for [three.js](https://threejs.org/) powering the **Tunnel Sketcher** demo application. It helps visualize underground tunnel geometry, grouting patterns, and geological fracture planes with a focus on clarity and interactivity. Use the components directly to build your own tunnel design or geological visualization tools.

<img src="https://github.com/andrewisen-tikab/three-tunnel/blob/dev/resources/example.gif?raw=true" width="100%" />

## Features

- Parametric tunnel geometry (`Tunnel3D`) with adjustable length, width, height and roof curvature.
- Interactive grouting pattern management (`Grout3D` instances via `TunnelControls`).
- Grouped or per-grout parameter editing (angle, length, overlap, color, visibility).
- Geological fracture planes (`FracturePlane3D`) with strike, dip, positional offsets, opacity and color.
- Real-time tunnel ↔ fracture plane edge intersection line segments using `three-mesh-bvh` acceleration.
- Screenshot export (hi‑res) and full JSON scene save/load (tunnel, grouts, planes, controls, background).
- Orthographic camera + predefined viewpoint helpers (profile left/right, cross section, zoom to fit).
- Configurable clipping planes to hide left/right halves for profile views.
- Auto-generated TypeDoc API docs.

## Installation

```bash
npm install three-tunnel
# or
yarn add three-tunnel
```

Peer dependency: `three` (install a compatible version if not already present).

## Quick Start

```ts
import * as THREE from 'three';
import { Tunnel3D, TunnelControls } from 'three-tunnel';

const scene = new THREE.Scene();

// 1. Create a tunnel
const tunnel = new Tunnel3D();
scene.add(tunnel);

// 2. Attach interactive controls (optionally pass a group/root object)
const controls = new TunnelControls(scene);
controls.attach(tunnel);

// 3. Add two initial grouts and update derived geometry
const grout1 = controls.addGrout();
const grout2 = controls.addGrout();
controls.update();

// 4. Change parameters (angles given in radians)
controls.setGroutParams(0, { angle: 15 * THREE.MathUtils.DEG2RAD, holeLength: 25 });
controls.setTunnelParams({ tunnelLength: 60, tunnelWidth: 12 });
controls.update();
```

## Detailed Usage

### Tunnel3D
Represents an extruded tunnel profile. Adjustable fields include: `tunnelLength`, `tunnelWidth`, `tunnelHeight`, `tunnelRoofHeight`, `tunnelColorHEX`. Use `TunnelControls.setTunnelParams()` to modify and propagate changes.

### Grout3D
Represents a screen (array) of grout holes. Key parameters: `angle` (radians from horizontal), `holeLength`, `overlap`, `screenLength`, `groutColorHEX`, `isVisible`. Add via `TunnelControls.addGrout()` then mutate with `setGroutParams(index, params)`.

### FracturePlane3D
Visual geological plane with adjustable `strike`, `dip`, `xPosition`, `yPosition`, `zPosition`, `planeColorHEX`, `opacity`, `visible`. Use `plane.update()` after modifying direct properties (or use provided param helpers if exposed).

### TunnelControls
Central coordinator for updating tunnel and grout geometry. Typical flow:
1. Instantiate: `const controls = new TunnelControls(groupOrScene);`
2. Attach tunnel: `controls.attach(tunnel);`
3. Add grouts: `controls.addGrout();`
4. Modify params: `controls.setTunnelParams({...})` / `controls.setGroutParams(i, {...});`
5. Call `controls.update();` to rebuild geometry.

### Saving / Loading State
If you mirror the example viewer pattern, you can serialize a full session via `toJSON()` and restore with `fromJSON(json)`. See `example/Viewer.ts` for the schema referenced by the `JSONParams` type.

### Intersections (Tunnel ↔ Fracture Planes)
Real-time edge intersection line segments are generated between the tunnel surface and each visible fracture plane using `three-mesh-bvh`'s `bvhcast` triangle-pair traversal.

Implementation highlights:
- BVH trees lazily computed for both tunnel and plane geometries (strategy: SAH).
- Each plane maintains a dedicated `THREE.LineSegments` object storing intersection edges for that frame.
- When a plane is hidden or produces zero intersections, its line object is hidden.
- Color and opacity of intersection lines sync to the owning plane every frame.

Code location: `_updatePlaneTunnelIntersections()` inside `example/Viewer.ts`.

## Example Application

You can explore a full UI in the bundled demo.

Run locally:
```bash
git clone https://github.com/andrewisen-tikab/three-tunnel.git
cd three-tunnel
yarn install        # or npm install
yarn dev            # launches Vite dev server for the example
```
Open the printed local URL (usually http://localhost:5173/) to interact.

Build the example static site:
```bash
yarn build:example
```
Output goes to `dist/examples` (served on GitHub Pages at `/example/`).

Production library build:
```bash
yarn build
```
Outputs compiled module bundle + types to `dist/`.

Live demo: https://andrewisen-tikab.github.io/three-tunnel/example/

## API Docs

Auto-generated TypeDoc: https://andrewisen-tikab.github.io/three-tunnel/docs/

Regenerate locally:
```bash
yarn docs
```
Outputs HTML docs to the configured docs directory (see `typedoc.json`).

## Contributing

Contributions are welcome! Suggested workflow:

1. Fork & clone the repo.
2. Create a feature branch from `dev` (or `next` if testing upcoming changes):
	```bash
	git checkout dev
	git checkout -b feat/your-feature-name
	```
3. Install dependencies (`yarn install`).
4. Run the example (`yarn dev`) and implement changes in `src/`.
5. Keep the README and docs in sync; update JSDoc comments for new public APIs.
6. Lint & build before opening a PR:
	```bash
	yarn lint
	yarn build
	yarn docs
	```
7. Open a Pull Request against `dev` describing the change, screenshots/GIFs encouraged.

Testing: (Lightweight) The project currently relies on manual visual verification. If you add logic-heavy features, consider adding unit tests (e.g. with Vitest) and update this section.

Versioning: The `version` script (`yarn version`) runs `setVersion.cjs` to keep internal `VERSION` references aligned.

## Roadmap / Ideas

- Extended fracture plane editing gizmos.
- More efficient intersection diffing (only update when transforms change).
- Grout pattern templates & CSV/JSON import.
- Optional perspective camera mode.
- Unit tests & CI.
- Performance benchmarking page.

Feel free to open an issue to discuss any of these or propose new ones.

## Troubleshooting

| Issue | Possible Fix |
|-------|--------------|
| Peer dependency warning for `three` | Install a compatible version: `yarn add three@^0.157.0` |
| Intersections not appearing | Ensure planes are visible and tunnel length/width > 0; check console for BVH errors. |
| Grout updates not reflected | Make sure to call `tunnelControls.update()` after changing parameters. |
| Clipping hides wrong side | Confirm you are on the latest branch; logic in `_updateTunnelClipping()` was recently adjusted. |

## License

MIT © André Wisén and contributors.

## Status

Early-stage / work in progress. Expect breaking changes until a 1.0 release.
