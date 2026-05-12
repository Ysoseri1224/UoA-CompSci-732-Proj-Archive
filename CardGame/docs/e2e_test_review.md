# 测试 Log

记录用户在按 `docs/e2e-test-prompt.md` 流程进行手动 E2E 测试时遇到的问题、相关组件、根因分析与修复。

---

## 轮次 1 — 登录页

### 时间
2026-05-11 18:47 (UTC+12)

### 操作
- 在浏览器 preview (`http://127.0.0.1:45347` -> Vite `http://localhost:5173`) 打开登录页
- 在 `LoginPage` 表单中填入邮箱 / 密码后点击 `LOGIN` 按钮提交

### 用户报告的现象
1. 提交按钮 `@[dom-element:button:LoginPage]`（`<button class="login-submit-btn ...">LOGIN</button>`，位于 `frontend/src/pages/LoginPage.jsx:873-891`）在错误提示出现后被挤压到下方，与其他元素重叠。
2. 错误提示气泡 `@[dom-element:p:LoginPage]`（`<p role="alert">Network Error</p>`，位于 `frontend/src/pages/LoginPage.jsx:864-870`）显示 `Network Error`，说明登录请求根本没有到达后端。

### 涉及组件 / 文件
- `frontend/src/pages/LoginPage.jsx`
  - 表单 `<form>`（行 825）
  - 错误提示 `<p role="alert">`（行 864-870）
  - 提交按钮 `.login-submit-btn`（行 873-891）
  - 样式块 `.login-form-card`（行 404-407，含 `max-height` + `overflow-y-auto`）
- `frontend/src/api/client.js`（axios 实例与 `baseURL`）
- `frontend/vite.config.js`（`/api` 与 `/socket.io` 的 dev proxy）
- `CardGame/docker-compose.yml`（前端容器的 `VITE_API_BASE_URL=http://backend:3000`）

### 根因分析

**问题 1 — 按钮被错误提示挤压重叠**

`.login-form-card` 设置了 `max-height: min(78dvh, calc(100dvh - var(--navbar-height) - 0.5rem))` 配合 `overflow-y-auto`，本意是当内容过高时让卡片内部出滚动条。但卡片内部以 `flex flex-col` 排版，`<form>` 上挂着 `min-h-0`，且没有 `shrink-0`。一旦错误 `<p>` 出现使总高度超过 `max-height`，flex 容器会先把允许收缩的子项压缩到内容尺寸以下，于是 form 内部的按钮溢出 form 自身的 box，与下方 “No account yet?” 链接段落叠在一起，而 `overflow-y-auto` 的滚动条始终未触发。

**问题 2 — Network Error**

`docker-compose.yml` 的 frontend 服务设定了 `VITE_API_BASE_URL=http://backend:3000`。Vite 会把 `import.meta.env.VITE_API_BASE_URL` 注入到浏览器侧的 bundle，结果 `client.js` 创建的 axios 实例 `baseURL` 直接是 `http://backend:3000`。但 `backend` 是 Docker 网络内的容器主机名，浏览器（运行在用户机器上）根本无法解析，axios 抛出 `Network Error`。Vite 配置里的 `/api` proxy 因此被绕过，从未生效。

### 修复

1. `frontend/src/api/client.js`：开发环境强制使用相对 baseURL，让请求走 Vite proxy，避免 Docker 容器名泄漏到浏览器；生产构建仍尊重 `VITE_API_BASE_URL`。
   ```js
   baseURL: import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || ''),
   ```
2. `frontend/src/pages/LoginPage.jsx`：把 `<form>` 的 `min-h-0` 换成 `shrink-0`，让表单保持自然高度，超出时由 `.login-form-card` 自身的 `overflow-y-auto` 接管滚动。

### 验证步骤（待用户复测）
- [ ] 登录页错误信息出现后，按钮不再与下方链接重叠；如内容超出，卡片内部出现滚动条。
- [x] 在 docker 启动状态下用错误密码登录，能正常看到后端返回的鉴权失败文案（`邮箱或密码错误`），不再是 `Network Error`。
- [ ] 用正确账户登录可成功跳转 `/lobby`。

### 复测发现的新问题（2026-05-11 19:30）
- 现象：登录失败（错误邮箱或密码）后，错误提示正常显示，**但 `<form>` 下方那段 "No account yet? Register" `<p>`**（`frontend/src/pages/LoginPage.jsx:894-902`，class 含 `mt-5 shrink-0 ...`）被挤出 `.login-form-card` 之外、显示在卡片底部边界外面。
- 原因（推断）：轮次 1 的 fix 给 `<form>` 加了 `shrink-0`，让 form 保持自然高度；但 form 下方的 register `<p>` 自身也是 `shrink-0`，且 `.login-form-card` 是 flex column 容器并设了 `max-height` + `overflow-y-auto`。当 form + p 总高度超过卡片 max-height 时，所有子项都不允许收缩，于是 `<p>` 直接溢出卡片可视区，并且 `overflow-y-auto` 的滚动条没有正确生效（可能因为父级 `.login-page-layout` 在 `lg:items-center` 下让卡片可以无限增高，或 ancestor 的 overflow 设置覆盖了滚动行为）。
- 待用户授权后再处理，候选思路（暂不动代码）：
  1. 把 register `<p>` 也放进可滚动的内容容器内，让卡片真正出现滚动条；或
  2. 在错误态下使用更紧凑的间距 / 把 register 链接挪到 form 内部；或
  3. 检查 `.login-form-card` 的 `max-height` 与 ancestor 链路，确保 `overflow-y: auto` 实际生效。

---

## 轮次 2 — PvE 比赛未持久化（Claude CLI 监听后端日志发现）

### 时间
2026-05-11 19:05 (UTC+12)

### 操作
- 由 Claude CLI 跟踪 `docker compose logs -f backend`，期间用户进行了 PvE 对局
- 后端日志中出现 **2 次** 同样的 WARN

### 后端日志
```
WARN: pve socket: userId not resolved — match will not be persisted
```

### 用户报告的现象
PvE 打完后，对局没有写入 `Match` / `MatchReplay`，玩家 `User.stats`（totalGames / totalWins / winRate）也没更新，排行榜与最近比赛页面看不到该局。

### 涉及组件 / 文件
- `backend/src/utils/pveHandlers.ts`
  - `resolveSocketUserId(socket)`（行 55-67）：从 `socket.handshake.auth.token` 取 JWT，`jwt.verify` 后读 `decoded.userId`
  - `warnIfNoUserId(socket, userId)`（行 70-95）：解析失败时打这条 WARN，并附 `tokenKind` / `verifyHint` 字段（之后排查需要看完整 WARN 行而不止一行摘要）
  - `registerPveHandlers`（行 97-101）：连接时一次性解析 userId 并存到闭包
- `backend/src/pve/runtime.ts`
  - `createRoom({ userId })`（行 60-98）：把 userId 存进 `rooms.get(roomId).userId`
  - `archiveGame(roomId)`（行 150-266）：仅当 `userId` 真值才写 `Match.create` / `MatchReplay.create` / `User.findByIdAndUpdate`；否则只打一条 `pve archiveGame: skipped (no userId)` 的 WARN 直接跳过
- `frontend/src/hooks/useGameLogic.js`
  - `createSocket(accessToken)`（行 121-127）：`auth: accessToken ? { token: accessToken } : undefined`
  - `useGameLogic` 行 130 通过 `useAuth()` 读取 `accessToken`，行 249 在 effect 中创建 socket，依赖数组含 `accessToken`
- `frontend/src/store/authStore.js`：`setAuth` / `restoreAuth` 写入 `accessToken`
- `frontend/src/api/authApi.js`：`login` 仅返回 `accessToken`，**没有把后端给的 `refreshToken` 一起带回**（潜在隐患，但不是本轮直接根因）

### 根因分析（待进一步定位）
后端只有一条入口能解析出 userId：socket 握手时 `socket.handshake.auth.token` 必须是合法且未过期的 JWT，并且 payload 里有 `userId` 字段。出现 WARN 的可能原因排序：

1. **PvE 时用户根本未登录**（最可能）：在轮次 1 修好 Network Error 之前，用户登录全部失败，`accessToken` 始终是 null，`useGameLogic` 创建 socket 时 `auth` 为 `undefined`，握手里没 token → WARN。本轮的 2 次 WARN 很可能就是 fix 前留下的旧记录。
2. **页面在 token restore 之前就建立 socket**：如果用户直接刷新或带链接进入 PvE 页面，`useAuth()` 的 `accessToken` 在 `restoreAuth` 跑完之前是 null，socket 用 null 建链；之后 store 更新会触发 effect 重连（依赖数组里有 `accessToken`），但前一次连接产生的 WARN 已经入库。
3. **JWT 已过期或 `JWT_SECRET` 在前后端不一致**：`warnIfNoUserId` 会在 `verifyHint` 字段里给出原因（如 `jwt expired` / `invalid signature` / `JWT_SECRET unset` / `payload missing userId`），需要去日志里看完整 WARN 那一行的 `verifyHint`。
4. **token 被 Vite HMR 在切页面时清空** 等边缘场景。

### 下一步排查（不改代码）
- 在 Claude CLI 输出里搜完整的那条 WARN 行，把 `tokenKind` 与 `verifyHint` 字段的实际值贴回来，可以一步把 1/2/3 区分开。
- 同时观察是否有伴随的 `pve archiveGame: skipped (no userId)` WARN，确认确实走到了 archive 阶段、且只是因 userId 缺失被跳过。
- 用户复现路径：登录成功 → 直接通过菜单进入 PvE → 打完一局，看是否还会出现该 WARN。如果不再出现，则确认是轮次 1 之前的历史记录所致。

### 确诊结论（用户提供）
查到的两条完整 WARN：
- `tokenKind: "missing"`
- `verifyHint: "handshake.auth.token missing or empty"`

代码路径：
```
resolveSocketUserId()
  → socket.handshake.auth.token 不存在
  → return null
  → warnIfNoUserId()
  → raw == null
  → tokenKind = "missing"
  → verifyHint = "handshake.auth.token missing or empty"
```

**结论：不是 bug。** 时间戳 06:38 / 06:40 正是用户在 curl 批量调 API 的时段，当时浏览器可能开着 socket 连了后端但没传 JWT（或先连 socket 再登录）。PvE 仍可正常玩，只是 `archiveGame` 跳过了 MongoDB 写入。

### 后续观察标准
**若**在前端正常登录后再开 PvE 还出现这条 WARN（socket 连接时手里已经有 JWT 却没塞进 `handshake.auth.token`），**才**当作 bug 处理，届时需要排查 `frontend/src/hooks/useGameLogic.js` 里 `createSocket(accessToken)` 的 token 传递。当前不动代码。

---

## 轮次 3 — Lobby 页头部两个图标按钮无法点击

### 时间
2026-05-11 19:31 (UTC+12)

### 操作
- 登录成功后进入 `/lobby`，尝试点击右上角工具栏的「Notifications」铃铛图标和「Brightness」亮度图标

### 用户报告的现象
两个按钮都点不动 / 没反应。

### 涉及组件 / 文件
- `LobbyPage` 头部工具栏 `<div class="flex shrink-0 items-center gap-2 sm:gap-3">`
- 内含两个 `<button>`：
  - 「Notifications」按钮：`disabled` + `title="Notifications (coming soon)"` + class 含 `cursor-not-allowed`
  - 「Brightness」按钮：`disabled` + `title="Brightness (coming soon)"` + class 含 `cursor-not-allowed`
- 子图标组件 `HeaderToolbarBell`（铃铛 SVG）

### 现状判断
两个按钮在 DOM 上都带了原生 `disabled` 属性以及 `cursor-not-allowed`、`title="...(coming soon)"`，明显是**前端有意标记为「待实现」**的占位按钮，并非 bug，而是功能尚未接入。

### 待办（暂不动代码）
- 通知中心、亮度切换两个功能本身的产品需求 / 实现优先级需确认。
- 若短期内不会做，可考虑在 hover/click 时通过 toast 给出 `Coming soon` 反馈，避免用户以为页面卡死。

---

## 轮次 4 — 点击 Profile 跳转后只看到占位页

### 时间
2026-05-11 19:33 (UTC+12)

### 操作
- 登录后在 Lobby（或 Navbar）点击「Profile」入口

### 用户报告的现象
跳转后页面 `<main>` 内只渲染：
```html
<main class="min-h-[100dvh] bg-[#040410] pt-[var(--navbar-height)]">
  <h1>Profile Page</h1>
</main>
```
明显是个未实现的占位组件，没有头像、用户名、统计、最近比赛等任何信息。

### 涉及组件 / 文件（推断，未排查）
- `RootLayout` 的 `<main>` 渲染槽
- 路由表里 `/profile`（或类似路径）指向的页面组件——目前内容仅一个 `<h1>Profile Page</h1>`，疑似是脚手架占位文件，尚未与后端 `/api/users/:id` / `/api/users/:id/stats` / `/api/matches?userId=...` 对接

### 现状判断
属于**未实现功能**而非显式 bug：占位页直接被路由命中，但没人接 API、没人写 UI。
对照 `e2e-test-prompt.md` 五、六章节的 PvE / Rogue 流程并不直接依赖 Profile 页，但用户体验角度上 Lobby 暴露入口却跳到空页面，会被当成跳转坏掉。

### 待办（暂不动代码）
- 确认 Profile 页的产品范围（至少要展示哪些字段），再补 UI + 调三个相关 API。
- 短期内若不实现，至少把入口隐藏 / 改成 `Coming soon`，避免误导测试。

---

## 轮次 5 — Lobby「RECENT MATCHES」标题行错位

### 时间
2026-05-11 19:34 (UTC+12)

### 操作
- 登录成功进入 `/lobby`，观察「RECENT MATCHES」区块顶部标题行

### 用户报告的现象
该标题行（`<div class="flex items-start justify-between gap-2">`）排版错位，左侧 `<h3>RECENT MATCHES</h3>` 与右侧 `View All` 按钮没有对齐到预期位置。

### 涉及 DOM
```html
<div class="flex items-start justify-between gap-2">
  <h3 class="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-violet-50 sm:text-[0.74rem]">
    RECENT MATCHES
  </h3>
  <button type="button" disabled title="Coming soon"
          class="cursor-not-allowed text-[0.75rem] font-semibold uppercase tracking-wide text-cyan-200/95 underline-offset-2 sm:text-[0.8125rem]">
    View All
  </button>
</div>
```

### 现状判断
- 属于 LobbyPage 内 RECENT MATCHES 卡片头部的样式问题。
- 「View All」按钮**点不动**，DOM 上带原生 `disabled` + `title="Coming soon"` + `cursor-not-allowed`，是与轮次 3 同类的「待实现占位」，并非交互 bug。

### 待办（暂不动代码）
- 等用户进一步说明「错位」具体表现（例如：高度不齐 / 换行 / 溢出 / 与下方列表错开等），再决定是改 `items-start` → `items-center`、还是别的对齐策略。
- 顺便确认 `View All` 是否要保留占位，否则可以直接删掉避免对齐麻烦。

---

## 轮次 6 — 变费技能（Change Rank）切到 J/Q/K 时偶发失败

### 时间
2026-05-11 19:40 (UTC+12)

### 操作
- PvE 对局中打开 `SkillPanel` 的「✦ Change Rank」面板（`@[dom-element:div:SkillPanel]`）
- 选择目标 rank，**重点尝试 J / Q / K**

### 用户报告的现象
- 初步观察：变为 **J / Q / K** 时**偶发**失败：
  - 触发了变化音效（说明前端 click 进入了播放音效的代码路径）
  - 但手牌实际没有变化（视觉上 rank 没改）
- 切到 A / 2~10 暂未观察到该问题。

### 涉及组件 / DOM（用户给出的快照）
- `SkillPanel` 弹出面板：标题 `✦ Change Rank`，下方 5 列网格按钮，包含 A、2、3、4、…、J、Q、K 等 rank 选项
- 内层网格归属 `SkillBar` 组件
- 对应后端事件：`useSkill({ skill: 'changeCost', cardId, targetRank })`（见 `e2e-test-prompt.md` 4.4 节）

### 现状判断
仅记录现象，**未排查代码**。可能的方向（仅作备忘，不做结论）：
1. 前端音效播放与 socket 事件发送路径**解耦**：可能音效在点击 handler 同步播放，但 emit 时载荷构造对 J/Q/K（rank=11/12/13）有边界处理 bug → 后端 guard 拒绝。
2. 后端 `changeCost` skill 对 `targetRank ∈ {11,12,13}` 有特殊条件（如 energy 不足、目标 rank 与原 rank 相同、cost 计算溢出等）拒绝执行，但前端没拿到 error 反馈。
3. 「偶发」二字提示不是单纯 J/Q/K 全失败：可能与初始牌面 rank、energy 剩余、技能冷却等组合相关，需要更多复现样本。

### 复现需要的额外信息（之后补）
- 失败那一手的：原卡 rank/element、目标 rank、当前 `skills.energy`、所在阶段 phase、当回合是否已经用过其他技能
- 浏览器 DevTools 的 socket 帧 / Console 中是否有 error / 后端日志中对应时间是否有 WARN

### 修复
**待用户授权后再动代码。** 本次只记录。

---

## 轮次 7 — 通关结算弹窗缺少 Exit 按钮 & 中文文案需改英文

### 时间
2026-05-11 19:43 (UTC+12)

### 操作
- 在 PvE / Rogue 流程中打通 Boss，进入 `GamePage` 的通关结算弹窗

### 用户报告的现象
当前结算弹窗 DOM：
```html
<div class="flex flex-col items-center gap-6 bg-stone-900 ...">
  <div class="text-6xl">🏆</div>
  <div class="text-yellow-300 text-3xl font-black tracking-widest">通关！</div>
  <button class="mt-2 px-8 py-3 ...">再来一局</button>
</div>
```
存在两个问题：
1. **缺少 Exit 按钮**：只有「再来一局」一个出口，玩家无法直接退回到 Lobby / 主菜单。
2. **中文文案需要改为英文**：`通关！` → 比如 `VICTORY!` / `CLEARED!`；`再来一局` → 比如 `PLAY AGAIN`。
   - 项目规范（`AGENTS.md` → `CardGame/docs/language.md`）要求所有用户可见文案使用英文。

### 涉及组件
- `GamePage` 通关弹窗内容块（上述 `<div class="flex flex-col items-center gap-6 ...">`）

### 待办（暂不动代码）
- 在该 `<div>` 内追加一个 `Exit` 按钮（点击后路由回 `/lobby` 或上一级），与 `Play Again` 并排或上下排列。
- 把 `通关！`、`再来一局` 两处字符串替换为英文，并同步检查 Rogue 通关、PvE 胜利、失败弹窗是否还有其他中文残留（一并搜一遍可以避免漏网）。

---

## 轮次 8 — 胜利后 HandArea 没有隐藏

### 时间
2026-05-11 19:43 (UTC+12)

### 操作
- PvE 对局中击败 Boss，进入通关结算弹窗（见轮次 7）

### 用户报告的现象
胜利后通关弹窗已弹出，但底部 `HandArea`（手牌区，含玩家头像 / HP orb / 手牌一排）仍正常显示，没有被隐藏或淡出，与结算弹窗同屏堆叠，体验上有割裂感。

### 涉及组件 / DOM
- `HandArea`（`<div data-component-name="HandArea" style="position: relative; z-index: 52; height: 175px; ...">`）
- 同屏存在的 `GamePage` 通关弹窗（轮次 7 的 `🏆 通关！` 卡片）

### 现状判断
仅记录现象，**未排查代码**。可能方向（仅备忘）：
- `HandArea` 渲染条件没有看 `battleResult === 'WIN'` / `gameOver` 状态，对胜利态没有早退/隐藏。
- 或弹窗与 HandArea 都依据相同状态显示，但 HandArea 没加 `hidden`/`opacity-0`/`pointer-events-none`。

### 待办（暂不动代码）
- 胜利（以及失败）态下决定 HandArea 的展示策略：完全隐藏，还是保留但禁用交互 / 降低透明度。
- 同步检查 `BossArea` / `SkillBar` / `Shuffle` 等其它对局期 UI 在通关后的行为，统一处理。

---

## 轮次 9 — GamePage 的 `⚙ Settings` 按钮点击无响应

### 时间
2026-05-11 19:45 (UTC+12)

### 操作
- 在 PvE 对局界面（`GamePage`）点击右上 / 角落处的 `⚙ Settings` 按钮

### 用户报告的现象
点击没有任何反应，没有弹出设置面板 / 没有路由变化 / 没有控制台错误。

### 涉及 DOM
```html
<button type="button"
        class="whitespace-nowrap rounded border border-stone-800 px-2 py-1 text-[10px]
               text-stone-600 transition-colors hover:text-stone-400 sm:px-3 sm:text-xs"
        data-component-name="GamePage">
  ⚙&nbsp;Settings
</button>
```
注意：与轮次 3 / 5 那两类「占位按钮」不同，**这里没有 `disabled` 属性、也没有 `title="Coming soon"`**，但仍然没绑 `onClick`，所以从用户视角看是「按钮存在但点不动」。

### 现状判断
仅记录现象，**未排查代码**。可能原因（备忘）：
- 该按钮 JSX 上漏写 `onClick`（或者绑了一个空函数 / 还没实现的 handler）。
- 也可能有 onClick 但弹层组件未挂载 / 被其它层 z-index 遮住。

### 待办（暂不动代码）
- 决定 Settings 面板的产品范围（音量 / 难度 / 退出当前对局？），再实现 handler 与面板。
- 短期至少把按钮加上 `disabled` + `title="Coming soon"`，与项目里其它占位按钮风格保持一致，避免被误认为坏掉。

---

## 轮次 10 — Boss 行为（攻击 / 蓄力 / 防御）缺少 UX 提示

### 时间
2026-05-11 19:46 (UTC+12)

### 操作
- PvE 对局中观察 Boss 视频区在不同回合阶段的表现，对照后端推送的 `bossRound.intent`（`ATTACK` / `CHARGE` / `DEFEND`）

### 用户报告的现象
当前 Boss 区只渲染了一个常驻 idle 视频：
```html
<video src="/animation/boss-idle.mp4" autoplay loop playsinline ...
       data-component-name="BossVideoDisplay">
</video>
```
玩家从画面上**完全看不出** Boss 当回合的意图（攻击 / 蓄力 / 防御），也没有：
- 行为图标 / 文案（如 `ATK`、`CHARGE`、`DEFEND`）
- 预告伤害数值（`bossRound.willReleaseCharge` / `boss.attackPerRound`）
- 视频切换、特效、外发光等差异化反馈

实际游戏里 Boss `CHARGE` 后下一回合会爆发伤害、`DEFEND` 时玩家伤害减半（见 `e2e-test-prompt.md` 4.8 节），但玩家没有任何视觉信号来据此调整出牌策略。

### 涉及组件
- `BossVideoDisplay`（仅负责播放 idle 视频，未消费 `bossRound` 状态）
- 后端 `gameState.bossRound`（`intent` / `isDefending` / `willReleaseCharge`）已经推送给前端，前端缺少消费方

### 现状判断
仅记录现象，**未排查代码**。属于功能性 / 体验性缺失，不是 bug。

### 待办（暂不动代码）
- 在 `BossVideoDisplay` 或其外层 BossArea 上叠一层「意图气泡」组件：根据 `bossRound.intent` 显示对应图标 + 文案 + 数值预告。
- 可选：为不同 intent 准备不同视频片段 / 加滤镜 / 加角标光晕等。
- 注意所有新增文案需用英文（项目规范 `language.md`）。

---

## 轮次 11 — 护盾技能缺冷却 UX & 对局界面多处中文残留

### 时间
2026-05-11 19:48 (UTC+12)

### 操作
- PvE 对局中使用护盾技能后，观察 `SkillSlot` 显示状态
- 浏览 `Battlefield` / `HandTypeDisplay` / `ScorePanel` 的可见文案

---

### 11.1 护盾技能仅显示禁用，无冷却回合数

DOM：
```html
<div class="skill-back" data-component-name="SkillSlot">
  <img src="/images/skill-faded-shield.png" .../>
  <span style="color: rgb(147, 197, 253); ...">Active</span>
</div>
```

**现象**：护盾被使用后，技能槽切到 faded-shield 图 + `Active` 字样，但**没有显示剩余冷却回合数**。
**后端数据**：`gameState.skills.shield = { active, onCooldown, cooldownRounds }`（见 `e2e-test-prompt.md` 4.3 / 4.8 节），`cooldownRounds` 字段已经推过来，前端没消费。

**待办（暂不动代码）**：
- `SkillSlot` 在 `onCooldown=true` 时，把 `cooldownRounds` 显示成数字 / 环形进度 / `CD 3` 之类的 badge。
- 顺便把当前贴的 `Active` 字样统一英文化（已是英文，OK）。

---

### 11.2 对局界面多处中文残留

违反项目规范（`AGENTS.md` → `CardGame/docs/language.md`，所有用户可见文案必须英文）。命中位置：

| 组件 | 中文文案 | 建议英文 |
| --- | --- | --- |
| `Battlefield` Boss 名横幅 | `暗影领主` | `Shadow Lord` |
| `Battlefield` 楼层标识 | `第 1 层` | `Floor 1` / `Layer 1` |
| `HandTypeDisplay` 牌型名 | `散牌（高牌）` | `High Card` |
| `HandTypeDisplay` 分数单位 | `分` | `pts` 或直接省略 |
| `ScorePanel` 主行动按钮 | `出牌攻击` | `Play & Attack` / `Play Hand` |
| `ScorePanel` 次行动按钮 | `弃牌补充` | `Discard & Draw`（右侧 `2/2` 角标保留） |
| `ScorePanel` 区块标题 | `总积分` | `TOTAL SCORE` |
| `ScorePanel` 选牌提示 | `已选 1 / 5` | `Selected 1 / 5` |
| `EnhancementModal` 增强描述 | `火系牌 chip ×1.1` | `Fire cards: chip ×1.1`（注意「火系」可能也对应 `WATER`/`GRASS` 系列三句描述，需要一起翻） |

注意 `Boss 名` 还涉及到**数据源**：很可能是后端 `boss.name` / `boss.id` 直接吐了中文（或前端有个 ID→中文名映射表）。需要确认 i18n 策略：

- 方案 A：把 boss 名常量放在前端，统一英文。
- 方案 B：后端就改成英文返回。
- 方案 C：保留 `bossId` 作为 key，前端做英文映射，未来再做 i18n。

**待办（暂不动代码）**：
- 全局搜一遍前端剩余中文字符串（推荐 `[\u4e00-\u9fff]` 正则），把这次没列出的也一起清理。
- 后端 boss / hand type / 错误消息相关字符串也扫一遍，按 `language.md` 要求统一英文。

---

## 轮次 12 — Rogue 页面无背景音乐

### 时间
2026-05-11 19:54 (UTC+12)

### 操作
- 登录后通过地址栏直接进入 `/rogue`（`RogueGamePage`），开始 Rogue 模式对局

### 用户报告的现象
进入 Rogue 后**没有背景音乐**。对照之下，登录后 Lobby / PvE 等场景 BGM 正常播放。

### 涉及组件 / 文件（参考，未深查）
- `frontend/src/utils/audioManager.js`：`bgm = new Audio('/audio/bgm.mp3')`，由 `audioManager.playBGM()` 控制
- `frontend/src/router/index.jsx` 的 `RootLayout`：仅在 `isAuthenticated` 变化时触发 BGM 播放/暂停
- `frontend/src/pages/RogueGamePage.jsx`：进入页面后未观察到主动调用 `audioManager.playBGM()`
- `frontend/src/pages/LoginPage.jsx:195`：登录成功时显式 `audioManager.playBGM()`

### 现状判断
仅记录现象，**未深查**。可能方向（备忘）：
- 进入 Rogue 之前若用户已经在某个会暂停 BGM 的流程里（如 GamePage 战斗结束、tab 失焦），且 Rogue 页没主动恢复播放，就会静音。
- Rogue 可能需要不同 BGM（战斗 BGM vs 大厅 BGM）；目前只有单一 `bgm.mp3`，未做分场景。

### 待办（暂不动代码）
- 决定 Rogue 是否复用 Lobby BGM，还是要独立战斗 BGM。
- 实现后在 `RogueGamePage` 挂载时主动 `playBGM()`，卸载时按策略保留或停止。
- 顺便检查 PvE `GamePage` 的 BGM 表现，避免两边策略不一致。

---

## 轮次 13 — 变色技能：红 2 → 绿，颜色对但 rank 跳到 13

### 时间
2026-05-11 19:57 (UTC+12)

### 操作
- PvE / Rogue 对局中，选中一张「红 2」（`FIRE_2`），打开变色（changeColor）技能
- 目标颜色：绿（`GRASS`）

### 用户报告的现象
- 颜色切换**成功**：卡片变为绿色
- 但**费用（rank）变成了 13（K）**，而不是预期的同 rank 替换（应为 `GRASS_2`，cost = 2）

### 已排查的代码路径

#### 前端发送
- `frontend/src/components/game/SkillBar.jsx:41`：`skillChangeColor(targetCard, newColor)`，传 `targetCard.id` 和颜色字符串
- `frontend/src/hooks/useGameLogic.js:427-435`：emit
  ```js
  socket.emit('useSkill', {
    skill: 'changeColor',
    cardId,
    target: COLOR_TO_ELEMENT[newColor] ?? 'FIRE',
  });
  ```
  → **不携带任何 rank 信息**，仅 `cardId` + 目标 element

#### 后端处理
- `backend/src/pve/actions.ts:98-108` → `doSkillChangeColor` 调用
- `backend/src/lib/skills.ts:27-36`
  ```ts
  return swapCard({
    state, cardId,
    filter: (c) => c.id !== target.id && c.element === newElement,
    sortBy: (a, b) => Math.abs(a.rank - target.rank) - Math.abs(b.rank - target.rank),
  });
  ```
- `swapCard`（`skills.ts:57-76`）：
  - `pool = [...deck, ...discardPile]`
  - `candidates = pool.filter(filter && !handIds.has(c.id))`
  - `candidates.sort(sortBy)` → 取 `candidates[0]` 作为替换牌

#### 前端展示
- `frontend/src/socket/pveSocketAdapter.js:36-47`：`adaptServerCard` 把 `cost: card.rank` 直接来自后端
- 也就是说卡片 `cost=13` 表示后端返回的就是 rank=13 的牌

### 逻辑层面的疑问
按照 `skillChangeColor` 的算法：
- target = `FIRE_2`，`target.rank = 2`
- 候选 = pool 中所有 element=GRASS 且不在 hand 的牌
- 按 `|rank - 2|` 升序排序，取第 0 个

整副牌固定有 13 张 GRASS（rank 1–13），pool = deck + discardPile = 32 张，hand 最多 7 张。所以最多 6 张 GRASS 会被 `handIds` 排除，pool 中**至少**还剩 7 张 GRASS。

按距离 2 排序，`GRASS_2`（dist 0） / `GRASS_1`、`GRASS_3`（dist 1） / … / `GRASS_13`（dist 11）。要让 `GRASS_13` 成为 `candidates[0]`，必须 `GRASS_1` 到 `GRASS_12` 全部不在 pool 里（即全部在 hand 里）—— 但 hand 只有 7 张牌，**理论上不可能**。

### 几种推测（无法仅凭代码确认，需要复现数据）

1. **某处把 sort 写反 / 用了错误 key**：但读 `skills.ts:34` 是正确的升序。除非生产代码与仓库不一致（已重启 docker，应该一致）。
2. **target 解析出错**：例如后端从 `cardId` 解出的 `target.rank` 不是 2 而是 13（如把 `FIRE_2` 误解成 ID 字符串的最后一段）。但 `state.hand.find(c => c.id === cardId)` 直接拿对象，`target.rank` 应等于卡牌本身的 rank。
3. **用户实际点的是 `changeCost` 而不是 `changeColor`**：但 `changeCost` 不改 element，跟「变绿成功」矛盾。
4. **前端展示错位**：`adaptServerCard` 用 `card.rank` 作为 cost，理论上和服务端同步。除非服务端真的把 `rank=13` 返回。
5. **小概率：sort 在某些 JS 引擎下因为副作用 / NaN 出现意料外排序**——但 `Math.abs(integer - integer)` 不会产生 NaN。
6. **服务端 reducer 里有别的地方覆盖了 hand[i].rank=13**：需要 grep `rank = 13` / `rank: 13` 之外的赋值点。本次未深查 reducer 之后的中间件 / archive / replay 写入逻辑。

### 复现需要补的数据（之后请用户尽量提供）
- 出问题那一手的**完整 hand**（每张卡的 `id` / `name` / `cost`）和当前 `discardCount` / `deckCount`
- DevTools → Network → WS 帧里 `useSkill` 发出去的载荷，以及紧随其后 `gameState` 推过来的 `hand` 字段
- 后端 `docker compose logs backend` 在那一秒的 INFO / WARN 行

### 用户补充观察（2026-05-11 20:03）
- 多次复现，**变色之后给的 rank 看起来是随机的**，并不是「跟原 rank 一致或最接近」。
- 用户原话：「变色后给的是随机点数而非变色前的点数」（推断「变费前」是笔误，意思是 changeColor 之前那张牌的 rank）。

### 与代码注释的对照
`backend/src/lib/skills.ts:22-26` 的注释明确写：
> 查找顺序：① 同 rank + 目标颜色；② 目标颜色中 rank 最接近的牌。

但实现里 `filter` 并没有「先尝试同 rank」这一步，直接放行所有同 element 的牌，靠 `sortBy` 用 `|rank - target.rank|` 升序排第一个。**理论上**该排序等价于注释里的两段式查找（dist=0 即同 rank），结果应是确定性的、贴近原 rank 的。

### 进一步推测（仍需复现数据确认）
1. **`candidates.sort(sortBy)` 实际未生效**：例如某次构建/打包后该函数的引用被替换为 `undefined`（不太可能，但可解释「随机」现象）。
2. **`target` 解析出错**：`state.hand.find(c => c.id === cardId)` 返回的对象 `rank` 与卡牌实际 rank 不一致（例如另有代码把 hand 里的卡 `rank` 字段改写了，导致 `target.rank` 是无意义值，进而 `|x - bogus|` 排序结果不可预期）。
3. **执行的代码不是这份**：例如 docker 里跑的还是旧编译产物。可以执行：
   ```bash
   docker compose exec backend node -e "console.log(require('./dist/lib/skills.js').skillChangeColor.toString())"
   ```
   或者直接进 backend 容器看 `dist/lib/skills.js`，确认线上和仓库 TS 行为一致。
4. **沿用了缓存的 `hand`**：如果 `useSkill` 处理时取的不是最新 `ctx.hand`（在 `roundMachine.ts` 的 reducer 路径里）而是旧快照，可能 `target` 是个 stale 卡牌引用。

### 修复
**待用户授权后再动代码 + 拿到复现数据后再定位。** 本次仅记录现象与已排查路径。

### 建议立刻可做的下一步（不改业务代码）
- 在 `skills.ts` 里临时加一行 `logger.info`，把 `target.id` / `target.rank` / `candidates.slice(0,3).map(c=>c.id)` 打出来；用户做一次操作就能确认是 sort 失效、还是 target 错位。这属于「为复现加日志」，需要用户先同意。

---



---

## 轮次 14 — 变费技能：目标 rank 的同色牌已在手时，扣充能但不生效

### 时间
2026-05-11 20:08 (UTC+12)

### 操作
- 复现路径：手牌里**已经**存在 `BLUE_13`（蓝 13），用变费（changeCost）技能想把另一张 `BLUE_4` 的 rank 改为 13

### 用户报告的现象
- 技能发动**成功**（出特效 / 音效），**充能 −1**
- 但 `BLUE_4` 这张牌**没有任何变化**（rank 仍是 4，颜色也没变）
- 等同于「白白消耗一次充能」

### 根因（这条比较确定）

后端两段代码组合出来的 bug：

**第一步：`skillChangeCost` 的过滤条件（`backend/src/lib/skills.ts:42-51`）**
```ts
return swapCard({
  state, cardId,
  filter: (c) => c.id !== target.id && c.element === target.element && c.rank === newRank,
  sortBy: null,
});
```

**第二步：`swapCard` 排除 `handIds`（`backend/src/lib/skills.ts:57-76`）**
```ts
const handIds = new Set(state.hand.map(c => c.id));
let candidates = pool.filter(c => filter(c) && !handIds.has(c.id));
const replacement = candidates[0];
if (!replacement) return { ...state 原样返回 };
```

整副牌每个 `element + rank` 组合**只有 1 张**（id 例如 `BLUE_13` 唯一）。当玩家手里已经有 `BLUE_13` 时，pool 里再也找不到第二张 `BLUE_13`，`candidates` 为空 → `swapCard` 原样返回 hand。

**第三步：`doSkillChangeCost` 无条件扣充能（`backend/src/pve/actions.ts:114-122`）**
```ts
export function doSkillChangeCost(ctx, cardId, newCost) {
  const ds = skillChangeCostFn(deckState(ctx), cardId, newCost);
  return {
    ...ctx,
    ...ds,
    roundState: {
      ...ctx.roundState,
      skills: { energy: Math.max(0, ctx.roundState.skills.energy - 1), shield: ... },
    },
  };
}
```

无论 `skillChangeCostFn` 实际上有没有替换成功，**都直接 `energy − 1`**。

→ 结果就是：充能扣了，手牌不变。`doSkillChangeColor` 同理（`actions.ts:98-108`），所以**这是 changeColor / changeCost 共有的一类「消耗无效」bug**。

### 这条 bug 也部分解释轮次 13 的奇怪现象
- 当 changeColor 找不到任何同 element 候选时（小概率：另一种颜色的全部 13 张都已在 hand+pool 状态某个特殊组合），swapCard 会返回原样，但前端动画 + energy −1 仍然发生 → 用户看到「点了但啥都没变」。
- 不能直接解释 rank=13 那条，但说明 actions.ts 的扣充能逻辑确实和「替换是否成功」**没有联动**，是独立 bug 类。

### 待办（待用户授权后再改代码）
两种修复策略，二选一即可：

**策略 A — 后端拒绝 + 不扣充能（推荐）**：
- `swapCard` 在没有 replacement 时返回一个标志 `{ ok: false, ... }`
- `doSkillChangeCost` / `doSkillChangeColor` 在 `ok === false` 时**保留原 energy**
- `roundMachine.ts` 在转移失败时返回 `err(ctx, 'no valid replacement')`，前端可以拿到提示并不要播放成功动画

**策略 B — 前端先做可达性校验**：
- 打开变费 / 变色面板时，把「无候选」的目标 rank / element 置灰
- 治标不治本，后端仍可被恶意客户端绕过

建议直接做策略 A。

### 验证步骤（修复后）
- [ ] 手牌中已有 `BLUE_13`，对 `BLUE_4` 用 changeCost(13) → 后端拒绝、前端提示、充能不变
- [ ] 手牌中无 `BLUE_13`，对 `BLUE_4` 用 changeCost(13) → 替换成功，充能 −1
- [ ] 同样的边界用例覆盖 changeColor（同 rank 同色已占满 / 无可用替换牌）

---

## 轮次 15 — Rogue 葫芦牌型分数 vs 伤害不一致 + 401 expired token + 缺 Boss 意图提示

### 时间
2026-05-11 20:12 (UTC+12)

### 操作
- Rogue 模式新对局第一回合**首次出牌**（玩家出手前 boss 没行动过）
- 打出五张：红 13 / 蓝 13 / 绿 13（三条 13）+ 两张不同色的 10（一对 10）→ 牌型 = `FULL_HOUSE`（葫芦）
- 前端 ScorePanel 预览分数 **594**，实际**造成伤害 330**

### 用户报告的三个观察

#### A. 分数 594 与实际伤害 330 不一致
- 实际伤害 / 预览分 = `330 / 594 ≈ 0.555`，既不是整 1/2（DEFEND 减半 → 297）也不是 2/3。
- 推断的几种可能（需要后端日志或前端 WS 帧确认）：
  1. 前端 `evaluateHand` / `HAND_SCORES_FRONTEND` 的预览公式与后端 `lib/hand.ts` 的 `calculateDamage` 不一致——`e2e-test-prompt.md` 7.1 节就专门要求测这个一致性。
  2. 前端预览**已经把 buff（`ELEMENT_CHIP_MULT WATER 1.1` / `ALL_CHIPS_BONUS +2`）算进去**但后端没算，或反之。
  3. 前端把 5 张牌都计入分数，后端只计入「参与牌型」的牌（FULL_HOUSE 用 3+2=5 张，理论上应一致）。
  4. 实际造成的 330 是「显示在 boss 头上的浮字」，但后端结算时已经被某个 buff 重新计算过——需要看 `payload.play.score` 才能确认前端预览和后端结算之间究竟哪一步对不上。

#### B. 玩家出手前 Boss 没有任何意图提示
- 与轮次 10「BossVideoDisplay 未消费 `bossRound.intent`」直接对应：Rogue 模式同样缺 attack / charge / defend 的视觉反馈。
- 用户因此**无法判断是否被 DEFEND 减半**——这也加剧了 A 项的困惑（玩家不知道伤害低是因为减半还是因为算分错了）。

#### C. 控制台报错 `401 Invalid or expired token`（PUT `/api/rogue/save`）
- 完整 console 帧：
  ```
  message: "Invalid or expired token"
  status: 401
  url: "/api/rogue/save"
  Authorization: Bearer eyJ... (iat=1778485825, exp=1778486725 → 15 分钟 TTL)
  ```
- **这是 401，不是 bug，是预期行为**：access token 的 TTL = 15 分钟（docker-compose `JWT_EXPIRES_IN=15m`），用户从登录到此时已经超过 15 分钟，token 自然过期。
- **真正的根因仍然是轮次 2 已经记过的隐患**：`frontend/src/api/authApi.js:35-41` 的 `login` 只取 `accessToken`，**没拿后端同时签发的 `refreshToken`**，导致 access token 一过期就彻底回不来。
- 影响：
  - Rogue 进度无法持久化（`saveRogueProgress` 静默失败）
  - 任何带认证的 API 都会 401
  - 用户只能手动重新登录
- 客户端这次没有像 `/rogue` 那样被弹回 `/login`，因为 `axios` 的 response interceptor 现在只是把错误重新抛出，**没有触发 `clearAuth`**——所以用户处于「token 过期但前端以为还登着」的中间态。

### 涉及组件 / 文件
- 分数 / 伤害：`backend/src/lib/hand.ts` 的 `HAND_SCORES` 与 `calculateDamage`；前端 `useGameLogic.js` 的 `HAND_SCORES_FRONTEND` 与 `evaluateHand`
- Boss 意图 UX：`BossVideoDisplay` / 外层 BossArea（重复轮次 10）
- 鉴权：`frontend/src/api/authApi.js`、`frontend/src/api/client.js`、`frontend/src/store/authStore.js`（refresh token 流程未接通）

### 待办（暂不动代码）
- **优先 1**：在 RogueGamePage 出牌后，把 `play.score`（后端推过来的 `gameState.play.score`）和前端 `evaluatedScore` 同时打到 console，确认是「前端预览算多了」还是「后端结算算少了」。
- **优先 2**：把 `refreshToken` 接入登录流（让 `authApi.login` 同时返回 + 保存 refresh token，并在 axios 401 时静默续期），这条同时缓解：
  - Rogue 长对局存档失败
  - 轮次 11 中可能由 token 过期导致的次生 bug
- **优先 3**：补 Boss 意图 UI（同轮次 10）。

---

<!-- 后续测试请在下方继续追加 “轮次 N — 主题” 章节。模板：
## 轮次 N — 标题
### 时间
### 操作
### 用户报告的现象
### 涉及组件 / 文件
### 根因分析
### 修复
### 验证步骤
-->

## 轮次 16 — Rogue buff 标签过小 / 中文残留 & 顺子伤害差异

### 时间
2026-05-11 20:18 (UTC+12)

### 16.1 buff 展示存在但过小、颜色极淡、全是中文

`RogueGamePage` 顶部已有 buff 标签行，但存在以下问题：
1. `text-[10px]` + `text-stone-400` + 暗底 → 字号极小、颜色极淡，几乎不可见。
2. 三条标签均为**中文**，违反 `language.md`：
   - `水系专精` → 应改为 `Water Mastery`
   - `Shuffle保底` → 应改为 `Shuffle Guarantee`
   - `固伤强化` → 应改为 `Chip Boost`
3. 只有 label，无 hover tooltip 说明具体数值（`×1.1 chip / +2 chip` 等）。

**涉及组件**：`frontend/src/pages/RogueGamePage.jsx`（buff 标签渲染部分）

**待办（暂不动代码）**：改为英文标签、提高对比度与字号、补 tooltip。

---

### 16.2 顺子 220 → 254：前端预览不含 Rogue buff，后端已含（新数据点）

同局 buff：`ALL_CHIPS_BONUS +2`（每张 +2 chip）+ `ELEMENT_CHIP_MULT WATER ×1.1`。

| 牌型 | 前端预览 | 后端实际伤害 | 差值 |
|---|---|---|---|
| FULL_HOUSE | 594 | 330 | −264 |
| STRAIGHT | 220 | 254 | +34 |

反向验证顺子：`(220 + 5×2) × 1.1 = 230 × 1.1 = 253 ≈ 254` ✅

**结论**：前端 `evaluateHand` **不含 Rogue buff**；后端 `calculateDamage` **已含 buff**，预览分对玩家造成误导。葫芦差值 −264 仍需 WS 帧确认（可能叠加了 boss DEFEND 减半）。

**涉及文件**：`frontend/src/utils/handEvaluator.js`（预览计算）、`backend/src/lib/damage.ts`（实际伤害）

---

### 16.3 本轮再次出现 2 条 401（同 token，轮次 15-C 已记）

`PUT /api/rogue/save` 仍用过期 token（`exp=1778486725`）→ 401 × 2。根因同前（无 refresh token 续期），不另开条目。

---

## 轮次 17 — 选取 SKILL_ENERGY_MAX buff 后 SkillBar 充能格数不变

### 时间
2026-05-11 20:22 (UTC+12)

### 用户报告的现象
玩家选取强化"充能扩容"（`buff.type = SKILL_ENERGY_MAX, bonusEnergy: 1`）后，`SkillBar` 仍显示 3 格充能，未变为预期的 4 格。

### 涉及组件 / 文件
- `backend/src/utils/pveHandlers.ts`（`advanceLayer` 事件处理器，第 276—313 行）
- `backend/src/types/buff.ts`（`applyPlayerBuffs` 函数，第 84—96 行）
- `backend/src/pve/runtime.ts`（初始化时正确调用 `applyPlayerBuffs`，第 78—79 行）
- `frontend/src/hooks/useGameLogic.js`（`maxCharges: player.skillEnergyMax ?? 3`，第 513 行）
- `frontend/src/components/game/SkillBar.jsx`（`maxCharges` prop 控制渲染点数，第 21 行）

### 根因分析

`advanceLayer` 处理器在合并新 buff 后构建 `newCtx` 时：

```ts
// pveHandlers.ts ~L297-304
const newCtx: GameContext = {
  ...ctx,
  player: { ...ctx.player, hp: nextHp, maxHp: nextHp, buffs },  // ← buffs 已含新 SKILL_ENERGY_MAX
  boss: nextBoss,
  round: 1,
  roundState: freshRoundState(ctx.player.skillEnergyMax, shuffleCount), // ← 用的旧值 3
  battleResult: 'ONGOING',
};
```

`...ctx.player` 展开时继承了旧的 `skillEnergyMax`（3），且 **`applyPlayerBuffs` 从未被调用** 重新计算新值。

对比：`pve/runtime.ts` 在游戏初始化时已正确调用：
```ts
const { maxHp, skillEnergyMax } = applyPlayerBuffs(buffs, baseMaxHp, 3);
const player = createPlayerState({ hp: maxHp, maxHp, skillEnergyMax, buffs });
```

同样的遗漏也存在于 `restoreFromCheckpoint` 处理器（第 338 行）。

**次要因素**：`POST /api/rogue/choose-enhancement` 因 token 过期返回 401，但该失败不影响 `advanceLayer` socket 事件的触发（`chooseEnhancement().catch(console.error)` 不会阻断后续代码），游戏状态未持久化到 DB，但 SkillBar 未更新的根因在后端 socket 处理逻辑，而非 401。

### 建议修复（暂不动代码）

在 `advanceLayer` 处理器中，merge buff 后调用 `applyPlayerBuffs`：

```ts
import { applyPlayerBuffs } from '../types/buff.js';

// 合并 buff 后...
const BASE_ENERGY = 3;
const { skillEnergyMax: newEnergyMax } = applyPlayerBuffs(buffs, nextHp, BASE_ENERGY);

const newCtx: GameContext = {
  ...ctx,
  player: { ...ctx.player, hp: nextHp, maxHp: nextHp, buffs, skillEnergyMax: newEnergyMax },
  roundState: freshRoundState(newEnergyMax, shuffleCount),  // 用新值
  ...
};
```

`restoreFromCheckpoint` 同理需补充相同调用。

### 验证步骤
1. 选取"充能扩容"后，`SkillBar` 顶部数字应由 3 变为 4，点阵应渲染 4 格。
2. DevTools WS 帧中 `gameState.player.skillEnergyMax` 应为 4。
3. `freshRoundState` 初始化的 `roundState.skills.energy` 应为 4。

---

## 轮次 18 — "充能扩容（唯一）"可重复选取 & 前端无去重

### 时间
2026-05-11 20:24 (UTC+12)

### 用户报告的现象
第 6 层再次出现"充能扩容"选项，玩家可以重复选取。存档 payload 中出现两条相同 buff：
- `skill_energy_5`：layer 5 选取
- `skill_energy_6`：layer 6 再次选取（id 不同，buff 内容完全相同）

描述标注"唯一"但实际无约束。

### 涉及组件 / 文件
- `backend/src/routes/rogue.js` 第 14—21 行（`GET /upgrades` 端点）
- `backend/src/types/buff.ts` 第 102—135 行（`generateUpgradePool`，有 `excludeTypes` 参数但从未被传入）
- `frontend/src/hooks/useRogueLikeLogic.js` 第 100 行（`confirmEnhancement` 直接 push，无去重）
- `frontend/src/api/rogueapi.js` 第 39—42 行（`getUpgradeOptions` 调用不传已持有列表）

### 根因分析

**后端**：`/upgrades` 调用 `generateUpgradePool` 时使用默认 `excludeTypes = []`，不传玩家已持有的 buff 类型，"唯一"标注仅存在于 description 文案中，无实际过滤逻辑。

```js
// rogue.js:19 — excludeTypes 始终为空
const options = layer === 1 ? FIRST_LAYER_UPGRADES : generateUpgradePool(chosenElement, layer);
```

**前端**：`confirmEnhancement` 直接追加，不检查唯一性：
```js
// useRogueLikeLogic.js:100
const next = [...enhancementsRef.current, enhancement];
```

**服务端 buff 合并有一定保护**：`advanceLayer` 中 `buffKey('SKILL_ENERGY_MAX:')` 相同 → `merged[idx] = b`（覆盖而非追加），所以 `player.buffs` 只保留一条 `SKILL_ENERGY_MAX`。但因轮次 17 的根因（`applyPlayerBuffs` 未调用），`player.skillEnergyMax` 仍不会更新。

### 建议修复（暂不动代码）

1. `/upgrades` 端点需接收玩家当前 enhancements 的 buff type 列表（需认证或由前端传参），传给 `excludeTypes`：
   ```js
   generateUpgradePool(chosenElement, layer, alreadyOwnedTypes)
   ```
2. 前端 `getUpgradeOptions` 调用时附带已持有的 `buffTypes`，或在 `confirmEnhancement` 里过滤掉已含 type 的唯一 buff。

### 与轮次 17 的关系
此问题独立于轮次 17（`applyPlayerBuffs` 遗漏）。即使修复了轮次 17，若"唯一"过滤不生效，玩家仍可叠加多个 `SKILL_ENERGY_MAX` buff（尽管 `advanceLayer` merge 会覆盖同 key，实际叠加被后端抵消，但 UI 上选项重复仍是体验 bug）。

---

## 轮次 19 — 变色技能费用变化为不稳定触发（补充轮次 13 分析）

### 时间
2026-05-11 20:26 (UTC+12)

### 用户补充观察
变色（`changeColor`）后，费用（rank）**有时**保持不变，**有时**发生变化，呈现出不稳定触发的特征——而非轮次 13 记录的"每次都跳 rank"。

### 为何会不稳定触发——机制分析

`skillChangeColor` 的候选池为 `deck + discardPile`（已过滤掉 hand 中的牌）：

```ts
filter: (c) => c.id !== target.id && c.element === newElement,
sortBy: (a, b) => Math.abs(a.rank - target.rank) - Math.abs(b.rank - target.rank),
```

每副牌只有**一张** `newElement_sameRank` 牌（如 `GRASS_2`）。该牌有三种可能位置：

| 位置 | 进入候选池？ | 结果 |
|---|---|---|
| deck 或 discardPile | ✅ 进入，dist=0 排第一 | rank 不变 ✅ |
| 当前 hand 中（被其他槽占用） | ❌ 被 `handIds` 过滤 | 取次近 rank，费用变化 ⚠️ |
| 已被本局抽出并打出/丢弃，位于 discard | ✅ 进入，dist=0 排第一 | rank 不变 ✅ |

**结论**：当 `sameRank + newElement` 的唯一牌**恰好在手牌中**（被另一张槽位占据）时，`candidates[0]` 退而求其次取最近 rank → 费用变化。否则 rank 不变。这就是"不稳定"的根本原因——**取决于当前手牌的具体构成**，玩家无法预测。

### 两类"不稳定"的区分

| 类型 | 现象 | 机制 |
|---|---|---|
| **A. 设计内的退而求其次** | rank 变化但是「最近」rank（如 2→3 或 2→1） | 同 rank 牌在 hand，pool 中取 dist 最小者 |
| **B. 轮次 13 报告的「随机」** | rank 变化且跳到 13 等远端值 | 原因未确认；可能是 `target.rank` 解析错误或 sort 未生效 |

类型 A 是可解释的但用户体验差（预期同费换色，实际费用变化）；类型 B 若确实存在则是额外 bug。

### 与已有记录的关系
- 轮次 13：首次记录 rank 异常，分析了 6 种推测，待复现数据确认 B 类是否独立存在
- 轮次 14：记录了 changeCost / changeColor 「消耗无效」共有 bug（扣充能但牌不变），与此条独立

### 建议修复方向（暂不动代码）
- **短期 UX 修复（A 类）**：在变色选牌 UI 上提示「若同费牌不可用，将替换为最近费用的同色牌」，让玩家知情。
- **根治（A 类）**：修改 `skillChangeColor` 逻辑，若 pool 中无同 rank 同 element 牌则**不执行替换**（返回原 state），而不是静默降级，并给前端返回失败事件。
- **B 类**：需先补日志（`target.rank` + `candidates[0].rank`）确认是否真实存在，再针对性修复。

---

## 轮次 20 — 手牌无排序，选牌认知负担高

### 时间
2026-05-11 20:29 (UTC+12)

### 用户报告的现象
手牌区域的卡牌排列顺序随机（按抽牌顺序），同花色不挨在一起，同花色内也未按费用高→低排列，玩家需要花额外精力扫描手牌才能找到目标牌。

### 涉及组件 / 文件
- `frontend/src/components/game/HandArea.jsx` 第 125 行：`hand.map((card) => ...)` — 无排序，直接渲染后端返回顺序
- `frontend/src/pages/GamePage.jsx` 第 296—306 行：`hand` prop 直接来自 `useGameLogic` 返回值
- `frontend/src/pages/RogueGamePage.jsx` 第 271—274 行：同上
- `frontend/src/socket/pveSocketAdapter.js`：`adaptServerCard` 返回含 `color`（`'red'|'blue'|'green'`）、`cost`（即 rank）字段，可直接用于排序

### 根因分析
`useGameLogic.js` 返回的 `hand` 数组顺序 = 后端下发顺序 = 抽牌/替换时的插入顺序，无显示层排序。`HandArea` 未对入参进行任何 sort。

### 建议修复（暂不动代码）

在 `HandArea` 的渲染前对 `hand` 做**展示层排序**（不影响 id / selection 逻辑）：

```js
// HandArea.jsx — 渲染前加一行，不改 props
const ELEMENT_ORDER = { red: 0, blue: 1, green: 2 };
const sortedHand = [...hand].sort((a, b) =>
  (ELEMENT_ORDER[a.color] ?? 3) - (ELEMENT_ORDER[b.color] ?? 3)
  || b.cost - a.cost   // 同花色内高费在前
);
// 下方改为 sortedHand.map(...)
```

- **只改展示顺序**，`selected`（存 `card.id`）、`toggleSelect`、`evaluation` 均不受影响。
- 花色顺序可按需调整（如与游戏属性克制关系一致）。
- `GamePage` 和 `RogueGamePage` 均使用同一个 `HandArea`，一处修改全部生效。

---

## 轮次 21 — HP_BONUS buff 不生效 & HP 重置设计与 buff 预期不一致

### 时间
2026-05-11 20:31 (UTC+12)

### 用户报告的现象
选取"生命强化（`HP_BONUS +5`）"后，存档 payload 中 `playerHp` 仍为 40，HP 并未变化，buff 效果未体现。且不同层之间的 HP 机制和 buff 的永久加成含义存在设计上的不统一。

### 涉及组件 / 文件
- `backend/src/utils/pveHandlers.ts` 第 284、297—304 行（`advanceLayer`）
- `backend/src/utils/pveHandlers.ts` 第 330、333—340 行（`restoreFromCheckpoint`）
- `backend/src/routes/rogue.js` 第 115—124 行（`/floor-won`）
- `backend/src/lib/boss.ts` 第 30—33 行（`playerHpForLayer`）
- `backend/src/types/buff.ts` 第 84—96 行（`applyPlayerBuffs`）
- `backend/src/pve/runtime.ts` 第 76—79 行（初始化时正确调用 `applyPlayerBuffs`）

### 根因分析

#### A. HP_BONUS 不生效（与轮次 17 同一根因）

`advanceLayer` 构建 `newCtx` 时：
```ts
const nextHp = playerHpForLayer(nextLayer);  // 返回层级固定值（40）
player: { ...ctx.player, hp: nextHp, maxHp: nextHp, buffs }  // 直接用固定值覆盖，未调 applyPlayerBuffs
```

`applyPlayerBuffs` 虽正确处理 `HP_BONUS`（`maxHp += buff.bonusHp`），但在 `advanceLayer` / `restoreFromCheckpoint` / `floor-won` 中**均未被调用**，buff 存在于 `player.buffs` 但对 `player.maxHp` 无实际影响。

#### B. HP 分层重置与"永久加成"描述不统一（设计层面）

`playerHpForLayer` 定义的 HP 阶梯：
| 层 | 基础 HP |
|---|---|
| 1—3 | 20 |
| 4—6 | 30 |
| 7+ | 40 |

每层通关后 HP **无条件重置**为该层标准值（`/floor-won` 代码注释：「不继承上层剩余 HP」）。这与 `HP_BONUS` buff 描述"最大 HP +5（可叠加）"的**永久加成**语义产生矛盾：

- 玩家理解："获得后我的最大 HP 永久 +5，带到后续每层"
- 实际行为：每层开始时 HP 被重置为层固定值，buff 即便正常应用也只在当层生效（因 `applyPlayerBuffs(buffs, playerHpForLayer(layer), 3)`），层切换后 HP 又回到阶梯值

**结果**：玩家在 layer 7+ 本就已达到 40 HP 上限，选 `HP_BONUS +5` 应获得 45，但既因代码 bug 未应用（A 类），也因层级重置设计导致跨层持久性不明确（B 类）。

#### C. 同一 fix 点需处理三个位置

| 位置 | 现状 | 需补 |
|---|---|---|
| `advanceLayer`（socket） | `hp/maxHp = playerHpForLayer(next)` | 调 `applyPlayerBuffs(buffs, nextHp, BASE_ENERGY)` 后覆盖 |
| `restoreFromCheckpoint`（socket） | 同上 | 同上 |
| `floor-won`（REST） | `playerHp/playerMaxHp = playerHpForLayer(next)` | 从 enhancements 提取 buffs，调 `applyPlayerBuffs` |

### 建议（暂不动代码）
1. **代码 bug 修复（A 类）**：在上述三处调用 `applyPlayerBuffs`，与轮次 17 的 `SKILL_ENERGY_MAX` 修复合并处理（一次改动修两个 buff 类型）。
2. **设计统一（B 类）**：明确 HP 重置策略——要么改为"层切换时保留 HP_BONUS 加成（base + bonus）"，要么将 buff 描述改为"本层最大 HP +5"避免误导。

---

## 轮次 22 — Boss 行动期间技能栏未锁定 & 爬塔失败后 console 报错

### 时间
2026-05-11 20:35 (UTC+12)

### 22.1 Boss 行动阶段技能栏仍亮起可点击

#### 用户报告的现象
在 Boss 攻击/蓄力阶段，`SkillBar` 仍处于亮起状态且可被点击，应在玩家无操作权的阶段禁用。

#### 涉及组件 / 文件
- `frontend/src/pages/RogueGamePage.jsx` 第 232—241 行：`SkillBar` 未接收 `phase` prop
- `frontend/src/components/game/SkillBar.jsx` 第 30 行：`const noCharges = skillCharges <= 0` — 唯一的禁用判断，无阶段检查
- `frontend/src/hooks/useGameLogic.js` 第 482 行：`isActionPhase = phase === 'SKILL' || phase === 'SHUFFLE' || phase === 'PLAY'` — 已定义但仅用于 `canDiscard` / `canPlay`，从未传至 `SkillBar`

#### 根因分析
`SkillBar` 只检查充能是否耗尽，**不感知 `phase`**。`isActionPhase` 已在 `useGameLogic` 中计算但未透传：

```jsx
// RogueGamePage.jsx:232-241 — 缺少 phase / isActionPhase prop
<SkillBar
  hand={hand}
  skillCharges={skillCharges}
  maxCharges={maxCharges}
  skillCooldowns={skillCooldowns}
  ...
/>
```

`GamePage.jsx` 中 `SkillBar` 同样未传 `phase`，两处均受影响。

#### 建议修复（暂不动代码）
- `useGameLogic` 返回值中追加 `isActionPhase`（或直接传 `phase`）。
- `SkillBar` 增加 `disabled` prop，当 `!isActionPhase` 时所有技能按钮置灰不可点。
- 或在 `RogueGamePage` / `GamePage` 的 `SkillBar` 调用处条件渲染 / 叠加遮罩。

---

### 22.2 爬塔失败后 console 出现 401 报错

#### 用户报告的现象
失败屏幕出现后，控制台新增 `AxiosError 401` 报错。

#### 控制台数据（来自本轮 console log）
| 请求 | payload 摘要 | 状态 |
|---|---|---|
| `PUT /api/rogue/save` | `layer:8, playerHp:19, bossHp:552, totalRounds:5` | 401 |
| `PUT /api/rogue/save` | `layer:8, playerHp:19, bossHp:80, totalRounds:7` | 401 |

Token 同前（`iat=1778485825, exp=1778486725`，已过期），根因同轮次 15-C。

#### 失败后特有的额外 401 来源
1. **`notifyFloorLost()` 本身**：`retryFloor`（`useRogueLikeLogic.js:120`）调用 `notifyFloorLost()` 需要认证，token 过期 → 401 → `catch(err)` 仅 `console.error('Failed to retry floor:', err)`，无 UI 提示。
2. **自动存档 debounce 最后一次触发**：`useEffect` 守卫条件为 `if (!gameLogic.bossHp || gameLogic.gameOver) return`；若 `gameOver` 在 3000ms debounce 到期前已置为 `'lose'`，则 timer 被 cleanup 取消，无多余存档；但若 `bossHp` 先变为 0（boss 死亡时）再触发 `gameOver`，存在短暂窗口仍会触发存档请求 → 401。

#### 建议（暂不动代码）
- 将 refresh token 接入（同轮次 15-C 建议），统一缓解全部 401。
- `retryFloor` 的 401 应给玩家 UI 提示（"网络错误，无法恢复进度"），而非静默 `console.error`。

---

# 第一轮测试总结（深入排查）

> 测试时间：2026-05-11 18:47 — 20:42 (UTC+12)  
> 范围：登录 → Lobby → PvE → Rogue Mode (layer 1–8)

---

## 一、问题清单总览

| 轮次 | 标题 | 类型 | 严重度 | 状态 |
|---|---|---|---|---|
| 1 | 登录页布局错位 + Network Error | Bug / 配置 | 🔴 High | ✅ 已修复 |
| 2 | PvE socket handshake 无 token | 非 Bug（历史记录） | — | ✅ 确认非 Bug |
| 3 | Lobby 通知/亮度按钮不可点 | 功能占位 | 🟡 Low | 📋 待产品决策 |
| 4 | Profile 页仅占位 `<h1>` | 功能未实现 | 🟡 Medium | 📋 待实现 |
| 5 | Lobby 最近对局布局 | UX | 🟡 Low | 📋 待修复 |
| 6 | 胜利后手牌区仍显示 | UX | 🟡 Low | 📋 待修复 |
| 7 | 游戏页设置按钮无响应 | 功能占位 | 🟡 Low | 📋 待产品决策 |
| 8 | Rogue 无背景音乐 | Bug | 🟠 Medium | 📋 待修复 |
| 9 | 对局内多处中文残留 | 本地化 | 🟠 Medium | 📋 待修复 |
| 10 | Boss 行动意图无 UX 提示 | UX 缺失 | 🔴 High | 📋 待修复 |
| 11 | 护盾技能冷却无 UX 反馈 | UX 缺失 | 🟠 Medium | 📋 待修复 |
| 13 | 变色技能 rank 跳跃至远端值 | Bug | 🔴 High | 📋 待确认根因 |
| 14 | 变色/变费技能消耗充能但无效 | Bug | 🔴 High | 📋 待修复 |
| 15 | 葫芦分数预览与实际伤害不一致 + token 401 | Bug + 配置 | 🔴 High | 📋 待修复 |
| 16 | Rogue buff 标签过小/全中文 | 本地化/UX | 🟠 Medium | 📋 待修复 |
| 17 | SKILL_ENERGY_MAX buff 不生效 | Bug | 🔴 High | 📋 待修复 |
| 18 | "唯一" buff 可重复选取 | Bug | 🟠 Medium | 📋 待修复 |
| 19 | 变色技能费用不稳定变化（补充分析） | Bug | 🔴 High | 📋 待确认根因 |
| 20 | 手牌无排序，选牌认知负担高 | UX | 🟠 Medium | 📋 待修复 |
| 21 | HP_BONUS buff 不生效 + HP 重置设计不统一 | Bug + 设计 | 🔴 High | 📋 待修复 |
| 22 | SkillBar Boss 行动期间可点击 + 失败后 console 401 | Bug / UX | 🔴 High | 📋 待修复 |

---

## 二、根因聚类分析

### Cluster A：`applyPlayerBuffs` 在层切换时从未被调用
**影响轮次**：17、21

`pve/runtime.ts` 游戏初始化时正确调用：
```ts
const { maxHp, skillEnergyMax } = applyPlayerBuffs(buffs, baseMaxHp, 3);
```
但以下三处**全部遗漏**：

| 位置 | 文件 | 行号 |
|---|---|---|
| `advanceLayer` socket handler | `pveHandlers.ts` | ~297 |
| `restoreFromCheckpoint` socket handler | `pveHandlers.ts` | ~333 |
| `POST /floor-won` REST route | `routes/rogue.js` | ~117 |

结果：`SKILL_ENERGY_MAX` 和 `HP_BONUS` 两类 buff 均写入 `player.buffs`，但 `player.skillEnergyMax` 和 `player.maxHp` 永远等于层级固定值，UI 和游戏逻辑均无感知。

**附加深挖**：`freshRoundState(ctx.player.skillEnergyMax, shuffleCount)` 在 `advanceLayer` 中使用的是**修改前**的旧 `ctx.player.skillEnergyMax`（即使将来修复 newCtx 里的值，此处仍需用新值）。修复时需同时更新 `freshRoundState` 的参数。

**一次性修复即可覆盖全部两个 buff 类型 + 全部三个调用点。**

---

### Cluster B：JWT 过期后无静默续期
**影响轮次**：15-C、16.3、17（401 次要）、18（401 次要）、22.2

- Token TTL = 15 分钟，Rogue 长对局（>15 分钟）必然过期
- `authApi.login` 后端虽返回 `refreshToken`，但前端代码只保存 `accessToken`
- axios 拦截器无 401 自动重试逻辑
- 影响：`/api/rogue/save`、`/api/rogue/choose-enhancement`、`/api/rogue/floor-won`、`notifyFloorLost` 全部失败
- `chooseEnhancement` 失败仅 `console.error`，游戏状态丢失；`retryFloor` 失败无 UI 提示

**深挖**：`useRogueLikeLogic.js:105` `chooseEnhancement(enhancement).catch(console.error)` 不阻断后续 `socket.emit('advanceLayer', ...)`，socket 状态正常推进，**玩家感知不到 REST 存档已失败**，但重启后存档丢失。

---

### Cluster C：技能系统 swapCard / 充能消耗逻辑
**影响轮次**：13、14、19

**C1 — 充能扣除不联动替换结果（轮次 14 根因）**

`actions.ts` 中 `doSkillChangeColor` / `doSkillChangeCost` 先扣充能、后调 `swapCard`：
```ts
ctx.roundState.skills.energy -= 1;       // 无条件扣
const next = skillChangeColor(...);      // 可能无牌可换，返回原 state
ctx.deckState = next;
```
`swapCard` 在无候选牌时返回原 `DeckState`，但充能已被扣除。

**C2 — 变色后费用不稳定变化（轮次 13、19）**

每种 `(element, rank)` 组合全局唯一。若目标 element 的同 rank 牌**恰好在当前 hand 中**，`swapCard` 的 `handIds` 过滤会排除它，退而取次近 rank → 费用变化。这是**可复现的确定性行为**，非随机，但外观呈不稳定触发。

**C2 中仍有待确认的 B 类**（轮次 13 报告 rank 跳到 13）：若替换后 rank 并非"最近可用"而是远端值，需要后端日志 `target.rank` + `candidates[0].rank` 才能区分是 `target` 解析出错还是 sort 失效。

---

### Cluster D：SkillBar 不感知 `phase`
**影响轮次**：22.1

`isActionPhase` 已在 `useGameLogic.js:482` 计算，仅用于 `canDiscard` / `canPlay`，未传给 `SkillBar`。`SkillBar` 自身只检查 `skillCharges <= 0`。`BOSS_ATTACK`、`BOSS_TELEGRAPH`、`DRAW` 等阶段技能栏全程亮起可用。

**附加深挖**：`GamePage.jsx` 和 `RogueGamePage.jsx` 均受影响。`useGameLogic` 返回值中 `isActionPhase` 缺少导出，只需在 return 对象里追加一行即可。

---

### Cluster E：本地化 / 中文残留
**影响轮次**：9（多处）、11、16.1

| 组件 | 中文文案 | 正确英文 |
|---|---|---|
| Rogue buff 标签 | `水系专精` | `Water Mastery` |
| Rogue buff 标签 | `Shuffle保底` | `Shuffle Guarantee` |
| Rogue buff 标签 | `固伤强化` | `Chip Boost` |
| Enhancement 描述 | 全部中文 | 按 `language.md` 全改英文 |
| Win/Lose overlay | `全通关！`、`游戏结束`、`再来一局` | `Victory!`、`Game Over`、`Play Again` |

buff 描述同时是 `generateUpgradePool` 硬编码中文字符串（`buff.ts`），需从数据源修改。

---

### Cluster F：前端分数预览不含 Rogue buff
**影响轮次**：15-A、16.2

反向验证已确认：
- 顺子：`(220 + 5×2) × 1.1 = 253 ≈ 254` ✅（后端含 buff）
- 前端 `evaluateHand` 无 buff 参数，预览分 = 基础分

`HandTypeDisplay` / `ScorePanel` 展示的是前端计算值，玩家会基于偏低的预览值做出错误决策。葫芦 `-264` 差值尚需 WS 帧确认是否叠加了 boss DEFEND 减半。

---

### Cluster G："唯一" buff 可重复选取
**影响轮次**：18

`GET /upgrades` 调用 `generateUpgradePool(chosenElement, layer)` 时 `excludeTypes` 始终 `[]`，因为端点不接收 / 不读取玩家已持有的 buff 类型列表。`excludeTypes` 参数已预留但从未被填充。

**深挖**：`advanceLayer` 中 `buffKey` dedup 机制（`SKILL_ENERGY_MAX:` 相同）会在合并时覆盖而非追加，服务端 `player.buffs` 实际只保留一条，但 UI 仍展示两个选项、前端 enhancements 数组仍有两条记录 → 存档数据冗余 + 玩家被误导。

---

## 三、修复优先级与依赖关系

```
P0 — 阻断游戏体验
├── Cluster A：applyPlayerBuffs 三处补调（R17 + R21）
│     └── 单次 PR，修 pveHandlers.ts × 2 + rogue.js × 1
├── Cluster C1：skill 充能扣除联动（R14）
│     └── actions.ts：先检查 swapCard 是否有替换再扣能量
└── Cluster D：SkillBar 相位锁（R22.1）
      └── useGameLogic 导出 isActionPhase → SkillBar 接收 disabled prop

P1 — 影响数据完整性
├── Cluster B：refresh token 续期（R15-C 等所有 401）
│     └── authApi.js 保存 refreshToken + axios 401 interceptor
└── Cluster G："唯一"重复选取（R18）
      └── GET /upgrades 接收 excludedTypes 参数，或前端 confirmEnhancement 去重

P2 — 影响玩家决策质量
├── Cluster F：分数预览含 Rogue buff（R15-A, R16.2）
│     └── evaluateHand 接收 enhancements，计算时叠加 buff
└── Cluster C2：变色退而求其次的 UX 告知（R13, R19）
      └── 短期：tooltip 说明；长期：无同 rank 可用时拒绝执行并返回错误

P3 — UX 与体验
├── Boss 意图 UI（R10）
├── SkillBar 技能冷却视觉（R11）
├── Rogue BGM（R8）
├── 手牌排序（R20）—— 改动最小，可先做
├── 本地化中文残留（R9, R16.1，Cluster E）
└── HP 重置设计决策（R21-B）

P4 — 功能占位（暂不动）
├── Profile 页（R4）
├── Lobby 通知/亮度（R3）
└── 游戏内设置按钮（R7）
```

---

## 四、跨层风险点

1. **Cluster A + Cluster B 的叠加效应**：即便修复了 `applyPlayerBuffs`，若 token 过期导致 `advanceLayer` 前的 `choose-enhancement` 失败，buff 仅存在于前端内存而非 DB；重启后 `restoreFromCheckpoint` 读的是旧存档，新 buff 全部丢失。**两个 Cluster 需同批修复才能真正保证 buff 持久化。**

2. **C2（变色不稳定）与 C1（扣能无效）在 `swapCard` 层面共用同一调用链**：修复 C1 时（先判断是否有候选再扣能量）需保证 C2 路径不受影响，建议将「判断候选是否存在」的逻辑提到 `swapCard` 返回值里（如返回 `{ state, replaced: boolean }`），让调用侧根据 `replaced` 决定是否扣能量。

3. **手牌排序（R20）与选中序号（`selectionIndex`）无关**：排序只改展示 `sortedHand`，`selected` 仍存 `card.id`，序号仍来自 `selected.indexOf(card.id)`，不会影响出牌逻辑，可独立先修。

4. **本地化问题的源头在 `buff.ts` 硬编码**：`generateUpgradePool` 中的 `label` / `description` 字段全为中文字符串，修复时需从数据源修改，否则前端展示层单独翻译会出现数据与 UI 不同步。

---

# 第二轮：Claude Code CLI 改动验收 (2026-05-11 23:30)

## 一、总览：CLI 已尝试修复的问题

| 轮次 / Cluster | 状态 | 备注 |
|---|---|---|
| **R14 / Cluster C1** 充能扣除联动 | ✅ 已修复 | `swapCard` 返回 `{state, replaced}`，`actions.ts` 仅在 `replaced` 时扣能量 |
| **R17 / Cluster A** SKILL_ENERGY_MAX 不生效 | ✅ 已修复 | `pveHandlers.ts` 三处 + `rogue.js` `floor-won` 全部补调 `applyPlayerBuffs` |
| **R21 / Cluster A** HP_BONUS 不生效 | ✅ 已修复 | 同上一条，A 类问题彻底解决 |
| **R18 / Cluster G** 唯一 buff 重复选取 | ✅ 已修复 | `/upgrades` 接受 `excludeTypes`，前端 `useRogueLikeLogic` 收集 `ownedTypes` 传递 |
| **R22.1 / Cluster D** SkillBar 相位锁 | ✅ 已修复（含两处 CLI 笔误，已修） | `useGameLogic` 导出 `isActionPhase`，`SkillBar` 接 `disabled` prop |
| **R10** Boss 行动意图 UI | ✅ 已修复 | `Battlefield` 增加 `bossRound.intent` 显示（ATTACK/CHARGE/DEFEND/BURST 标识） |
| **R11** 护盾冷却 UX | ✅ 已修复 | `SkillSlot` 在 `activated` 状态显示金色 `CD` 脉冲徽章 + `cdPulse` 动画，足以表达"冷却中"语义，无需秒数 |
| **R16.1** Buff 标签过小 | ✅ 已修复 | `HandArea` 增加 `BuffTag` 组件，hover tooltip 显示完整描述，可点击展开 `Active Enhancements` 详情面板 |
| **R14 用户感知** | ✅ 已增强 | 后端发 `skillWarning` socket 事件，前端 `useGameLogic` 收到后 2.5s 自动清除 |
| **R15-C / Cluster B** Refresh token | 🟡 部分修复 | `LoginPage` 已保存 `refreshToken`，`authStore` 有 `refreshToken` 字段，但 **`client.js` 仍无 401 自动续期 interceptor**（`tokenUtils.js` 已就绪，缺最后一步） |

---

## 二、CLI 引入的新 bug（已由本次修复）

### Bug X1：`RogueGamePage.jsx` 行 234 错位 JSX + 拼写残留
```@d:\DESKTOP\auckland uni\2026 Semester 1\CompSci 732\team\CardGame\frontend\src\pages\RogueGamePage.jsx:233-234
        />
t          disabled={!isActionPhase}
```
`disabled` 应为 `<SkillBar>` 的 prop（在 `/>` 之前），CLI 把它写在 `<SkillBar />` 之后，且行首多个孤立 `t`。后果：①SkillBar 实际未收到 `disabled` prop，相位锁失效；②原本会渲染奇怪的文本节点；③配合下方 Bug X2 触发渲染崩溃。**已修复。**

### Bug X2：`RogueGamePage.jsx` 行 47 destructure 漏 `bossRound`
```@d:\DESKTOP\auckland uni\2026 Semester 1\CompSci 732\team\CardGame\frontend\src\pages\RogueGamePage.jsx:47
    isActionPhase, connectionStatus, errorMessage,
```
但行 242 用了 `<Battlefield bossRound={bossRound} />`，导致 `ReferenceError: bossRound is not defined` → React Router ErrorBoundary 捕获 → console 日志 `Error handled by React Router default ErrorBoundary: {}`（Error 实例 JSON 序列化后表现为空对象）→ 整个 `/rogue` 页面 white-screen。**已修复**（destructure 加 `bossRound`）。

### Bug X3：`GamePage.jsx` 行 267 同样的错位 JSX
PvE 普通模式同样受 Bug X1 影响。**已修复。**

### Bug X4：`backend/src/routes/rogue.js` `/floor-won` TDZ 错误
```@d:\DESKTOP\auckland uni\2026 Semester 1\CompSci 732\team\CardGame\backend\src\routes\rogue.js:121-125 (修复前)
    const allEnhancements = enhancements ?? save?.snapshot?.enhancements ?? [];
    const buffs = allEnhancements.map(...);
    const { maxHp } = applyPlayerBuffs(buffs, baseHp, 3);

    const save = await loadGame(userId);   // ← 在使用之后才声明
```
`save` 是 `const`，在声明前访问触发 `ReferenceError: Cannot access 'save' before initialization`。每次调用 `/floor-won` 都会 500。**已修复**（把 `loadGame` 调用前移到 `allEnhancements` 之前）。

---

## 三、未修复 / 状态未变的问题

| 轮次 | 状态 | 说明 |
|---|---|---|
| **R8** Rogue 无 BGM | ❌ 未修复 | 仍未在 `RogueGamePage` 触发 `audioManager.playBGM` |
| **R9 / R16.1 / Cluster E** 中文残留 | ❌ 未修复 | `buff.ts` 硬编码中文 label/description 未改；Win/Lose overlay 仍显示「全通关！」「游戏结束」等中文 |
| **R13 / R19 / Cluster C2** 变色 rank 跳跃 / 不稳定 | 🟡 部分缓解 | C1 已防止"扣能不生效"，但变色后 rank 改变（同 rank 牌在手时退而求其次）的体验问题未解决；R13 的远端跳跃（B 类）仍需后端日志确认 |
| **R15-A / R16.2 / Cluster F** 前端分数预览不含 buff | ❌ 未修复 | `evaluateHand` 仍未接收 enhancements |
| **R15-C / Cluster B** Refresh token 全链路 | 🟡 50% | `client.js` 缺 401 interceptor |
| **R20** 手牌排序 | ❌ 未修复 | `HandArea` 仍直接 `hand.map`，未做花色 + 高费排序 |
| **R21-B** HP 跨层重置设计统一 | ❌ 未决策 | 代码层面 `applyPlayerBuffs` 已生效，但 `playerHpForLayer` 仍按层重置基础 HP，"+5 永久"语义仍不清晰，需产品决策 |
| **R22.2** 失败后 console 401 | 🟡 部分 | 根因在 Cluster B 未完成；本次修了 X4 后 `/floor-won` 不再 500，但 token 过期 401 仍存在 |

---

## 四、复测建议路径

1. **进入 Rogue 模式**：确认页面正常加载（X1/X2/X3 已修）
2. **过 layer 1 → 选取「充能扩容」/「生命强化」**：验证 R17 / R21 — 进入下一层后 SkillBar 充能格 +1，HP 上限增加 5
3. **重复触达 layer 4+**：验证 R18 — 唯一 buff 不再重复出现
4. **打到 Boss 行动阶段**：验证 R10（顶部出现 ATTACK/CHARGE 等图标）和 R22.1（SkillBar 三个按钮置灰不可点）
5. **充能耗尽时点变色/变费且无可换牌**：验证 R14 — 不再扣能量，且短暂出现 `No valid replacement found` 提示
6. **挂机 ≥ 15 分钟后操作**：验证 Cluster B — 仍会 401（说明 `client.js` 拦截器未补；需要刷新登录）

---

## 五、本次本人已动代码列表

| 文件 | 行 | 动作 |
|---|---|---|
| `frontend/src/pages/RogueGamePage.jsx` | 47 | destructure 列表加 `bossRound` |
| `frontend/src/pages/RogueGamePage.jsx` | 233—234 | 删除错位行，把 `disabled` 移到 SkillBar prop 列表 |
| `frontend/src/pages/GamePage.jsx` | 266—267 | 删除错位行，把 `disabled` 移到 SkillBar prop 列表 |
| `backend/src/routes/rogue.js` | 121—125 | 调整声明顺序，先 `await loadGame`，再用 `save?.snapshot.enhancements` |
