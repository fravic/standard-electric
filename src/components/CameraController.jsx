import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";

// Camera configuration
const CAMERA_CONFIG = {
  PAN_SPEED: 0.2,
  MIN_DISTANCE: 5,
  MAX_DISTANCE: 10,
  MIN_POLAR_ANGLE: 0,
  MAX_POLAR_ANGLE: Math.PI / 8,
  PAN_BOUNDS: {
    MIN_X: -35,
    MAX_X: 35,
    MIN_Z: -20,
    MAX_Z: 20,
  },
};

export function CameraController() {
  const { camera, controls } = useThree();
  const panSpeed = CAMERA_CONFIG.PAN_SPEED;
  const keys = useRef({});

  useEffect(() => {
    if (controls) {
      // Disable automatic orbit controls during WASD movement
      controls.enableKeys = false;
      controls.enablePan = false;

      // Set camera limits
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      // Set zoom limits
      controls.minDistance = CAMERA_CONFIG.MIN_DISTANCE;
      controls.maxDistance = CAMERA_CONFIG.MAX_DISTANCE;

      // Restrict rotation
      controls.minPolarAngle = CAMERA_CONFIG.MIN_POLAR_ANGLE;
      controls.maxPolarAngle = CAMERA_CONFIG.MAX_POLAR_ANGLE;

      // Add bounds to the existing update
      const originalUpdate = controls.update;
      controls.update = function () {
        originalUpdate.call(this);

        // Enforce pan limits
        controls.target.x = Math.max(
          CAMERA_CONFIG.PAN_BOUNDS.MIN_X,
          Math.min(CAMERA_CONFIG.PAN_BOUNDS.MAX_X, controls.target.x)
        );
        controls.target.z = Math.max(
          CAMERA_CONFIG.PAN_BOUNDS.MIN_Z,
          Math.min(CAMERA_CONFIG.PAN_BOUNDS.MAX_Z, controls.target.z)
        );
        controls.target.y = 0;

        // Ensure camera position stays within bounds
        camera.position.x = Math.max(
          CAMERA_CONFIG.PAN_BOUNDS.MIN_X,
          Math.min(CAMERA_CONFIG.PAN_BOUNDS.MAX_X, camera.position.x)
        );
        camera.position.z = Math.max(
          CAMERA_CONFIG.PAN_BOUNDS.MIN_Z,
          Math.min(CAMERA_CONFIG.PAN_BOUNDS.MAX_Z, camera.position.z)
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
      const zoomFactor = camera.position.y / 10;
      const currentSpeed = panSpeed * Math.max(1, zoomFactor);

      if (keys.current["w"]) movement.add(lookDir);
      if (keys.current["s"]) movement.sub(lookDir);
      if (keys.current["a"]) movement.sub(right);
      if (keys.current["d"]) movement.add(right);

      if (movement.length() > 0) {
        movement.normalize().multiplyScalar(currentSpeed);

        // Calculate new positions
        const newCameraPos = camera.position.clone().add(movement);
        const newTargetPos = controls.target.clone().add(movement);

        // Check if new positions are within bounds
        if (
          newCameraPos.x >= CAMERA_CONFIG.PAN_BOUNDS.MIN_X &&
          newCameraPos.x <= CAMERA_CONFIG.PAN_BOUNDS.MAX_X &&
          newCameraPos.z >= CAMERA_CONFIG.PAN_BOUNDS.MIN_Z &&
          newCameraPos.z <= CAMERA_CONFIG.PAN_BOUNDS.MAX_Z &&
          newTargetPos.x >= CAMERA_CONFIG.PAN_BOUNDS.MIN_X &&
          newTargetPos.x <= CAMERA_CONFIG.PAN_BOUNDS.MAX_X &&
          newTargetPos.z >= CAMERA_CONFIG.PAN_BOUNDS.MIN_Z &&
          newTargetPos.z <= CAMERA_CONFIG.PAN_BOUNDS.MAX_Z
        ) {
          camera.position.copy(newCameraPos);
          controls.target.copy(newTargetPos);
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
