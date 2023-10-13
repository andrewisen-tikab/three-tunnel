# three-tunnel

`three-tunnel` is a tunnel & grouting library for [three.js](https://threejs.org/).
It's purpose is to help rock engineers to design grouts.

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

## Status

This is a work in progress. It's not production ready.
