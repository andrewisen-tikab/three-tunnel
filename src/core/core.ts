/* eslint-disable @typescript-eslint/no-explicit-any */
export type AbstractObject3D = {
    /**
     * Convert the object to JSON format.
     */
    toJSON(): any;
    /**
     * Convert the object from JSON format.
     */
    fromJSON(...args: any[]): void;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Abstract type for a tunnel.
 */
export type AbstractTunnel3D = {
    /**
     * Property to check if the object is a `Tunnel3D`.
     */
    isTunnel3D: boolean;
    /**
     * Length along the positive z-axis.
     */
    tunnelLength: number;
    /**
     * Width along the positive x-axis.
     */
    tunnelWidth: number;
    /**
     * Height along the positive y-axis.
     */
    tunnelHeight: number;
    /**
     * Height along the positive y-axis.
     */
    tunnelRoofHeight: number;
    /**
     * Color as hexadecimal.
     *
     * E.g. 0xff0000 for red.
     */
    tunnelColorHEX: number;
    /**
     * Update the tunnel's geometry.
     *
     * Call this method when the {@link AbstractTunnel3DParams} changes.
     */
    update(): void;
};

/**
 * Parameters for creating/updating {@link AbstractTunnel3D}.
 */
export type AbstractTunnel3DParams = Pick<
    AbstractTunnel3D,
    'tunnelLength' | 'tunnelWidth' | 'tunnelHeight' | 'tunnelRoofHeight' | 'tunnelColorHEX'
>;

/**
 * Abstract type for a grout.
 */
export type AbstractGrout3D = {
    /**
     * Property to check if the object is a `Grout3D`.
     */
    isGrout3D: boolean;
    /**
     * Measured at the given angle.
     *
     * This is the hypotenuse if you study the geometry in 2D.
     */
    holeLength: number;
    /**
     * Angle parallel to the tunnel (+Z) and up towards the ground (+Y).
     * In radians.
     */
    angle: number;
    /**
     * Length perpendicular to the tunnel (+Z)
     */
    cutDepth: number;
    /**
     * To be calculated.
     *
     * Distance to next grout.
     * Measured parallel to the tunnel (+Z).
     */
    overlap: number;
    /**
     * To be calculated.
     *
     * Measured parallel to the tunnel (+Z).
     */
    screenLength: number;
    /**
     * Color as hexadecimal.
     *
     * E.g. 0xff0000 for red.
     */
    groutColorHEX: number;
    /**
     * Update the grouts's geometry.
     *
     * Call this method when the {@link AbstractGrout3DParams} changes.
     */
    update(): void;
};

/**
 * Parameters for creating/updating {@link AbstractGrout3D}.
 */
export type AbstractGrout3DParams = Pick<
    AbstractGrout3D,
    'holeLength' | 'angle' | 'cutDepth' | 'groutColorHEX' | 'overlap'
>;

/**
 * Abstract type for a fracture plane.
 */
export type AbstractFracturePlane3D = {
    /**
     * Property to check if the object is a `FracturePlane3D`.
     */
    isFracturePlane3D: boolean;
    /**
     * Object gets rendered if `true`.
     */
    visible: boolean;
    /**
     * Position along the positive z-axis.
     */
    xPosition: number;
    /**
     * Angle in degrees.
     */
    strike: number;
    /**
     * Angle in degrees.
     */
    dip: number;
    /**
     * From 0-1.
     */
    opacity: number;
    /**
     * Color as hexadecimal.
     *
     * E.g. 0xff0000 for red.
     */
    planeColorHEX: number;
};

/**
 * Parameters for creating/updating {@link AbstractFracturePlane3D}.
 */
export type AbstractFracturePlane3DParams = Omit<AbstractFracturePlane3D, 'isFracturePlane3D'>;

/**
 * Abstract type for a tunnel controls.
 */
export type AbstractTunnelControlsParams = {
    /**
     * On each side of the center
     */
    numberOfGrouts: number;
    spreadDistance: number;
    /**
     * Angle in degrees
     */
    spreadAngle: number;
};
