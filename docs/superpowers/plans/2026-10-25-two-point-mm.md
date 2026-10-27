# Two-point length calibration

Keep all existing measurement fields, plots and controls. Add one length-mm row to Live Data, and append mm/signal columns to recorded results/CSV. Add a collapsible two-point calibration editor below existing strain controls, independently for HX1/HX2/HX3.

Use absolute ADC raw counts averaged over the latest ten fresh samples. Capture signal S1 with entered length L1 (default 3 mm), then signal S2 with entered length L2 (default 4 mm). Convert using L1 + (S-S1)*(L2-L1)/(S2-S1), supporting positive and negative sensor slopes. Absolute raw counts make this calibration independent from START's relative zero, firmware ZERO's delta offset, strain factor and sign inversion. Hold mm unavailable until ten fresh samples and valid calibration; disabled channels display 0.0000. Four fractional digits describe display resolution, not guaranteed physical accuracy.

Require active recording/enabled channel to capture; show START instructions. Reject non-finite, negative lengths, equal lengths, equal ADC signals and saturated ADC endpoints. Editing a reference length invalidates its previously captured signal. Store complete calibrations locally across app restarts, with validation on read. Do not retroactively rewrite recorded rows after calibration changes. No firmware, license, serial lifecycle or old-field calculation changes.

- [x] Failing tests for linear/inverse conversion, invalid references, per-channel independence, START/sign/zero invariance, history preservation, storage validation and four-decimal render.
- [x] Implement calibration math/storage and session raw averaging/mm snapshots.
- [x] Add collapsed calibration editor and mm row; wire hook persistence; append result/CSV fields.
- [x] Run all serial/lifecycle/calibration tests, prior license/DIC checks, build/lint and focused review.

Verification: 29 serial/channel/lifecycle/calibration tests passed (including six new length tests), all six license tests passed, and the DIC synthetic-image self-test passed. Actual ReactDOMServer rendering verifies mm values 3.0001 / 4.5000 / -- while preserving the old raw cells. Build passed; lint has existing warnings only. Review checked calibration state/persistence/history; regression tests caught overflow and saturated-raw issues during review, both fixed and passing. No physical length standards or desktop interactions were tested; actual measurement accuracy requires user calibration on the mechanism.

Capture uses the current rolling ten-sample absolute raw mean and refuses samples older than 1500ms. Saturation empties that channel's length buffer, requiring ten fresh nonsaturated samples before calibration/measurement resumes. Reference points remain stored across START, clear and channel on/off; only explicit Xóa mốc removes calibration. Recorded old rows retain their original mm/null value.
