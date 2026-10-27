# Independent three-channel display

User requirement: HX1/HX2/HX3 are three entirely separate data streams, colored red/blue/black, with each channel's numbers visible separately at the same time.

Keep existing per-channel decoding, EMA, baselines, on/off handling and CSV channel IDs. Change the three trace colors. Expose all three channel snapshots to the view instead of selecting a single snapshot. Show Live Data in three labeled columns (raw, delta, filtered, min/max, count, time) and strain/calibration/sign in corresponding independent columns. Keep START/STOP/ZERO/CSV/clear and raw/Y-axis display options. Each sign/calibration input changes only its own channel. Disabled channels remain zero. No firmware or COM lifecycle changes.

- [x] Assert exact trace colors and isolated per-channel values; independent sign/calibration.
- [x] Assert actual rendered live/strain tables show all channels' own readings simultaneously.
- [x] Implement parallel readings, per-channel controls and colors without removing existing measurement fields.
- [x] Run serial/lifecycle tests, build/lint and focused review.

Verification: all 23 serial/channel/lifecycle tests passed. The two new tests failed before implementation and passed afterward, including actual ReactDOMServer rendering of both live and strain tables with different per-channel input values. Production build passed. Lint passed with existing warnings only. Physical hardware/UI interactions were not exercised for this presentation change.
