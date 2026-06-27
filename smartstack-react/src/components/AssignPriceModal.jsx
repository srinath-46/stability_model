import { useState, useEffect } from 'react';
import { X, CheckCircle, Calculator, Info } from 'lucide-react';
<<<<<<< HEAD
import { TRUCKS, TAX_RATE } from '../data/trucks';
=======
import { TRUCKS } from '../data/trucks';
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
import './AssignPriceModal.css';

export default function AssignPriceModal({ project, isOpen, onClose, onConfirm }) {
    const [amount, setAmount] = useState(0);
    const [calculation, setCalculation] = useState({
        basePrice: 0,
<<<<<<< HEAD
        efficiencyBonus: 0,
        handlingFee: 0,
        distancePay: 0,
        subtotal: 0,
        tax: 0,
=======
        distancePay: 0,
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
        total: 0
    });

    useEffect(() => {
        if (project && isOpen) {
            const truck = TRUCKS[project.truckKey || 'medium'];
            const basePrice = truck.basePrice || 0;
<<<<<<< HEAD
            const efficiencyBonus = Math.round((project.utilization / 100) * (truck.bonusPrice || 0));
            const handlingFee = (project.itemCount || 0) * 40;
            const distancePay = (project.distance || 0) * (truck.perKmRate || 0);
            const subtotal = basePrice + efficiencyBonus + handlingFee + distancePay;
            const tax = Math.round(subtotal * TAX_RATE);
            const total = subtotal + tax;

            setCalculation({ basePrice, efficiencyBonus, handlingFee, distancePay, subtotal, tax, total });
=======
            const distancePay = (project.distance || 0) * (truck.perKmRate || 0);
            const total = basePrice + distancePay;

            setCalculation({ basePrice, distancePay, total });
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
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
<<<<<<< HEAD
                            <span className="label">Utilization:</span>
                            <span className="value">{project.utilization?.toFixed(1)}%</span>
                        </div>
                        <div className="brief-item">
=======
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
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
<<<<<<< HEAD
                            <span>Efficiency Bonus ({project.utilization?.toFixed(1)}% util.)</span>
                            <span>+ ₹{calculation.efficiencyBonus.toLocaleString()}</span>
                        </div>
                        <div className="calc-row">
                            <span>Item Handling Fee ({project.itemCount} items)</span>
                            <span>+ ₹{calculation.handlingFee.toLocaleString()}</span>
                        </div>
                        <div className="calc-row">
                            <span>Distance Pay ({project.distance || 0} km)</span>
                            <span>+ ₹{calculation.distancePay.toLocaleString()}</span>
                        </div>
                        <div className="calc-row subtotal-row">
                            <span>Subtotal</span>
                            <span>₹{calculation.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="calc-row">
                            <span>Tax (GST {TAX_RATE * 100}%)</span>
                            <span>+ ₹{calculation.tax.toLocaleString()}</span>
                        </div>
=======
                            <span>Distance Pay ({project.distance || 0} km)</span>
                            <span>+ ₹{calculation.distancePay.toLocaleString()}</span>
                        </div>
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
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
