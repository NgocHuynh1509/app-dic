// Bọc import tĩnh opencv-js trong module riêng.
// Lý do: export của opencv-js là một "thenable". Nếu import() động trả thẳng namespace của nó,
// bản build của Vite 8 (rolldown) sẽ gọi .then() sai receiver -> "incompatible receiver".
// Module bọc này không có `then`, nên import("./opencvModule.js") an toàn và vẫn nạp lười (lazy chunk).
import cvReady from "@techstark/opencv-js";

export const getCvReady = () => cvReady;