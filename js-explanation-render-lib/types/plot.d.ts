import type { Target } from './dom';
import type { Span } from './scene3d';
export interface Curve {
    fn: (x: number) => number;
    domain?: Span;
    color?: string;
    thickness?: number;
    opacity?: number;
    dashed?: boolean;
}
export interface PlotArea {
    fn: (x: number) => number;
    domain: Span;
    baseline?: (x: number) => number;
    color?: string;
    negativeColor?: string;
    opacity?: number;
}
export interface PlotPoint {
    x: number;
    y: number;
    color?: string;
    radius?: number;
    label?: string;
}
export interface Plot {
    x: Span;
    y: Span;
    curves: readonly Curve[];
    areas?: readonly PlotArea[];
    points?: readonly PlotPoint[];
    axes?: boolean;
    axisLabels?: readonly [string, string];
    grid?: boolean;
    samples?: number;
}
export interface PlotOptions {
    height?: number;
    background?: string;
    gridColor?: string;
    axisColor?: string;
    label?: string;
    formatTick?: (value: number) => string;
}
export interface PlotView {
    readonly element: HTMLElement;
    setPlot(plot: Plot): void;
    destroy(): void;
}
export declare function plot2d(target: Target, plot: Plot, options?: PlotOptions): PlotView;
