// controls.js — the touch/mouse control layer of the game.
// The pointer/tap/drag/pinch implementation lives in interactionManager.js
// and the orbit/zoom camera handling in camera.js; this module re-exports
// both under the game's public control API.
export { InteractionManager } from './interactionManager.js';
export { InteractionManager as Controls } from './interactionManager.js';
export { CameraRig } from './camera.js';
