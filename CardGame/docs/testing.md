# 测试工作流文档

本文档说明当前后端测试基础设施的目录结构、测试入口，以及数据库测试的运行约定。

## 当前测试目录

后端测试位于 `CardGame/backend/tests/`，目前按用途拆成三个目录：

- `tests/unit/`：纯逻辑测试
- `tests/db/`：数据库与模型测试
- `tests/api/`：API 集成测试预留目录

## 测试入口

当前可用的测试命令定义在 `CardGame/backend/package.json`：

| 命令 | 用途 |
|------|------|
| `npm test` | 运行 `tests/` 下所有 `*.test.js` 测试文件 |
| `npm run test:unit` | 运行 `tests/unit/` 下的测试 |
| `npm run test:db` | 运行 `tests/db/` 下的数据库测试 |
| `npm run test:api` | 运行 `tests/api/` 下的 API 测试 |

所有测试命令当前都配置为单并发执行；其中数据库测试必须保持串行，避免共享测试数据库时互相影响。

## 数据库测试工作流

数据库测试使用独立测试库，不复用开发库。

- 环境变量：`TEST_MONGO_URI`
- 默认测试库：`balatro_test`
- 默认连接示例：`mongodb://127.0.0.1:27017/balatro_test`

从宿主机运行数据库测试时：

```bash
cd CardGame/backend
npm run test:db
```

`tests/db/setup.js` 负责数据库测试的基础流程：

- 连接测试数据库
- 在每个测试前清理已有数据
- 在测试结束后断开连接

数据库清理逻辑只允许作用于测试库。当前实现会在清库前检查当前数据库名，不符合测试库约定时直接报错。

## 新增测试时的放置规则

- 纯逻辑或纯函数测试：放入 `tests/unit/`
- 依赖 MongoDB 或 Mongoose model 的测试：放入 `tests/db/`
- 依赖 HTTP 接口或服务启动流程的测试：放入 `tests/api/`

新增测试时，优先使用现有目录和命令，不要额外创建新的测试入口，除非确实引入了新的测试类型。

## 当前状态说明

当前仓库中的测试工作流状态如下：

- `tests/db/` 是目前最明确、约定最完整的正式测试工作流
- `tests/unit/` 已有测试入口和测试目录，但现有用例仍在逐步整理
- `tests/api/` 已有脚本入口和目录结构，当前作为后续 API 集成测试的预留位置

如果后续修改了测试脚本、测试目录结构或数据库测试约定，需要同步更新本文件。
