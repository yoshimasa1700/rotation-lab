export const demos = [
  {
    id: "A",
    name: "同じ姿勢、違う表現",
    english: "REPRESENTATIONS",
    title: "ひとつの姿勢。3つの書き方。",
    intro:
      "まず yaw を動かしてみましょう。物体が回ると、Quaternion と行列も同じ姿勢を表す値に変わります。",
    hint: "「q ↔ −q」を押して、数値だけが変わることを観察。",
    formula: "R = Rz(yaw) Ry(pitch) Rx(roll)",
    reason:
      "Euler角と単位Quaternionは、回転を記述する方法です。SO(3)は回転そのものの集合。Quaternionは4成分でもノルム1の制約があるので自由度は3。qと−qは同じ回転を表します。",
    code: "src/math/rotation.ts",
  },
  {
    id: "B",
    name: "ジンバルロック",
    english: "GIMBAL LOCK",
    title: "重なる軸。失われる独立性。",
    intro:
      "pitch を 90° にして、roll と yaw を同じ量だけ増やしてみましょう。2つの操作が打ち消し合います。",
    hint: "「同値姿勢」を切り替え、(0°, 90°, 0°) と (30°, 90°, 30°) を比較。",
    formula: "pitch = 90° → roll と yaw の軸が重なる",
    reason:
      "青い外側のyaw、緑のpitch、赤い内側のrollが入れ子になっています。pitch=±90°ではEuler角の局所的な表現が退化します。物体の回転自由度が減るわけではありません。同じEuler入力をQuaternionに変換しても、この入力の退化は解消しません。",
    code: "src/math/rotation.ts",
  },
  {
    id: "C",
    name: "補間の経路",
    english: "INTERPOLATION",
    title: "始点と終点が同じでも。",
    intro:
      "補間率 u を動かし、2つの回転経路を比較しましょう。線は物体上の点 p=(1,0,0) の全軌跡です。",
    hint: "±179°の例では、Eulerのunwrapを切り替えると大回りを改善できます。",
    formula: "Euler: (1−u) a + u b　 /　Quaternion: SLERP(a, b, u)",
    reason:
      "SLERPは内積が負なら符号を合わせ、短い経路を選びます。uを一定速度で進めると回転角速度は一定です。近接姿勢では正規化線形補間に切り替え、数値的不安定さを避けます。角度のunwrapは折り返しの対処であり、一般の3次元回転の補間とは別問題です。相対回転が180°なら最短経路は一意ではありません。",
    code: "src/math/rotation.ts",
  },
  {
    id: "D",
    name: "回転の順序",
    english: "NON-COMMUTATIVITY",
    title: "順序が変わると、答えも変わる。",
    intro:
      "X軸とY軸の90°回転を交換します。世界の固定軸まわりに回した点 (0,0,1) の行き先を比べましょう。",
    hint: "列ベクトルでは、行列積の右側から先に適用します。",
    formula: "Rx(90°) Ry(90°) ≠ Ry(90°) Rx(90°)",
    reason:
      "回転は一般に非可換です。Rx Ryは「Y回転 → X回転」。Ry Rxは「X回転 → Y回転」。QuaternionのHamilton積も同じ順序規約に従います。",
    code: "src/math/rotation.ts",
  },
  {
    id: "E",
    name: "位置と姿勢",
    english: "RIGID TRANSFORMS",
    title: "向きに、位置を加える。",
    intro:
      "Z軸+90°とX方向+1の移動を、異なる順序で点 (1,0,0) に適用します。「逆変換」で元に戻せます。",
    hint: "回転 → 移動では (1,1,0)、移動 → 回転では (0,2,0)。",
    formula: "p_A = T_A_from_B p_B = R p_B + t",
    reason:
      "SE(3)は回転と移動をまとめた剛体変換の集合で、自由度は6です。拡大縮小・せん断・鏡映は含みません。能動変換の順序を比較した後、その結果の物体座標Bから世界座標Aへの写像をT_A_from_Bとして読めます。逆写像T_B_from_Aは同じ点の世界座標を物体座標に戻します。",
    code: "src/math/rigid-transform.ts",
  },
] as const;
