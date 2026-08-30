// Tuning constants for the hero / feature R3F scenes.
// Keep all motion slow and sine-based — no linear snapping, no easing overshoot.

export const CORE_ROTATION_SPEED = 0.04;       // rad/sec, central core
export const RING_ROTATION_SPEEDS = [0.02, -0.015, 0.028]; // per ring, alternating direction
export const NODE_DRIFT_AMPLITUDE = 0.35;      // world units
export const NODE_DRIFT_FREQUENCY = 0.15;      // Hz, use per-node phase offset via node index
export const NODE_DEPTH_OSCILLATION = 0.6;     // z-axis push/pull range
export const CAMERA_PUSH_IN_DISTANCE = 1.2;    // total dolly distance over full loop
export const CAMERA_LOOP_DURATION = 48;        // seconds for one full push-in/out + lateral cycle
export const CONNECTION_PULSE_SPEED = 0.6;     // dash-offset animation rate
export const PARTICLE_COUNT_DESKTOP = 400;
export const PARTICLE_COUNT_MOBILE = 120;      // reduce density, never remove entirely
