export type AbstractTunnel3D = {
    /**
     * Property to check if the object is a `Tunnel3D`.
     */
    isTunnel3D: boolean;

    tunnelLength: number;
    tunnelWidth: number;
    tunnelHeight: number;
    tunnelRoofHeight: number;

    update(): void;
};

export type AbstractTunnel3DParams = Pick<
    AbstractTunnel3D,
    'tunnelLength' | 'tunnelWidth' | 'tunnelHeight' | 'tunnelRoofHeight'
>;
