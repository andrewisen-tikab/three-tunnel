import * as THREE from 'three';
import { AbstractTunnel3D, AbstractTunnel3DParams } from './core';

export default class Tunnel3D extends THREE.Object3D implements AbstractTunnel3D {
    public isTunnel3D: boolean = true;

    public tunnelLength: number = 50;
    public tunnelWidth: number = 20;
    public tunnelHeight: number = 10;
    public tunnelRoofHeight: number = 3;

    public tunnelColorHEX: number = 0x808080;

    public groutGroup: THREE.Group;

    constructor(params?: Partial<AbstractTunnel3DParams>) {
        super();

        this.groutGroup = new THREE.Group();

        if (params) Object.assign(this, params);
        this._build();
    }

    private _build() {
        const tunnelShape = new THREE.Shape();

        const { tunnelWidth, tunnelHeight, tunnelLength, tunnelRoofHeight, tunnelColorHEX } = this;

        // Define the semi-major and semi-minor axes of the elliptical roof
        const semiMajorAxis = tunnelWidth / 2;
        const semiMinorAxis = tunnelRoofHeight; // Adjust this value to control the shape of the ellipse

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
            depth: tunnelLength,
            bevelEnabled: false,
        };

        const group = new THREE.Group();
        const tunnelGeometry = new THREE.ExtrudeGeometry(tunnelShape, extrudeSettings);
        const tunnelMaterial = new THREE.MeshBasicMaterial({
            // grey
            color: tunnelColorHEX,
        });
        const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);

        group.add(tunnel);

        const edges = new THREE.EdgesGeometry(tunnelGeometry);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0xffffff }),
        );
        group.add(line);

        group.translateY(tunnelHeight / 2);
        this.add(group);

        this.add(this.groutGroup);
    }

    update(): void {
        this.clear();
        this._build();
    }
}
