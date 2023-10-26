import * as THREE from 'three';
import SpriteText from 'three-spritetext';

import { AbstractObject3D, AbstractTunnel3D, AbstractTunnel3DParams } from '../core';

import ClipperLib from '@doodle3d/clipper-lib';
import Shape from '@doodle3d/clipper-js';
import { Grout3D } from '..';
import { disposeMesh, disposeMeshGroup } from '../utils/disposeMesh';

type Found = {
    distance: number;
    index: number;
};

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
const debug = new THREE.Group();

type PointAlongShape = {
    point: THREE.Vector2;
    index: number;
};

// function evenlyInterpolateShape(shape: THREE.Shape, numPoints: number = 1000) {
//     const points = shape.getPoints();
//     const totalLength = shape.getLength();

//     const interpolatedPoints = [];
//     const segmentLength = totalLength / (numPoints - 1);

//     for (let i = 0; i < numPoints; i++) {
//         let distance = i * segmentLength;

//         for (let j = 0; j < points.length - 1; j++) {
//             const p1 = points[j];
//             const p2 = points[j + 1];
//             const segmentLength = p1.distanceTo(p2);

//             if (distance < segmentLength) {
//                 const t = distance / segmentLength;
//                 const interpolatedPoint = p1.clone().lerp(p2, t);
//                 interpolatedPoints.push(interpolatedPoint);
//                 break;
//             } else {
//                 distance -= segmentLength;
//             }
//         }
//     }

//     // const p1 = points[points.length - 1];
//     // const p2 = points[0];

//     // const delta = p1.distanceTo(p2);
//     // // I want add a point  every 0.1 unit
//     // const step = 0.01;
//     // let distance = 0;
//     // while (distance < delta) {
//     //     const t = distance / delta;
//     //     const interpolatedPoint = p1.clone().lerp(p2, t);
//     //     interpolatedPoints.push(interpolatedPoint);
//     //     distance += step;
//     // }

//     return interpolatedPoints;
// }

/**
 *
 * @param shape WORKS
 * @param numPoints
 * @returns
 */
function evenlyInterpolateShape(shape: THREE.Shape, numPoints: number) {
    const points = shape.getPoints();
    // Assuming you have an array of Vector3 points representing the shape
    const shapePoints = [...points, points[0]];

    // Step 1: Calculate the total length
    let totalLength = 0;
    for (let i = 1; i < shapePoints.length; i++) {
        totalLength += shapePoints[i].distanceTo(shapePoints[i - 1]);
    }

    // Step 2: Calculate the number of points to add
    // const desiredPointSpacing = 0.01; // 1cm
    const desiredPointSpacing = 0.1; // 1cm
    const numPointsToAdd = Math.floor(totalLength / desiredPointSpacing);

    // Step 3: Distribute points along the shape
    const newPoints = [];
    for (let i = 1; i < shapePoints.length; i++) {
        const segmentLength = shapePoints[i].distanceTo(shapePoints[i - 1]);
        const numSubdivisions = Math.ceil((segmentLength / totalLength) * numPointsToAdd);

        for (let j = 0; j <= numSubdivisions; j++) {
            const t = j / numSubdivisions;
            const interpolatedPoint = new THREE.Vector3().lerpVectors(
                shapePoints[i - 1],
                shapePoints[i],
                t,
            );
            newPoints.push(interpolatedPoint);
        }
    }

    return newPoints;
}

// /**
//  * NEW ONE
//  * @param shape
//  * @param numPoints
//  * @returns
//  */
// function evenlyInterpolateShape(shape: THREE.Shape, numPoints: number) {
//     const points = shape.getPoints();
//     // Assuming you have an array of Vector3 points representing the shape
//     const shapePoints = [...points, points[0]];

//     // Specify the number of interpolated points you want
//     const numInterpolatedPoints = 100; // Adjust this value as needed

//     const newPoints = [];

//     for (let i = 1; i < shapePoints.length; i++) {
//         const segmentLength = shapePoints[i].distanceTo(shapePoints[i - 1]);
//         const numSubdivisions = numInterpolatedPoints;

//         for (let j = 0; j <= numSubdivisions; j++) {
//             const t = j / numSubdivisions;
//             const interpolatedPoint = new THREE.Vector3().lerpVectors(
//                 shapePoints[i - 1],
//                 shapePoints[i],
//                 t,
//             );
//             newPoints.push(interpolatedPoint);
//         }
//     }
//     return newPoints;
// }

// function evenlyInterpolateShape(shape, numPoints = 300) {
//     const points = shape.getPoints();
//     const totalLength = shape.getLength();

//     const interpolatedPoints = [];
//     const segmentLength = totalLength / (numPoints - 1);

//     let currentDistance = 0;

//     for (let i = 0; i < numPoints; i++) {
//         for (let j = 0; j < points.length - 1; j++) {
//             const p1 = points[j];
//             const p2 = points[j + 1];
//             const segmentLength = p1.distanceTo(p2);

//             if (currentDistance <= segmentLength) {
//                 const t = currentDistance / segmentLength;
//                 const interpolatedPoint = p1.clone().lerp(p2, t);
//                 interpolatedPoints.push(interpolatedPoint);
//                 currentDistance += segmentLength;
//             } else {
//                 currentDistance -= segmentLength;
//                 if (j === points.length - 2) {
//                     // Reached the last segment, continue with the first point to close the shape
//                     const lastSegmentLength = p2.distanceTo(points[0]);
//                     const t = currentDistance / lastSegmentLength;
//                     const interpolatedPoint = p2.clone().lerp(points[0], t);
//                     interpolatedPoints.push(interpolatedPoint);
//                     currentDistance += lastSegmentLength;
//                 }
//             }
//         }
//     }

//     return interpolatedPoints;
// }

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
        tunnelShape.moveTo(tunnelWidth / 2, -tunnelHeight / 2); // Bottom-right corner
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
        // tunnelShape.lineTo(-tunnelWidth / 2, tunnelHeight / 2); // Top-right corner

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
        disposeMeshGroup(debug);
        debug.clear();

        const clone = this._shape.clone();
        const numPoints = 300;

        const points = clone.getPoints();
        this.stickInterpolatedPoints = points;

        points.forEach((point, index) => {
            const clone = cube.clone();
            clone.position.set(point.x, point.y + this.tunnelHeight / 2, position);

            // clone.material.color.addScalar(1)
            const myText = new SpriteText(`${index}`, 1, 'blue');
            myText.position.set(point.x, point.y + this.tunnelHeight / 2, -1);

            myText.material.depthTest = false;
            myText.renderOrder = 1;
            // debug.add(myText);s
        });

        const originalPaths = [
            points.map((point) => {
                return { X: point.x, Y: point.y };
            }),
        ];

        const subject = new Shape(originalPaths, true);
        const result = subject.offset(stick);

        const newPoints = result.paths[0].map((point) => {
            return new THREE.Vector2(point.X, point.Y);
        });

        const newShape = new THREE.Shape(newPoints);
        const newInterpolatedPoints = evenlyInterpolateShape(newShape);

        newInterpolatedPoints.forEach((p) => {
            p.y += +this.tunnelHeight / 2;
        });
        newInterpolatedPoints.forEach((point) => {
            const clone = cube.clone();
            clone.position.set(point.x, point.y, position);
            debug.add(clone);
        });

        const stickInterpolatedPoints = newInterpolatedPoints.map(
            (p) => new THREE.Vector2(p.x, p.y),
        );

        this.stickInterpolatedPoints = stickInterpolatedPoints;

        for (let i = 0; i < stickInterpolatedPoints.length; i++) {
            const element = stickInterpolatedPoints[i];

            const clone = cube.clone();
            clone.position.set(element.x, element.y, position);
            // debug.add(clone);

            // // ONly have 2 decimal places
            // const x = Math.round(element.x * 100) / 100;
            // const y = Math.round(element.y * 100) / 100;

            // // const text = `${x}, ${y}`;
            // const text = `${y}`;

            // const myText = new SpriteText(text, 0.5, 'blue');
            // myText.position.set(element.x, element.y, -1);

            // myText.material.depthTest = false;
            // myText.renderOrder = 1;
            // // debug.add(myText);
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

        // console.log(distanceBetweenPoints, whileIndex);

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

    public mockDoStick(
        spread: Grout3D,
        h: number,
        l: number,
        point: THREE.Vector2,
        stickDistance = 3,
    ) {
        const newMockStickPosition = this.mockGetStick(point, stickDistance);
        if (newMockStickPosition == null) return;
        // THIS IS YOUR NEW PLACE TO BE
        spread.position.x = newMockStickPosition.point.x;
        spread.position.y = newMockStickPosition.point.y;
        spread.position.z = l;
        const { holeLength } = spread;

        const { tunnelHeight, tunnelRoofHeight } = this;

        // const positionAtTunnel = new THREE.Vector2(spread.position.x, spread.position.y - h);
        const positionAtTunnel = new THREE.Vector2(
            newMockStickPosition.point.x,
            newMockStickPosition.point.y,
        );

        // console.log(spread.position.y, tunnelHeight);

        //  Top;
        // if (spread.position.y > 0) {
        //     positionAtTunnel.y -= h;
        // }
        // //  Bottom
        // if (spread.position.y < 0) {
        //     positionAtTunnel.y += h;
        // }
        // // left
        // if (spread.position.x > this.tunnelWidth / 2) {
        //     positionAtTunnel.x -= h;
        // }
        // // right
        // if (spread.position.x < -this.tunnelWidth / 2) {
        //     positionAtTunnel.x += h;
        // }

        let pointAtShape: PointAlongShape | null = null;

        const pointsAroundTunnel3D = evenlyInterpolateShape(this._shape);

        const pointsAroundTunnel2D: THREE.Vector2[] = [];
        pointsAroundTunnel3D.forEach((point) => {
            point.y += this.tunnelHeight / 2;

            pointsAroundTunnel2D.push(new THREE.Vector2(point.x, point.y));
        });

        // console.log('X:', spread.position.x);

        for (let i = 0; i < pointsAroundTunnel3D.length; i++) {
            const element = pointsAroundTunnel3D[i];

            const clone = cube.clone();
            clone.position.set(element.x, element.y, 0);
            // HERE I AM?
            // debug.add(clone);
        }

        let clockwise: boolean = true;

        // Top mid -> Bottom right
        if (spread.position.x < 0 && spread.position.y > this.tunnelHeight / 2) {
            clockwise = true;
        }

        // Bottom mid -> Bottom right
        if (spread.position.x < 0 && spread.position.y < this.tunnelHeight / 2) {
            clockwise = false;
        }

        // Bottom mid -> Bottom left
        if (spread.position.x > 0 && spread.position.y < this.tunnelHeight / 2) {
            clockwise = true;
        }

        if (
            // Top right corner
            spread.position.x < -this.tunnelWidth / 2 &&
            spread.position.y > this.tunnelHeight / 2
        ) {
            clockwise = true;
        }
        if (
            // Bottom right corner
            spread.position.x < -this.tunnelWidth / 2 &&
            spread.position.y < this.tunnelHeight / 2
        ) {
            clockwise = false;
            // return;
        }

        if (
            // Top left corner
            spread.position.x > 0 &&
            spread.position.y > this.tunnelHeight / 2
        ) {
            clockwise = false;
        }
        if (
            // Bottom left corner
            spread.position.x > 0 &&
            spread.position.y < this.tunnelHeight / 2
        ) {
            clockwise = true;
        }

        // REGULAR;
        {
            const max1 = pointsAroundTunnel2D.length;
            const max2 = this.stickInterpolatedPoints.length;

            const adjustedIndex = Math.round((newMockStickPosition.index / max2) * max1);

            const dummy = pointsAroundTunnel2D[adjustedIndex];
            if (dummy) {
                const clone1 = cube.clone();
                clone1.position.set(dummy.x, dummy.y, 0);

                const clone2 = cube.clone();
                clone2.position.set(newMockStickPosition.point.x, newMockStickPosition.point.y, 0);

                // debug.add(clone1);
                // debug.add(clone2);
            } else {
                console.log('INDEX ??', adjustedIndex);

                return;
            }

            pointAtShape = this.mockGetPointAtShape(pointsAroundTunnel2D, clockwise, 1, dummy);

            if (pointAtShape == null) {
                console.error("Can't find point");
                return;
            }
            spread.lookAt(pointAtShape.point.x, pointAtShape.point.y, 0);
        }

        // WHILE TEST
        {
            // let whileIndex = 0;
            // let tolerance = 10;
            // let conditionMet = false;
            // let whilePoint: THREE.Vector2 | PointAlongShape = positionAtTunnel;
            // while (conditionMet === false) {
            //     whileIndex++;
            //     if (whileIndex > 1_000) {
            //         conditionMet = true;
            //         console.error('Endless while loop');
            //         return;
            //     }
            //     pointAtShape = this.mockGetPointAtShape(
            //         pointsAroundTunnel2D,
            //         clockwise,
            //         tolerance,
            //         whilePoint,
            //     );
            //     if (pointAtShape == null) {
            //         console.error("Can't find point");
            //         return;
            //     }
            //     const distance = spread.position.distanceTo(
            //         new THREE.Vector3(pointAtShape.point.x, pointAtShape.point.y, 0),
            //     );
            //     const diff = Math.abs(distance - holeLength);
            //     if (diff < 1) {
            //         conditionMet = true;
            //         console.log('FOUND');
            //         whilePoint = pointAtShape;
            //         break;
            //     }
            //     whilePoint = pointAtShape;
            //     tolerance -= 0.1;
            //     if (tolerance < 1) {
            //         tolerance = 1;
            //         return;
            //     }
            // }
            // console.log(whilePoint);
            // if (whilePoint.point == null) return;
            // spread.lookAt(whilePoint.point.x, whilePoint.point.y, 0);
        }
    }
    public mockGetStick(point: THREE.Vector2, stickDistance = 3): PointAlongShape | null {
        const startingPointAtShape = this.mockGetPointAtShape(
            this.stickInterpolatedPoints,
            false,
            1,
            point,
        );
        if (startingPointAtShape == null) throw new Error("Can't find starting point");

        let newPointAtShape = { ...startingPointAtShape };
        let conditionMet = false;
        let whileIndex = 0;

        while (conditionMet === false) {
            whileIndex++;
            if (whileIndex > 1_000) {
                conditionMet = true;
                console.error('Endless while loop');
                return null;
            }

            // Increase or decrease?
            // newPointAtShape.index++;
            newPointAtShape.index++;

            const newPointAtShapeToCompare = this.mockGetPointAtShape(
                this.stickInterpolatedPoints,
                false,
                1,
                newPointAtShape,
            );
            if (newPointAtShapeToCompare == null) {
                console.error("Can't find new point");
                return null;
            }
            const distance = startingPointAtShape.point.distanceTo(newPointAtShapeToCompare.point);
            if (distance > stickDistance) {
                conditionMet = true;
                // console.log('FOUND');
                break;
            }

            newPointAtShape = newPointAtShapeToCompare;
        }

        return newPointAtShape;
    }

    public mock() {}

    public mockGetPointAtShape(
        points: THREE.Vector2[],
        clockwise: boolean = true,
        threshold: number,
        startingPoint: THREE.Vector2 | PointAlongShape,
    ): PointAlongShape | null {
        const pointsAlongShape: PointAlongShape[] = [];
        for (let index = 0; index < points.length; index++) {
            const point = points[index];
            pointsAlongShape.push({ point, index });
        }

        let conditionMet = false;
        let whileIndex = 0;

        const startPoint = startingPoint?.point ?? startingPoint;
        let startIndex = startingPoint?.index ?? 0;
        const maxSearchIndex = pointsAlongShape.length - 1;

        if (startIndex > maxSearchIndex) {
            // startInd ex = startIndex - maxSearchIndex;
            startIndex = 0;

            // return null;
            // return null;
        }

        let searchIndex = startIndex;

        // TODO: Makse sure this is counter clockwise
        while (conditionMet === false) {
            whileIndex++;
            if (whileIndex > 10_000) {
                conditionMet = true;
                console.error('Endless while loop');

                return null;
            }

            const pointAlongShapeToCompare = pointsAlongShape[searchIndex];

            if (pointAlongShapeToCompare?.point == null) {
                console.log('null point');
                // console.log('searchIndex', searchIndex);
                // console.log('startIndex', startIndex);
                // console.log('maxSearchIndex', maxSearchIndex

                const debug = {
                    searchIndex,
                    startIndex,
                    maxSearchIndex,
                };

                console.log(debug);
                console.log(startingPoint?.index);

                // clockwise ? searchIndex++ : searchIndex--;
                return null;
            }

            // console.log(pointAlongShapeToCompare.point.x, pointAlongShapeToCompare.point.y);

            const distance = startPoint.distanceTo(pointAlongShapeToCompare.point);

            if (distance < threshold) {
                conditionMet = true;
                break;
            }

            // Begin by increment or decrement
            clockwise ? searchIndex++ : searchIndex--;

            // Handle end of "array"
            if (clockwise) {
                if (searchIndex >= maxSearchIndex) searchIndex = 0;
            } else {
                if (searchIndex < 0) searchIndex = maxSearchIndex;
            }

            // Check if we are back at the starting point
            if (whileIndex !== 0 && searchIndex === startIndex) {
                conditionMet = true;
                console.error('AROUND THE WORLD');
                return null;
            }
        }

        return pointsAlongShape[searchIndex];
    }
}
