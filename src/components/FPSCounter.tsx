import React, { useEffect, useState } from "react";

interface FPSCounterStyles {
  position: "fixed";
  bottom: string;
  left: string;
  backgroundColor: string;
  color: string;
  padding: string;
  borderRadius: string;
  fontFamily: string;
  fontSize: string;
  zIndex: number;
}

export function FPSCounter(): JSX.Element {
  const [fps, setFps] = useState<number>(0);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const countFrames = (): void => {
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

  const styles: FPSCounterStyles = {
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
  };

  return <div style={styles}>FPS: {fps}</div>;
}
