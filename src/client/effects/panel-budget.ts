/** Share a short render budget window without reading DOM every frame. */
let until = 0
export function reservePanelMotion(milliseconds: number) { until = performance.now() + milliseconds }
export function panelMotionBusy(now: number) { return now < until }
