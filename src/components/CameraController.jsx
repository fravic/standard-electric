import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";

export function CameraController() {
  const { camera, controls } = useThree();
  const panSpeed = 0.4;
  const keys = useRef({});

  useEffect(() => {
    if (controls) {
      // Disable automatic orbit controls during WASD movement
      controls.enableKeys = false;
      controls.enablePan = false;

      // Set camera limits
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      // Adjust zoom limits for larger map
      controls.minDistance = 2;
      controls.maxDistance = 50;

      // Restrict rotation
      controls.maxPolarAngle = Math.PI / 2.5; // ~72 degrees
    }
  }, [controls]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      keys.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Animation loop for smooth panning
    const panCamera = () => {
      if (!controls) return;

      // Get the current look direction
      const lookDir = new Vector3();
      camera.getWorldDirection(lookDir);
      lookDir.y = 0;
      lookDir.normalize();

      // Calculate right vector from look direction
      const right = new Vector3(-lookDir.z, 0, lookDir.x);

      // Create movement vectors
      const movement = new Vector3(0, 0, 0);

      // Adjust movement speed based on zoom level
      const zoomFactor = camera.position.y / 10; // Faster movement when zoomed out
      const currentSpeed = panSpeed * Math.max(1, zoomFactor);

      if (keys.current["w"]) movement.add(lookDir);
      if (keys.current["s"]) movement.sub(lookDir);
      if (keys.current["a"]) movement.sub(right);
      if (keys.current["d"]) movement.add(right);

      if (movement.length() > 0) {
        movement.normalize().multiplyScalar(currentSpeed);
        camera.position.add(movement);
        controls.target.add(movement);
      }

      requestAnimationFrame(panCamera);
    };

    const animationFrame = requestAnimationFrame(panCamera);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cancelAnimationFrame(animationFrame);
    };
  }, [camera, controls]);

  return null;
}
