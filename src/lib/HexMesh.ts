import { Color, HSL } from "three";
import { Vertex } from "./HexCoordinates";

export class HexMesh {
  vertices: number[] = [];
  indices: number[] = [];
  colors: number[] = [];
  uvs: number[] = [];

  addTriangle(v1: Vertex, v2: Vertex, v3: Vertex, color: Color) {
    const baseVertexIndex = this.vertices.length / 3;
    this.vertices.push(
      v1[0],
      v1[1],
      v1[2],
      v2[0],
      v2[1],
      v2[2],
      v3[0],
      v3[1],
      v3[2]
    );
    this.indices.push(
      baseVertexIndex,
      baseVertexIndex + 1,
      baseVertexIndex + 2
    );
    this.colors.push(
      color.r,
      color.g,
      color.b,
      color.r,
      color.g,
      color.b,
      color.r,
      color.g,
      color.b
    );
  }

  addTriangleWithUVs(
    v1: Vertex,
    v2: Vertex,
    v3: Vertex,
    color: Color,
    uv1: [number, number],
    uv2: [number, number],
    uv3: [number, number]
  ) {
    this.addTriangle(v1, v2, v3, color);
    this.uvs.push(uv1[0], uv1[1], uv2[0], uv2[1], uv3[0], uv3[1]);
  }
}
