import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import CameraControls from 'camera-controls';

import { saveAs } from 'file-saver';

import { Tunnel3D, TunnelControls } from '../src';
import { AbstractGrout3D, AbstractTunnel3D } from '../src/core';
import Grout3D from '../src/Grout3D';
import { VERSION } from '../src/version';

CameraControls.install({ THREE });

export type JSONTunnelParams = Pick<
    AbstractTunnel3D,
    'tunnelHeight' | 'tunnelRoofHeight' | 'tunnelWidth' | 'tunnelColorHEX'
>;

export type JSONGroutsParams = Pick<
    AbstractGrout3D,
    'angle' | 'cutDepth' | 'holeLength' | 'overlap' | 'groutColorHEX' | 'screenLength'
>;

export type JSONParams = {
    tunnel: JSONTunnelParams;
    grouts: JSONGroutsParams[];
    version: string;
};

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

    private _grout1!: Grout3D;

    private _grout2!: Grout3D;

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

        this._grout1 = this.tunnelControls.addGrout();
        this._grout2 = this.tunnelControls.addGrout();
        this.tunnelControls.update();

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

        const groutFolder = this._gui.addFolder('Grouts');

        groutFolder
            .add(this.tunnelControls, 'groupGrouts')
            .name('Group Grouts')
            .onChange((value: boolean) => {
                this.tunnelControls.groupGrouts = value;
                updateGroutFolder(value);
            });

        const grout1Folder = groutFolder.addFolder('#1');
        const grout2Folder = groutFolder.addFolder('#2');

        const grout1Params = {
            visible: true,
            angle: 5,
            holeLength: 10,
            overlap: 5,
            groutColorHEX: 0xff0000,
        };

        const grout2Params = {
            visible: true,
            angle: 5,
            holeLength: 10,
            overlap: 5,
            groutColorHEX: 0xff0000,
        };

        grout1Folder
            .add(grout1Params, 'visible')
            .name('Visible')
            .onChange((value: boolean) => {
                if (this._grout1 == null) return;
                this._grout1.visible = value;
            });
        grout1Folder
            .add(grout1Params, 'angle', 1, 20, 1)
            .name('Angle [α] (degrees)')
            .onChange((value: number) => {
                this.tunnelControls.setGroutParams(0, { angle: value * THREE.MathUtils.DEG2RAD });
            });

        grout1Folder
            .add(grout1Params, 'holeLength', 1, 90)
            .name('Hole Length [L] (m)')
            .onChange((value: number) => {
                this.tunnelControls.setGroutParams(0, { holeLength: value });
            });

        grout1Folder
            .add(grout1Params, 'overlap', 1, 10)
            .name('Overlap [O] (m)')
            .onChange((value: number) => {
                this.tunnelControls.setGroutParams(0, { overlap: value });
            });

        grout1Folder
            .addColor(grout1Params, 'groutColorHEX')
            .name('Color')
            .onChange((value: number) => {
                this.tunnelControls.setGroutParams(0, { groutColorHEX: value });
            });

        grout2Folder
            .add(grout2Params, 'visible')
            .name('Visible')
            .onChange((value: boolean) => {
                if (this._grout1 == null) return;
                this._grout2.visible = value;
            });

        const angle2 = grout2Folder
            .add(grout2Params, 'angle', 1, 20, 1)
            .name('Angle [α] (degrees)')
            .onChange((value: number) => {
                this.tunnelControls.setGroutParams(1, { angle: value * THREE.MathUtils.DEG2RAD });
            });

        const holeLength2 = grout2Folder
            .add(grout2Params, 'holeLength', 1, 90)
            .name('Hole Length [L] (m)')
            .onChange((value: number) => {
                this.tunnelControls.setGroutParams(1, { holeLength: value });
            });

        grout1Folder
            .add(grout2Params, 'overlap', 1, 10)
            .name('Overlap [O] (m)')
            .onChange((value: number) => {
                this.tunnelControls.setGroutParams(1, { overlap: value });
            });

        grout2Folder
            .addColor(grout2Params, 'groutColorHEX')
            .name('Color')
            .onChange((value: number) => {
                this.tunnelControls.setGroutParams(1, { groutColorHEX: value });
            });

        const updateGroutFolder = (groupGrouts: boolean) => {
            if (groupGrouts) {
                angle2.disable();
                holeLength2.disable();
            } else {
                angle2.enable();
                holeLength2.enable();
            }
            this.tunnelControls.update();
        };

        updateGroutFolder(this.tunnelControls.groupGrouts);

        const planeParams = {
            visible: false,
            xPosition: 0,
            strike: 0,
            dip: 0,
            opacity: 0.5,
            planeColorHEX: 0xffff00,
        };

        const planeFolder = this._gui.addFolder('Plane').close();
        const planeAppearanceFolder = planeFolder.addFolder('Appearance');
        const planeGeometryFolder = planeFolder.addFolder('Geometry');

        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshBasicMaterial({
            color: planeParams.planeColorHEX,
            side: THREE.DoubleSide,
            opacity: planeParams.opacity,
            transparent: true,
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.visible = planeParams.visible;
        this._group.add(plane);

        planeAppearanceFolder
            .add(planeParams, 'visible')
            .name('Visible')
            .onChange((value: boolean) => {
                plane.visible = value;
            });

        planeGeometryFolder
            .add(planeParams, 'strike', 0, 360, 1)
            .name('Strike (degrees)')
            .onChange((value: number) => {
                plane.rotation.y = -value * THREE.MathUtils.DEG2RAD;
            });

        planeGeometryFolder
            .add(planeParams, 'dip', 0, 90, 1)
            .name('Dip (degrees)')
            .onChange((value: number) => {
                plane.rotation.x = (90 - value) * THREE.MathUtils.DEG2RAD;
            });

        planeAppearanceFolder
            .addColor(planeParams, 'planeColorHEX')
            .name('Color')
            .onChange((value: number) => {
                plane.material.color.setHex(value);
            });

        planeAppearanceFolder
            .add(planeParams, 'opacity', 0, 1, 0.01)
            .name('Opacity')
            .onChange((value: number) => {
                plane.material.opacity = value;
            });

        planeGeometryFolder
            .add(planeParams, 'xPosition', -100, 100)
            .name('X Position')
            .onChange((value: number) => {
                plane.position.z = value;
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

        viewpointsFolder.add(params, 'fitProfile').name('Profile (side)');
        viewpointsFolder.add(params, 'fitCrossSection').name('Cross Section (front)');

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

        animate();

        window.addEventListener('resize', this._onWindowResize.bind(this));

        const screenshotFolder = this._gui.addFolder('Screenshot');
        screenshotFolder.add(params, 'saveScreenshot').name('Save Screenshot (jpg)');
    }

    public dispose(): void {
        this._container.innerHTML = '';
        this._gui.destroy();
    }

    public toJSON(): JSONParams {
        const { tunnelHeight, tunnelRoofHeight, tunnelWidth, tunnelColorHEX } = this._tunnel;

        const grouts: JSONGroutsParams[] = this.tunnelControls.getGrouts().map((grout) => {
            const { angle, cutDepth, groutColorHEX, holeLength, overlap, screenLength } = grout;
            return { angle, cutDepth, groutColorHEX, holeLength, overlap, screenLength };
        });

        const object: JSONParams = {
            tunnel: { tunnelHeight, tunnelRoofHeight, tunnelWidth, tunnelColorHEX },
            grouts,
            version: VERSION,
        };

        return object;
    }

    public fromJSON(json: JSONParams): void {
        this._checkVersion(json);

        this._fromJSONTunnel(json);
        this._fromJSONGrouts(json);
    }

    private _checkVersion(json: JSONParams): void {
        const { version = '0.0.0' } = json;
        if (version !== VERSION) {
            alert(
                `Version mismatch. Expected ${VERSION} but got ${version}. Results may be unexpected.`,
            );
        }
    }

    private _fromJSONTunnel(json: JSONParams): void {
        const {
            tunnel: { tunnelHeight, tunnelRoofHeight, tunnelWidth, tunnelColorHEX },
        } = json;

        this.tunnelControls.setTunnelParams({
            tunnelHeight,
            tunnelRoofHeight,
            tunnelWidth,
            tunnelColorHEX,
        });
    }

    private _fromJSONGrouts(json: JSONParams): void {
        const { grouts } = json;

        // Only support 2 for now
        if (grouts.length !== 2) throw new Error('Only support 2 grouts for now.');

        for (let index = 0; index < grouts.length; index++) {
            this.tunnelControls.setGroutParams(index, grouts[index]);
        }
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

        const scaleFactor = 2; // 2x resolution
        this._cameraControls.zoom(-scaleFactor * 10, false);
        this._cameraControls.update(0);
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
