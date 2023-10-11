import * as THREE from 'three';
import { AbstractGrout3D, AbstractGrout3DParams } from './core';
import Tunnel3D from './Tunnel3D';

// const doSomething = () => {};

export default class Grout3D extends THREE.Object3D implements AbstractGrout3D {
    public isGrout3D: boolean = true;

    public order: number = -1;

    public screenLength: number = 1;

    public angle: number = 5 * THREE.MathUtils.DEG2RAD;

    public cutDepth: number = 1;

    public overlap: number = 5;

    public holeLength: number = 10;

    public groutColorHEX: number = 0xff0000;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    private _params: AbstractGrout3DParams | null = null;

    private _tunnel: Tunnel3D;

    public geometry: THREE.BufferGeometry;

    public cylinder: THREE.Mesh;

    public positionOffset: number = 0;

    constructor(tunnel: Tunnel3D, params?: AbstractGrout3DParams) {
        super();
        this._tunnel = tunnel;
        if (params) this._params = params;
        this.geometry = new THREE.BufferGeometry();
        this.cylinder = new THREE.Mesh();
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
        const { holeLength, groutColorHEX } = this;
        this.geometry = new THREE.CylinderGeometry(1 / 3, 1 / 3, holeLength, 32);
        const material = new THREE.MeshBasicMaterial({
            color: groutColorHEX,
            // depthTest: false,
            // depthWrite: false,
        });
        this.cylinder = new THREE.Mesh(this.geometry, material);
        // this.cylinder.rotateX(Math.PI / 2);
        // this.cylinder.position.set(0, 0, holeLength / 2);
        // this.cylinder.renderOrder = 2;
        this.add(this.cylinder);
        const { tunnelHeight, tunnelRoofHeight } = this._tunnel;
        // this.position.set(0, tunnelHeight + tunnelRoofHeight, 0);
        // this.rotation.set(-this.angle, 0, 0);
        this.cylinder.position.set(
            0,
            tunnelHeight + tunnelRoofHeight,
            holeLength / 2 + this.positionOffset,
        );
        this.cylinder.rotation.set(Math.PI / 2 - this.angle, 0, 0);
        // {
        //     this.geometry = new THREE.BoxGeometry(10, 10, 10);
        //     const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        //     this.cylinder = new THREE.Mesh(this.geometry, material);
        //     const { tunnelHeight, tunnelRoofHeight } = this._tunnel;
        //     const { holeLength } = this;
        //     // this.cylinder.position.set(
        //     //     0,
        //     //     tunnelHeight + tunnelRoofHeight,
        //     //     holeLength / 2 + this.positionOffset,
        //     // );
        //     this.cylinder.position.set(0, 20, 1);
        //     this.add(this.cylinder);
        // }
    }

    public update(params?: AbstractGrout3DParams): void {
        if (params) this._params = params;
        this.clear();
        this._build();
    }
}
