import * as THREE from "three";

export function cloneAndPrepareMesh(
  mesh: THREE.Group,
  options: {
    scale?: [number, number, number];
    isGhost?: boolean;
    position?: [number, number, number];
  } = {}
): THREE.Group {
  const { scale = [1, 1, 1], isGhost = false, position = [0, 0, 0] } = options;

  const clonedMesh = mesh.clone();

  clonedMesh.position.set(...position);
  clonedMesh.scale.set(...scale);

  clonedMesh.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const meshChild = child as THREE.Mesh;
      const processMaterial = (material: THREE.Material) => {
        // Let's use THREE materials for consistency, rather than the model materials
        const newMaterial = new THREE.MeshStandardMaterial({
          color: (material as any).color,
          transparent: isGhost,
          opacity: isGhost ? 0.2 : 1,
        });
        return newMaterial;
      };

      if (Array.isArray(meshChild.material)) {
        meshChild.material = meshChild.material.map(processMaterial);
      } else if (meshChild.material) {
        meshChild.material = processMaterial(meshChild.material);
      }
    }
  });

  return clonedMesh;
}
