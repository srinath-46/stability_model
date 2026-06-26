import { Truck, ClipboardList, BarChart3, Layers, Scale, Box, CheckCircle } from 'lucide-react';
import './StatsPanel.css';

export default function StatsPanel({
  status = 'Ready',
  truckName = 'Medium Truck',
  itemCount = 0,
  stability = 100,
  utilization = 0,
  distance = null, // Added distance prop with default
  onViewReport,
  showReportButton = false,
  onAssign,
  showAssignButton = false,
  assignDisabled = false,
  isAssigned = false,
  payment = null
}) {
  return (
    <div className="stats-panel">
      <div className="stats-panel-inner">
        <h1><Truck size={20} /> SMARTSTACK FLEET</h1>

        <div className="stat-row">
          <span>Status:</span>
          <span className="stat-val">{status}</span>
        </div>
        <div className="stat-row">
          <span>Truck:</span>
          <span className="stat-val">{truckName}</span>
        </div>
        <div className="stat-row">
          <span><Layers size={14} /> Items Packed:</span>
          <span className="stat-val">{itemCount}</span>
        </div>
        <div className="stat-row">
          <span><Scale size={14} /> Stability:</span>
          <span className="stat-val">{stability}%</span>
        </div>
        <div className="stat-row">
          <span><BarChart3 size={14} /> Space Used:</span>
          <span className="stat-val">{utilization?.toFixed(1)}%</span>
        </div>
        {distance !== null && (
          <div className="stat-row">
            <span>Route Distance:</span>
            <span className="stat-val">{distance} km</span>
          </div>
        )}
        {payment && (
          <div className="stat-row payment-row">
            <span>Trip Earnings:</span>
            <span className="stat-val earnings">₹{payment.amount?.toLocaleString()}</span>
          </div>
        )}

        <div className="legend">
          <span><span style={{ color: '#a855f7' }}>■</span> Electronics</span>
          <span><span style={{ color: '#22c55e' }}>■</span> Standard</span>
          <span><span style={{ color: '#3b82f6' }}>■</span> Appliance</span>
          <span><span style={{ color: '#f59e0b' }}>■</span> Furniture</span>
          <span><span style={{ color: '#ef4444' }}>■</span> Industrial</span>
        </div>

        {showReportButton && (
          <button className="view-report-btn" onClick={onViewReport}>
            <ClipboardList size={16} /> View Cargo Report
          </button>
        )}
        {showAssignButton && !isAssigned && (
          <button className="assign-plan-btn" onClick={onAssign} disabled={assignDisabled}>
            <CheckCircle size={16} /> {assignDisabled ? 'Assigning...' : 'Assign Plan'}
          </button>
        )}
        {showAssignButton && isAssigned && (
          <div className="assigned-badge-panel">
            <CheckCircle size={16} /> Plan Assigned
          </div>
        )}
      </div>
    </div>
  );
}
