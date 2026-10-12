# 健康日志

每天的饮食、训练和身体状态，做成一个静态网页，用 GitHub Pages 发布。

记录由 Claude 在「健康」项目里根据发来的餐前、餐后照片和描述估算，写进 `data/` 里的 JSON 文件；每次提交后 GitHub Pages 会自动重新发布。

## 本地预览

浏览器不允许直接双击打开的页面读取数据文件，需要起一个本地服务器：

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
# 示例数据：http://localhost:8000/?demo=1
```

## 文件

```
index.html              页面
assets/style.css        样式
assets/app.js           读取数据、计算、画图
assets/body-shapes.js   正反面人体肌群图形
assets/vendor/d3.min.js d3 v7.9.0
data/                   你的记录（一开始都是空的）
data/demo/              虚构的示例数据，只用来预览页面
```

## 数据格式

所有日期都是 Europe/Berlin 当地日期，`YYYY-MM-DD`；时间 `HH:MM`。没有的值写 `null`。

### data/meals.json：每样食物一行

| 字段 | 说明 |
| --- | --- |
| `id` | `meal_id-序号` |
| `date`, `time` | 日期、开吃时间 |
| `meal_id` | `日期-b`（早餐）、`-l`（午餐）、`-d`（晚餐）、`-s1`、`-s2`（加餐） |
| `meal` | 早餐 / 午餐 / 晚餐 / 加餐 |
| `item`, `portion` | 食物名称；份量和估算依据，如“1 碗 ≈ 200 g” |
| `kcal_served` | 餐前照片里整份的热量 |
| `eaten_pct` | 根据餐后照片判断吃掉的比例，0–100 |
| `kcal`, `protein_g`, `carb_g`, `fat_g` | 实际吃掉的量（整份 × 比例） |
| `confidence` | 估算把握：高 / 中 / 低 |
| `note` | 补充说明，比如“只有餐前照片” |

### data/workouts.json：每个动作一行

| 字段 | 说明 |
| --- | --- |
| `id` | `日期-w序号` |
| `date`, `time` | 日期、开始时间 |
| `type` | 力量 / 有氧 / 运动 |
| `exercise` | 动作名称 |
| `sets`, `reps`, `load_kg` | 组数、次数、重量 |
| `duration_min`, `distance_km` | 时长、距离 |
| `kcal_burn` | 估算的运动消耗 |
| `primary`, `secondary` | 主要、辅助肌群，逗号分隔的肌群 id |
| `rpe`, `note` | 主观用力程度（1–10）、备注 |

肌群 id：`chest` 胸肌、`front_delts` 三角肌前束、`side_delts` 三角肌中束、`rear_delts` 三角肌后束、`triceps` 肱三头肌、`biceps` 肱二头肌、`forearms` 前臂、`traps` 斜方肌、`lats` 背阔肌、`upper_back` 中上背、`lower_back` 下背、`abs` 腹直肌、`obliques` 腹斜肌、`glutes` 臀肌、`quads` 股四头肌、`hamstrings` 腘绳肌、`adductors` 内收肌、`calves` 小腿。

页面按“主要肌群 1 组、辅助肌群 0.5 组、有氧每 10 分钟 1 组”计算有效组数。

### data/body.json：每天一行

`{id, date, weight_kg, sleep_h, energy, mood, steps, soreness, note}`，`id` 等于日期；`energy`、`mood` 是 1–5；`soreness` 写成 `"quads:2,glutes:1"`（1–3）。

### data/notes.json：Claude 的点评

`{id, date, text}`，`id` 为 `日期-n序号`。

### data/profile.json：个人信息与目标

```json
{
  "profile": { "height_cm": null, "weight_kg": null, "age": null, "sex": null, "goal": null, "activity": null },
  "targets": { "kcal": null, "protein_g": null, "carb_g": null, "fat_g": null, "sleep_h": null, "sets_week_min": null, "sets_week_max": null },
  "basis": null
}
```

只填本人提供的信息；目标由这些信息算出，`basis` 写明怎么算的。没填之前页面不显示任何目标线。

### data/meta.json

`{ "updated_at": "ISO 时间" }`，每次更新数据时改。

## 隐私

GitHub Pages 发布的网站在互联网上是公开的，即使仓库设为私有也是如此。页面加了 `noindex`，搜索引擎一般不会收录，但知道网址的人都能看到这里的全部记录。
