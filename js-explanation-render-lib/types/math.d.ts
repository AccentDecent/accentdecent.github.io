import type { Target } from './dom';
export interface MathOptions {
    display?: boolean;
    color?: string;
    fontSize?: number;
    macros?: Readonly<Record<string, string>>;
    throwOnError?: boolean;
}
export interface MathView {
    readonly element: HTMLElement;
    setLatex(latex: string): void;
    destroy(): void;
}
export declare function math(target: Target, latex: string, options?: MathOptions): MathView;
