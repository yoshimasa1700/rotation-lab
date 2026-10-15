import { multiply, normalize, rotate, toMatrix } from "./rotation";
import type { Quat, Vec3 } from "./rotation";
/** T_A_from_B maps B coordinates to A coordinates. */
export interface Pose {
  q: Quat;
  t: Vec3;
}
export function transformPoint(pose: Pose, p: Vec3): Vec3 {
  return rotate(pose.q, p).map((v, i) => v + pose.t[i]) as Vec3;
}
/** T_A_from_C = T_A_from_B T_B_from_C; right operand acts first. */
export function compose(a: Pose, b: Pose): Pose {
  return { q: normalize(multiply(a.q, b.q)), t: transformPoint(a, b.t) };
}
export function inverse(pose: Pose): Pose {
  const [w, x, y, z] = normalize(pose.q);
  const q: Quat = [w, -x, -y, -z];
  return { q, t: rotate(q, pose.t).map((v) => -v) as Vec3 };
}
export function toHomogeneous(pose: Pose): number[] {
  const r = toMatrix(pose.q),
    t = pose.t;
  return [
    r[0],
    r[1],
    r[2],
    t[0],
    r[3],
    r[4],
    r[5],
    t[1],
    r[6],
    r[7],
    r[8],
    t[2],
    0,
    0,
    0,
    1,
  ];
}
