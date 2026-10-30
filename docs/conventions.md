# 数学・実装の規約

このページを公開仕様の原本とする。回転の表現と群そのものを区別する。

| 項目 | 採用規約 |
| --- | --- |
| 座標系 | 右手系。X=赤、Y=緑、Z=青。文字ラベルを併用 |
| ベクトル | 列ベクトル。回転デモは能動回転 p′=Rp |
| Euler角 | R=Rz(yaw) Ry(pitch) Rx(roll)。内因性ZYX、等価な固定軸XYZ |
| 適用順序 | 行列積の右側が先。Rx Ry は Y回転 → X回転 |
| 角度 | UIは度、数学コアはラジアン |
| Quaternion | 単位Quaternion、Hamilton積、(w,x,y,z)順 |
| Quaternion合成 | R(q₁q₂)=R(q₁)R(q₂)、q₂が先 |
| 状態 | 単位Quaternionと位置。Euler編集値を別に保持 |
| 座標変換 | p_A=T_A_from_B p_B、B座標からA座標へ |
| 変換合成 | T_A_from_C=T_A_from_B T_B_from_C |
| 配列 | 数学コアの行列はrow-major（行を順に並べる） |
| 精度 | 表示のみ丸め、内部はJavaScriptの倍精度。移動は共通の無次元単位 |

Three.jsのQuaternionは(x,y,z,w)順。`src/adapters/three.ts`で明示的に並べ替える。`Matrix4.set`は行順で受け取り、`elements`は列順で保存する。Three.jsのZYX Eulerと既知解の両方で独立に検証する。

Euler入力を姿勢から逆算して上書きしない。Eulerへの逆変換は周期性、複数解、特異点があり、同じ回転でも入力値が飛ぶためである。初版はQuaternionや行列の直接入力を持たない。

## デモEの2つの読み方

1. **能動変換の比較**：同じ世界座標の点p=(1,0,0)に、世界原点まわりの回転と世界方向の移動を異なる順で適用する。回転→移動は`T_translation T_rotation`、移動→回転は`T_rotation T_translation`。
2. **座標表現**：上記の合成結果を物体Bの世界Aにおける姿勢`T_A_from_B`と読めば、同じ物理的な点を`p_B`と`p_A`で記述できる。

「逆変換を適用」は、表示中の姿勢にも`T_B_from_A`を左から掛け、元の姿勢・点に戻して表示する。数値欄には順変換・逆変換の両方を常時残す。このとき表示の基準はBに戻る。軸添字w/bは3D表示の基準軸/物体軸を示し、パネル上部に表示基準の変更を明記する。

## 点の座標変換とカメラ投影の学習ノート

`point-transforms.html` と `point-transforms.en.html` では、同じ点Pの表現をカメラ座標Cから世界座標Wへ変える。点自体を動かす能動変換と区別する。`T_WC` は既存の `T_W_from_C` の短縮記法。`R_WC` の各列はCの単位軸をWで表したもので、`t_WC` はカメラ原点の世界座標である。

- `p_W = R_WC p_C + t_WC`、逆変換は `R_CW = R_WCᵀ`, `t_CW = −R_CW t_WC`。
- このノートの点・並進・深さの単位はm。既存の回転デモの無次元単位とは分ける。
- カメラ軸は右手系のx右・y下・z前。世界座標の軸を重力方向とは結び付けない。
- ピンホール投影は `u = fx X_C/Z_C + cx`, `v = fy Y_C/Z_C + cy`。焦点距離と主点・画像座標の単位はpixel。歪みは無視する。
- `Z_C` は光軸方向の深さで、カメラからの距離（点のノルム）とは異なる。投影関数は有限な `Z_C > 0` の点だけを扱う。画像の画角による切り取りや遮蔽は判定しない。
- 操作図は点を同じ光線上で `λ(1,0,4)` に動かす別の実験。各λで同じ点のC/W表現を往復し、投影が不変であることを確認する。

## 対応資料

- [Three.js Quaternion](https://threejs.org/docs/pages/Quaternion.html)
- [Three.js Euler](https://threejs.org/docs/pages/Euler.html)
- [Modern Robotics](https://modernrobotics.northwestern.edu/)
