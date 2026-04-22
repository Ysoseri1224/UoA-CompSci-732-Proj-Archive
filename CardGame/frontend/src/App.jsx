import { RouterProvider } from 'react-router-dom';
import router from './router/index.jsx';

// Root application component.
// Passes the router configuration to React Router's RouterProvider.
// Global providers (auth context, error toasts, etc.) will wrap this in later PRs.
function App() {
  return <RouterProvider router={router} />;
}

export default App;
