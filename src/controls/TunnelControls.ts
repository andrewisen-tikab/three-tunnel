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
    public showMirror: boolean = true;
    public showSpread: boolean = true;

    public spreadConfig: AbstractTunnelControlsParams = {
        numberOfGrouts: 2,
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
        this._generateMirroredGrouts();
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
        if (this.showMirror === false) return;

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
        if (this.showSpread === false) return;

        const { numberOfGrouts, spreadDistance, spreadAngle } = this.spreadConfig;
        const spreadGrouts = this._grouts.flatMap((grout) => {
            const json = grout.toJSON();
            const grouts: Grout3D[] = [];

            for (let i = 0; i < numberOfGrouts; i++) {
                for (let j = 0; j < 2; j++) {
                    const spread = new Grout3D(this._tunnel!);
                    spread.fromJSON(json);
                    spread.position.x =
                        j === 0 ? +spreadDistance * (i + 1) : -spreadDistance * (i + 1);
                    spread.rotateY(
                        j === 0
                            ? +(spreadAngle * THREE.MathUtils.DEG2RAD)
                            : -(spreadAngle * THREE.MathUtils.DEG2RAD),
                    );
                    spread.position.z = grout.position.z;

                    grouts.push(spread);

                    if (this.showMirror == false) continue;

                    const mirror = new Grout3D(this._tunnel!);
                    mirror.fromJSON(json);
                    mirror.rotation.x *= -1;

                    mirror.position.x =
                        j === 0 ? +spreadDistance * (i + 1) : -spreadDistance * (i + 1);
                    mirror.rotateY(
                        j === 0
                            ? +(spreadAngle * THREE.MathUtils.DEG2RAD)
                            : -(spreadAngle * THREE.MathUtils.DEG2RAD),
                    );

                    mirror.position.z = grout.position.z;
                    mirror.position.y = 0;
                    grouts.push(mirror);
                }
            }

            return grouts;
        });

        this._spread.add(...spreadGrouts);
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
