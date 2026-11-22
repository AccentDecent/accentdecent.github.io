export type Target = string | HTMLElement;
export declare function resolveTarget(target: Target): HTMLElement;
export declare function installStyles(doc: Document): void;
export declare function element<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, className?: string, text?: string): HTMLElementTagNameMap[K];
export declare function svg<K extends keyof SVGElementTagNameMap>(doc: Document, tag: K, attrs?: Record<string, number | string>): SVGElementTagNameMap[K];
export declare function finite(value: number, name: string): number;
export declare function positive(value: number, name: string): number;
export declare function range(bounds: readonly [number, number], name: string): readonly [number, number];
export declare function clamp(value: number, min: number, max: number): number;
