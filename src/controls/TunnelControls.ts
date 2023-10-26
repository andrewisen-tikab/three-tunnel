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

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const cube = new THREE.Mesh(geometry, material);

export default class TunnelControls extends EventDispatcher {
    public groupGrouts: boolean = true;

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

    /**
     * Given a spread, generate the grouts around the spread
     * @returns
     */
    private _generateSpreadGrouts() {
        // Clear any previous spread
        this._spread.clear();
        if (this._tunnel == null) return;

        for (let i = 0; i < this._grouts.length; i++) {
            const element = this._grouts[i];

            this._generateSpreadGrout(element);
        }
    }

    private _generateSpreadGrout(initialGrout: Grout3D) {
        // The spread is only used for calculations and is not visible
        initialGrout.visible = false;

        // Calculate some maths
        const { tunnelHeight, tunnelRoofHeight } = this._tunnel!;
        const l = Math.cos(initialGrout.angle) * initialGrout.holeLength;
        const h = Math.sin(initialGrout.angle) * initialGrout.holeLength;

        // Set the grout's position to the end (!) of the hole
        const initialZ = initialGrout.position.z;
        initialGrout.position.y += h;
        initialGrout.position.z += l; // move towards the spread

        // Setup iteration
        let conditionMet = false;
        let whileIndex = 0; // Keep track of iterations
        let groutIndex = 0; // Keep track of grout used

        const spreads: Grout3D[] = [initialGrout];

        while (conditionMet === false) {
            // Safety check
            whileIndex++;
            if (whileIndex > 30) {
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

            // Set the new grout's position to the end (!) of the hole
            const currentSpreadPosition = new THREE.Vector3().copy(spread.position);
            const currentSpreadPosition2D = new THREE.Vector2(
                currentSpreadPosition.x,
                currentSpreadPosition.y,
            );

            this._tunnel!.mockDoStick(
                spread,
                initialZ,
                h,
                l,
                new THREE.Vector2(currentSpreadPosition2D.x, currentSpreadPosition2D.y),
            );

            // Check if we need to stop
            if (
                // Wait for the loop to do its thing
                whileIndex > 10 &&
                // Make sure it's over the tunnel's ""
                spread.position.y > tunnelHeight + tunnelRoofHeight &&
                // N:B. X coordinate is world coordinate, not tunnel coordinate!
                spread.position.x < 0
            ) {
                conditionMet = true;
                break;
            }

            spreads.push(spread);
            groutIndex++;
        }

        this._spread.add(...spreads);
    }

    toJSON(): AbstractTunnelControlsParams {
        const object: AbstractTunnelControlsParams = {};
        return object;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fromJSON(_json: AbstractTunnelControlsParams): void {
        // Object.assign(this, json);
        this.update();
    }
}
