# 待办事项

---

## 技能充能池系统

三技能（变色/变费/护盾）共享充能池，替代当前独立冷却。

| 参数 | 值 |
|---|---|
| 初始充能 | 3 点 |
| 使用技能 | 消耗 1 点 |
| 跨回合 | **不恢复** |
| 过层 | 回满 |
| Shuffle | 不吃充能，保持独立 2 次/回合 |

Buff 候选池新增：`SKILL_ENERGY_MAX` — 充能上限 +1（由玩家在 3 选 1 中选择）。

### 各文档改动

| 文档 | 改动 |
|---|---|
| `state-machine.md` | §4.3 skills 结构重写（`energy` 替代 `used`）；PlayerState 加 `skillEnergyMax`；§6 守卫条件改用 `energy > 0`；§7 副作用 ROUND_END 不重置充能、BATTLE_WIN 回满 |
| `game-rules-prompt.md` | §4 重写为充能池规则；§6.2 强化池加充能上限 buff |
| `card-abstractions.md` | Buff union 加 `SKILL_ENERGY_MAX`；Upgrade 池加对应候选 |
| `GameLogic_backend.md` | 步骤 4 描述更新 |
| `numerical-design-spec.md` | §3.3 方向 C 加"充能上限+1" |

### 待确认

- 护盾双重成本（充能 + cd）是否过重

---

## GameLogic_backend.md 待修正

| # | 问题 | 位置 |
|---|---|---|
| 1 | 步骤 5 状态转移缺 BOSS_TELEGRAPH | §5 状态转移图 |
| 2 | pve/roundMachine.ts 注释写 XState → 改为自定义 | 文件组织 |
| 3 | lib/cards.ts / lib/upgrades.ts 已迁入 types/，文件组织里应去掉 | 文件组织 |
| 4 | 步骤 3 写 evaluator.ts + scoring.ts → 实际还是 .js | §3 验收标准 |
