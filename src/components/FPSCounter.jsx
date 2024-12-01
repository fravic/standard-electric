import { useEffect, useState } from "react";

export function FPSCounter() {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId;

    const countFrames = () => {
      frameCount++;
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / deltaTime));
        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(countFrames);
    };

    animationFrameId = requestAnimationFrame(countFrames);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "10px",
        left: "10px",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        color: "white",
        padding: "5px 10px",
        borderRadius: "5px",
        fontFamily: "monospace",
        fontSize: "14px",
        zIndex: 1000,
      }}
    >
      FPS: {fps}
    </div>
  );
}
