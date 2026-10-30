import { describe, expect, it } from "vitest";
import { projectCameraPoint } from "../src/math/camera";
import { inverse, transformPoint } from "../src/math/rigid-transform";
import { fromEuler } from "../src/math/rotation";
import type { Vec3 } from "../src/math/rotation";

const intrinsics = { fx: 400, fy: 400, cx: 320, cy: 240 };

describe("point-coordinate learning note", () => {
  it("agrees with the hand-calculated frame change, inverse translation and recovery", () => {
    const pose = { q: fromEuler([0, 0, Math.PI / 2]), t: [1, 2, 0] as Vec3 };
    const world = transformPoint(pose, [1, 0, 4]);
    world.forEach((n, i) => expect(n).toBeCloseTo([1, 3, 4][i], 12));
    const reversed = inverse(pose);
    reversed.t.forEach((n, i) => expect(n).toBeCloseTo([-2, 1, 0][i], 12));
    transformPoint(reversed, world).forEach((n, i) =>
      expect(n).toBeCloseTo([1, 0, 4][i], 12),
    );
  });

  it("projects the two different depths to the same known pixel", () => {
    expect(projectCameraPoint([1, 0, 4], intrinsics)).toEqual([420, 240]);
    expect(projectCameraPoint([2, 0, 8], intrinsics)).toEqual([420, 240]);
  });

  it("uses each axis's focal length and preserves image y pointing down", () => {
    expect(projectCameraPoint([2, 1, 4], { ...intrinsics, fy: 600 })).toEqual([
      520, 390,
    ]);
  });

  it("preserves projection along a positive ray, including nonzero y", () => {
    for (const scale of [0.5, 0.75, 1, 2, 3]) {
      expect(
        projectCameraPoint([scale, -2 * scale, 4 * scale], intrinsics),
      ).toEqual([420, 40]);
    }
  });

  it.each<Vec3>([
    [1, 0, 0],
    [1, 0, -4],
    [NaN, 0, 4],
    [1, Infinity, 4],
    [1, 0, Infinity],
  ])(
    "does not project points outside the finite front half-space: %j",
    (...point) => expect(projectCameraPoint(point, intrinsics)).toBeNull(),
  );
});
