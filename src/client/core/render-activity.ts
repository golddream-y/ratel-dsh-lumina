/** A bounded hint that lets persistent decoration yield to panel interaction. */
let until = 0
export function reservePanelMotion(milliseconds: number) { until = performance.now() + milliseconds }
export function panelMotionBusy(now: number) { return now < until }
