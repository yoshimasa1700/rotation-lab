/** Right-handed, active rotations, column vectors. Matrices are row-major here. */
export type Vec3 = [number, number, number];
/** Hamilton quaternion in mathematical (w, x, y, z) order. */
export type Quat = [number, number, number, number];
export type Mat3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
export const DEG = Math.PI / 180;
const clamp = (x: number) => Math.min(1, Math.max(-1, x));
export function normalize(q: Quat): Quat {
  const n = Math.hypot(...q);
  if (!Number.isFinite(n) || n === 0)
    throw new RangeError("Quaternion must be finite and nonzero");
  return q.map((v) => v / n) as Quat;
}
export function multiply([a, b, c, d]: Quat, [w, x, y, z]: Quat): Quat {
  return [
    a * w - b * x - c * y - d * z,
    a * x + b * w + c * z - d * y,
    a * y - b * z + c * w + d * x,
    a * z + b * y - c * x + d * w,
  ];
}
export function axisAngle(axis: Vec3, angle: number): Quat {
  const n = Math.hypot(...axis);
  if (!Number.isFinite(n) || n === 0 || !Number.isFinite(angle))
    throw new RangeError("Invalid axis-angle");
  const s = Math.sin(angle / 2) / n;
  return normalize([
    Math.cos(angle / 2),
    axis[0] * s,
    axis[1] * s,
    axis[2] * s,
  ]);
}
/** R = Rz(yaw) Ry(pitch) Rx(roll), radians. */
export function fromEuler([roll, pitch, yaw]: Vec3): Quat {
  return normalize(
    multiply(
      multiply(axisAngle([0, 0, 1], yaw), axisAngle([0, 1, 0], pitch)),
      axisAngle([1, 0, 0], roll),
    ),
  );
}
export function toMatrix(q: Quat): Mat3 {
  const [w, x, y, z] = normalize(q);
  return [
    1 - 2 * (y * y + z * z),
    2 * (x * y - z * w),
    2 * (x * z + y * w),
    2 * (x * y + z * w),
    1 - 2 * (x * x + z * z),
    2 * (y * z - x * w),
    2 * (x * z - y * w),
    2 * (y * z + x * w),
    1 - 2 * (x * x + y * y),
  ];
}
export function rotate(q: Quat, p: Vec3): Vec3 {
  const r = toMatrix(q);
  return [0, 1, 2].map(
    (i) => r[i * 3] * p[0] + r[i * 3 + 1] * p[1] + r[i * 3 + 2] * p[2],
  ) as Vec3;
}
export function transpose(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}
export function matMultiply(a: Mat3, b: Mat3): Mat3 {
  return Array.from({ length: 9 }, (_, k) => {
    const i = Math.floor(k / 3),
      j = k % 3;
    return a[i * 3] * b[j] + a[i * 3 + 1] * b[j + 3] + a[i * 3 + 2] * b[j + 6];
  }) as Mat3;
}
export function determinant(m: Mat3): number {
  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  );
}
export function angularDistance(a: Quat, b: Quat): number {
  const qa = normalize(a),
    qb = normalize(b);
  return (
    2 * Math.acos(clamp(Math.abs(qa.reduce((sum, v, i) => sum + v * qb[i], 0))))
  );
}
/** Shortest-arc SLERP; the two shortest arcs at exactly 180° are equally valid. */
export function slerp(a: Quat, b: Quat, u: number): Quat {
  const qa = normalize(a);
  let qb = normalize(b);
  let dot = qa.reduce((sum, v, i) => sum + v * qb[i], 0);
  if (dot < 0) {
    qb = qb.map((v) => -v) as Quat;
    dot = -dot;
  }
  dot = clamp(dot);
  if (dot > 0.9995)
    return normalize(qa.map((v, i) => v + u * (qb[i] - v)) as Quat);
  const theta = Math.acos(dot),
    sin = Math.sin(theta);
  return normalize(
    qa.map(
      (v, i) =>
        (Math.sin((1 - u) * theta) * v + Math.sin(u * theta) * qb[i]) / sin,
    ) as Quat,
  );
}
export function lerpEuler(a: Vec3, b: Vec3, u: number, unwrap = false): Vec3 {
  return a.map((v, i) => {
    let delta = b[i] - v;
    if (unwrap)
      delta =
        ((((delta + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) -
        Math.PI;
    return v + u * delta;
  }) as Vec3;
}
