import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../hooks/useProjects';
import { useState, useEffect } from 'react';
import TruckViewer from '../../components/TruckViewer';
import StatsPanel from '../../components/StatsPanel';
import BoxTooltip from '../../components/BoxTooltip';
import ReportModal from '../../components/ReportModal';
import { ArrowLeft, User, LogOut, MousePointer, Loader, Trash2 } from 'lucide-react';
import './PlanView.css';

export default function PlanView() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const { getProject, deleteProject } = useProjects();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBox, setSelectedBox] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    const loadProject = async () => {
      const data = await getProject(id);
      setProject(data);
      setLoading(false);
    };
    loadProject();
  }, [id, getProject]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleBoxClick = (item, event) => {
    setSelectedBox(item);
    setTooltipPos({ x: event.clientX || 0, y: event.clientY || 0 });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      const result = await deleteProject(id);
      if (result.success) {
        navigate('/admin/dashboard');
      } else {
        alert('Error deleting project: ' + result.error);
      }
    }
  };

  if (loading) {
    return (
      <div className="plan-view-page loading-state">
        <Loader size={48} className="spinner" />
        <p>Loading plan...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="plan-view-page">
        <div className="not-found">
          <h2>Plan not found</h2>
          <button onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="plan-view-page">
      <header className="dashboard-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1>{project.name}</h1>
          <span className="driver-tag">by {project.driverName}</span>
          <button className="delete-plan-btn" onClick={handleDelete} title="Delete Plan">
            <Trash2 size={16} /> Delete Plan
          </button>
        </div>
        <div className="header-right">
          <span className="admin-badge">ADMIN</span>
          <span className="user-info"><User size={16} /> {user?.name}</span>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>
      
      <div className="plan-view-container">
        <TruckViewer 
          truckKey={project.truckKey} 
          packedItems={project.items || []}
          onBoxClick={handleBoxClick}
          animate={false}
        />
        
        <StatsPanel
          status={`${project.itemCount} boxes loaded`}
          truckName={project.truckName}
          itemCount={project.itemCount}
          stability={project.stability}
          utilization={project.utilization}
          onViewReport={() => setShowReport(true)}
          showReportButton={true}
        />
        
        <BoxTooltip item={selectedBox} position={tooltipPos} />
        
        <ReportModal
          isOpen={showReport}
          onClose={() => setShowReport(false)}
          items={project.items || []}
          truckKey={project.truckKey}
          utilization={project.utilization}
        />
      </div>
      
      <div className="click-hint"><MousePointer size={14} /> Click on any box to see details</div>
    </div>
  );
}
