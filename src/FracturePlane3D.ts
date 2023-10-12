import * as THREE from 'three';
import { AbstractFracturePlane3D, AbstractFracturePlane3DParams } from './core';

export default class FracturePlane3D extends THREE.Object3D implements AbstractFracturePlane3D {
    xPosition: number;
    strike: number;
    dip: number;
    opacity: number;
    planeColorHEX: number;

    constructor() {
        super();
        this.xPosition = 0;
        this.strike = 0;
        this.dip = 0;
        this.opacity = 0.5;
        this.planeColorHEX = 0xffff00;
        this._build();
    }

    private _build(): void {
        this.clear();
        const geometry = new THREE.BoxGeometry(100, 100, 0.1);
        const material = new THREE.MeshBasicMaterial({
            color: this.planeColorHEX,
            side: THREE.DoubleSide,
            opacity: this.opacity,
            transparent: true,
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.visible = this.visible;

        plane.rotation.y = -this.strike * THREE.MathUtils.DEG2RAD;
        plane.rotation.x = (90 - this.dip) * THREE.MathUtils.DEG2RAD;

        plane.position.z = this.xPosition;

        this.add(plane);
    }

    public update(): void {
        this._build();
    }

    public toJSON(): AbstractFracturePlane3DParams {
        const { visible, xPosition, strike, dip, opacity, planeColorHEX } = this;
        const object: AbstractFracturePlane3DParams = {
            visible,
            xPosition,
            strike,
            dip,
            opacity,
            planeColorHEX,
        };
        return object;
    }

    public fromJSON(json: AbstractFracturePlane3DParams): void {
        Object.assign(this, json);
        this.update();
    }
}
