import * as THREE from 'three';
import SpriteText from 'three-spritetext';

import { AbstractObject3D, AbstractTunnel3D, AbstractTunnel3DParams } from '../core';

import Shape from '@doodle3d/clipper-js';
import { Grout3D } from '..';
import { disposeMeshGroup } from '../utils/disposeMesh';

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

/**
 * Given a {@link THREE.Shape}, evenly interpolate points along the shape.
 * @param shape Shape to be interpolated
 * @param desiredPointSpacing Space between each interpolated point
 * @returns Interpolated points along the shape
 */
function evenlyInterpolateShape(shape: THREE.Shape, desiredPointSpacing: number = 0.1) {
    const points = shape.getPoints();
    // Assuming you have an array of Vector3 points representing the shape
    const shapePoints = [...points, points[0]];

    // Step 1: Calculate the total length
    let totalLength = 0;
    for (let i = 1; i < shapePoints.length; i++) {
        totalLength += shapePoints[i].distanceTo(shapePoints[i - 1]);
    }

    // Step 2: Calculate the number of points to add
    const numPointsToAdd = Math.floor(totalLength / desiredPointSpacing);

    // Step 3: Distribute points along the shape
    const newPoints = [];
    for (let i = 1; i < shapePoints.length; i++) {
        const segmentLength = shapePoints[i].distanceTo(shapePoints[i - 1]);
        const numSubdivisions = Math.ceil((segmentLength / totalLength) * numPointsToAdd);

        for (let j = 0; j <= numSubdivisions; j++) {
            const t = j / numSubdivisions;
            const interpolatedPoint = new THREE.Vector3().lerpVectors(
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                shapePoints[i - 1],
                shapePoints[i],
                t,
            );
            newPoints.push(interpolatedPoint);
        }
    }

    return newPoints;
}

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

    /**
     * Interpolated points along the stick's shape as {@link THREE.Vector2}
     */
    stickInterpolatedPoints: THREE.Vector2[] = [];

    /**
     * Interpolated points along the tunnel's shape as {@link THREE.Vector3}
     */
    interpolatedPoints3D: THREE.Vector3[] = [];

    /**
     * Interpolated points along the tunnel's shape as {@link THREE.Vector2}
     */
    interpolatedPoints2D: THREE.Vector2[] = [];

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

        this.interpolatedPoints3D = evenlyInterpolateShape(tunnelShape);
        this.interpolatedPoints3D.forEach((point) => {
            point.y += this.tunnelHeight / 2;
        });
        this.interpolatedPoints2D = this.interpolatedPoints3D.map(
            (p) => new THREE.Vector2(p.x, p.y),
        );
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
        // Clear previous
        disposeMeshGroup(debug);
        debug.clear();

        // Clone the object, just in case
        const clone = this._shape.clone();
        const points = clone.getPoints();
        this.stickInterpolatedPoints = points;

        // Debug
        {
            // points.forEach((point, index) => {
            //     const clone = cube.clone();
            //     clone.position.set(point.x, point.y + this.tunnelHeight / 2, position);
            //     // clone.material.color.addScalar(1)
            //     const myText = new SpriteText(`${index}`, 1, 'blue');
            //     myText.position.set(point.x, point.y + this.tunnelHeight / 2, -1);
            //     myText.material.depthTest = false;
            //     myText.renderOrder = 1;
            //     // debug.add(myText);s
            // });
        }

        // Prepare the shape for offsetting by converting the points to Clipper format
        const originalPaths = [
            points.map((point) => {
                return { X: point.x, Y: point.y };
            }),
        ];
        // Offset the shape using Clipper
        const subject = new Shape(originalPaths, true);
        const result = subject.offset(stick);

        // Convert back to THREE.js format
        const newPoints = result.paths[0].map((point) => {
            return new THREE.Vector2(point.X, point.Y);
        });

        // Generate interpolated points
        const newShape = new THREE.Shape(newPoints);
        const newInterpolatedPoints = evenlyInterpolateShape(newShape);

        // Normalize the height
        newInterpolatedPoints.forEach((p) => {
            p.y += +this.tunnelHeight / 2; // World space
        });

        // Debug
        {
            // newInterpolatedPoints.forEach((point) => {
            //     const clone = cube.clone();
            //     clone.position.set(point.x, point.y, position);
            //     debug.add(clone);
            // });
        }

        // Convert to `Vector2`
        const stickInterpolatedPoints = newInterpolatedPoints.map(
            (p) => new THREE.Vector2(p.x, p.y),
        );

        // Store the points for later use
        this.stickInterpolatedPoints = stickInterpolatedPoints;

        // Debug
        {
            for (let i = 0; i < stickInterpolatedPoints.length; i++) {
                const element = stickInterpolatedPoints[i];

                const clone = cube.clone();
                clone.position.set(element.x, element.y, position);
            }
        }
    }

    /**
     * Update the position of the grout.
     * @param grout Grout to be updated
     * @param _h Height of the grout perpendicular to the tunnel's roof (unused)
     * @param l  Length of the tunnel
     * @param point Position of the grout at the spread (!)
     * @param stickDistance Distance, in +Y, between each grout
     * @returns
     */
    public mockDoStick(
        grout: Grout3D,
        initialZ: number,
        _h: number,
        l: number,
        point: THREE.Vector2,
        stickDistance = 3,
    ) {
        const newMockStickPosition = this.mockGetStick(point, stickDistance);
        if (newMockStickPosition == null) return;

        // This is the position at the end of the stick!
        grout.position.x = newMockStickPosition.point.x;
        grout.position.y = newMockStickPosition.point.y;
        grout.position.z = initialZ + l;

        // Now, go back to the tunnel and find the point at the tunnel shape
        let newPointAtTunnelShape: PointAlongShape | null = null;

        const pointsAroundTunnel2D = this.interpolatedPoints2D;

        // Debug
        {
            // for (let i = 0; i < pointsAroundTunnel3D.length; i++) {
            //     const element = pointsAroundTunnel3D[i];
            //     const clone = cube.clone();
            //     clone.position.set(element.x, element.y, 0);
            //     // HERE I AM?
            //     // debug.add(clone);
            // }
        }

        // Determine if clockwise or counter-clockwise
        // This will affect the look of the grouts
        // They will either point inwards or outwards
        let clockwise: boolean = true;

        // Top mid -> Bottom right
        if (grout.position.x < 0 && grout.position.y > this.tunnelHeight / 2) {
            clockwise = true;
        }

        // Bottom mid -> Bottom right
        if (grout.position.x < 0 && grout.position.y < this.tunnelHeight / 2) {
            clockwise = false;
        }

        // Bottom mid -> Bottom left
        if (grout.position.x > 0 && grout.position.y < this.tunnelHeight / 2) {
            clockwise = true;
        }

        if (
            // Top right corner
            grout.position.x < -this.tunnelWidth / 2 &&
            grout.position.y > this.tunnelHeight / 2
        ) {
            clockwise = true;
        }
        if (
            // Bottom right corner
            grout.position.x < -this.tunnelWidth / 2 &&
            grout.position.y < this.tunnelHeight / 2
        ) {
            clockwise = false;
            // return;
        }

        if (
            // Top left corner
            grout.position.x > 0 &&
            grout.position.y > this.tunnelHeight / 2
        ) {
            clockwise = false;
        }
        if (
            // Bottom left corner
            grout.position.x > 0 &&
            grout.position.y < this.tunnelHeight / 2
        ) {
            clockwise = true;
        }

        // Attempt to find the corresponding index at the tunnel shape.
        const max1 = pointsAroundTunnel2D.length;
        const max2 = this.stickInterpolatedPoints.length;

        // Use percentage to figure out the new index
        const adjustedIndex = Math.round((newMockStickPosition.index / max2) * max1);
        const samplePointAtTunnel = pointsAroundTunnel2D[adjustedIndex];

        // Find the new point at the tunnel shape
        newPointAtTunnelShape = this.mockGetPointAtShape(
            pointsAroundTunnel2D,
            clockwise,
            1,
            samplePointAtTunnel,
        );

        if (newPointAtTunnelShape == null) {
            console.error("Can't find point");
            return;
        }

        // If found, simply look at it
        grout.lookAt(newPointAtTunnelShape.point.x, newPointAtTunnelShape.point.y, initialZ);
    }

    /**
     * Given a approximate point at the stick, attempt to find the corresponding point at along the interpolated stick shape.
     * @param point Approximate point at the stick
     * @param stickDistance Distance, in +Y, between each grout
     * @returns Point along the stick shape, if found
     */
    public mockGetStick(point: THREE.Vector2, stickDistance = 3): PointAlongShape | null {
        const tolerance = 1;
        // Get initial point at the stick shape
        const startingPointAtShape = this.mockGetPointAtShape(
            this.stickInterpolatedPoints,
            false,
            tolerance,
            point,
        );
        if (startingPointAtShape == null) throw new Error("Can't find starting point");

        // This point might be off.
        let newPointAtShape = { ...startingPointAtShape };
        let conditionMet = false;
        let whileIndex = 0;

        // We need to find a point that satisfies the stickDistance.
        // If not found, simply look at the next point (by incrementing the index)
        while (conditionMet === false) {
            whileIndex++;
            if (whileIndex > 1_000) {
                console.error('Endless while loop');
                conditionMet = true;
                return null;
            }

            const newPointAtShapeToCompare = this.mockGetPointAtShape(
                this.stickInterpolatedPoints,
                false,
                tolerance,
                newPointAtShape,
            );
            if (newPointAtShapeToCompare == null) {
                console.error("Can't find new point");
                return null;
            }
            const distance = startingPointAtShape.point.distanceTo(newPointAtShapeToCompare.point);
            if (distance > stickDistance) {
                conditionMet = true;
                break;
            }

            newPointAtShape = newPointAtShapeToCompare;

            // Look at the next point
            newPointAtShape.index++;
        }

        return newPointAtShape;
    }

    public mock() {}

    /**
     * Given a array of points, attempt to find the closest point to the starting point.
     * @param points Points along the shape
     * @param clockwise Clockwise or counter-clockwise index search
     * @param threshold Distance threshold in meters
     * @param startingPoint Starting point to help the search algorithm
     * @returns Point along the shape, if found
     */
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

        const startPoint =
            (startingPoint as Partial<PointAlongShape>)?.point ?? (startingPoint as THREE.Vector2);
        let startIndex = (startingPoint as Partial<PointAlongShape>)?.index ?? 0;
        const maxSearchIndex = pointsAlongShape.length - 1;

        // NB: Something is wrong here
        if (startIndex > maxSearchIndex) {
            startIndex = 0;
        }

        let searchIndex = startIndex;

        // Search along the `pointsAlongShape` array to find the closest point
        while (conditionMet === false) {
            whileIndex++;
            if (whileIndex > 10_000) {
                conditionMet = true;
                console.error('Endless while loop');

                return null;
            }

            const pointAlongShapeToCompare = pointsAlongShape[searchIndex];

            // NB: Something is wrong here:
            if (pointAlongShapeToCompare?.point == null) {
                console.log('null point');
                // console.log('searchIndex', searchIndex);
                // console.log('startIndex', startIndex);
                // console.log('maxSearchIndex', maxSearchIndex

                // const debug = {
                //     searchIndex,
                //     startIndex,
                //     maxSearchIndex,
                // };

                return null;
            }

            // Check if the distance is within the threshold
            const distance = startPoint.distanceTo(
                (pointAlongShapeToCompare as PointAlongShape).point,
            );
            if (distance < threshold) {
                conditionMet = true;
                break;
            }

            // Begin by increment or decrement the serach index
            clockwise ? searchIndex++ : searchIndex--;

            // Handle the end of the `pointsAlongShape`
            if (clockwise) {
                if (searchIndex >= maxSearchIndex) searchIndex = 0;
            } else {
                if (searchIndex < 0) searchIndex = maxSearchIndex;
            }

            // Check if we are back at the starting point
            if (whileIndex !== 0 && searchIndex === startIndex) {
                console.error('AROUND THE WORLD');
                conditionMet = true;
                return null;
            }
        }

        return pointsAlongShape[searchIndex];
    }
}
