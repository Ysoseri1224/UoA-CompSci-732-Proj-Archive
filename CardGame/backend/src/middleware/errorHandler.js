/**
 * Global error handling middleware.
 * Must be mounted after all routes. The four-argument signature (err, req, res, next)
 * is required for Express to recognise this as an error handler.
 */
const errorHandler = (err, req, res, next) => {
  // Keep the fourth arg so Express recognizes this as an error handler.
  void next;
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    success: false,
    message,
    data: null,
  });
};

export default errorHandler;
