import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { register } from '../api/authApi.js';
import { useAuth } from '../hooks/useAuth.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(username, email, password) {
  const trimmedUsername = username.trim();
  if (!trimmedUsername) return 'Username is required.';
  if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
    return 'Username must be 3–20 characters.';
  }
  if (!email.trim()) return 'Email is required.';
  if (!EMAIL_REGEX.test(email)) return 'Enter a valid email address.';
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

function RegisterPage() {
  const { isAuthenticated, setAuth } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Already logged in — go straight to lobby.
  if (isAuthenticated) {
    return <Navigate to="/lobby" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationError = validate(username, email, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { accessToken, user } = await register(username.trim(), email.trim(), password);
      setAuth(user, accessToken);
      navigate('/lobby');
    } catch (err) {
      // Backend returns descriptive English messages for 409 conflicts,
      // e.g. "Username is already taken" or "Email is already taken".
      // The axios interceptor in client.js normalises err.message from the
      // response body, so we can display it directly.
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Create account</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="username">Username</label>
          <br />
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            placeholder="player01"
            autoComplete="username"
            minLength={3}
            maxLength={20}
          />
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <br />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <br />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="min 8 characters"
            autoComplete="new-password"
          />
        </div>

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}

export default RegisterPage;
