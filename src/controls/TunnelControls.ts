import * as THREE from 'three';

import Grout3D from '../objects/Grout3D';
import Tunnel3D from '../objects/Tunnel3D';
import {
    AbstractGrout3DParams,
    AbstractTunnel3DParams,
    AbstractTunnelControlsParams,
} from '../core';
import { EventDispatcher } from './EventDispatcher';

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
        this._generateSpreadGrouts();
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

        const { numberOfGrouts, spreadDistance, spreadAngle } = this.spreadConfig;

        let conditionMet = false;
        let index = 0;
        let groutIndex = 0;
        const grout = this._grouts[0];

        const spreads: Grout3D[] = [grout];
        const center3D = new THREE.Vector3(0, tunnelHeight, 0);
        const center2D = new THREE.Vector2(0, tunnelHeight);

        const direction = new THREE.Vector3(1, 0, 0);

        // this._tunnel.buildTunnelInterpolation();

        while (conditionMet === false) {
            index++;
            if (index > 120) conditionMet = true;

            const previousGrout = spreads[groutIndex];

            const json = previousGrout.toJSON();
            const spread = new Grout3D(this._tunnel!);
            spread.fromJSON(json);
            spread.position.copy(previousGrout.position);

            spread.position.add(direction.clone().multiplyScalar(spreadDistance));

            const position2D = new THREE.Vector2(spread.position.x, spread.position.y);

            const { closetsPointInWorld: newPosition2D, config } =
                this._tunnel.getShapeDEV(position2D); // console.log('position2D', position2D, 'newPosition2D', newPosition2D);
            const newPosition3D = new THREE.Vector3(newPosition2D.x, newPosition2D.y, 0);

            spread.position.x = newPosition3D.x;
            spread.position.y = newPosition3D.y;

            // const newDirection = new THREE.Vector3();
            direction.copy(newPosition3D).sub(previousGrout.position).normalize();

            // direction.copy(spread.position).sub(center3D).normalize();

            const { topLeft, topRight, bottomLeft, bottomRight } = config;

            if (topLeft) {
                direction.x = 0;
                direction.y = -1;
            } else if (bottomLeft) {
                direction.x = -1;
                direction.y = 0;
            } else if (bottomRight) {
                direction.x = 0;
                direction.y = 1;
            } else if (topRight) {
                direction.x = 1;
                direction.y = 0;
            }

            // direction.copy(newDirection);

            // Calculate new direction from spread's position to newPosition

            spreads.push(spread);

            groutIndex++;
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
