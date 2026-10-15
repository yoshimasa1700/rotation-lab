# Rotation Lab

An interactive learning lab for Euler angles, unit quaternions, SO(3), and SE(3), with a Japanese interface and five experiments.

[Live demo](https://yoshimasa1700.github.io/rotation-lab/) · [日本語](README.md)

- **Representations:** one orientation as Euler angles, a unit quaternion, and a rotation matrix; compare q and −q.
- **Gimbal lock:** nested ZYX axes and equivalent Euler triples at pitch ±90°.
- **Interpolation:** component-wise Euler interpolation versus shortest-path SLERP, with trajectories, playback, and optional angle unwrapping.
- **Rotation order:** compare Rx Ry and Ry Rx using known quarter-turns.
- **Rigid transforms:** translation/rotation order, homogeneous matrices, point coordinates, and inverse transforms.

Right-handed coordinates, column vectors, active rotations, `R = Rz(yaw) Ry(pitch) Rx(roll)`. Mathematical quaternion order is `(w,x,y,z)` with Hamilton multiplication. Three.js conversion is explicit at the boundary.

Use Node 24 LTS (minimum 22.12):

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

The independent TypeScript math core is covered by 22 tests: known rotations, singularities, interpolation edge cases, SE(3) inverse/composition, 200 fixed-seed invariant checks, and independent Three.js comparisons. GitHub Actions tests/builds pull requests and deploys `main` to Pages.

WebGL is required for 3D; numerical controls remain available without it. Near-identical SLERP inputs use normalized linear interpolation. General matrix/quaternion editing, inverse Euler conversion, Lie algebra tools, and a fully multilingual UI are outside this version.

MIT License.
