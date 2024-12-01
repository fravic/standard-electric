import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";

// Camera configuration
const CAMERA_CONFIG = {
  PAN_SPEED: 15, // Units per second (adjusted for delta time)
  MIN_DISTANCE: 5,
  MAX_DISTANCE: 12,
  MIN_POLAR_ANGLE: 0,
  MAX_POLAR_ANGLE: Math.PI / 8,
  PAN_BOUNDS: {
    MIN_X: -35,
    MAX_X: 35,
    MIN_Z: -25,
    MAX_Z: 25,
  },
};

export function CameraController() {
  const { camera, controls } = useThree();
  const keys = useRef({});
  const lastTime = useRef(performance.now());

  // Helper function to clamp a value between min and max
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  // Helper function to check if a position is within bounds
  const isWithinBounds = (position, axis) => {
    const min = CAMERA_CONFIG.PAN_BOUNDS[`MIN_${axis}`];
    const max = CAMERA_CONFIG.PAN_BOUNDS[`MAX_${axis}`];
    return position >= min && position <= max;
  };

  useEffect(() => {
    if (controls) {
      controls.enableKeys = false;
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = CAMERA_CONFIG.MIN_DISTANCE;
      controls.maxDistance = CAMERA_CONFIG.MAX_DISTANCE;
      controls.minPolarAngle = CAMERA_CONFIG.MIN_POLAR_ANGLE;
      controls.maxPolarAngle = CAMERA_CONFIG.MAX_POLAR_ANGLE;

      const originalUpdate = controls.update;
      controls.update = function () {
        originalUpdate.call(this);

        // Clamp target position
        controls.target.x = clamp(
          controls.target.x,
          CAMERA_CONFIG.PAN_BOUNDS.MIN_X,
          CAMERA_CONFIG.PAN_BOUNDS.MAX_X
        );
        controls.target.z = clamp(
          controls.target.z,
          CAMERA_CONFIG.PAN_BOUNDS.MIN_Z,
          CAMERA_CONFIG.PAN_BOUNDS.MAX_Z
        );
        controls.target.y = 0;

        // Clamp camera position
        camera.position.x = clamp(
          camera.position.x,
          CAMERA_CONFIG.PAN_BOUNDS.MIN_X,
          CAMERA_CONFIG.PAN_BOUNDS.MAX_X
        );
        camera.position.z = clamp(
          camera.position.z,
          CAMERA_CONFIG.PAN_BOUNDS.MIN_Z,
          CAMERA_CONFIG.PAN_BOUNDS.MAX_Z
        );
      };
    }
  }, [controls, camera]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      keys.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const panCamera = () => {
      if (!controls) return;

      // Calculate delta time in seconds
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime.current) / 1000; // Convert to seconds
      lastTime.current = currentTime;

      const lookDir = new Vector3();
      camera.getWorldDirection(lookDir);
      lookDir.y = 0;
      lookDir.normalize();

      const right = new Vector3(-lookDir.z, 0, lookDir.x);
      const movement = new Vector3(0, 0, 0);

      // Calculate movement vector
      if (keys.current["w"]) movement.add(lookDir);
      if (keys.current["s"]) movement.sub(lookDir);
      if (keys.current["a"]) movement.sub(right);
      if (keys.current["d"]) movement.add(right);

      if (movement.length() > 0) {
        // Normalize and apply speed with delta time
        movement.normalize();
        const zoomFactor = camera.position.y / 10;
        const currentSpeed =
          CAMERA_CONFIG.PAN_SPEED * Math.max(1, zoomFactor) * deltaTime;
        movement.multiplyScalar(currentSpeed);

        // Calculate new positions
        const newCameraPos = camera.position.clone().add(movement);
        const newTargetPos = controls.target.clone().add(movement);

        // Check and apply movement for each axis independently
        const canMoveX =
          isWithinBounds(newCameraPos.x, "X") &&
          isWithinBounds(newTargetPos.x, "X");
        const canMoveZ =
          isWithinBounds(newCameraPos.z, "Z") &&
          isWithinBounds(newTargetPos.z, "Z");

        if (canMoveX) {
          camera.position.x = newCameraPos.x;
          controls.target.x = newTargetPos.x;
        }
        if (canMoveZ) {
          camera.position.z = newCameraPos.z;
          controls.target.z = newTargetPos.z;
        }
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
