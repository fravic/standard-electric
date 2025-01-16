import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3, Camera, Object3D } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface CameraConfigType {
  PAN_SPEED: number;
  MIN_DISTANCE: number;
  MAX_DISTANCE: number;
  MIN_POLAR_ANGLE: number;
  MAX_POLAR_ANGLE: number;
  PAN_BOUNDS: {
    MIN_X: number;
    MAX_X: number;
    MIN_Z: number;
    MAX_Z: number;
  };
}

// Camera configuration
const CAMERA_CONFIG: CameraConfigType = {
  PAN_SPEED: 12, // Units per second (adjusted for delta time)
  MIN_DISTANCE: 2,
  MAX_DISTANCE: 50,
  MIN_POLAR_ANGLE: 0,
  MAX_POLAR_ANGLE: Math.PI / 8,
  PAN_BOUNDS: {
    MIN_X: 0,
    MAX_X: 100,
    MIN_Z: 0,
    MAX_Z: 80,
  },
};

interface KeyMap {
  [key: string]: boolean;
}

export function CameraController(): React.ReactNode {
  const { camera, controls } = useThree();
  const keys = useRef<KeyMap>({});
  const lastTime = useRef<number>(performance.now());

  // Helper function to clamp a value between min and max
  const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

  // Helper function to check if a position is within bounds
  const isWithinBounds = (position: number, axis: "X" | "Z"): boolean => {
    const min = CAMERA_CONFIG.PAN_BOUNDS[`MIN_${axis}`];
    const max = CAMERA_CONFIG.PAN_BOUNDS[`MAX_${axis}`];
    return position >= min && position <= max;
  };

  useEffect(() => {
    if (controls) {
      const orbitControls = controls as OrbitControls;
      orbitControls.enablePan = false;
      orbitControls.enableDamping = true;
      orbitControls.dampingFactor = 0.05;
      orbitControls.minDistance = CAMERA_CONFIG.MIN_DISTANCE;
      orbitControls.maxDistance = CAMERA_CONFIG.MAX_DISTANCE;
      orbitControls.minPolarAngle = CAMERA_CONFIG.MIN_POLAR_ANGLE;
      orbitControls.maxPolarAngle = CAMERA_CONFIG.MAX_POLAR_ANGLE;
    }
  }, [controls, camera]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      keys.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent): void => {
      keys.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const panCamera = (): void => {
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
        const newTargetPos = (controls as OrbitControls).target
          .clone()
          .add(movement);

        // Check and apply movement for each axis independently
        const canMoveX =
          isWithinBounds(newCameraPos.x, "X") &&
          isWithinBounds(newTargetPos.x, "X");
        const canMoveZ =
          isWithinBounds(newCameraPos.z, "Z") &&
          isWithinBounds(newTargetPos.z, "Z");

        if (canMoveX) {
          camera.position.x = newCameraPos.x;
          (controls as OrbitControls).target.x = newTargetPos.x;
        }
        if (canMoveZ) {
          camera.position.z = newCameraPos.z;
          (controls as OrbitControls).target.z = newTargetPos.z;
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
