import { useEffect } from 'react';
import CameraControls from 'camera-controls';

CameraControls.install({ THREE });

import './App.css';

import * as THREE from 'three';

function App() {
    useEffect(() => {
        const clock = new THREE.Clock();

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000,
        );

        const renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(renderer.domElement);

        const cameraControls = new CameraControls(camera, renderer.domElement);

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        // scene.add(cube);

        const size = 10;
        const divisions = 10;

        const gridHelper = new THREE.GridHelper(size, divisions);
        scene.add(gridHelper);

        cameraControls.setPosition(0, 5, 5);

        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);
        const tunnelShape = new THREE.Shape();

        // Define the width and height of the tunnel
        const tunnelWidth = 5; // Adjust the width of the tunnel
        const tunnelHeight = 10; // Adjust the height of the tunnel

        // Define the semi-major and semi-minor axes of the elliptical roof
        const semiMajorAxis = tunnelWidth / 2;
        const semiMinorAxis = 3; // Adjust this value to control the shape of the ellipse

        // Calculate the starting and ending angles for the ellipse
        const startAngle = 0;
        const endAngle = Math.PI;

        // Create the straight walls
        tunnelShape.moveTo(-tunnelWidth / 2, -tunnelHeight / 2); // Bottom-left corner
        tunnelShape.lineTo(tunnelWidth / 2, -tunnelHeight / 2); // Bottom-right corner
        tunnelShape.lineTo(tunnelWidth / 2, tunnelHeight / 2); // Top-right corner
        tunnelShape.lineTo(-tunnelWidth / 2, tunnelHeight / 2); // Top-left corner

        // Add the elliptical roof
        tunnelShape.moveTo(0, tunnelHeight / 2); // Move to the starting point of the roof
        tunnelShape.ellipse(0, 0, semiMajorAxis, semiMinorAxis, startAngle, endAngle, false, 0); // Elliptical roof

        // Create the final straight wall
        // Extrude the shape to create the tunnel geometry
        const extrudeSettings = {
            steps: 100,
            depth: 20,
            bevelEnabled: false,
        };

        const tunnelGeometry = new THREE.ExtrudeGeometry(tunnelShape, extrudeSettings);
        const tunnelMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
        scene.add(tunnel);

        function animate() {
            const delta = clock.getDelta();
            cameraControls.update(delta);

            requestAnimationFrame(animate);

            renderer.render(scene, camera);
        }

        animate();
    }, []);

    return <></>;
}

export default App;
