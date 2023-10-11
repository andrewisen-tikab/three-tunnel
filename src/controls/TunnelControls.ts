import * as THREE from 'three';
import {
    SUBTRACTION,
    ADDITION,
    INTERSECTION,
    HOLLOW_SUBTRACTION,
    HOLLOW_INTERSECTION,
    DIFFERENCE,
    Brush,
    Evaluator,
} from 'three-bvh-csg';

import Grout3D from '../Grout3D';
import Tunnel3D from '../Tunnel3D';
import { AbstractGrout3DParams, AbstractTunnel3DParams } from '../core';
import { EventDispatcher } from './EventDispatcher';

export default class TunnelControls extends EventDispatcher {
    public groupGrouts: boolean = true;

    private _tunnel: Tunnel3D | null = null;
    private _grouts: Grout3D[] = [];

    /**
     * Scene or group that holds tunnel and grouts.
     */
    private _group: THREE.Object3D;
    /**
     * Group that holds intersection results
     */
    private _results: THREE.Object3D;

    private _plane: THREE.Mesh | null = null;

    constructor(group: THREE.Object3D) {
        super();
        this._group = group;
        this._results = new THREE.Group();
        this._group.add(this._results);
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

    addPlane(plane: THREE.Mesh) {
        if (this._tunnel == null) return;
        this._plane = plane;
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

    public updateCSG() {
        this._generateCSG();
    }

    private _updateGrouts() {
        this.groupGrouts ? this._updateGroutsAsGroup() : this._updateGroutsIndividually();
        this._generateCSG();
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
            this._setGroutPosition(previousGrout, currentGrout);
            currentGrout.update();
        }
    }

    private _updateGroutsIndividually() {
        this._grouts[0].update();

        for (let i = 1; i < this._grouts.length; i++) {
            const previousGrout = this._grouts[i - 1];
            const currentGrout = this._grouts[i];
            this._setGroutPosition(previousGrout, currentGrout);
            currentGrout.update();
        }
    }

    private _setGroutPosition(previousGrout: Grout3D, currentGrout: Grout3D) {
        const newZPosition = Math.cos(previousGrout.angle) * previousGrout.holeLength;

        // currentGrout.cylinder.position.z = newZPosition - currentGrout.overlap;
        currentGrout.positionOffset = newZPosition - currentGrout.overlap;
    }

    private _generateCSG() {
        if (this._plane == null) return;
        this._results.clear();

        this._plane.updateMatrixWorld(true);
        const planeBrush = new Brush(
            this._plane.geometry.clone().applyMatrix4(this._plane.matrixWorld),
        );

        const grout = this._grouts[0];
        grout.updateMatrixWorld(true);

        const cylinder = grout.cylinder;
        cylinder.updateMatrixWorld(true);
        const groutBrush = new Brush(cylinder.geometry.clone().applyMatrix4(cylinder.matrixWorld));

        const evaluator = new Evaluator();
        evaluator.debug.enabled = true;

        // const result = evaluator.evaluate(planeBrush, groutBrush, SUBTRACTION);
        // const result = evaluator.evaluate(groutBrush, planeBrush, SUBTRACTION);

        // const result = evaluator.evaluate(planeBrush, groutBrush, ADDITION);
        // const result = evaluator.evaluate(planeBrush, groutBrush, INTERSECTION);
        // const result = evaluator.evaluate(groutBrush, planeBrush, INTERSECTION);
        // const result = evaluator.evaluate(planeBrush, groutBrush, DIFFERENCE);
        const result = evaluator.evaluate(groutBrush, planeBrush, INTERSECTION);
        // const result = evaluator.evaluate(planeBrush, groutBrush, INTERSECTION);

        result.material = new THREE.MeshBasicMaterial({
            // blue
            color: 0x0000ff,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false,
        });

        result.renderOrder = 3;
        this._results.add(result);
    }
}
