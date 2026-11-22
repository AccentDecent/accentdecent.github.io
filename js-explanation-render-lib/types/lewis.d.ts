import type { Target } from './dom';
export interface LewisAtom {
    id: string;
    symbol: string;
    x: number;
    y: number;
    /** Angle in degrees clockwise from the right, with zero at the right. */
    electrons?: readonly (number | {
        angle: number;
        count?: 1 | 2;
        distance?: number;
        color?: string;
    })[];
    charge?: number;
    chargeAngle?: number;
    color?: string;
    fontSize?: number;
}
export interface LewisBond {
    from: string;
    to: string;
    order?: 1 | 2 | 3;
    color?: string;
    thickness?: number;
    dashed?: boolean;
}
export interface LewisDiagram {
    atoms: readonly LewisAtom[];
    bonds?: readonly LewisBond[];
    /** Net charge of the complete structure. Displayed beside the brackets. */
    charge?: number;
    brackets?: boolean;
    label?: string;
}
export interface LewisOptions {
    height?: number;
    background?: string;
    color?: string;
    bondColor?: string;
    electronColor?: string;
    chargeColor?: string;
    bracketColor?: string;
    fontSize?: number;
    bondThickness?: number;
    bondSpacing?: number;
    electronRadius?: number;
    padding?: number;
    scale?: number;
    showCharges?: boolean;
}
export type Molecule = 'water' | 'ammonia' | 'methane' | 'carbonDioxide' | 'ammonium' | 'carbonate';
export declare function molecule(name: Molecule): LewisDiagram;
export interface LewisView {
    readonly element: HTMLElement;
    setDiagram(diagram: LewisDiagram | Molecule): void;
    destroy(): void;
}
export declare function lewis(target: Target, diagram: LewisDiagram | Molecule, options?: LewisOptions): LewisView;
