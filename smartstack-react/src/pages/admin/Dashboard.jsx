import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useProjects } from '../../hooks/useProjects';
<<<<<<< HEAD
import { useEffect, useState, useMemo } from 'react';
import { Truck, User, LogOut, BarChart3, Eye, Package, Inbox, Loader, Sun, Moon, UserPlus, X, CheckCircle, Search, Filter, Activity, TrendingUp, ClipboardList, Clock, XCircle, AlertTriangle, Edit, IndianRupee } from 'lucide-react';
=======
import { useDrivers } from '../../hooks/useDrivers';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Truck, User, LogOut, BarChart3, Eye, Package, Inbox, Loader, Sun, Moon, UserPlus, X, CheckCircle,
  ClipboardList, IndianRupee, Clock, ArrowLeft, Search, Filter, Activity, AlertTriangle, XCircle, MapPin
} from 'lucide-react';
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
import AssignPriceModal from '../../components/AssignPriceModal';
import './Dashboard.css';

export default function AdminDashboard() {
  const { user, logout, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { getAllProjects, updateProject, deleteProject } = useProjects();
  const { drivers, getAllDrivers } = useDrivers();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProjectForAssign, setSelectedProjectForAssign] = useState(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
<<<<<<< HEAD
  const [selectedProjectForAssign, setSelectedProjectForAssign] = useState(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
=======
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247

  const loadProjects = useCallback(async () => {
    const data = await getAllProjects();
    setProjects(data);
    await getAllDrivers();
    setLoading(false);
  }, [getAllProjects, getAllDrivers]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const stats = useMemo(() => {
    return {
      totalPlans: projects.length,
      totalRevenue: projects.reduce((acc, p) => acc + (p.payment?.amount || 0), 0),
      pendingReview: projects.filter(p => p.status === 'submitted').length,
      totalDrivers: drivers.length
    };
  }, [projects, drivers]);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = 
        project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.driverName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = 
        statusFilter === 'all' || 
        project.status === statusFilter;
      
      return matchesSearch && matchesFilter;
    });
  }, [projects, searchQuery, statusFilter]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };


<<<<<<< HEAD
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

  const handleAssignDriver = (project) => {
    setSelectedProjectForAssign(project);
    setShowPriceModal(true);
  };

=======
  const handleAssignDriver = (project) => {
    setSelectedProjectForAssign(project);
    setShowPriceModal(true);
  };

>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
  const handleConfirmAssignment = async (amount) => {
    if (!selectedProjectForAssign) return;

    const result = await updateProject(selectedProjectForAssign.id, {
      status: 'assigned',
      assignedAt: new Date().toISOString(),
      payment: {
        amount,
        currency: 'INR',
        status: 'pending'
      }
<<<<<<< HEAD
      assignedAt: new Date().toISOString(),
      payment: {
        amount,
        currency: 'INR',
        status: 'pending'
      }
=======
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
    });

    if (result.success) {
      setShowPriceModal(false);
      setSelectedProjectForAssign(null);
<<<<<<< HEAD
      loadProjects();
    }

    if (result.success) {
      setShowPriceModal(false);
      setSelectedProjectForAssign(null);
=======
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
      loadProjects();
    }
  };

  const handleApproveCancel = async (projectId) => {
    const result = await updateProject(projectId, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    });
    if (result.success) loadProjects();
  };

  const handleRejectCancel = async (projectId) => {
    const result = await updateProject(projectId, {
      status: 'assigned',
      cancelReason: null,
      cancelRequestedAt: null
    });
    if (result.success) loadProjects();
  };



  // Computed stats
  const stats = useMemo(() => {
    if (projects.length === 0) return null;
    const revenue = projects.reduce((acc, p) => acc + (p.payment?.amount || 0), 0);
    const pending = projects.filter(p => !p.payment).length;
    const revenue = projects.reduce((acc, p) => acc + (p.payment?.amount || 0), 0);
    const pending = projects.filter(p => !p.payment).length;
    const uniqueDrivers = new Set(projects.map(p => p.driverName)).size;
    return {
      totalPlans: projects.length,
      totalRevenue: revenue,
      totalRevenue: revenue,
      pendingReview: pending,
      totalDrivers: uniqueDrivers
    };
  }, [projects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.driverName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

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

        {/* Admin Stats Summary */}
        {stats && (
          <div className="stats-summary admin-stats">
            <div className="summary-card">
              <div className="summary-icon"><ClipboardList size={20} /></div>
              <div className="summary-data">
                <span className="summary-value">{stats.totalPlans}</span>
                <span className="summary-label">Total Plans</span>
              </div>
            </div>
            <div className="summary-card revenue-card">
              <div className="summary-icon"><IndianRupee size={20} /></div>
<<<<<<< HEAD
            <div className="summary-card revenue-card">
              <div className="summary-icon"><IndianRupee size={20} /></div>
              <div className="summary-data">
                <span className="summary-value">₹{stats.totalRevenue.toLocaleString()}</span>
                <span className="summary-label">Fleet Revenue</span>
                <span className="summary-value">₹{stats.totalRevenue.toLocaleString()}</span>
                <span className="summary-label">Fleet Revenue</span>
=======
              <div className="summary-data">
                <span className="summary-value">₹{stats.totalRevenue.toLocaleString()}</span>
                <span className="summary-label">Fleet Revenue</span>
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon"><Clock size={20} /></div>
              <div className="summary-data">
                <span className="summary-value">{stats.pendingReview}</span>
                <span className="summary-label">Pending Price</span>
<<<<<<< HEAD
                <span className="summary-label">Pending Price</span>
=======
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
              </div>
            </div>
            <div className="summary-card clickable" onClick={() => navigate('/admin/drivers')}>
              <div className="summary-icon"><User size={20} /></div>
              <div className="summary-data">
                <span className="summary-value">{stats.totalDrivers}</span>
                <span className="summary-label">Drivers</span>
              </div>
              <div className="card-action-hint">Manage <ArrowLeft size={12} style={{ transform: 'rotate(180deg)' }} /></div>
            </div>
          </div>
        )}


<<<<<<< HEAD

=======
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
        {/* Search & Filter */}
        {projects.length > 0 && (
          <div className="search-filter-bar">
            <div className="search-input-wrapper">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search by project or driver..."
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
                <CheckCircle size={14} /> Assigned
              </button>
              <button className={`filter-btn ${statusFilter === 'cancel_requested' ? 'active' : ''}`} onClick={() => setStatusFilter('cancel_requested')}>
                <AlertTriangle size={14} /> Cancel Req.
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
            <h3>No plans submitted yet</h3>
            <p>Drivers will submit their cargo plans here once created.</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Search size={48} /></div>
            <h3>No matches found</h3>
            <p>Try a different search term or filter.</p>
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
                  <th>Dist.</th>
                  <th>Utilization</th>
                  <th>Payment</th>
<<<<<<< HEAD
                  <th>Payment</th>
=======
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map(project => (
                  <tr key={project.id} className="clickable-row" onClick={() => navigate(`/admin/plan/${project.id}`)}>
                    <td className="project-name">{project.name}</td>
                    <td>
                      <span className="driver-name-cell">
                        <span className="driver-avatar">{project.driverName?.charAt(0).toUpperCase()}</span>
                        {project.driverName}
                      </span>
                    </td>
                    <td><Truck size={14} /> {project.truckName}</td>
                    <td><Package size={14} /> {project.itemCount}</td>
                    <td><MapPin size={14} /> {project.distance || 0} km</td>
                    <td>
                      <div className="table-util-cell">
                        <span className="utilization-badge">
                          {project.utilization?.toFixed(1)}%
                        </span>
                        <div className="utilization-bar-container table-bar">
                          <div
                            className="utilization-bar-fill"
                            style={{ width: `${Math.min(project.utilization || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="payment-cell">
                      {project.status === 'assigned' || project.status === 'cancel_requested' || project.status === 'cancelled' ? (
                        <span className="earnings-badge">₹{project.payment?.amount?.toLocaleString()}</span>
                      ) : (
                        <span className="not-set">-</span>
                      )}
<<<<<<< HEAD
                    </td>
                    <td className="payment-cell">
                      {project.status === 'assigned' || project.status === 'cancel_requested' || project.status === 'cancelled' ? (
                        <span className="earnings-badge">₹{project.payment?.amount?.toLocaleString()}</span>
                      ) : (
                        <span className="not-set">-</span>
                      )}
=======
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
                    </td>
                    <td>
                      <span className={`status-badge ${project.status}`}>
                        {project.status === 'cancel_requested' ? 'Cancel Req.' : project.status === 'cancelled' ? 'Cancelled' : project.status === 'assigned' ? 'Assigned' : 'Submitted'}
                      </span>
                    </td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="view-btn"
                        onClick={() => navigate(`/admin/plan/${project.id}`)}
                      >
                        <Eye size={14} /> View
                      </button>
                      {project.status === 'submitted' && (
                        <button
                          className="assign-btn"
                          onClick={() => handleAssignDriver(project)}
<<<<<<< HEAD
                          onClick={() => handleAssignDriver(project)}
=======
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
                        >
                          <CheckCircle size={14} /> Assign
                        </button>
                      )}
                      {project.status === 'cancel_requested' && (
                        <>
                          <button
                            className="assign-btn"
                            onClick={() => handleApproveCancel(project.id)}
                          >
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => handleRejectCancel(project.id)}
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </>
                      )}
                      {project.status === 'cancelled' && (
                        <button
                          className="modify-btn"
                          onClick={() => navigate(`/admin/modify/${project.id}`)}
                        >
                          <Edit size={14} /> Modify
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

<<<<<<< HEAD
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
=======
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247

      <AssignPriceModal
        project={selectedProjectForAssign}
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        onConfirm={handleConfirmAssignment}
      />
    </div>
  );
}
