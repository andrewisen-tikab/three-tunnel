import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import CameraControls from 'camera-controls';

import { saveAs } from 'file-saver';

import { Tunnel3D, TunnelControls } from '../src';
import { AbstractTunnel3D } from '../src/core';
import Grout3D from '../src/Grout3D';

CameraControls.install({ THREE });

export type JSONParams = Pick<
    AbstractTunnel3D,
    'tunnelHeight' | 'tunnelRoofHeight' | 'tunnelWidth'
>;

export default class Viewer {
    private static _instance: Viewer;

    public tunnelControls!: TunnelControls;

    public freeze: boolean = false;

    private _container!: HTMLElement;

    private _stats!: Stats;

    private _gui!: GUI;

    private _clock!: THREE.Clock;

    private _scene!: THREE.Scene;

    private _group!: THREE.Group<THREE.Object3DEventMap>;

    private _camera!: THREE.OrthographicCamera;

    private _renderer!: THREE.WebGLRenderer;

    private _cameraControls!: CameraControls;

    private _gridHelperXZ!: THREE.GridHelper;

    private _gridHelperXY!: THREE.GridHelper;

    private _gridHelperYZ!: THREE.GridHelper;

    private _tunnel!: Tunnel3D;

    private _grout!: Grout3D;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    init(container: HTMLElement = document.body): void {
        this._container = container;

        this._stats = new Stats();
        document.body.appendChild(this._stats.dom);

        this._gui = new GUI();

        this._clock = new THREE.Clock();

        this._scene = new THREE.Scene();
        this._group = new THREE.Group();
        this._scene.add(this._group);

        const { innerWidth: width, innerHeight: height } = window;
        this._camera = new THREE.OrthographicCamera(
            width / -2,
            width / 2,
            height / 2,
            height / -2,
            1,
            1_000,
        );

        this._renderer = new THREE.WebGLRenderer();
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        this._renderer.setClearColor(0xffffff, 1);

        document.body.appendChild(this._renderer.domElement);

        this._cameraControls = new CameraControls(this._camera, this._renderer.domElement);

        this._tunnel = new Tunnel3D();
        this._group.add(this._tunnel);

        this.tunnelControls = new TunnelControls();
        this.tunnelControls.attach(this._tunnel);

        this._grout = this.tunnelControls.addGrout();

        const size = 200;
        const divisions = 200;

        this._gridHelperXZ = new THREE.GridHelper(size, divisions);
        this._scene.add(this._gridHelperXZ);

        this._gridHelperXY = new THREE.GridHelper(size, divisions);
        this._gridHelperXY.rotation.x = Math.PI / 2;
        this._gridHelperXY.visible = false;
        this._scene.add(this._gridHelperXY);

        this._gridHelperYZ = new THREE.GridHelper(size, divisions);
        this._gridHelperYZ.rotation.x = Math.PI / 2;
        this._gridHelperYZ.rotation.z = Math.PI / 2;
        this._gridHelperYZ.visible = false;
        this._scene.add(this._gridHelperYZ);

        this._cameraControls.setPosition(-100, 100, 100);

        const axesHelper = new THREE.AxesHelper(5);
        this._scene.add(axesHelper);

        const fit = () => {
            this._cameraControls.fitToSphere(this._tunnel, true);
        };

        setTimeout(() => fit(), 100);

        const animate = () => {
            const delta = this._clock.getDelta();
            this._cameraControls.update(delta);

            requestAnimationFrame(animate);

            this._stats.update();

            this._renderer.render(this._scene, this._camera);
        };

        const tunnelFolder = this._gui.addFolder('Tunnel');
        tunnelFolder
            .add(this._tunnel, 'tunnelLength', 1, 100)
            .name('Length [L]')
            .onChange((value: number) => {
                this.tunnelControls.setTunnelParams({ tunnelLength: value });
            })
            .disable();

        tunnelFolder
            .add(this._tunnel, 'tunnelWidth', 1, 100)
            .name('Width [W] (m)')
            .onChange((value: number) => {
                this.tunnelControls.setTunnelParams({ tunnelWidth: value });
            });

        tunnelFolder
            .add(this._tunnel, 'tunnelHeight', 1, 20)
            .name('Height [H] (m)')
            .onChange((value: number) => {
                this.tunnelControls.setTunnelParams({ tunnelHeight: value });
            });

        tunnelFolder
            .add(this._tunnel, 'tunnelRoofHeight', 1, 10)
            .name('Roof [f] (m)')
            .onChange((value: number) => {
                this.tunnelControls.setTunnelParams({ tunnelRoofHeight: value });
            });

        const groutFolder = this._gui.addFolder('Grout');
        const groutParams = {
            visible: true,
            angle: 5,
            holeLength: 10,
        };

        groutFolder
            .add(groutParams, 'visible')
            .name('Visible')
            .onChange((value: boolean) => {
                if (this._grout == null) return;
                this._grout.visible = value;
            });
        groutFolder
            .add(groutParams, 'angle', 1, 20, 1)
            .name('Angle [α] (degrees)')
            .onChange((value: number) => {
                this.tunnelControls.setGroutParams({ angle: value * THREE.MathUtils.DEG2RAD });
            });

        groutFolder
            .add(groutParams, 'holeLength', 1, 90)
            .name('Hole Length [L] (m)')
            .onChange((value: number) => {
                this.tunnelControls.setGroutParams({ holeLength: value });
            });

        const params = {
            fit,
            fitProfile: () => {
                this._cameraControls.rotateTo(-Math.PI / 2, Math.PI / 2, true);
                this._cameraControls.fitToBox(this._tunnel, true, {
                    paddingLeft: 1,
                    paddingRight: 1,
                });
            },
            fitCrossSection: () => {
                this._cameraControls.rotateTo(-Math.PI, Math.PI / 2, true);

                this._cameraControls.fitToBox(this._tunnel, true, {
                    paddingTop: 1,
                    paddingBottom: 1,
                });
            },
            gridHelperXZVisible: true,
            gridHelperXYVisible: false,
            gridHelperYZVisible: false,
            save: this._save.bind(this),
            load: this._load.bind(this),
        };

        const cameraFolder = this._gui.addFolder('Camera');
        cameraFolder.add(params, 'fit').name('Zoom to Tunnel');
        cameraFolder.add(params, 'fitProfile').name('Profile');
        cameraFolder.add(params, 'fitCrossSection').name('Cross Section');

        const appearanceFolder = this._gui.addFolder('Appearance');
        appearanceFolder
            .add(params, 'gridHelperXZVisible')
            .name('Show Grid (XZ)')
            .onChange((value: boolean) => {
                this._gridHelperXZ.visible = value;
            });
        appearanceFolder
            .add(params, 'gridHelperXYVisible')
            .name('Show Grid (XY)')
            .onChange((value: boolean) => {
                this._gridHelperXY.visible = value;
            });
        appearanceFolder
            .add(params, 'gridHelperYZVisible')
            .name('Show Grid (YZ)')
            .onChange((value: boolean) => {
                this._gridHelperYZ.visible = value;
            });

        const loadSaveFolder = this._gui.addFolder('Load / Save');
        loadSaveFolder.add(params, 'save').name('Save');
        loadSaveFolder.add(params, 'load').name('Load');

        animate();
    }

    public dispose(): void {
        this._container.innerHTML = '';
        this._gui.destroy();
    }

    public toJSON(): JSONParams {
        const { tunnelHeight, tunnelRoofHeight, tunnelWidth } = this._tunnel;

        const object: JSONParams = {
            tunnelHeight,
            tunnelRoofHeight,
            tunnelWidth,
        };

        return object;
    }

    public fromJSON(json: JSONParams): void {
        const { tunnelHeight, tunnelRoofHeight, tunnelWidth } = json;
        this.tunnelControls.setTunnelParams({ tunnelHeight, tunnelRoofHeight, tunnelWidth });
    }

    private _save(): void {
        const data: string = JSON.stringify(this.toJSON(), null, 2);
        const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });

        const timestamp = new Date().toISOString().replace(/:/g, '-');
        saveAs(blob, `tunnel-data-${timestamp}.json`);
    }

    private _load(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (event: Event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file == null) return;

            // check file name ends with .json
            if (!file.name.toLowerCase().endsWith('.json')) {
                alert('Invalid file type.');
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = reader.result as string;
                    const json = JSON.parse(data);
                    this.fromJSON(json);
                } catch (error) {
                    console.error(error);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
}
