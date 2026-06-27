import { useState, useEffect } from 'react';
import { X, CheckCircle, Calculator, Info } from 'lucide-react';
import { TRUCKS } from '../data/trucks';
import './AssignPriceModal.css';

export default function AssignPriceModal({ project, isOpen, onClose, onConfirm }) {
    const [amount, setAmount] = useState(0);
    const [calculation, setCalculation] = useState({
        basePrice: 0,
        distancePay: 0,
        total: 0
    });

    useEffect(() => {
        if (project && isOpen) {
            const truck = TRUCKS[project.truckKey || 'medium'];
            const basePrice = truck.basePrice || 0;
            const distancePay = (project.distance || 0) * (truck.perKmRate || 0);
            const total = basePrice + distancePay;

            setCalculation({ basePrice, distancePay, total });
            setAmount(total);
        }
    }, [project, isOpen]);

    if (!isOpen || !project) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="price-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3><Calculator size={20} /> Assign Trip Payment</h3>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body">
                    <div className="project-brief">
                        <div className="brief-item">
                            <span className="label">Project:</span>
                            <span className="value">{project.name}</span>
                        </div>
                        <div className="brief-item">
                            <span className="label">Truck:</span>
                            <span className="value">{project.truckName}</span>
                        </div>
                        <div className="brief-item">
                            <span className="label">Distance:</span>
                            <span className="value">{project.distance || 0} km</span>
                        </div>
                    </div>

                    <div className="calculation-breakdown">
                        <h4><Info size={16} /> Suggested Price Breakdown</h4>
                        <div className="calc-row">
                            <span>Base Trip Rate ({project.truckName})</span>
                            <span>₹{calculation.basePrice.toLocaleString()}</span>
                        </div>
                        <div className="calc-row">
                            <span>Distance Pay ({project.distance || 0} km)</span>
                            <span>+ ₹{calculation.distancePay.toLocaleString()}</span>
                        </div>
                        <div className="calc-total">
                            <span>Estimated Total</span>
                            <span className="suggested-val">₹{calculation.total.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="amount-input-section">
                        <label>Final Payment Amount (₹)</label>
                        <div className="price-input-wrapper">
                            <span className="currency-symbol">₹</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                placeholder="Enter amount"
                            />
                        </div>
                        <p className="helper-text">You can adjust the suggested price before assigning.</p>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="confirm-btn" onClick={() => onConfirm(amount)}>
                        <CheckCircle size={18} /> Confirm & Assign Plan
                    </button>
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}
