export type AbstractTunnel3D = {
    /**
     * Property to check if the object is a `Tunnel3D`.
     */
    isTunnel3D: boolean;

    tunnelLength: number;
    tunnelWidth: number;
    tunnelHeight: number;
    tunnelRoofHeight: number;

    /**
     * Color as hexadecimal.
     *
     * E.g. 0xff0000 for red.
     */
    tunnelColorHEX: number;

    update(): void;
};

export type AbstractTunnel3DParams = Pick<
    AbstractTunnel3D,
    'tunnelLength' | 'tunnelWidth' | 'tunnelHeight' | 'tunnelRoofHeight' | 'tunnelColorHEX'
>;

export type AbstractGrout3D = {
    /**
     * Property to check if the object is a `Grout3D`.
     */
    isGrout3D: boolean;
    /**
     *
     *
     * Hypotenuse.
     */
    holeLength: number;
    /**
     * Angle parallel to the tunnel and up towards the ground.
     */
    angle: number;
    /**
     * Length perpendicular to the tunnel.
     */
    cutDepth: number;
    /**
     * To be calculated.
     *
     * Distance to next grout.
     */
    overlap: number;
    /**
     * To be calculated.
     *
     * Parallel to the tunnel
     */
    screenLength: number;
    /**
     * Color as hexadecimal.
     *
     * E.g. 0xff0000 for red.
     */
    groutColorHEX: number;

    update(): void;
};

export type AbstractGrout3DParams = Pick<
    AbstractGrout3D,
    'holeLength' | 'angle' | 'cutDepth' | 'groutColorHEX' | 'overlap'
>;
