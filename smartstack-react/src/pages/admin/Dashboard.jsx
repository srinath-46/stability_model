import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useProjects } from '../../hooks/useProjects';
import { useEffect, useState } from 'react';
import { Truck, User, LogOut, BarChart3, Eye, Package, Inbox, Loader, Sun, Moon, UserPlus, X, CheckCircle } from 'lucide-react';
import './Dashboard.css';

export default function AdminDashboard() {
  const { user, logout, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { getAllProjects, updateProject } = useProjects();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: '', email: '', password: '' });
  const [addingDriver, setAddingDriver] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const loadProjects = async () => {
    const data = await getAllProjects();
    setProjects(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleAddDriver = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    setAddingDriver(true);

    if (newDriver.password.length < 6) {
      setAddError('Password must be at least 6 characters');
      setAddingDriver(false);
      return;
    }

    const result = await register(newDriver.email, newDriver.password, newDriver.name, 'driver');
    
    if (result.success) {
      setAddSuccess(`Driver "${newDriver.name}" added successfully!`);
      setNewDriver({ name: '', email: '', password: '' });
      setTimeout(() => {
        setShowAddDriver(false);
        setAddSuccess('');
      }, 2000);
    } else {
      setAddError(result.error);
    }
    
    setAddingDriver(false);
  };

  const handleAssignDriver = async (projectId) => {
    // Update project status to 'assigned'
    const result = await updateProject(projectId, { 
      status: 'assigned',
      assignedAt: new Date().toISOString()
    });
    
    if (result.success) {
      // Reload projects to show updated status
      loadProjects();
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page admin loading-state">
        <Loader size={48} className="spinner" />
        <p>Loading plans...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page admin">
      <header className="dashboard-header">
        <div className="header-left">
          <span className="logo"><Truck size={28} /></span>
          <h1>SmartStack Pro</h1>
          <span className="admin-badge">ADMIN</span>
        </div>
        <div className="header-right">
          <button className="add-driver-btn" onClick={() => setShowAddDriver(true)}>
            <UserPlus size={16} /> Add Driver
          </button>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <span className="user-info"><User size={16} /> {user?.name}</span>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>
      
      <main className="dashboard-main">
        <div className="dashboard-title">
          <h2><BarChart3 size={22} /> All Submitted Plans</h2>
          <span className="total-count">{projects.length} total</span>
        </div>
        
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Inbox size={64} /></div>
            <h3>No plans submitted yet</h3>
            <p>Drivers will submit their cargo plans here once created.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Driver</th>
                  <th>Truck</th>
                  <th>Items</th>
                  <th>Utilization</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(project => (
                  <tr key={project.id}>
                    <td className="project-name">{project.name}</td>
                    <td>{project.driverName}</td>
                    <td><Truck size={14} /> {project.truckName}</td>
                    <td><Package size={14} /> {project.itemCount}</td>
                    <td>
                      <span className="utilization-badge">
                        {project.utilization?.toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${project.status}`}>
                        {project.status === 'assigned' ? 'Assigned' : 'Submitted'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button 
                        className="view-btn"
                        onClick={() => navigate(`/admin/plan/${project.id}`)}
                      >
                        <Eye size={14} /> View
                      </button>
                      {project.status !== 'assigned' && (
                        <button 
                          className="assign-btn"
                          onClick={() => handleAssignDriver(project.id)}
                        >
                          <CheckCircle size={14} /> Assign
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Add Driver Modal */}
      {showAddDriver && (
        <div className="modal-overlay" onClick={() => setShowAddDriver(false)}>
          <div className="add-driver-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><UserPlus size={20} /> Add New Driver</h3>
              <button className="close-btn" onClick={() => setShowAddDriver(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddDriver} className="add-driver-form">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={newDriver.name}
                  onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                  placeholder="Enter driver's name"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={newDriver.email}
                  onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                  placeholder="Enter driver's email"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={newDriver.password}
                  onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                />
              </div>
              
              {addError && <div className="error-msg">{addError}</div>}
              {addSuccess && <div className="success-msg">{addSuccess}</div>}
              
              <button type="submit" className="submit-driver-btn" disabled={addingDriver}>
                {addingDriver ? 'Adding...' : <><UserPlus size={16} /> Add Driver</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
