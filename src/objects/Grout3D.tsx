import * as THREE from 'three';
import { AbstractGrout3D, AbstractGrout3DParams, AbstractObject3D } from '../core';
import Tunnel3D from './Tunnel3D';

/**
 * A cylindrical grout shape with a circular cross-section.
 */
export default class Grout3D extends THREE.Object3D implements AbstractGrout3D, AbstractObject3D {
    public isGrout3D: boolean = true;

    public order: number = -1;

    public screenLength: number = 1;

    public angle: number = 15 * THREE.MathUtils.DEG2RAD;

    public cutDepth: number = 1;

    public overlap: number = 5;

    public holeLength: number = 20;

    public groutColorHEX: number = 0xff0000;

    public radius = 1 / 5;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    private _params: AbstractGrout3DParams | null = null;

    private _tunnel: Tunnel3D;

    constructor(tunnel: Tunnel3D, params?: AbstractGrout3DParams) {
        super();
        this._tunnel = tunnel;
        if (params) this._params = params;
        this._build();
    }

    private _build() {
        const { holeLength, groutColorHEX } = this;

        const geometry = new THREE.CylinderGeometry(this.radius, this.radius, holeLength, 32);
        const material = new THREE.MeshBasicMaterial({
            color: groutColorHEX,
        });
        const cylinder = new THREE.Mesh(geometry, material);
        cylinder.rotateX(Math.PI / 2);
        cylinder.position.set(0, 0, holeLength / 2);
        this.add(cylinder);

        const { tunnelHeight, tunnelRoofHeight } = this._tunnel;
        this.position.set(0, tunnelHeight + tunnelRoofHeight, 0);
        this.rotation.set(-this.angle, 0, 0);
    }

    public update(params?: AbstractGrout3DParams): void {
        if (params) this._params = params;
        this.clear();
        this._build();
    }

    public toJSON(): AbstractGrout3DParams {
        const { angle, cutDepth, groutColorHEX, holeLength, overlap } = this;
        const object: AbstractGrout3DParams = {
            angle,
            cutDepth,
            groutColorHEX,
            holeLength,
            overlap,
        };
        return object;
    }

    public fromJSON(json: AbstractGrout3DParams): void {
        Object.assign(this, json);
        this.update();
    }
}
