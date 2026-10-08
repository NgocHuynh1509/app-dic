import Panel from "./Panel.jsx";

export default function CameraView({ canvasRef, live, cameraStatus }) {
  return (
    <Panel title="Video từ camera" className="cam-panel">
      <div className="cam-wrap">
        <canvas ref={canvasRef} className="feed cam" width={1280} height={720} style={{ opacity: live ? 1 : 0 }} />
        {!live && <div className="cam-empty">No Feed</div>}
      </div>
      {cameraStatus?.connected && (
        <p className="cam-info">
          {cameraStatus.source} · {cameraStatus.width}×{cameraStatus.height} · {cameraStatus.measuredFps} FPS (
          {cameraStatus.requestedMode})
        </p>
      )}
    </Panel>
  );
}
