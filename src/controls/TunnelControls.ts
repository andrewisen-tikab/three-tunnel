import * as THREE from 'three';

import Grout3D from '../objects/Grout3D';
import Tunnel3D from '../objects/Tunnel3D';
import {
    AbstractGrout3DParams,
    AbstractTunnel3DParams,
    AbstractTunnelControlsParams,
} from '../core';
import { EventDispatcher } from './EventDispatcher';

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({
    // blue
    color: 0x0000ff,
});
const cube = new THREE.Mesh(geometry, material);

export default class TunnelControls extends EventDispatcher {
    public groupGrouts: boolean = true;

    public spreadConfig: AbstractTunnelControlsParams = {
        numberOfGrouts: 1,
        spreadDistance: 3,
        spreadAngle: 10,
    };

    private _tunnel: Tunnel3D | null = null;
    private _grouts: Grout3D[] = [];
    private _group: THREE.Object3D;
    private _result: THREE.Group;
    private _mirror: THREE.Group;
    private _spread: THREE.Group;

    constructor(group: THREE.Object3D) {
        super();
        this._group = group;

        this._result = new THREE.Group();
        this._group.add(this._result);

        this._mirror = new THREE.Group();
        this._result.add(this._mirror);

        this._spread = new THREE.Group();
        this._result.add(this._spread);
    }

    attach(tunnel: Tunnel3D) {
        this._tunnel = tunnel;

        // TODO: Move grouts to tunnel
        this._grouts = [];
    }

    detach() {
        this._tunnel = null;
        // TODO: Move grouts to tunnel
        this._grouts = [];
    }

    getTunnel() {
        return this._tunnel;
    }

    setTunnelParams(params: Partial<AbstractTunnel3DParams>) {
        if (this._tunnel == null) return;
        Object.assign(this._tunnel, params);
        this._tunnel.update();
        this._updateGrouts();
    }

    addGrout() {
        if (this._tunnel == null) throw new Error('Tunnel is not attached.');

        const grout = new Grout3D(this._tunnel);
        grout.order = this._grouts.length;
        this._grouts.push(grout);

        this._tunnel.groutGroup.add(grout);
        return grout;
    }

    clearGrouts() {
        this._grouts = [];
    }

    getGrouts() {
        return [...this._grouts];
    }

    setGroutParams(index: number, params: Partial<AbstractGrout3DParams>) {
        const grout = this._grouts[index];
        if (grout == null) throw new Error('Grout is not found.');
        Object.assign(grout, params);
        this._updateGrouts();
    }

    public update() {
        if (this._tunnel != null) this._tunnel.update();
        this._updateGrouts();
    }
    private _updateGrouts() {
        this.groupGrouts ? this._updateGroutsAsGroup() : this._updateGroutsIndividually();
        this._buildStick();
        this._generateSpreadGrouts();
    }

    private _buildStick() {
        if (this._tunnel == null) throw new Error('Tunnel is not attached.');
        const initialGrout = this._grouts[0];
        if (initialGrout == null) throw new Error('Grout is not found.');

        const l = Math.cos(initialGrout.angle) * initialGrout.holeLength;
        const h = Math.sin(initialGrout.angle) * initialGrout.holeLength;
        this._tunnel.buildStick(l, h);
    }

    private _updateGroutsAsGroup() {
        this._grouts[0].update();
        const { angle, holeLength, cutDepth } = this._grouts[0];
        for (let i = 1; i < this._grouts.length; i++) {
            const previousGrout = this._grouts[i - 1];
            const currentGrout = this._grouts[i];

            currentGrout.angle = angle;
            currentGrout.holeLength = holeLength;
            currentGrout.cutDepth = cutDepth;
            currentGrout.update();
            this._setGroutPosition(previousGrout, currentGrout);
        }
    }

    private _updateGroutsIndividually() {
        this._grouts[0].update();

        for (let i = 1; i < this._grouts.length; i++) {
            const previousGrout = this._grouts[i - 1];
            const currentGrout = this._grouts[i];
            currentGrout.update();
            this._setGroutPosition(previousGrout, currentGrout);
        }
    }

    private _setGroutPosition(previousGrout: Grout3D, currentGrout: Grout3D) {
        const newZPosition = Math.cos(previousGrout.angle) * previousGrout.holeLength;
        currentGrout.position.z = newZPosition - currentGrout.overlap;
    }

    private _generateMirroredGrouts() {
        this._mirror.clear();
        if (this._tunnel == null) return;

        const mirrorGrouts = this._grouts.map((grout) => {
            const json = grout.toJSON();
            const mirror = new Grout3D(this._tunnel!);
            mirror.fromJSON(json);
            mirror.rotation.x *= -1;

            mirror.position.z = grout.position.z;
            mirror.position.y = 0;

            return mirror;
        });

        this._mirror.add(...mirrorGrouts);
    }

    private _generateSpreadGrouts() {
        this._spread.clear();
        if (this._tunnel == null) return;
        const { tunnelHeight } = this._tunnel;

        const initialGrout = this._grouts[0];

        const l = Math.cos(initialGrout.angle) * initialGrout.holeLength;
        const h = Math.sin(initialGrout.angle) * initialGrout.holeLength;

        initialGrout.position.y += h; // move towards the spread
        initialGrout.position.z += l; // move towards the spread

        const { numberOfGrouts, spreadDistance, spreadAngle } = this.spreadConfig;

        let conditionMet = false;
        let index = 0;
        let groutIndex = 0;

        const spreads: Grout3D[] = [initialGrout];
        const center3D = new THREE.Vector3(0, tunnelHeight, 0);
        const center2D = new THREE.Vector2(0, tunnelHeight);

        const up = new THREE.Vector3(0, 1, 0);
        const UC = new THREE.Vector3().copy(center3D).add(up);

        const direction = new THREE.Vector3(1, 0, 0);

        const cachedConfig = {
            topLeft: false,
            topRight: false,
            bottomLeft: false,
            bottomRight: false,
        };

        // this._tunnel.buildTunnelInterpolation();

        while (conditionMet === false) {
            index++;
            if (index > 20) {
                conditionMet = true;
                break;
            }

            // Get the previous grout
            const previousGrout = spreads[groutIndex];

            // Setup the new one
            const json = previousGrout.toJSON();
            const spread = new Grout3D(this._tunnel!);
            spread.fromJSON(json);
            spread.position.copy(previousGrout.position);

            // Spread position
            const currentSpreadPosition = new THREE.Vector3().copy(spread.position);

            const currentSpreadPosition2D = new THREE.Vector2(
                currentSpreadPosition.x,
                currentSpreadPosition.y,
            );

            // Move the spread position by b=3m in counter clockwise direction
            const newApproxSpreadPosition3D = new THREE.Vector3().copy(spread.position);

            console.log('LOOK', currentSpreadPosition2D.x, currentSpreadPosition2D.y);

            this._tunnel.mockDoStick(
                spread,
                h,
                l,
                new THREE.Vector2(currentSpreadPosition2D.x, currentSpreadPosition2D.y),
            );

            // const newMockStickPosition = this._tunnel.mockGetStick(
            //     new THREE.Vector2(currentSpreadPosition2D.x, currentSpreadPosition2D.y),
            // );
            // if (newMockStickPosition == null) throw new Error('Stick is not found.');
            // // newApproxSpreadPosition3D.add(direction.clone().multiplyScalar(spreadDistance));

            // // const direction2D = new THREE.Vector2(direction.x, direction.y);

            // spread.position.x = newMockStickPosition.point.x;
            // spread.position.y = newMockStickPosition.point.y;
            // spread.position.z = l;

            spreads.push(spread);
            groutIndex++;

            // // This will move us very closly to the spread, but we might miss.
            // const newApproxSpreadPosition2D = new THREE.Vector2(
            //     newApproxSpreadPosition3D.x,
            //     newApproxSpreadPosition3D.y,
            // );

            // // TODO: Rewrite this so b=3m
            // const { closetsPointInWorld: newSpreadPosition2D } = this._tunnel.getShapeDEV2(
            //     newApproxSpreadPosition2D,
            //     currentSpreadPosition2D,
            //     direction2D,
            // ); // console.log('position2D', position2D, 'newPosition2D', newPosition2D);
            // const newSpreadPosition3D = new THREE.Vector3(
            //     newSpreadPosition2D.x,
            //     newSpreadPosition2D.y,
            //     l,
            // );

            // spread.position.copy(newSpreadPosition3D);

            // // Let's move back to the our original position
            // const newApproxStartPosition3D = new THREE.Vector3().copy(newSpreadPosition3D);
            // newApproxStartPosition3D.y -= h;
            // newApproxStartPosition3D.z -= l;
            // const newApproxStartPosition2D = new THREE.Vector2(
            //     newApproxStartPosition3D.x,
            //     newApproxStartPosition3D.y,
            // );

            // const cubeClone = cube.clone();

            // const { closetsPointInWorld: newStartPosition2D, config } =
            //     this._tunnel.getShapeDEV(newApproxStartPosition2D);

            // const newStartPosition3D = new THREE.Vector3(
            //     newStartPosition2D.x,
            //     newStartPosition2D.y,
            //     0,
            // );
            // const dummy = new THREE.Vector3(0, 13, 0);
            // cubeClone.position.copy(newStartPosition3D);
            // spread.lookAt(newStartPosition3D);

            // newStartPosition3D.z = l;

            // this._spread.add(cubeClone);

            // spread.scale.z = -1;

            // TODO: Draw new grout

            // const AC = new THREE.Vector3().copy(spread.position).sub(center3D);
            // const angle = AC.angleTo(UC);
            // console.log('angle', angle * THREE.MathUtils.RAD2DEG - 45);

            // spread.rotateX(45 * THREE.MathUtils.DEG2RAD);
            // spread.rotateX(45 * THREE.MathUtils.DEG2RAD);

            const distance = previousGrout.position.distanceTo(spread.position);

            // console.log('distance', distance);

            // // const newDirection = new THREE.Vector3();
            // direction.copy(newSpreadPosition3D).sub(previousGrout.position).normalize();

            // // direction.copy(spread.position).sub(center3D).normalize();

            // const { topLeft, topRight, bottomLeft, bottomRight } = config;

            // if (topLeft) {
            //     cachedConfig.topLeft = true;
            //     direction.x = 0;
            //     direction.y = -1;
            // } else if (bottomLeft) {
            //     cachedConfig.bottomLeft = true;
            //     direction.x = -1;
            //     direction.y = 0;
            // } else if (bottomRight) {
            //     cachedConfig.bottomRight = true;
            //     direction.x = 0;
            //     direction.y = 1;
            // } else if (topRight) {
            //     cachedConfig.topRight = true;
            //     direction.x = 1;
            //     direction.y = 0;
            // }

            // // direction.copy(newDirection);

            // // Calculate new direction from spread's position to newPosition

            // spreads.push(spread);

            // groutIndex++;

            // if (
            //     cachedConfig.topLeft &&
            //     cachedConfig.bottomLeft &&
            //     cachedConfig.bottomRight &&
            //     cachedConfig.topRight
            // ) {
            //     const distance = initialGrout.position.distanceTo(spread.position);
            //     if (distance < spreadDistance) conditionMet = true;
            // }
        }

        this._spread.add(...spreads);
    }

    toJSON(): AbstractTunnelControlsParams {
        const {
            spreadConfig: { numberOfGrouts, spreadDistance, spreadAngle },
        } = this;
        const object: AbstractTunnelControlsParams = {
            numberOfGrouts,
            spreadDistance,
            spreadAngle,
        };
        return object;
    }

    fromJSON(json: AbstractTunnelControlsParams): void {
        Object.assign(this, json);
        this.update();
    }
}
