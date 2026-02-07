import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useProjects } from '../../hooks/useProjects';
import { useEffect, useState } from 'react';
import { Truck, Package, Plus, User, LogOut, Calendar, BarChart3, Inbox, Loader, Sun, Moon } from 'lucide-react';
import './Dashboard.css';

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { getProjectsByDriver } = useProjects();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      if (user?.uid) {
        const data = await getProjectsByDriver(user.uid);
        setProjects(data);
      }
      setLoading(false);
    };
    loadProjects();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="dashboard-page loading-state">
        <Loader size={48} className="spinner" />
        <p>Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="header-left">
          <span className="logo"><Truck size={28} /></span>
          <h1>SmartStack Pro</h1>
        </div>
        <div className="header-right">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <span className="user-info"><User size={16} /> {user?.name} (Driver)</span>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>
      
      <main className="dashboard-main">
        <div className="dashboard-title">
          <h2><Package size={22} /> My Projects</h2>
          <button className="new-project-btn" onClick={() => navigate('/driver/new-project')}>
            <Plus size={18} /> New Project
          </button>
        </div>
        
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Inbox size={64} /></div>
            <h3>No projects yet</h3>
            <p>Create your first cargo loading project to get started!</p>
            <button className="new-project-btn" onClick={() => navigate('/driver/new-project')}>
              <Plus size={18} /> Create Your First Project
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(project => (
              <div key={project.id} className="project-card" onClick={() => navigate(`/driver/project/${project.id}`)}>
                <div className="project-header">
                  <h3>{project.name}</h3>
                  <span className={`status-badge ${project.status}`}>{project.status}</span>
                </div>
                <div className="project-meta">
                  <div className="meta-row">
                    <span><Truck size={14} /> {project.truckName}</span>
                  </div>
                  <div className="meta-row">
                    <span><Package size={14} /> {project.itemCount} items</span>
                    <span><BarChart3 size={14} /> {project.utilization?.toFixed(1)}%</span>
                  </div>
                  <div className="meta-row date">
                    <span><Calendar size={14} /> {new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
