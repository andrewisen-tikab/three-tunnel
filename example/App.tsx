import { useEffect } from 'react';
import CameraControls from 'camera-controls';

CameraControls.install({ THREE });

import './App.css';

import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { Tunnel3D, TunnelControls } from '../src';

const stats = new Stats();
document.body.appendChild(stats.dom);

const gui = new GUI();

const clock = new THREE.Clock();

const scene = new THREE.Scene();
const group = new THREE.Group();
scene.add(group);

const { innerWidth: width, innerHeight: height } = window;
const camera = new THREE.OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    1,
    1_000,
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff, 1);

document.body.appendChild(renderer.domElement);

const cameraControls = new CameraControls(camera, renderer.domElement);

const tunnel = new Tunnel3D();
group.add(tunnel);

const tunnelControls = new TunnelControls();
tunnelControls.attach(tunnel);
const grout = tunnelControls.addGrout();

const size = 200;
const divisions = 200;

const gridHelper = new THREE.GridHelper(size, divisions);

scene.add(gridHelper);

cameraControls.setPosition(-100, 100, 100);

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
        tunnelControls.setTunnelParams({ tunnelLength: value });
    })
    .disable();

tunnelFolder
    .add(tunnel, 'tunnelWidth', 1, 100)
    .name('Width [W] (m)')
    .onChange((value) => {
        tunnelControls.setTunnelParams({ tunnelWidth: value });
    });

tunnelFolder
    .add(tunnel, 'tunnelHeight', 1, 20)
    .name('Height [H] (m)')
    .onChange((value) => {
        tunnelControls.setTunnelParams({ tunnelHeight: value });
    });

tunnelFolder
    .add(tunnel, 'tunnelRoofHeight', 1, 10)
    .name('Roof [f] (m)')
    .onChange((value) => {
        tunnelControls.setTunnelParams({ tunnelRoofHeight: value });
    });

const groutFolder = gui.addFolder('Grout');
const groutParams = {
    visible: true,
    angle: 5,
    holeLength: 10,
};

groutFolder
    .add(groutParams, 'visible')
    .name('Visible')
    .onChange((value) => {
        if (grout == null) return;
        grout.visible = value;
    });
groutFolder
    .add(groutParams, 'angle', 1, 20, 1)
    .name('Angle [α] (degrees)')
    .onChange((value) => {
        tunnelControls.setGroutParams({ angle: value * THREE.MathUtils.DEG2RAD });
    });

groutFolder
    .add(groutParams, 'holeLength', 1, 90)
    .name('Hole Length [L] (m)')
    .onChange((value) => {
        tunnelControls.setGroutParams({ holeLength: value });
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
