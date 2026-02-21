import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../hooks/useProjects';
import { useToast } from '../../context/ToastContext';
import { useState, useEffect } from 'react';
import TruckViewer from '../../components/TruckViewer';
import StatsPanel from '../../components/StatsPanel';
import BoxTooltip from '../../components/BoxTooltip';
import ReportModal from '../../components/ReportModal';
import { ArrowLeft, User, LogOut, MousePointer, Loader, CheckCircle, XCircle, AlertTriangle, Edit } from 'lucide-react';
import './PlanView.css';

export default function PlanView() {
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
  const [assigning, setAssigning] = useState(false);
  const [processingCancel, setProcessingCancel] = useState(false);

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

  const handleAssign = async () => {
    setAssigning(true);
    const result = await updateProject(id, {
      status: 'assigned',
      assignedAt: new Date().toISOString()
    });
    if (result.success) {
      toast.success('Plan assigned successfully!');
      const data = await getProject(id);
      setProject(data);
    } else {
      toast.error('Failed to assign plan');
    }
    setAssigning(false);
  };

  const handleApproveCancel = async () => {
    setProcessingCancel(true);
    const result = await updateProject(id, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    });
    if (result.success) {
      toast.success('Cancellation approved');
      const data = await getProject(id);
      setProject(data);
    } else {
      toast.error('Failed to approve cancellation');
    }
    setProcessingCancel(false);
  };

  const handleRejectCancel = async () => {
    setProcessingCancel(true);
    const result = await updateProject(id, {
      status: 'assigned',
      cancelReason: null,
      cancelRequestedAt: null
    });
    if (result.success) {
      toast.info('Cancel request rejected — plan remains assigned');
      const data = await getProject(id);
      setProject(data);
    } else {
      toast.error('Failed to reject cancellation');
    }
    setProcessingCancel(false);
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
        </div>
        <div className="header-right">
          {project.status === 'submitted' && (
            <button className="assign-btn" onClick={handleAssign} disabled={assigning}>
              <CheckCircle size={16} /> {assigning ? 'Assigning...' : 'Assign Plan'}
            </button>
          )}
          {project.status === 'assigned' && (
            <span className="status-badge assigned">Assigned</span>
          )}
          {project.status === 'cancel_requested' && (
            <span className="status-badge cancel_requested">Cancel Requested</span>
          )}
          {project.status === 'cancelled' && (
            <>
              <span className="status-badge cancelled">Cancelled</span>
              <button className="modify-btn" onClick={() => navigate(`/admin/modify/${project.id}`)}>
                <Edit size={16} /> Modify Plan
              </button>
            </>
          )}
          <span className="admin-badge">ADMIN</span>
          <span className="user-info"><User size={16} /> {user?.name}</span>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Cancel Request Banner */}
      {project.status === 'cancel_requested' && (
        <div className="cancel-banner-admin">
          <div className="cancel-banner-info">
            <AlertTriangle size={20} />
            <div>
              <strong>Cancellation Requested</strong>
              <p>Reason: {project.cancelReason || 'No reason provided'}</p>
            </div>
          </div>
          <div className="cancel-banner-actions">
            <button className="approve-cancel-btn" onClick={handleApproveCancel} disabled={processingCancel}>
              <CheckCircle size={14} /> Approve
            </button>
            <button className="reject-cancel-btn" onClick={handleRejectCancel} disabled={processingCancel}>
              <XCircle size={14} /> Reject
            </button>
          </div>
        </div>
      )}

      {project.status === 'cancelled' && (
        <div className="cancel-banner-admin cancelled">
          <div className="cancel-banner-info">
            <XCircle size={20} />
            <div>
              <strong>Plan Cancelled</strong>
              <p>You can modify and re-submit this plan.</p>
            </div>
          </div>
          <button className="modify-btn" onClick={() => navigate(`/admin/modify/${project.id}`)}>
            <Edit size={14} /> Modify Plan
          </button>
        </div>
      )}

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
          showAssignButton={project.status === 'submitted'}
          onAssign={handleAssign}
          assignDisabled={assigning}
          isAssigned={project.status === 'assigned'}
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
