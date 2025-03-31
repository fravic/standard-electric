import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3, Camera, Object3D } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useSelector } from "@xstate/store/react";
import { clientStore } from "@/lib/clientState";
import { useSpring } from "@react-spring/three";

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
  START_POSITION: Vector3;
}

// Camera configuration
const CAMERA_CONFIG: CameraConfigType = {
  PAN_SPEED: 15,
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
  START_POSITION: new Vector3(15, 0, 15),
};

interface KeyMap {
  [key: string]: boolean;
}

export function CameraController(): React.ReactNode {
  const { camera, controls } = useThree();
  const keys = useRef<KeyMap>({});
  const lastTime = useRef<number>(performance.now());
  const animationFrameRef = useRef<number>();
  const areKeyboardControlsActive = useSelector(
    clientStore,
    (state) => state.context.areKeyboardControlsActive
  );

  // Spring for movement velocity only
  const [springs, springApi] = useSpring(() => ({
    vx: 0,
    vz: 0,
    config: {
      tension: 50,
      friction: 15,
      clamp: true, // Prevents spring bounce-back
      precision: 0.0001,
    },
  }));

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

      // Set initial camera position
      camera.position.set(
        CAMERA_CONFIG.START_POSITION.x,
        camera.position.y,
        CAMERA_CONFIG.START_POSITION.z
      );
      orbitControls.target.set(CAMERA_CONFIG.START_POSITION.x, 0, CAMERA_CONFIG.START_POSITION.z);
      orbitControls.update();
    }
  }, [controls, camera]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (!areKeyboardControlsActive) return;
      keys.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent): void => {
      if (!areKeyboardControlsActive) return;
      keys.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [areKeyboardControlsActive]);

  useEffect(() => {
    const panCamera = (): void => {
      if (!areKeyboardControlsActive || !controls) {
        // When inactive, smoothly bring velocity to zero
        springApi.start({ vx: 0, vz: 0 });
        animationFrameRef.current = requestAnimationFrame(panCamera);
        return;
      }

      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime.current) / 1000;
      lastTime.current = currentTime;

      const lookDir = new Vector3();
      camera.getWorldDirection(lookDir);
      lookDir.y = 0;
      lookDir.normalize();

      const right = new Vector3(-lookDir.z, 0, lookDir.x);
      const targetVelocity = { x: 0, z: 0 };

      // Calculate target velocity based on input
      if (keys.current["w"]) {
        targetVelocity.x += lookDir.x;
        targetVelocity.z += lookDir.z;
      }
      if (keys.current["s"]) {
        targetVelocity.x -= lookDir.x;
        targetVelocity.z -= lookDir.z;
      }
      if (keys.current["a"]) {
        targetVelocity.x -= right.x;
        targetVelocity.z -= right.z;
      }
      if (keys.current["d"]) {
        targetVelocity.x += right.x;
        targetVelocity.z += right.z;
      }

      // Normalize target velocity if it exists
      const length = Math.sqrt(
        targetVelocity.x * targetVelocity.x + targetVelocity.z * targetVelocity.z
      );
      if (length > 0) {
        targetVelocity.x /= length;
        targetVelocity.z /= length;
      }

      // Apply speed scaling
      const zoomFactor = camera.position.y / 10;
      const speed = CAMERA_CONFIG.PAN_SPEED * Math.max(1, zoomFactor);
      targetVelocity.x *= speed;
      targetVelocity.z *= speed;

      // Update spring velocity
      springApi.start({
        vx: targetVelocity.x,
        vz: targetVelocity.z,
      });

      // Apply movement using current velocity
      const movement = new Vector3(springs.vx.get() * deltaTime, 0, springs.vz.get() * deltaTime);

      // Calculate new positions
      const newCameraPos = camera.position.clone().add(movement);
      const newTargetPos = (controls as OrbitControls).target.clone().add(movement);

      // Check and apply movement for each axis independently
      const canMoveX = isWithinBounds(newCameraPos.x, "X") && isWithinBounds(newTargetPos.x, "X");
      const canMoveZ = isWithinBounds(newCameraPos.z, "Z") && isWithinBounds(newTargetPos.z, "Z");

      if (canMoveX) {
        camera.position.x = newCameraPos.x;
        (controls as OrbitControls).target.x = newTargetPos.x;
      }
      if (canMoveZ) {
        camera.position.z = newCameraPos.z;
        (controls as OrbitControls).target.z = newTargetPos.z;
      }

      animationFrameRef.current = requestAnimationFrame(panCamera);
    };

    panCamera();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [camera, controls, areKeyboardControlsActive, springs, springApi]);

  return null;
}
