import { describe, it, expect } from "vitest";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import {
  axisAngle,
  fromEuler,
  toMatrix,
  multiply,
  rotate,
  slerp,
  normalize,
  transpose,
  matMultiply,
  determinant,
  lerpEuler,
  angularDistance,
} from "../src/math/rotation";
import type { Quat, Vec3 } from "../src/math/rotation";
import {
  compose,
  inverse,
  transformPoint,
  toHomogeneous,
} from "../src/math/rigid-transform";
import { toThreeQuaternion, toThreeMatrix } from "../src/adapters/three";
const pi = Math.PI;
const near = (
  actual: readonly number[],
  expected: readonly number[],
  tolerance = 1e-9,
) => {
  expect(actual.length).toBe(expected.length);
  actual.forEach((n, i) =>
    expect(Math.abs(n - expected[i])).toBeLessThan(tolerance),
  );
};
const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const q = (r: number, p: number, y: number) =>
  fromEuler([r, p, y].map((v) => (v * pi) / 180) as Vec3);
describe("SO(3) conventions and known answers", () => {
  it("identity", () => {
    near(toMatrix(q(0, 0, 0)), identity);
    near(q(0, 0, 0), [1, 0, 0, 0]);
  });
  it.each([
    [
      [90, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    [
      [-90, 0, 0],
      [0, 1, 0],
      [0, 0, -1],
    ],
    [
      [0, 90, 0],
      [0, 0, 1],
      [1, 0, 0],
    ],
    [
      [0, -90, 0],
      [0, 0, 1],
      [-1, 0, 0],
    ],
    [
      [0, 0, 90],
      [1, 0, 0],
      [0, 1, 0],
    ],
    [
      [0, 0, -90],
      [1, 0, 0],
      [0, -1, 0],
    ],
  ])("axis quarter-turn %j", (angles, point, result) =>
    near(rotate(q(...(angles as Vec3)), point as Vec3), result),
  );
  it("q and -q have identical matrices", () => {
    const a = q(31, 65, -179);
    near(toMatrix(a), toMatrix(a.map((v) => -v) as Quat));
  });
  it.each([90, -90, 89.999999, -89.999999])(
    "matches independent Three ZYX at pitch %s",
    (pitch) => {
      const a = q(30, pitch, 47),
        expected = new Quaternion().setFromEuler(
          new Euler(pi / 6, (pitch * pi) / 180, (47 * pi) / 180, "ZYX"),
        );
      near(toThreeQuaternion(a).toArray(), expected.toArray());
    },
  );
  it("gimbal lock: equal roll/yaw increments cancel at +90", () =>
    near(toMatrix(q(0, 90, 0)), toMatrix(q(30, 90, 30))));
  it("gimbal lock: opposite roll/yaw increments cancel at -90", () =>
    near(toMatrix(q(0, -90, 0)), toMatrix(q(30, -90, -30))));
  it("Hamilton product applies rightmost first", () => {
    const x = q(90, 0, 0),
      y = q(0, 90, 0);
    near(rotate(multiply(x, y), [0, 0, 1]), [1, 0, 0]);
    near(rotate(multiply(y, x), [0, 0, 1]), [0, -1, 0]);
    near(toMatrix(multiply(x, y)), matMultiply(toMatrix(x), toMatrix(y)));
  });
  it("axis-angle normalizes axis and rejects zero", () => {
    near(toMatrix(axisAngle([0, 0, 5], pi / 2)), toMatrix(q(0, 0, 90)));
    expect(() => axisAngle([0, 0, 0], 1)).toThrow();
    expect(() => normalize([0, 0, 0, 0])).toThrow();
    expect(() => normalize([Infinity, 0, 0, 0])).toThrow();
  });
});
describe("interpolation", () => {
  it("endpoints agree; wrap example takes opposite midpoints", () => {
    const a: Vec3 = [0, 0, (179 * pi) / 180],
      b: Vec3 = [0, 0, (-179 * pi) / 180];
    near(
      toMatrix(slerp(fromEuler(a), fromEuler(b), 0)),
      toMatrix(fromEuler(a)),
    );
    near(
      toMatrix(slerp(fromEuler(a), fromEuler(b), 1)),
      toMatrix(fromEuler(b)),
    );
    near(rotate(slerp(fromEuler(a), fromEuler(b), 0.5), [1, 0, 0]), [-1, 0, 0]);
    near(rotate(fromEuler(lerpEuler(a, b, 0.5, false)), [1, 0, 0]), [1, 0, 0]);
    near(rotate(fromEuler(lerpEuler(a, b, 0.5, true)), [1, 0, 0]), [-1, 0, 0]);
  });
  it("same, opposite signs, near-identical and half-turn remain finite/unit", () => {
    const a = q(20, 30, 40);
    for (const b of [
      a,
      a.map((v) => -v) as Quat,
      q(20, 30, 40 + 1e-8),
      multiply(a, q(180, 0, 0)),
    ]) {
      for (const u of [0, 0.1, 0.5, 0.9, 1]) {
        const out = slerp(a, b, u);
        expect(out.every(Number.isFinite)).toBe(true);
        expect(Math.hypot(...out)).toBeCloseTo(1, 12);
      }
    }
    near(toMatrix(slerp(a, a.map((v) => -v) as Quat, 0.4)), toMatrix(a));
  });
  it("SLERP progresses at constant angular speed", () => {
    const a = q(0, 0, 0),
      b = q(90, 60, 120),
      total = angularDistance(a, b);
    for (const u of [0.1, 0.25, 0.5, 0.75])
      expect(angularDistance(a, slerp(a, b, u))).toBeCloseTo(u * total, 10);
  });
});
describe("SE(3) and library boundary", () => {
  it("rotation/translation order and inverse match hand calculation", () => {
    const R = { q: q(0, 0, 90), t: [0, 0, 0] as Vec3 },
      T = { q: q(0, 0, 0), t: [1, 0, 0] as Vec3 };
    const rt = compose(T, R),
      tr = compose(R, T);
    near(transformPoint(rt, [1, 0, 0]), [1, 1, 0]);
    near(transformPoint(tr, [1, 0, 0]), [0, 2, 0]);
    near(transformPoint(inverse(rt), [1, 1, 0]), [1, 0, 0]);
    near(toHomogeneous(rt), [0, -1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  });
  it("Three matrix storage/order and quaternion conversion", () => {
    const pose = { q: q(25, -40, 75), t: [1, 2, 3] as Vec3 };
    const m = toThreeMatrix(pose);
    const ref = new Matrix4().compose(
      new Vector3(1, 2, 3),
      new Quaternion().setFromEuler(
        new Euler((25 * pi) / 180, (-40 * pi) / 180, (75 * pi) / 180, "ZYX"),
      ),
      new Vector3(1, 1, 1),
    );
    near(m.elements, ref.elements);
    near(
      new Vector3(3, 1, 2).applyMatrix4(m).toArray(),
      transformPoint(pose, [3, 1, 2]),
    );
  });
  it("fixed seed: orthogonality, determinant, norms, composition, inverse", () => {
    let seed = 0x12345678;
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    const vec = () =>
      [random() * 6 - 3, random() * 6 - 3, random() * 6 - 3] as Vec3;
    for (let i = 0; i < 200; i++) {
      const a = { q: fromEuler(vec()), t: vec() },
        b = { q: fromEuler(vec()), t: vec() },
        p = vec(),
        r = toMatrix(a.q);
      near(matMultiply(transpose(r), r), identity);
      expect(determinant(r)).toBeCloseTo(1, 10);
      expect(Math.hypot(...a.q)).toBeCloseTo(1, 12);
      near(
        transformPoint(compose(a, b), p),
        transformPoint(a, transformPoint(b, p)),
      );
      near(transformPoint(inverse(a), transformPoint(a, p)), p);
      near(
        toHomogeneous(compose(inverse(a), a)),
        [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      );
      near(
        toMatrix(multiply(a.q, b.q)),
        matMultiply(toMatrix(a.q), toMatrix(b.q)),
      );
    }
  });
});
