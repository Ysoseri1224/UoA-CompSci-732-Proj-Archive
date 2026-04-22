# logger.md

## Manual Logging API

### 1. In-request logging (preferred)
  ```js
  req.log.info(message)
  req.log.info(object, message)
  req.log.warn(...)
  req.log.error(...)
  ```

  Use when:

  - Inside route handlers
  - Inside middleware
  - You need request context (req_id / method / url)

  ### 2. Logging with res only

  res.log.info(...)

  Use when:

  - Only res is available in scope
  - Rare case; prefer req.log when possible

  ### 3. Out-of-request logging (global)

  ```js
  logger.info(...)
  logger.error(...)
   ```

  Use when:

  - App startup / shutdown
  - Scheduled jobs / background jobs
  - Non-HTTP flows