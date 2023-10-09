import * as THREE from 'three';
import { AbstractGrout3D, AbstractGrout3DParams } from './core';

const doSomething = () => {};

export default class Grout3D extends THREE.Object3D implements AbstractGrout3D {
    public isGrout3D: boolean = true;

    public screenLength: number = 1;

    public angle: number = 1;

    public cutDepth: number = 1;

    public overlap: number = 0;

    public holeLength: number = 0;

    _params: AbstractGrout3DParams | null = null;

    constructor(params?: AbstractGrout3DParams) {
        super();
        if (params) this._params = params;
        this._build();
    }

    private _calculateNewParams(): boolean {
        if (!this._params) throw new Error('Grout3D: params is are defined');

        const { holeLength, angle, cutDepth } = this._params;

        if (angle != null && holeLength != null) {
            doSomething();
        } else if (holeLength != null && cutDepth != null) {
            doSomething();
        } else if (angle != null && cutDepth != null) {
            doSomething();
        } else {
            console.error('params', this._params);
            return false;
        }
        return true;
    }

    private _build() {
        if (!this._calculateNewParams())
            throw new Error('Grout3D: params are not correctly defined');
    }

    public update(params?: AbstractGrout3DParams): void {
        if (params) this._params = params;
        this.clear();
        this._build();
    }
}
