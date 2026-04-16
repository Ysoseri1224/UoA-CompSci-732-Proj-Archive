/**
 * 全局错误处理中间件
 * 必须挂载在所有路由之后，参数列表必须是 (err, req, res, next) 四个才会被 Express 识别为错误处理器
 */
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || '服务器内部错误';

  res.status(status).json({
    success: false,
    message,
    data: null,
  });
};

export default errorHandler;
