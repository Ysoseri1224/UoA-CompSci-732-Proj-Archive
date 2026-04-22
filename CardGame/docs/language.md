# Language Convention

All user-facing text in this project must be written in **English**.

## Scope

This rule applies to:

- API response `message` fields (success and error)
- Validation error messages (`express-validator` `.withMessage(...)`)
- Rate limiter and error handler response messages
- Frontend UI text: labels, buttons, placeholders, toasts, headings, and any visible copy
- Log output written by the application (excluding third-party library output)
- Code comments and JSDoc annotations

## What is NOT required to be in English

- Git commit messages (Conventional Commits format is required regardless)
- Internal team communication and PR discussion
- This documentation file itself

## Rationale

Keeping all output in a single language ensures a consistent user experience and avoids mixed-language strings that are hard to maintain. An i18n library is out of scope for this project.

## How to comply

### Backend — response messages

```js
// Correct
res.status(401).json({ success: false, message: 'Invalid email or password', data: null });

// Wrong
res.status(401).json({ success: false, message: '邮箱或密码错误', data: null });
```

### Backend — validation messages

```js
body('username')
  .isLength({ min: 3 })
  .withMessage('Username must be at least 3 characters'); // English only
```

### Frontend — UI text

```jsx
// Correct
<button>Log in</button>

// Wrong
<button>登录</button>
```
