import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { ArrowLeft, Check, MousePointer, Loader, Edit } from 'lucide-react';
import './ModifyPlan.css';

export default function ModifyPlan() {
    const { id } = useParams();
    const { user } = useAuth();
    const { getProject, updateProject } = useProjects();
    const navigate = useNavigate();
    const toast = useToast();

    const [originalProject, setOriginalProject] = useState(null);
    const [pageLoading, setPageLoading] = useState(true);

    const [projectName, setProjectName] = useState('');
    const [truckKey, setTruckKey] = useState('medium');
    const [boxCounts, setBoxCounts] = useState({
        electronics: 5,
        standard: 8,
        appliance: 2,
        furniture: 1,
        industrial: 2
    });
    const [distance, setDistance] = useState(10);

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

    // Load existing project data
    useEffect(() => {
        const loadProject = async () => {
            const data = await getProject(id);
            if (data) {
                setOriginalProject(data);
                setProjectName(data.name || '');
                setTruckKey(data.truckKey || 'medium');
                if (data.boxCounts) {
                    setBoxCounts(data.boxCounts);
                }
                setDistance(data.distance || 10);
                // Pre-populate with existing packed items
                if (data.items && data.items.length > 0) {
                    setPackedItems(data.items);
                    setUtilization(data.utilization || 0);
                    setStability(data.stability || 100);
                    setStatus(`${data.items.length} boxes loaded`);
                    setIsComplete(true);
                }
            }
            setPageLoading(false);
        };
        loadProject();
    }, [id]);

    const truck = TRUCKS[truckKey];
    const containerVolume = truck.w * truck.h * truck.d;

    const handleTruckChange = (key) => {
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
        if (selectedBox && selectedBox.id === item.id && selectedBox.x === item.x && selectedBox.y === item.y && selectedBox.z === item.z) {
            setSelectedBox(null);
            setTooltipPos(null);
        } else {
            setSelectedBox(item);
            setTooltipPos({ x: event.clientX || 0, y: event.clientY || 0 });
        }
    };

    const handleSaveModification = async () => {
        setIsSubmitting(true);

        const updates = {
            name: projectName,
            truckKey,
            truckName: truck.name,
            boxCounts: { ...boxCounts },
            items: packedItems,
            itemCount: packedItems.length,
            utilization,
            stability,
            distance,
            status: 'submitted',
            cancelReason: null,
            cancelRequestedAt: null,
            cancelledAt: null,
            modifiedBy: user.name,
            modifiedAt: new Date().toISOString()
        };

        const result = await updateProject(id, updates);

        if (result.success) {
            toast.success('Plan modified and re-submitted successfully!');
            navigate('/admin/dashboard');
        } else {
            toast.error('Error saving modification: ' + result.error);
            setIsSubmitting(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="new-project-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <Loader size={48} className="spinner" />
                <p style={{ color: 'var(--text-muted)', marginLeft: 16 }}>Loading plan...</p>
            </div>
        );
    }

    if (!originalProject) {
        return (
            <div className="new-project-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', color: 'var(--text-muted)' }}>
                <h2>Plan not found</h2>
                <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="new-project-page">
            <header className="project-header">
                <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
                <div className="modify-header-info">
                    <span className="modify-badge"><Edit size={14} /> Modifying Plan</span>
                    <span className="modify-driver-tag">Driver: {originalProject.driverName}</span>
                </div>
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
                    <button className="submit-btn" onClick={handleSaveModification} disabled={isSubmitting}>
                        {isSubmitting ? <><Loader size={18} className="spinner" /> Saving...</> : <><Check size={18} /> Save & Re-submit</>}
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
                    distance={distance}
                    onViewReport={() => setShowReport(true)}
                    showReportButton={isComplete}
                />

                <InputPanel
                    truckKey={truckKey}
                    onTruckChange={handleTruckChange}
                    boxCounts={boxCounts}
                    onBoxCountChange={handleBoxCountChange}
                    distance={distance}
                    onDistanceChange={setDistance}
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
