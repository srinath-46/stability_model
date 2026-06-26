import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useProjects } from '../../hooks/useProjects';
import { useEffect, useState, useMemo } from 'react';
import { Truck, Package, Plus, User, LogOut, Calendar, BarChart3, Inbox, Loader, Sun, Moon, Search, Filter, TrendingUp, Activity, Box, XCircle, AlertTriangle } from 'lucide-react';
import './Dashboard.css';

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { getProjectsByDriver } = useProjects();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  // Computed stats
  const stats = useMemo(() => {
    if (projects.length === 0) return null;
    const items = projects.reduce((acc, p) => acc + (p.itemCount || 0), 0);
    const earnings = projects.reduce((acc, p) => acc + (p.payment?.amount || 0), 0);
    return {
      totalProjects: projects.length,
      totalItems: items,
      totalEarnings: earnings
    };
  }, [projects]);


  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

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

        {/* Stats Summary */}
        {stats && (
          <div className="stats-summary">
            <div className="summary-card">
              <div className="summary-icon"><Box size={20} /></div>
              <div className="summary-data">
                <span className="summary-value">{stats.totalProjects}</span>
                <span className="summary-label">Projects</span>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon"><Package size={20} /></div>
              <div className="summary-data">
                <span className="summary-value">{stats.totalItems.toLocaleString()}</span>
                <span className="summary-label">Items Packed</span>
              </div>
            </div>
            <div className="summary-card earnings-card">
              <div className="summary-icon"><TrendingUp size={20} /></div>
              <div className="summary-data">
                <span className="summary-value">₹{stats.totalEarnings.toLocaleString()}</span>
                <span className="summary-label">Total Earnings</span>
              </div>
            </div>
          </div>
        )}


        {/* Search & Filter Bar */}
        {projects.length > 0 && (
          <div className="search-filter-bar">
            <div className="search-input-wrapper">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-buttons">
              <button className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>
                <Filter size={14} /> All
              </button>
              <button className={`filter-btn ${statusFilter === 'submitted' ? 'active' : ''}`} onClick={() => setStatusFilter('submitted')}>
                <Activity size={14} /> Submitted
              </button>
              <button className={`filter-btn ${statusFilter === 'assigned' ? 'active' : ''}`} onClick={() => setStatusFilter('assigned')}>
                <TrendingUp size={14} /> Assigned
              </button>
              <button className={`filter-btn ${statusFilter === 'cancel_requested' ? 'active' : ''}`} onClick={() => setStatusFilter('cancel_requested')}>
                <AlertTriangle size={14} /> Pending Cancel
              </button>
              <button className={`filter-btn ${statusFilter === 'cancelled' ? 'active' : ''}`} onClick={() => setStatusFilter('cancelled')}>
                <XCircle size={14} /> Cancelled
              </button>
            </div>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Inbox size={64} /></div>
            <h3>No projects yet</h3>
            <p>Create your first cargo loading project to get started!</p>
            <button className="new-project-btn" onClick={() => navigate('/driver/new-project')}>
              <Plus size={18} /> Create Your First Project
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Search size={48} /></div>
            <h3>No matches found</h3>
            <p>Try a different search term or filter.</p>
          </div>
        ) : (
          <div className="projects-grid">
            {filteredProjects.map(project => (
              <div key={project.id} className="project-card" onClick={() => navigate(`/driver/project/${project.id}`)}>
                <div className="project-header">
                  <h3>{project.name}</h3>
                  <span className={`status-badge ${project.status}`}>
                    {project.status === 'cancel_requested' ? 'Cancel Pending' : project.status === 'cancelled' ? 'Cancelled' : project.status}
                  </span>
                </div>
                {project.payment && (
                  <div className="card-earnings">
                    <span className="earnings-label">Trip Fee:</span>
                    <span className="earnings-value">₹{project.payment.amount?.toLocaleString()}</span>
                  </div>
                )}
                <div className="project-meta">
                  <div className="meta-row">
                    <span><Truck size={14} /> {project.truckName}</span>
                  </div>
                  <div className="meta-row">
                    <span><Package size={14} /> {project.itemCount} items</span>
                    <span><BarChart3 size={14} /> {project.utilization?.toFixed(1)}%</span>
                  </div>
                  {/* Utilization Progress Bar */}
                  <div className="utilization-bar-container">
                    <div
                      className="utilization-bar-fill"
                      style={{ width: `${Math.min(project.utilization || 0, 100)}%` }}
                    />
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

