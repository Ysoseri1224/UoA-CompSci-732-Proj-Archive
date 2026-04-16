import { validationResult } from 'express-validator';

/**
 * 校验结果检查中间件
 * 配合 express-validator 的校验规则使用：
 * router.post('/register', registerRules, validate, handler)
 * 若存在校验错误则直接返回 400，不进入业务处理函数
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      data: null,
    });
  }
  next();
};

/**
 * POST /api/auth/register 校验规则
 */
import { body } from 'express-validator';

export const registerRules = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度须在 3-20 个字符之间'),
  body('email')
    .isEmail()
    .withMessage('邮箱格式不正确')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('密码至少 8 个字符'),
];

/**
 * POST /api/auth/login 校验规则
 */
export const loginRules = [
  body('email')
    .isEmail()
    .withMessage('邮箱格式不正确')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空'),
];

export { validate };
