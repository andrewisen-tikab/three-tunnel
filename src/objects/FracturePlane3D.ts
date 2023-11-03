import * as THREE from 'three';
import { AbstractFracturePlane3D, AbstractFracturePlane3DParams, AbstractObject3D } from '../core';

const x = /* #__PURE__ */ new THREE.Vector3(1, 0, 0);
const y = /* #__PURE__ */ new THREE.Vector3(0, 1, 0);

export default class FracturePlane3D
    extends THREE.Object3D
    implements AbstractFracturePlane3D, AbstractObject3D
{
    public isFracturePlane3D: boolean = true;

    public xPosition: number;

    public yPosition: number;

    public zPosition: number;

    public strike: number;

    public dip: number;

    public opacity: number;

    public planeColorHEX: number;

    constructor() {
        super();
        this.xPosition = 0;
        this.yPosition = 0;
        this.zPosition = 0;
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

        plane.position.x = this.yPosition;
        plane.position.z = this.xPosition;
        plane.position.y = this.zPosition;

        plane.rotateOnWorldAxis(x, (90 - this.dip) * THREE.MathUtils.DEG2RAD);
        plane.rotateOnWorldAxis(y, this.strike * THREE.MathUtils.DEG2RAD);

        this.add(plane);
    }

    public update(): void {
        this._build();
    }

    public toJSON(): AbstractFracturePlane3DParams {
        const { visible, xPosition, yPosition, zPosition, strike, dip, opacity, planeColorHEX } =
            this;
        const object: AbstractFracturePlane3DParams = {
            visible,
            xPosition,
            yPosition,
            zPosition,
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
