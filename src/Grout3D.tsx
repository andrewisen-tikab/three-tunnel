import * as THREE from 'three';
import { AbstractGrout3D, AbstractGrout3DParams } from './core';
import Tunnel3D from './Tunnel3D';

// const doSomething = () => {};

export default class Grout3D extends THREE.Object3D implements AbstractGrout3D {
    public isGrout3D: boolean = true;

    public screenLength: number = 1;

    public angle: number = 5 * THREE.MathUtils.DEG2RAD;

    public cutDepth: number = 1;

    public overlap: number = 0;

    public holeLength: number = 10;

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

    // private _calculateNewParams(): boolean {
    //     if (!this._params) throw new Error('Grout3D: params is are defined');

    //     const { holeLength, angle, cutDepth } = this._params;

    //     if (angle != null && holeLength != null) {
    //         doSomething();
    //     } else if (holeLength != null && cutDepth != null) {
    //         doSomething();
    //     } else if (angle != null && cutDepth != null) {
    //         doSomething();
    //     } else {
    //         console.error('params', this._params);
    //         return false;
    //     }
    //     return true;
    // }

    private _build() {
        // if (!this._calculateNewParams())
        //     throw new Error('Grout3D: params are not correctly defined');

        const { holeLength } = this;

        const geometry = new THREE.CylinderGeometry(1 / 3, 1 / 3, holeLength, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            depthTest: false,
            depthWrite: false,
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
}
