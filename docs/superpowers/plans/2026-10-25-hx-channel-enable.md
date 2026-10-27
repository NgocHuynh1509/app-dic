# Independent HX711 sensor selection

The user clarified that all HX711 modules remain attached, but some have no strain gauge/load cell. READY describes ADC conversion readiness and cannot establish analog sensor presence. Do not infer sensor presence from ADC magnitude or force legitimate values into zero.

Add explicit HX1/HX2/HX3 enable switches, initially off so unattached inputs cannot pollute the initial chart. Only user-enabled channels process readings; disabled channels always produce zero raw/delta/filtered/strain values on screen and in subsequent CSV rows. Preserve three independent chart traces, existing controls, old protocol, COM fixes and firmware. Do not alter the sketch: all modules remain mounted, so this request does not require removing its three-ADC frame barrier.

Reset only the changed channel's EMA, baseline and statistics when its switch changes. Retain recorded history and label whether each row was enabled. On enable, collect ten fresh baseline samples while holding delta/filtered at zero; then freeze that baseline. This avoids showing the moving baseline as an apparent measurement. Display READY separately from the user's enabled state.

- [x] Regression tests: disabled/noisy channels are exactly zero, active channels unaffected, toggling resets only that channel, protocol filter doesn't retain disabled noise, baseline warm-up stable, CSV enabled state.
- [x] Protocol/filter selection via restricted Electron IPC; independent session selection; UI switches.
- [x] Run serial/channel and license/DIC tests, build/lint, review. No automatic device upload or physical presence detection.

Verification: 21 serial/channel/lifecycle tests passed, plus all six license tests and the DIC synthetic-image self-test. Production build passed; lint passed with existing warnings only. Independent review identified a queued disabled-frame baseline race; regression reproduced it, then the protocol added per-sample enabled metadata and the session excluded stale disabled frames after enabling. No firmware changes or physical device probing in this task; analog noise on a connected sensor still depends on wiring and the measurement setup. This feature explicitly zeros channels selected as unused.
