import type { Target } from './dom';
export type Vec3 = readonly [number, number, number];
export type Span = readonly [number, number];
export interface LineStyle {
    color?: string;
    thickness?: number;
    opacity?: number;
    dashed?: boolean;
    /** Set false to draw the line above all surfaces. */
    depthTest?: boolean;
}
export interface PointStyle {
    color?: string;
    radius?: number;
    opacity?: number;
    label?: string;
    labelColor?: string;
}
export interface SurfaceStyle {
    color?: string;
    opacity?: number;
    wireColor?: string;
    thickness?: number;
    fill?: boolean;
    wire?: boolean;
    shade?: boolean;
}
export interface SurfaceOptions extends SurfaceStyle {
    x?: Span;
    y?: Span;
    resolution?: number | readonly [number, number];
}
export interface ParametricOptions extends SurfaceStyle {
    u?: Span;
    v?: Span;
    resolution?: number | readonly [number, number];
}
export type Shape3D = {
    kind: 'surface';
    sample: (u: number, v: number) => Vec3;
    u: Span;
    v: Span;
    resolution: readonly [number, number];
    style: SurfaceStyle;
} | {
    kind: 'line';
    points: readonly Vec3[];
    style: LineStyle;
} | {
    kind: 'vector';
    from: Vec3;
    to: Vec3;
    style: LineStyle;
} | {
    kind: 'point';
    at: Vec3;
    style: PointStyle;
};
export declare function surface(sample: (x: number, y: number) => number, options?: SurfaceOptions): Shape3D;
export declare function parametric(sample: (u: number, v: number) => Vec3, options?: ParametricOptions): Shape3D;
export declare function line(points: readonly Vec3[], style?: LineStyle): Shape3D;
export declare function vector(from: Vec3, to: Vec3, style?: LineStyle): Shape3D;
export declare function point(at: Vec3, style?: PointStyle): Shape3D;
export interface Scene3D {
    objects: readonly Shape3D[];
    /** Shared bounds define the initial framing. Geometry outside them remains visible. */
    bounds?: {
        x?: Span;
        y?: Span;
        z?: Span;
    };
    axes?: boolean;
    axisLabels?: readonly [string, string, string];
    grid?: boolean;
}
export interface Camera3D {
    yaw?: number;
    pitch?: number;
    zoom?: number;
}
export interface View3DOptions {
    height?: number;
    background?: string;
    gridColor?: string;
    axisColor?: string;
    label?: string;
    interactive?: boolean;
    camera?: Camera3D;
}
export interface View3D {
    readonly element: HTMLElement;
    setScene(scene: Scene3D): void;
    setCamera(camera: Camera3D): void;
    resetCamera(): void;
    destroy(): void;
}
export declare function view3d(target: Target, scene: Scene3D, options?: View3DOptions): View3D;
