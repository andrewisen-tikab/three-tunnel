# three-tunnel

`three-tunnel` is a tunnel & grouting library for [three.js](https://threejs.org/).
It's also a part of `Tunnel Sketcher` is a free tool for visualizing geological structures and grouting in tunnels.
Use parts of this library to create your own tunnel visualization tool.

<img src="https://github.com/andrewisen-tikab/three-tunnel/blob/dev/resources/example.gif?raw=true" width="100%" />

## Installation

```bash
npm install three-tunnel
```

## Usage

Begin by adding a tunnel.

```ts
import { Tunnel3D } from 'three-tunnel';

const tunnel = new Tunnel3D();
scene.add(tunnel);
```

To help you design the tunnel, you can add a controller.

```ts
import { TunnelControls } from 'three-tunnel';
const tunnelControls = new TunnelControls();
tunnelControls.attach(this._tunnel);
```

You can now add grouts to the tunnel.

```ts
const grout1 = this.tunnelControls.addGrout();
const grout2 = this.tunnelControls.addGrout();
this.tunnelControls.update();
```

## Example

A complete example can be found in the `example` folder.
Or, you can run the demo at:

[https://andrewisen-tikab.github.io/three-tunnel/example/](https://andrewisen-tikab.github.io/three-tunnel/example/)

## Docs

Auto-generated docs can be found here:
[https://andrewisen-tikab.github.io/three-tunnel/docs/](https://andrewisen-tikab.github.io/three-tunnel/docs/)
## Tunnel / Fracture Plane Edge Intersections

The viewer now computes real-time edge intersection line segments between the extruded `Tunnel3D` geometry and each visible `FracturePlane3D` using `three-mesh-bvh`'s `bvhcast` triangle pair traversal. Intersections appear as magenta line segments. Hiding a fracture plane via its GUI visibility toggle will also hide its intersection lines automatically.

Implementation details:
- BVH trees are generated for the tunnel and plane geometries when first needed.
- Each plane gets a dedicated `THREE.LineSegments` buffer updated per frame only when visible.
- When no intersections exist for a plane its line object is hidden.

This logic lives in `example/Viewer.ts` inside `_updatePlaneTunnelIntersections()`.

## Status

This is a work in progress. It's not production ready.
