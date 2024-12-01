import { CameraController } from "./CameraController";
import HexGrid from "./HexGrid";

export default function Experience() {
  return (
    <>
      <CameraController />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <HexGrid />
    </>
  );
}
