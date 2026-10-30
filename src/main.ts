import "./style.css";
import {
  DEG,
  angularDistance,
  determinant,
  fromEuler,
  lerpEuler,
  multiply,
  rotate,
  slerp,
  toMatrix,
} from "./math/rotation";
import type { Quat, Vec3 } from "./math/rotation";
import {
  compose,
  inverse,
  toHomogeneous,
  transformPoint,
} from "./math/rigid-transform";
import type { Pose } from "./math/rigid-transform";
import { SceneView } from "./ui/scene";
import { demos } from "./demos/content";
const repo = "https://github.com/yoshimasa1700/rotation-lab";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const f = (v: number, d = 4) =>
  (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d);
const vec = (v: readonly number[]) => `(${v.map((n) => f(n, 3)).join(", ")})`;
const matrix = (m: readonly number[], n = 3) =>
  `<div class="matrix" style="--cols:${n}" role="img" aria-label="${n}行${n}列の行列: ${m.map((v) => f(v)).join(", ")}">${m.map((v, i) => `<span class="${n === 4 && i < 12 ? (i % 4 === 3 ? "translation-cell" : "rotation-cell") : ""}">${f(v)}</span>`).join("")}</div>`;
const unit: Quat = [1, 0, 0, 0];
let active = 0,
  angles: Vec3 = [20, 25, 35],
  position: Vec3 = [1, 0, 0],
  q = fromEuler(angles.map((v) => v * DEG) as Vec3),
  sign = 1;
let u = 0,
  example = 0,
  unwrap = false,
  swapped = false,
  reverse = false,
  equivalent = false;
let playing = false,
  raf = 0,
  previous = 0;
let views: SceneView[] = [];
const app = $("app");
app.innerHTML = `<header class="masthead"><a href="#A" class="brand" aria-label="Rotation Lab ホーム"><span class="brand-mark">↗</span> Rotation Lab<span class="edition">INTERACTIVE FIELD NOTES / 01</span></a><a href="${repo}" target="_blank" rel="noreferrer" class="source-link">GitHub ↗</a></header>
<main><section class="intro"><div><p class="eyebrow">3D GEOMETRY, HANDS ON</p><h1>回転を、<em>ほどく。</em></h1></div><p class="lead">数式と、動きのあいだ。<br>5つの小さな実験で、3次元の回転を理解する。</p></section>
<nav class="demo-nav" aria-label="実験を選択">${demos.map((d, i) => `<button data-demo="${i}" aria-current="${i === 0 ? "page" : "false"}"><span>${d.id}</span>${d.name}</button>`).join("")}</nav>
<section class="experiment" aria-labelledby="demo-title"><div class="experiment-heading"><div><p class="eyebrow" id="demo-kicker"></p><h2 id="demo-title"></h2><p id="demo-intro"></p></div><button id="reset" class="quiet">↺ リセット</button></div>
<div class="workspace"><section class="stage-area" aria-label="3D実験"><div id="viewers" class="viewers"></div><div class="stage-footer"><span><b class="axis-x">X</b> / <b class="axis-y">Y</b> / <b class="axis-z">Z</b>　w: 世界　b: 物体</span><button id="camera" class="quiet">視点を戻す</button></div><p id="observation" class="observation"></p></section><aside class="control-panel"><p class="eyebrow">01 / 操作する</p><div id="controls"></div></aside></div>
<section class="readouts" aria-label="現在の数値"><div class="readout-heading"><p class="eyebrow">02 / 数値を読む</p><p>内部値は丸めず、表示のみ小数4桁</p></div><div id="numbers" class="number-grid"></div></section>
<section class="explanation"><div><p class="eyebrow">03 / 理由を知る</p><h3 id="formula"></h3></div><div><p id="reason"></p><details><summary>規約と計算の見方</summary><p>右手系・列ベクトル・能動回転。Eulerは内因性ZYX、R = Rz Ry Rx。固定軸ならX → Y → Zの順です。角度は画面で度、計算ではラジアン。Quaternionは(w,x,y,z)。表示状態はQuaternionと位置で保持し、Eulerの編集値は別に保持します。Eulerへの逆変換は複数解・特異点があるため、このデモでは自動で入力値に戻しません。</p><a href="${repo}/blob/main/docs/conventions.md" target="_blank" rel="noreferrer">規約の全文 ↗</a></details><a id="code-link" class="code-link" target="_blank" rel="noreferrer">04 / 対応するコードを見る ↗</a></div></section></section>
<section class="concepts"><p class="eyebrow">THE BIG PICTURE</p><h2>表現と、集合を分けて考える。</h2><div class="concept-grid"><article><h3>Euler角</h3><p>3つの角度で記述する</p><small>保存 3成分 / 回転の自由度 3</small></article><article><h3>Quaternion</h3><p>単位四元数で記述する</p><small>保存 4成分 / 自由度 3</small></article><article><h3>SO(3)</h3><p>3次元の回転全体</p><small>行列 9成分 / 自由度 3</small></article><article><h3>SE(3)</h3><p>回転と移動の組み合わせ</p><small>同次行列 16成分 / 自由度 6</small></article></div><p class="concept-note">Euler角と単位QuaternionはSO(3)の要素を表す方法。SE(3)は位置も含む剛体変換の全体です。</p></section><section class="reading-note" aria-labelledby="reading-title"><div><p class="eyebrow">NEXT / 最適化への入り口</p><h2 id="reading-title">回転の理解を、推定につなぐ。</h2><p>行列に足すと何が起きる？ 3・6成分の局所更新を、数値例から読み解きます。</p></div><a href="./optimization.html">最適化でSO(3)・SE(3)を使う理由</a></section><section class="reading-note" aria-labelledby="point-note-title"><div><p class="eyebrow">LEARNING NOTE / 2026.10.30</p><h2 id="point-note-title">同じ点を、別の座標で。</h2><p>逆変換の並進は、なぜ −Rᵀt？ 手計算からカメラ投影までをたどり、同じ画素に写る点を動かして確かめます。</p></div><a href="./point-transforms.html">点の座標変換・逆変換・カメラ投影</a></section></main><footer><span>Rotation Lab · 数学を、手触りに。</span><a href="${repo}/blob/main/docs/math-notes.md" target="_blank" rel="noreferrer">数式と検証ノート ↗</a><span>TypeScript + Three.js / MIT</span></footer>`;
function button(text: string, action: string, extra = "") {
  return `<button data-action="${action}" ${extra}>${text}</button>`;
}
function sliders(
  names: string[],
  values: number[],
  prefix: string,
  min: number,
  max: number,
  step: number,
  unitLabel: string,
) {
  return names
    .map(
      (name, i) =>
        `<div class="slider-control"><div><label for="${prefix}${i}">${name}</label><span><input id="${prefix}${i}n" aria-label="${name} 数値" type="number" min="${min}" max="${max}" step="${step}" value="${values[i]}"> ${unitLabel}</span></div><input id="${prefix}${i}" aria-label="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${values[i]}"></div>`,
    )
    .join("");
}
function stop() {
  playing = false;
  cancelAnimationFrame(raf);
  const b = document.querySelector('[data-action="play"]');
  if (b) b.textContent = "▶ 再生";
}
function syncAngles() {
  q = fromEuler(angles.map((v) => v * DEG) as Vec3);
}
function initState() {
  stop();
  angles = active === 1 ? [0, 0, 0] : active === 4 ? [0, 0, 90] : [20, 25, 35];
  position = [1, 0, 0];
  sign = 1;
  u = 0;
  example = 0;
  unwrap = false;
  swapped = false;
  reverse = false;
  equivalent = false;
  syncAngles();
}
function renderControls() {
  const controls = $("controls");
  const focused =
    document.activeElement instanceof HTMLElement &&
    controls.contains(document.activeElement)
      ? document.activeElement
      : null;
  const focusedId = focused?.id;
  const focusedAction = focused?.dataset.action;
  let html = "";
  if ([0, 1, 4].includes(active)) {
    html += `<div class="presets">${active === 1 ? button("pitch 0°", "p0") + button("89°", "p89") + button("90°", "p90") : button("恒等姿勢", "identity") + button("Z +90°", "z90") + button("複数軸", "multi")}</div>`;
    html += sliders(
      ["roll / X", "pitch / Y", "yaw / Z"],
      angles,
      "angle",
      -180,
      180,
      1,
      "°",
    );
    if (active === 0)
      html += button(
        "q ↔ −q",
        "sign",
        `aria-pressed="${sign === -1}" class="wide"`,
      );
    if (active === 1)
      html +=
        button("同値姿勢に切り替え", "equivalent", 'class="wide"') +
        '<p class="control-note">pitch=90°で、rollとyawをともに0° / 30°にします。</p>';
    if (active === 4)
      html += `<h3 class="control-subtitle">平行移動 / 世界座標</h3>${sliders(["移動 X", "移動 Y", "移動 Z"], position, "position", -2, 2, 0.1, "")}<div class="presets">${button(swapped ? "移動 → 回転" : "回転 → 移動", "order")}${button("逆変換を適用", "inverse", `aria-pressed="${reverse}"`)}</div>`;
  } else if (active === 2) {
    html = `<label class="select-label" for="example">始点 → 終点</label><select id="example"><option value="0">yaw +179° → −179°</option><option value="1">(0°,0°,0°) → (90°,60°,120°)</option></select><p class="control-note" id="endpoint-label"></p>${sliders(["補間率 u"], [u], "u", 0, 1, 0.01, "")}<label class="checkbox"><input type="checkbox" id="unwrap"> Eulerの角度をunwrapする</label>${button("▶ 再生", "play", 'class="wide primary"')}<p class="control-note">約6秒で始点から終点へ。途中で停止できます。</p>`;
  } else
    html = `<p class="control-note">世界の固定X軸・Y軸に、各90°の回転を適用します。</p>${button("⇄ 適用順序を交換", "order", 'class="wide primary"')}<div class="order-note">右側の行列が先。<br>物体の向きと点の座標を比較してください。</div>`;
  $("controls").innerHTML = html;
  bindSliders("angle", 3, (i, v) => {
    angles[i] = v;
    syncAngles();
  });
  bindSliders("position", 3, (i, v) => {
    position[i] = v;
  });
  bindSliders("u", 1, (_, v) => {
    stop();
    u = v;
  });
  if (active === 2) {
    const select = $<HTMLSelectElement>("example");
    select.value = String(example);
    select.onchange = () => {
      stop();
      example = Number(select.value);
      u = 0;
      renderControls();
      update();
      updateTrails();
    };
    const input = $<HTMLInputElement>("unwrap");
    input.checked = unwrap;
    input.onchange = () => {
      unwrap = input.checked;
      update();
      updateTrails();
    };
  }
  $("controls")
    .querySelectorAll<HTMLButtonElement>("button[data-action]")
    .forEach((b) => (b.onclick = () => action(b.dataset.action!)));
  const replacement = focusedId
    ? document.getElementById(focusedId)
    : Array.from(
        controls.querySelectorAll<HTMLButtonElement>("button[data-action]"),
      ).find(
        (button) => focusedAction && button.dataset.action === focusedAction,
      );
  replacement?.focus({ preventScroll: true });
}
function bindSliders(
  prefix: string,
  count: number,
  set: (i: number, v: number) => void,
) {
  for (let i = 0; i < count; i++) {
    const range = $<HTMLInputElement>(prefix + i),
      number = $<HTMLInputElement>(prefix + i + "n");
    if (!range) continue;
    const applyRange = () => {
      number.value = range.value;
      set(i, range.valueAsNumber);
      update();
    };
    const commitNumber = () => {
      if (Number.isFinite(number.valueAsNumber)) {
        // The native range clamps to bounds and snaps to the declared step.
        range.value = String(number.valueAsNumber);
      }
      applyRange();
    };
    range.oninput = applyRange;
    number.oninput = () => {
      // Preserve drafts such as "-0." instead of rewriting the user's text.
      if (!number.validity.valid || !Number.isFinite(number.valueAsNumber))
        return;
      range.value = number.value;
      set(i, number.valueAsNumber);
      update();
    };
    number.onchange = commitNumber;
    number.onblur = commitNumber;
  }
}
function action(name: string) {
  if (name === "play") {
    if (playing) stop();
    else {
      playing = true;
      if (u >= 1) u = 0;
      previous = performance.now();
      raf = requestAnimationFrame(tick);
      document.querySelector('[data-action="play"]')!.textContent = "Ⅱ 停止";
    }
    return;
  }
  if (name === "identity") angles = [0, 0, 0];
  if (name === "z90") angles = [0, 0, 90];
  if (name === "multi") angles = [35, 50, 65];
  if (name.startsWith("p") && name !== "play")
    angles[1] = Number(name.slice(1));
  if (name === "sign") sign *= -1;
  if (name === "order") swapped = !swapped;
  if (name === "inverse") reverse = !reverse;
  if (name === "equivalent") {
    equivalent = !equivalent;
    angles = [equivalent ? 30 : 0, 90, equivalent ? 30 : 0];
  }
  syncAngles();
  renderControls();
  update();
}
function tick(now: number) {
  if (!playing) return;
  u = Math.min(1, u + Math.min(now - previous, 100) / 6000);
  previous = now;
  $<HTMLInputElement>("u0").value = $<HTMLInputElement>("u0n").value =
    u.toFixed(2);
  update();
  if (u >= 1) stop();
  else raf = requestAnimationFrame(tick);
}
function endpoints(): [Vec3, Vec3] {
  return example === 0
    ? [
        [0, 0, 179 * DEG],
        [0, 0, -179 * DEG],
      ]
    : [
        [0, 0, 0],
        [90 * DEG, 60 * DEG, 120 * DEG],
      ];
}
function interpolated(t: number): [Quat, Quat] {
  const [a, b] = endpoints();
  return [
    fromEuler(lerpEuler(a, b, t, unwrap)),
    slerp(fromEuler(a), fromEuler(b), t),
  ];
}
function updateTrails() {
  if (active === 2)
    views.forEach((v, i) =>
      v.setTrail(
        Array.from({ length: 121 }, (_, n) =>
          rotate(interpolated(n / 120)[i], [1, 0, 0]),
        ),
        i === 0 ? 0xad5839 : 0x397f57,
      ),
    );
}
function block(title: string, body: string, detail = "") {
  return `<article class="number-block"><h3>${title}</h3>${body}${detail ? `<p>${detail}</p>` : ""}</article>`;
}
function pose(quat: Quat, t: Vec3 = [0, 0, 0]): Pose {
  return { q: quat, t };
}
function update() {
  let numbers = "";
  const euler = angles.map((v) => v * DEG) as Vec3;
  if (active === 0 || active === 1) {
    views[0].setPose(pose(q), euler);
    const r = toMatrix(q),
      shown = q.map((v) => v * sign);
    numbers =
      block(
        "Euler / ZYX",
        `<div class="big-number">${angles.map((v) => f(v, 0) + "°").join(" / ")}</div>`,
        "roll / pitch / yaw",
      ) +
      block(
        "単位Quaternion",
        `<div class="quat">${["w", "x", "y", "z"].map((s, i) => `<span><small>${s}</small>${f(shown[i])}</span>`).join("")}</div>`,
        `‖q‖ = ${f(Math.hypot(...q))} · q と −q は同じ姿勢`,
      ) +
      block("R ∈ SO(3)", matrix(r), `det R = ${f(determinant(r))} · RᵀR ≈ I`);
    $("observation").textContent =
      active === 1
        ? `軸の独立性の目安 |cos(pitch)| = ${f(Math.abs(Math.cos(euler[1])))}。${Math.abs(Math.cos(euler[1])) < 1e-6 ? "特異点：rollとyawの軸が重なっています。" : "0に近いほど2軸が重なります。"}`
        : `点 (1, 0, 0) → ${vec(rotate(q, [1, 0, 0]))}。${demos[active].hint}`;
  } else if (active === 2) {
    const qs = interpolated(u),
      [a, b] = endpoints();
    views.forEach((v, i) => v.setPose(pose(qs[i])));
    $("endpoint-label").textContent =
      `roll / pitch / yaw（度）\n${vec(a.map((v) => v / DEG))} → ${vec(b.map((v) => v / DEG))}`;
    numbers = qs
      .map((v, i) =>
        block(
          i === 0 ? "Euler成分補間" : "Quaternion SLERP",
          matrix(toMatrix(v)),
          `始点からの回転角 ${f(angularDistance(fromEuler(a), v) / DEG, 2)}°`,
        ),
      )
      .join("");
    $("observation").textContent =
      `u = ${f(u, 2)} / 2つの姿勢の差 ${f(angularDistance(qs[0], qs[1]) / DEG, 2)}°。${demos[2].hint}`;
  } else if (active === 3) {
    const x = fromEuler([90 * DEG, 0, 0]),
      y = fromEuler([0, 90 * DEG, 0]);
    const qs = swapped
      ? [multiply(y, x), multiply(x, y)]
      : [multiply(x, y), multiply(y, x)];
    const labels = swapped
      ? ["X回転 → Y回転 / Ry Rx", "Y回転 → X回転 / Rx Ry"]
      : ["Y回転 → X回転 / Rx Ry", "X回転 → Y回転 / Ry Rx"];
    views.forEach((v, i) => {
      v.setPose(pose(qs[i]));
      $("view-label-" + i).textContent = labels[i];
    });
    numbers = qs
      .map((v, i) =>
        block(
          labels[i],
          matrix(toMatrix(v)),
          `点 (0, 0, 1) → ${vec(rotate(v, [0, 0, 1]))}`,
        ),
      )
      .join("");
    $("observation").textContent =
      "同じ2つの回転でも結果は一致しません。左と右の機体の向き、行列、点の行き先を比較してください。";
  } else {
    const R = pose(q),
      T = pose(unit, position),
      forward = swapped ? compose(R, T) : compose(T, R),
      back = inverse(forward),
      p: Vec3 = [1, 0, 0],
      world = transformPoint(forward, p),
      returned = transformPoint(back, world);
    views[0].setPose(reverse ? compose(back, forward) : forward);
    $("view-label-0").textContent = reverse
      ? "逆変換後 / 物体座標Bに戻した表示"
      : "物体Bの姿勢 / 世界座標A";
    numbers =
      block(
        "T_A_from_B",
        matrix(toHomogeneous(forward), 4),
        "R：回転ブロック / t：移動列（緑）",
      ) +
      block(
        "点の座標",
        `<dl class="point-values"><dt>p_B / 入力</dt><dd>${vec(p)}</dd><dt>p_A / 変換後</dt><dd>${vec(world)}</dd><dt>T_B_from_A p_A / 復元</dt><dd>${vec(returned)}</dd></dl>`,
        "同じ点を物体Bと世界Aで表す",
      ) +
      block(
        "T_B_from_A = T_A_from_B⁻¹",
        matrix(toHomogeneous(back), 4),
        "Rᵀ と −Rᵀt で元に戻す",
      );
    $("observation").textContent =
      `能動変換：${swapped ? "移動 → 回転 (R T)" : "回転 → 移動 (T R)"}。${reverse ? "逆変換を適用して元の点と姿勢に戻しました。" : "移動列は " + vec(forward.t) + "。"} T₁T₂ の移動列は R₁t₂ + t₁ です。`;
  }
  $("numbers").innerHTML = numbers;
}
function selectDemo(i: number) {
  active = i;
  views.forEach((v) => v.dispose());
  views = [];
  initState();
  const d = demos[i];
  $("demo-kicker").textContent = `EXPERIMENT ${d.id} / ${d.english}`;
  $("demo-title").textContent = d.title;
  $("demo-intro").textContent = d.intro;
  $("formula").textContent = d.formula;
  $("reason").textContent = d.reason;
  $<HTMLAnchorElement>("code-link").href = `${repo}/blob/main/${d.code}`;
  document
    .querySelectorAll<HTMLButtonElement>("[data-demo]")
    .forEach((b, j) =>
      b.setAttribute("aria-current", i === j ? "page" : "false"),
    );
  const paired = i === 2 || i === 3;
  $("viewers").classList.toggle("paired", paired);
  $("viewers").innerHTML = (paired ? [0, 1] : [0])
    .map(
      (n) =>
        `<div class="view-wrap"><div class="view-label" id="view-label-${n}">${i === 2 ? (n === 0 ? "Euler / 成分の線形補間" : "Quaternion / SLERP") : "WORLD & BODY / 世界と物体"}</div><div class="scene" id="scene-${n}"></div><span class="drag-hint">ドラッグで視点変更 · スクロールで拡大</span></div>`,
    )
    .join("");
  (paired ? [0, 1] : [0]).forEach((n) =>
    views.push(
      new SceneView($("scene-" + n), i === 1, i === 3 ? [0, 0, 1] : [1, 0, 0]),
    ),
  );
  renderControls();
  update();
  updateTrails();
}
document.querySelectorAll<HTMLButtonElement>("[data-demo]").forEach(
  (b) =>
    (b.onclick = () => {
      location.hash = demos[Number(b.dataset.demo)].id;
    }),
);
$("reset").onclick = () => {
  initState();
  renderControls();
  update();
  updateTrails();
  views.forEach((v) => v.resetCamera());
};
$("camera").onclick = () => views.forEach((v) => v.resetCamera());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop();
});
function route() {
  const i = demos.findIndex((d) => d.id === location.hash.slice(1));
  selectDemo(i < 0 ? 0 : i);
}
window.addEventListener("hashchange", route);
route();
