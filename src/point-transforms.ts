import { projectCameraPoint } from "./math/camera";
import { inverse, transformPoint } from "./math/rigid-transform";
import { fromEuler } from "./math/rotation";
import type { Vec3 } from "./math/rotation";

const pose = { q: fromEuler([0, 0, Math.PI / 2]), t: [1, 2, 0] as Vec3 };
const reversed = inverse(pose);
const intrinsics = { fx: 400, fy: 400, cx: 320, cy: 240 };
const range = document.getElementById("ray-scale") as HTMLInputElement;
const text = (id: string, value: string) => {
  document.getElementById(id)!.textContent = value;
};
const format = (values: number[]) =>
  `(${values.map((value) => String(Number(value.toFixed(3)))).join(", ")})`;

function update() {
  const scale = range.valueAsNumber;
  const camera: Vec3 = [scale, 0, 4 * scale];
  const world = transformPoint(pose, camera);
  const recovered = transformPoint(reversed, world);
  const pixel = projectCameraPoint(recovered, intrinsics)!;
  text("scale-value", String(scale));
  text("camera-point", format(camera));
  text("world-point", format(world));
  text("recovered-point", format(recovered));
  text("pixel-point", format(pixel));
  const x = 60 + 42 * camera[2],
    y = 220 - 42 * camera[0];
  const point = document.getElementById("ray-point")!;
  point.setAttribute("cx", String(x));
  point.setAttribute("cy", String(y));
  const label = document.getElementById("ray-point-label")!;
  label.setAttribute("x", String(x + 10));
  label.setAttribute("y", String(y - 12));
  label.textContent = `λ=${scale}`;
}

range.addEventListener("input", update);
for (const [id, value] of [
  ["ray-double", "2"],
  ["ray-reset", "1"],
]) {
  document.getElementById(id)!.addEventListener("click", () => {
    range.value = value;
    update();
  });
}
update();
document.getElementById("ray-controls")!.hidden = false;
