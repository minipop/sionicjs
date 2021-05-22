# Sionic.js

mohayonao氏のmml演奏デモを、ライブラリとして切り出したものです。

https://mohayonao.github.io/pico.js/

# ライセンス

オリジナル版ソースに基づき、MITライセンスとします。

# 文法

Pico.jsから切り出したままにしています。

今後、SiONとの互換を取るために変更することもありえます。

## Sionic独自の文法

```
音色定義：
@3 PWM
@4 Noise
@5 FM Bass
@6 FM Lead

@w PWMのWidth(1-99)
@n Noiseのピッチ

エンベロープ定義：
@e1,a,d,s,r

エンベロープのデフォルト値：
 a: 0
 d: 64
 s: 32(0-128)
 r: 0(現状は非対応)
```

## 標準的なMML文法

```
t テンポ
l 音長
v ボリューム
o オクターブ
/:N ループ開始（N回ループ）
:/ ループ終了
cdefgab ノート
r 休符
& タイ
kt キートランスポーズ
```

## ないもの

```
FM音色定義
[] ループ
$ 無限ループ
```