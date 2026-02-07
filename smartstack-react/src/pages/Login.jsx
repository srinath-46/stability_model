import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Truck, Lock, Mail, Package, Sun, Moon, Shield } from 'lucide-react';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/driver/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleAdminLogin = () => {
    setEmail('l.srinath160706@gmail.com');
    setPassword('admin123');
    setError('');
  };

  return (
    <div className="login-page">
      <button className="theme-toggle login-theme-toggle" onClick={toggleTheme}>
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      
      <div className="login-container">
        <div className="login-header">
          <div className="logo"><Truck size={48} /></div>
          <h1>SmartStack Pro</h1>
          <p className="subtitle">Fleet Cargo Management System</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label><Mail size={14} /> Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div className="input-group">
            <label><Lock size={14} /> Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Please wait...' : <><Lock size={16} /> Sign In</>}
          </button>
        </form>
        
        <div className="admin-login-section">
          <div className="divider"><span>or</span></div>
          <button type="button" className="admin-login-btn" onClick={handleAdminLogin}>
            <Shield size={16} /> Login as Admin
          </button>
          <p className="admin-hint">Admin: l.srinath160706@gmail.com / admin123</p>
        </div>
      </div>
      
      <div className="login-bg">
        <div className="truck-icon"><Truck size={48} /></div>
        <div className="truck-icon delay-1"><Package size={48} /></div>
        <div className="truck-icon delay-2"><Truck size={48} /></div>
      </div>
    </div>
  );
}
