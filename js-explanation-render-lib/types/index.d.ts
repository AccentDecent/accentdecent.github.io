export { lesson } from './lesson';
export { view3d, surface, parametric, line, vector, point } from './scene3d';
export { lewis, molecule } from './lewis';
export { plot2d } from './plot';
export { math } from './math';
export type { Target } from './dom';
export type { Values, Slider, LessonStep, LessonState, LessonOptions, Lesson } from './lesson';
export type { Vec3, Span, Shape3D, Scene3D, Camera3D, View3D, View3DOptions, LineStyle, PointStyle, SurfaceStyle, SurfaceOptions, ParametricOptions } from './scene3d';
export type { LewisAtom, LewisBond, LewisDiagram, LewisOptions, LewisView, Molecule } from './lewis';
export type { Curve, Plot, PlotArea, PlotPoint, PlotView, PlotOptions } from './plot';
export type { MathOptions, MathView } from './math';
declare global {
    const JsRenderLib: typeof import('./index');
}
