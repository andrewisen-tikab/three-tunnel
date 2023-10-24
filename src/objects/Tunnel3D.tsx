import * as THREE from 'three';
import { AbstractObject3D, AbstractTunnel3D, AbstractTunnel3DParams } from '../core';

type Found = {
    distance: number;
    index: number;
};

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
const debug = new THREE.Group();

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

    stickInterpolatedPoints: THREE.Vector2[];

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

        this.add(debug);
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
        const interpolatedPoints = this._generateInterpolatedPoints(1_000);

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

        const config = {
            topLeft: false,
            topRight: false,
            bottomLeft: false,
            bottomRight: false,
        };

        const { x: x1, y: y1 } = closetsPointInWorld;
        const x = Math.round(x1);
        const y = Math.round(y1);

        // console.log(x, y);

        if (x === 10 && y === 10) {
            config.topLeft = true;
        } else if (x === 10 && y === 0) {
            config.bottomLeft = true;
        } else if (x === -10 && y === 0) {
            config.bottomRight = true;
        } else if (x === -10 && y === 10) {
            config.topRight = true;
        }

        return { closetsPointInWorld, config };
    }

    public buildTunnelInterpolation(spanDistance = 3) {
        const manyPoints = this._shape.getPoints(100);

        let totalDistance = 0;
        for (let i = 1; i < manyPoints.length; i++) {
            const prevouisPpoint = manyPoints[i - 1];
            const currentPoint = manyPoints[i];
            const distance = prevouisPpoint.distanceTo(currentPoint);
            totalDistance += distance;
        }

        const points = this._shape.getPoints(1);

        // return points;

        // Interpolate points
        const interpolatedPoints: THREE.Vector2[] = [];

        for (let i = 0; i < points.length - 1; i++) {
            const pointA = points[i];
            const pointB = points[i + 1];

            // At every spanDistance, add a point
            const distance = pointA.distanceTo(pointB);
            let currentDistance = 0;

            while (currentDistance < distance) {
                const interpolatedPoint = new THREE.Vector2();
                interpolatedPoint.lerpVectors(pointA, pointB, j / step);
                interpolatedPoints.push(interpolatedPoint);
            }

            // const step = distance / spanDistance;

            // for (let j = 0; j < step; j++) {
            //     const interpolatedPoint = new THREE.Vector2();
            //     interpolatedPoint.lerpVectors(pointA, pointB, j / step);
            //     interpolatedPoints.push(interpolatedPoint);

            //     {
            //         const geometry = new THREE.BoxGeometry(1, 1, 1);
            //         const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            //         const cube = new THREE.Mesh(geometry, material);
            //         cube.position.set(
            //             interpolatedPoint.x,
            //             interpolatedPoint.y + this.tunnelHeight / 2,
            //             0,
            //         );
            //         this.add(cube);
            //     }
            // }
        }
    }

    private _generateInterpolatedPoints(
        additionalPoints = 100,
        points = this._shape.getPoints(),
    ): THREE.Vector2[] {
        // {x: -10, y: -5}
        // {x: 10, y: -5}
        // {x: 10, y: 5}
        // {x: -10, y: 5}
        // {x: 0, y: 5}
        // {x: 10, y: 5}
        // {x: 9.914448613738104, y: 5.391578576660155}

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

    public buildStick(position: number, stick: number) {
        // const position = 20;

        debug.clear();
        const clone = this._shape.clone();
        const points = clone.getPoints();

        // return points;

        // Interpolate points
        const xs = [];
        const ys = [];
        for (let i = 0; i < points.length - 1; i++) {
            const pointA = points[i];

            xs.push(pointA.x);
            ys.push(pointA.y);
        }

        const center = new THREE.Vector2();
        center.set(
            xs.reduce((a, b) => a + b, 0) / xs.length,
            ys.reduce((a, b) => a + b, 0) / ys.length,
        );

        const newPoints = [];

        for (let i = 0; i < points.length; i++) {
            const pointA = points[i];
            const direction = new THREE.Vector2();
            direction.subVectors(pointA, center).normalize();

            const pointB = pointA.clone().add(direction.multiplyScalar(stick));

            newPoints.push(pointB);
        }

        // const interpolatedPoints = this._generateInterpolatedPoints(100, newPoints);
        const stickInterpolatedPoints = this._generateInterpolatedPoints(200, newPoints);
        this.stickInterpolatedPoints = stickInterpolatedPoints;

        for (let i = 0; i < stickInterpolatedPoints.length; i++) {
            const element = stickInterpolatedPoints[i];

            const clone = cube.clone();
            clone.position.set(element.x, element.y + this.tunnelHeight / 2, position);
            debug.add(clone);
        }
    }

    // TODO: Make sure the distance is correct
    // Iterate till the distance is correct
    public getShapeDEV2(
        newPoint: THREE.Vector2,
        oldPoint: THREE.Vector2,
        direction: THREE.Vector2,
        distance = 3,
        tolerance = 0.1,
    ) {
        const { tunnelHeight } = this;

        const offset = new THREE.Vector2(
            0,
            // +Y is internally offset
            tunnelHeight / 2,
        );

        // Interpolate points
        const interpolatedPoints = this.stickInterpolatedPoints;

        let distanceBetweenPoints = Infinity;

        let closetsPointInWorld = new THREE.Vector2();
        let conditionMet = false;
        let whileIndex = 0;
        while (conditionMet === false) {
            whileIndex++;
            if (whileIndex > 1_000) conditionMet = true;

            // Convert to local space
            const myPointInLocal = newPoint.clone().sub(offset);
            const closetsPointInLocal = this._findClosestPoint(interpolatedPoints, myPointInLocal);

            // Convert back
            closetsPointInWorld = closetsPointInLocal.clone();
            closetsPointInWorld.x += offset.x;
            closetsPointInWorld.y += offset.y;

            // Check distance, e.g 2.7
            distanceBetweenPoints = oldPoint.distanceTo(closetsPointInWorld);

            // 2.7 < 3 - 0.1 = 2.9
            if (distanceBetweenPoints < distance - tolerance) {
                newPoint.add(direction.clone().multiplyScalar(tolerance));
                // console.log('too close');
            } else if (distanceBetweenPoints > distance + tolerance) {
                newPoint.add(direction.clone().multiplyScalar(-tolerance));
                // console.log('too far');
            } else {
                // console.log(distanceBetweenPoints);
                conditionMet = true;
                // console.log('just right');
            }
        }

        console.log(distanceBetweenPoints, whileIndex);

        // Add debug point
        // const geometry = new THREE.BoxGeometry(1, 1, 1);
        // const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        // const cube = new THREE.Mesh(geometry, material);
        // cube.position.set(closetsPointInWorld.x, closetsPointInWorld.y, 0);

        // this.add(cube);

        const config = {
            topLeft: false,
            topRight: false,
            bottomLeft: false,
            bottomRight: false,
        };

        const { x, y } = closetsPointInWorld;
        if (x == 10 && y == 10) {
            config.topLeft = true;
        } else if (x == 10 && y == 0) {
            config.bottomLeft = true;
        } else if (x == -10 && y == 0) {
            config.bottomRight = true;
        } else if (x == -10 && y == 10) {
            config.topRight = true;
        }

        return { closetsPointInWorld, config };
    }
}
