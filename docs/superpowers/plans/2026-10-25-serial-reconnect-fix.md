# Serial connection lifecycle fix

Problem: COM18 can connect and report three READY sensors, then return to discovery. The development renderer uses StrictMode, whose setup/cleanup/setup calls connect/disconnect/connect. The old scanner shared one running flag across async loops, so a previous discovery resumed during the next connection. Old close/error events and delayed stop also referenced the current port instead of their original port.

- [x] Reproduce duplicate discovery, stale close/error, and delayed-stop replacement-port races in three failing regression tests.
- [x] Scope discovery to a generation; cancel pending handshake on stop; bound port handshake including unexpected USB close.
- [x] Capture the old port before awaiting STOP; ignore data/close/error from superseded ports; clear superseded status timers.
- [x] Run all 15 serial/channel tests and lint, build production bundle, and test quick reconnect against the user's actual COM18 device.

Evidence before change: standalone serial reader received repeated HX1/HX2/HX3 READY responses on COM18 for 25 seconds. All three lifecycle regression tests failed, including two concurrent discovery attempts. After change, all serial tests passed. Physical test exercised immediate start/stop/start plus stop/start on an already connected COM18. A brief access-denied response while the old handle closed recovered on the next discovery attempt. No firmware, HX data processing, UI layout or licensing changes in this fix.
