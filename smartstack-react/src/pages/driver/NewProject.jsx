import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../hooks/useProjects';
import { TRUCKS } from '../../data/trucks';
import { generateItems } from '../../data/boxTypes';
import { GuaranteedPacker } from '../../hooks/usePacker';
import { useToast } from '../../context/ToastContext';
import TruckViewer from '../../components/TruckViewer';
import StatsPanel from '../../components/StatsPanel';
import InputPanel from '../../components/InputPanel';
import BoxTooltip from '../../components/BoxTooltip';
import ReportModal from '../../components/ReportModal';
import { ArrowLeft, Check, MousePointer, Loader } from 'lucide-react';
import './NewProject.css';

export default function NewProject() {
  const { user } = useAuth();
  const { addProject } = useProjects();
  const navigate = useNavigate();
  const toast = useToast();

  const [projectName, setProjectName] = useState('');
  const [truckKey, setTruckKey] = useState('medium');
  const [boxCounts, setBoxCounts] = useState({
    electronics: 5,
    standard: 8,
    appliance: 2,
    furniture: 1,
    industrial: 2
  });

  const [status, setStatus] = useState('Ready');
  const [packedItems, setPackedItems] = useState([]);
  const [utilization, setUtilization] = useState(0);
  const [stability, setStability] = useState(100);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedBox, setSelectedBox] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const [showReport, setShowReport] = useState(false);

  const truck = TRUCKS[truckKey];
  const containerVolume = truck.w * truck.h * truck.d;

  const handleTruckChange = (key) => {
    // Reset everything when switching trucks so old packed items don't persist
    setPackedItems([]);
    setStatus('Ready');
    setUtilization(0);
    setStability(100);
    setIsComplete(false);
    setSelectedBox(null);
    setTruckKey(key);
  };

  const handleBoxCountChange = (type, count) => {
    setBoxCounts(prev => ({ ...prev, [type]: count }));
  };

  const handleLoadCargo = async () => {
    if (!projectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setIsRunning(true);
    setIsComplete(false);
    setPackedItems([]);
    setStatus('AI: Generating items...');

    const items = generateItems(boxCounts);

    if (items.length === 0) {
      setStatus('No items!');
      setIsRunning(false);
      return;
    }

    setStatus('AI: Optimizing...');

    const packer = new GuaranteedPacker(truck.w, truck.h, truck.d);

    const onItemPacked = (item, count, usedVol) => {
      setPackedItems(prev => [...prev, item]);
      setStability(Math.round(item.stability * 100));
      setUtilization((usedVol / containerVolume) * 100);
    };

    const packed = await packer.pack(items, onItemPacked);

    const finalUtil = (packer.usedVolume / containerVolume) * 100;
    setUtilization(finalUtil);

    if (packed.length === items.length) {
      setStatus(`All ${packed.length} boxes loaded!`);
    } else {
      setStatus(`${packed.length}/${items.length} loaded`);
    }

    setIsRunning(false);
    setIsComplete(true);
  };

  const handleReset = () => {
    setPackedItems([]);
    setStatus('Ready');
    setUtilization(0);
    setStability(100);
    setIsComplete(false);
    setSelectedBox(null);
  };

  const handleBoxClick = (item, event) => {
    if (selectedBox && selectedBox.index === item.index) {
      setSelectedBox(null);
      setTooltipPos(null);
    } else {
      setSelectedBox(item);
      setTooltipPos({ x: event.clientX || 0, y: event.clientY || 0 });
    }
  };

  const handleSubmitPlan = async () => {
    setIsSubmitting(true);

    const project = {
      name: projectName,
      driverUid: user.uid,
      driverName: user.name,
      truckKey,
      truckName: truck.name,
      boxCounts: { ...boxCounts },
      items: packedItems,
      itemCount: packedItems.length,
      utilization,
      stability
    };

    const result = await addProject(project);

    if (result.success) {
      navigate('/driver/dashboard');
    } else {
      toast.error('Error saving project: ' + result.error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="new-project-page">
      <header className="project-header">
        <button className="back-btn" onClick={() => navigate('/driver/dashboard')}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div className="project-name-input">
          <input
            type="text"
            placeholder="Enter project name..."
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={isRunning}
          />
        </div>
        {isComplete && (
          <button className="submit-btn" onClick={handleSubmitPlan} disabled={isSubmitting}>
            {isSubmitting ? <><Loader size={18} className="spinner" /> Saving...</> : <><Check size={18} /> Submit Plan</>}
          </button>
        )}
      </header>

      <div className="simulation-container">
        <TruckViewer
          truckKey={truckKey}
          packedItems={packedItems}
          onBoxClick={handleBoxClick}
        />

        <StatsPanel
          status={status}
          truckName={truck.name}
          itemCount={packedItems.length}
          stability={stability}
          utilization={utilization}
          onViewReport={() => setShowReport(true)}
          showReportButton={isComplete}
        />

        <InputPanel
          truckKey={truckKey}
          onTruckChange={handleTruckChange}
          boxCounts={boxCounts}
          onBoxCountChange={handleBoxCountChange}
          onLoadCargo={handleLoadCargo}
          onReset={handleReset}
          disabled={isRunning}
        />

        <BoxTooltip item={selectedBox} position={tooltipPos} />

        <ReportModal
          isOpen={showReport}
          onClose={() => setShowReport(false)}
          items={packedItems}
          truckKey={truckKey}
          utilization={utilization}
        />
      </div>

      {isComplete && (
        <div className="click-hint"><MousePointer size={14} /> Click on any box to see details</div>
      )}
    </div>
  );
}
