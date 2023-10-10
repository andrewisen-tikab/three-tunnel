import Grout3D from '../Grout3D';
import Tunnel3D from '../Tunnel3D';
import { AbstractGrout3DParams, AbstractTunnel3DParams } from '../core';
import { EventDispatcher } from './EventDispatcher';

export default class TunnelControls extends EventDispatcher {
    private _tunnel: Tunnel3D | null = null;
    private _grout: Grout3D | null = null;

    constructor() {
        super();
    }

    attach(tunnel: Tunnel3D) {
        this._tunnel = tunnel;
    }

    detach() {
        this._tunnel = null;
    }

    getTunnel() {
        return this._tunnel;
    }

    setTunnelParams(params: Partial<AbstractTunnel3DParams>) {
        if (this._tunnel == null) return;
        Object.assign(this._tunnel, params);
        this._tunnel.update();

        if (this._grout) {
            this._grout.update();
        }
    }

    addGrout() {
        if (this._tunnel == null) throw new Error('Tunnel is not attached.');
        const grout = new Grout3D(this._tunnel);
        this._grout = grout;
        this._tunnel.groutGroup.add(grout);
        return grout;
    }

    setGroutParams(params: Partial<AbstractGrout3DParams>) {
        if (this._grout == null) return;
        Object.assign(this._grout, params);
        this._grout.update();
    }
}
