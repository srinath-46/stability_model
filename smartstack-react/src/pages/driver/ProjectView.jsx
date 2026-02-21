import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../hooks/useProjects';
import { useToast } from '../../context/ToastContext';
import { useState, useEffect } from 'react';
import TruckViewer from '../../components/TruckViewer';
import StatsPanel from '../../components/StatsPanel';
import BoxTooltip from '../../components/BoxTooltip';
import ReportModal from '../../components/ReportModal';
import { ArrowLeft, User, LogOut, MousePointer, Loader, XCircle, AlertTriangle, X } from 'lucide-react';
import './ProjectView.css';

export default function ProjectView() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const { getProject, updateProject } = useProjects();
  const navigate = useNavigate();
  const toast = useToast();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBox, setSelectedBox] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const loadProject = async () => {
      const data = await getProject(id);
      setProject(data);
      setLoading(false);
    };
    loadProject();
  }, [id]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleBoxClick = (item, event) => {
    if (selectedBox && selectedBox.id === item.id && selectedBox.x === item.x && selectedBox.y === item.y && selectedBox.z === item.z) {
      setSelectedBox(null);
      setTooltipPos(null);
    } else {
      setSelectedBox(item);
      setTooltipPos({ x: event.clientX || 0, y: event.clientY || 0 });
    }
  };

  const handleRequestCancel = async () => {
    setCancelling(true);
    const result = await updateProject(id, {
      status: 'cancel_requested',
      cancelReason: cancelReason || 'No reason provided',
      cancelRequestedAt: new Date().toISOString()
    });
    if (result.success) {
      toast.success('Cancellation request sent to admin');
      setShowCancelModal(false);
      setCancelReason('');
      const data = await getProject(id);
      setProject(data);
    } else {
      toast.error('Failed to request cancellation');
    }
    setCancelling(false);
  };

  if (loading) {
    return (
      <div className="project-view-page loading-state">
        <Loader size={48} className="spinner" />
        <p>Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-view-page">
        <div className="not-found">
          <h2>Project not found</h2>
          <button onClick={() => navigate('/driver/dashboard')}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="project-view-page">
      <header className="dashboard-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/driver/dashboard')}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1>{project.name}</h1>
          {project.status && (
            <span className={`status-badge ${project.status}`}>
              {project.status === 'cancel_requested' ? 'Cancel Pending' : project.status === 'cancelled' ? 'Cancelled' : project.status}
            </span>
          )}
        </div>
        <div className="header-right">
          {project.status === 'assigned' && (
            <button className="cancel-request-btn" onClick={() => setShowCancelModal(true)}>
              <XCircle size={16} /> Request Cancellation
            </button>
          )}
          <span className="user-info"><User size={16} /> {user?.name}</span>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Cancellation pending banner */}
      {project.status === 'cancel_requested' && (
        <div className="cancel-banner pending">
          <AlertTriangle size={18} />
          <span>Cancellation requested — waiting for admin approval.</span>
        </div>
      )}
      {project.status === 'cancelled' && (
        <div className="cancel-banner cancelled">
          <XCircle size={18} />
          <span>This plan has been cancelled by the admin.</span>
        </div>
      )}

      <div className="project-view-container">
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

      {/* Cancel Request Modal */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="cancel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><XCircle size={20} /> Request Cancellation</h3>
              <button className="close-btn" onClick={() => setShowCancelModal(false)}>
                <X size={20} />
              </button>
            </div>
            <p className="cancel-modal-desc">Please provide a reason for cancelling this assigned plan. The admin will review your request.</p>
            <textarea
              className="cancel-reason-input"
              placeholder="Reason for cancellation (optional)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
            />
            <div className="cancel-modal-actions">
              <button className="cancel-confirm-btn" onClick={handleRequestCancel} disabled={cancelling}>
                {cancelling ? 'Submitting...' : 'Submit Request'}
              </button>
              <button className="cancel-dismiss-btn" onClick={() => setShowCancelModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
