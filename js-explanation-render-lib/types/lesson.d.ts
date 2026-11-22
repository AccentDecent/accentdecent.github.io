import type { Target } from './dom';
export type Values = Readonly<Record<string, number>>;
export interface Slider {
    id: string;
    label: string;
    min: number;
    max: number;
    step?: number;
    value?: number;
    unit?: string;
    format?: (value: number) => string;
}
export interface LessonStep {
    title: string;
    text?: string;
    equation?: string;
    /** Values to apply each time the step is entered. Other values are retained. */
    values?: Record<string, number>;
}
export interface LessonState {
    readonly step: number;
    readonly current: Readonly<LessonStep>;
    readonly values: Values;
}
export interface LessonOptions {
    steps: readonly LessonStep[];
    sliders?: readonly Slider[];
    startStep?: number;
    labels?: {
        previous?: string;
        next?: string;
        progress?: (current: number, total: number) => string;
    };
    render: (stage: HTMLDivElement, state: LessonState) => void | (() => void);
}
export interface Lesson {
    readonly element: HTMLElement;
    readonly stage: HTMLDivElement;
    readonly state: LessonState;
    setStep(index: number): void;
    setValue(id: string, value: number): void;
    destroy(): void;
}
export declare function lesson(target: Target, options: LessonOptions): Lesson;
