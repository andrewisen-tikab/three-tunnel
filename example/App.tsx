import { useEffect } from 'react';
import CameraControls from 'camera-controls';

CameraControls.install({ THREE });

import './App.css';

import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { Tunnel3D } from '../src';

const stats = new Stats();
document.body.appendChild(stats.dom);

const gui = new GUI();

const clock = new THREE.Clock();

const scene = new THREE.Scene();
const group = new THREE.Group();
scene.add(group);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff, 1);

document.body.appendChild(renderer.domElement);

const cameraControls = new CameraControls(camera, renderer.domElement);

const tunnel = new Tunnel3D();
group.add(tunnel);

const size = 10;
const divisions = 10;

const gridHelper = new THREE.GridHelper(size, divisions);
scene.add(gridHelper);

cameraControls.setPosition(-10, 10, 10);

const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

const fit = () => {
    cameraControls.fitToSphere(tunnel, true);
};

setTimeout(() => {
    fit();
}, 100);

function animate() {
    const delta = clock.getDelta();
    cameraControls.update(delta);

    requestAnimationFrame(animate);

    stats.update();

    renderer.render(scene, camera);
}

const tunnelFolder = gui.addFolder('Tunnel');
tunnelFolder
    .add(tunnel, 'tunnelLength', 1, 100)
    .name('Length [L]')
    .onChange((value) => {
        tunnel.tunnelLength = value;
        tunnel.update();
    })
    .disable();

tunnelFolder
    .add(tunnel, 'tunnelWidth', 1, 100)
    .name('Width [W]')
    .onChange((value) => {
        tunnel.tunnelWidth = value;
        tunnel.update();
    });

tunnelFolder
    .add(tunnel, 'tunnelHeight', 1, 20)
    .name('Height [H]')
    .onChange((value) => {
        tunnel.tunnelHeight = value;
        tunnel.update();
    });

tunnelFolder
    .add(tunnel, 'tunnelRoofHeight', 1, 10)
    .name('Roof [f]')
    .onChange((value) => {
        tunnel.tunnelRoofHeight = value;
        tunnel.update();
    });

const params = {
    fit,
    fitProfile: () => {
        cameraControls.rotateTo(-Math.PI / 2, Math.PI / 2, true);
        cameraControls.fitToBox(tunnel, true, { paddingLeft: 1, paddingRight: 1 });
    },
    fitCrossSection: () => {
        cameraControls.rotateTo(-Math.PI, Math.PI / 2, true);

        cameraControls.fitToBox(tunnel, true, { paddingTop: 1, paddingBottom: 1 });
    },
};
const cameraFolder = gui.addFolder('Camera');
cameraFolder.add(params, 'fit').name('Zoom to Tunnel');
cameraFolder.add(params, 'fitProfile').name('Profile');
cameraFolder.add(params, 'fitCrossSection').name('Cross Section');

animate();

function App() {
    useEffect(() => {}, []);

    return <></>;
}

export default App;
