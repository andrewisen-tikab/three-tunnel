import * as THREE from 'three';
import { AbstractObject3D, AbstractTunnel3D, AbstractTunnel3DParams } from '../core';

type Found = {
    distance: number;
    index: number;
};
/**
 * An extruded tunnel shape with straight walls and an elliptical roof.
 * The tunnel is centered at the origin and extends along the positive z-axis.
 */
export default class Tunnel3D extends THREE.Object3D implements AbstractTunnel3D, AbstractObject3D {
    public isTunnel3D: boolean = true;

    public tunnelLength: number = 50;
    public tunnelWidth: number = 20;
    public tunnelHeight: number = 10;
    public tunnelRoofHeight: number = 3;

    public tunnelColorHEX: number = 0x808080;

    public groutGroup: THREE.Group;

    private _shape: THREE.Shape;

    constructor(params?: Partial<AbstractTunnel3DParams>) {
        super();

        this.groutGroup = new THREE.Group();
        this._shape = new THREE.Shape();

        if (params) Object.assign(this, params);
        this._build();
    }

    private _build() {
        const tunnelShape = new THREE.Shape();
        this._shape = tunnelShape;

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

        // Add the elliptical roof
        tunnelShape.ellipse(
            -tunnelWidth / 2,
            0,
            semiMajorAxis,
            semiMinorAxis,
            startAngle,
            endAngle,
            false,
            0,
        ); // Elliptical roof

        tunnelShape.lineTo(-tunnelWidth / 2, -tunnelHeight / 2); // Bottom-left corner

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
            new THREE.LineBasicMaterial({ color: 0x000000 }),
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

    toJSON() {
        const { tunnelLength, tunnelWidth, tunnelHeight, tunnelRoofHeight, tunnelColorHEX } = this;
        const object: AbstractTunnel3DParams = {
            tunnelLength,
            tunnelWidth,
            tunnelHeight,
            tunnelRoofHeight,
            tunnelColorHEX,
        };
        return object;
    }

    fromJSON(params: AbstractTunnel3D): void {
        Object.assign(this, params);
    }

    public getShapeDEV(myPointInWorld: THREE.Vector2) {
        const { tunnelHeight } = this;

        // const myPointInWorld = new THREE.Vector2(10, 0);

        const offset = new THREE.Vector2(
            0,
            // +Y is internally offset
            tunnelHeight / 2,
        );

        // Interpolate points
        const interpolatedPoints = this._generateInterpolatedPoints(100);

        // Convert to local space
        const myPointInLocal = myPointInWorld.clone().sub(offset);
        const closetsPointInLocal = this._findClosestPoint(interpolatedPoints, myPointInLocal);

        // Convert back
        const closetsPointInWorld = closetsPointInLocal.clone();
        closetsPointInWorld.x += offset.x;
        closetsPointInWorld.y += offset.y;

        // Add debug point
        // const geometry = new THREE.BoxGeometry(1, 1, 1);
        // const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        // const cube = new THREE.Mesh(geometry, material);
        // cube.position.set(closetsPointInWorld.x, closetsPointInWorld.y, 0);

        // this.add(cube);

        return closetsPointInWorld;
    }

    private _generateInterpolatedPoints(additionalPoints = 100): THREE.Vector2[] {
        // {x: -10, y: -5}
        // {x: 10, y: -5}
        // {x: 10, y: 5}
        // {x: -10, y: 5}
        // {x: 0, y: 5}
        // {x: 10, y: 5}
        // {x: 9.914448613738104, y: 5.391578576660155}
        const points = this._shape.getPoints();

        // return points;

        // Interpolate points
        const interpolatedPoints: THREE.Vector2[] = [];

        for (let i = 0; i < points.length - 1; i++) {
            const pointA = points[i];
            const pointB = points[i + 1];

            const distance = pointA.distanceTo(pointB);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _step = distance / additionalPoints;

            for (let j = 0; j < additionalPoints; j++) {
                const interpolatedPoint = new THREE.Vector2();
                interpolatedPoint.lerpVectors(pointA, pointB, j / additionalPoints);
                interpolatedPoints.push(interpolatedPoint);

                // {
                //     const geometry = new THREE.BoxGeometry(1, 1, 1);
                //     const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
                //     const cube = new THREE.Mesh(geometry, material);
                //     cube.position.set(
                //         interpolatedPoint.x,
                //         interpolatedPoint.y + this.tunnelHeight / 2,
                //         0,
                //     );
                //     this.add(cube);
                // }
            }
        }
        return interpolatedPoints;
    }

    private _findClosestPoint(points: THREE.Vector2[], myPoint: THREE.Vector2) {
        const found: Found = {
            distance: Infinity,
            index: Infinity,
        };

        for (let i = 0; i < points.length; i++) {
            const point = points[i];

            const distance = point.distanceTo(myPoint);
            if (distance < found.distance) {
                found.distance = distance;
                found.index = i;
            }
        }
        const closetsPoint = points[found.index];
        return closetsPoint;
    }
}
