import type { Vec3 } from "./rotation";

export interface CameraIntrinsics {
  fx: number;
  fy: number;
  cx: number;
  cy: number;
}

/** Ideal pinhole camera: x right, y down, z forward; no lens distortion. */
export function projectCameraPoint(
  point: Vec3,
  intrinsics: CameraIntrinsics,
): [number, number] | null {
  const [x, y, z] = point;
  if (!point.every(Number.isFinite) || z <= 0) return null;
  const { fx, fy, cx, cy } = intrinsics;
  return [fx * (x / z) + cx, fy * (y / z) + cy];
}
