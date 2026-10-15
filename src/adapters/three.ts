import { Matrix4, Quaternion } from "three";
import type { Quat } from "../math/rotation";
import { toHomogeneous } from "../math/rigid-transform";
import type { Pose } from "../math/rigid-transform";
/** Explicit boundary: mathematical wxyz → Three xyzw. */
export function toThreeQuaternion([w, x, y, z]: Quat): Quaternion {
  return new Quaternion(x, y, z, w);
}
/** Matrix4.set takes rows; Matrix4.elements stores columns. */
export function toThreeMatrix(pose: Pose): Matrix4 {
  const m = toHomogeneous(pose);
  return new Matrix4().set(
    m[0],
    m[1],
    m[2],
    m[3],
    m[4],
    m[5],
    m[6],
    m[7],
    m[8],
    m[9],
    m[10],
    m[11],
    m[12],
    m[13],
    m[14],
    m[15],
  );
}
