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
    'tunnelHeight' | 'tunnelRoofHeight' | 'tunnelWidth' | 'tunnelColorHEX'
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

        this._renderer = new THREE.WebGLRenderer({
            preserveDrawingBuffer: true,
        });
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        this._renderer.setClearColor(0xffffff, 0);

        this._container.appendChild(this._renderer.domElement);

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

            this._render();
        };

        const tunnelFolder = this._gui.addFolder('Tunnel');
        tunnelFolder
            .add(this._tunnel, 'tunnelLength', 1, 100)
            .name('Length [L]')
            .onChange((value: number) => {
                this.tunnelControls.setTunnelParams({ tunnelLength: value });
            })
            .listen()
            .disable();

        tunnelFolder
            .add(this._tunnel, 'tunnelWidth', 1, 100)
            .name('Width [W] (m)')
            .onChange((value: number) => {
                this.tunnelControls.setTunnelParams({ tunnelWidth: value });
            })
            .listen();

        tunnelFolder
            .add(this._tunnel, 'tunnelHeight', 1, 20)
            .name('Height [H] (m)')
            .onChange((value: number) => {
                this.tunnelControls.setTunnelParams({ tunnelHeight: value });
            })
            .listen();

        tunnelFolder
            .add(this._tunnel, 'tunnelRoofHeight', 1, 10)
            .name('Roof [f] (m)')
            .onChange((value: number) => {
                this.tunnelControls.setTunnelParams({ tunnelRoofHeight: value });
            })
            .listen();

        tunnelFolder
            .addColor(this._tunnel, 'tunnelColorHEX')
            .name('Color')
            .onChange((value: number) => {
                this.tunnelControls.setTunnelParams({ tunnelColorHEX: value });
            })
            .listen();

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
            saveScreenshot: this._saveScreenshot.bind(this),
        };

        const cameraFolder = this._gui.addFolder('Camera').close();
        cameraFolder.add(params, 'fit').name('Zoom to Tunnel');

        const viewpointsFolder = this._gui.addFolder('Viewpoints');

        viewpointsFolder.add(params, 'fitProfile').name('Profile');
        viewpointsFolder.add(params, 'fitCrossSection').name('Cross Section');

        const appearanceFolder = this._gui.addFolder('Appearance').close();
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

        const loadSaveFolder = this._gui.addFolder('Load / Save Settings').close();
        loadSaveFolder.add(params, 'save').name('Save');
        loadSaveFolder.add(params, 'load').name('Load');

        const screenshotFolder = this._gui.addFolder('Screenshot');
        screenshotFolder.add(params, 'saveScreenshot').name('Save Screenshot (jpg)');

        animate();

        window.addEventListener('resize', this._onWindowResize.bind(this));
    }

    public dispose(): void {
        this._container.innerHTML = '';
        this._gui.destroy();
    }

    public toJSON(): JSONParams {
        const { tunnelHeight, tunnelRoofHeight, tunnelWidth, tunnelColorHEX } = this._tunnel;

        const object: JSONParams = {
            tunnelHeight,
            tunnelRoofHeight,
            tunnelWidth,
            tunnelColorHEX,
        };

        return object;
    }

    public fromJSON(json: JSONParams): void {
        const { tunnelHeight, tunnelRoofHeight, tunnelWidth, tunnelColorHEX } = json;
        this.tunnelControls.setTunnelParams({
            tunnelHeight,
            tunnelRoofHeight,
            tunnelWidth,
            tunnelColorHEX,
        });
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

    private _render(): void {
        // if (this.freeze) return;
        this._renderer.render(this._scene, this._camera);
    }

    private _onWindowResize(): void {
        this._resize();
    }
    private _resize(width = window.innerWidth, height = window.innerHeight): void {
        // const aspect = width / height;
        // const { _camera: camera } = this;

        // camera.left = (-frustumSize * aspect) / 2;
        // camera.right = (frustumSize * aspect) / 2;
        // camera.top = frustumSize / 2;
        // camera.bottom = -frustumSize / 2;

        // camera.updateProjectionMatrix();

        // this._renderer.setSize(width, height);
        // this._render();

        const { _camera: camera } = this;
        this._renderer.setSize(width, height);

        camera.left = width / -2;
        camera.right = width / 2;
        camera.top = height / 2;
        camera.bottom = height / -2;
        camera.updateProjectionMatrix();

        this._render();
    }

    private _beginHighResolution() {
        this.freeze = true;
        const scaleFactor = 2; // 2x resolution

        const { innerWidth: width, innerHeight: height } = window;

        const newWidth = width * scaleFactor;
        const newHeight = height * scaleFactor;

        this._resize(newWidth, newHeight);

        this._cameraControls.zoom(scaleFactor * 10, false);
        this._cameraControls.update(0);
        this._render();
    }

    private _endHighResolution() {
        const { innerWidth: width, innerHeight: height } = window;
        this._renderer.setSize(width, height);
        this.freeze = false;
        this._resize();
    }

    private _saveScreenshot() {
        this._beginHighResolution();
        this._renderer.domElement.toBlob((blob) => {
            if (blob == null) {
                alert('Failed to save screenshot.');
                return;
            }

            const a = document.createElement('a');
            document.body.appendChild(a);
            a.style.display = 'none';

            const url = window.URL.createObjectURL(blob);
            a.href = url;
            a.download = 'screenshot.png';

            this._endHighResolution();
            a.click();
        }),
            'image/png',
            1;
    }
}
