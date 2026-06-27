import React, { useState, useEffect } from 'react';
import { X, IndianRupee } from 'lucide-react';
import './AssignPriceModal.css';

export default function AssignPriceModal({ project, isOpen, onClose, onConfirm }) {
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && numAmount > 0) {
      onConfirm(numAmount);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content assign-price-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Assign Payment</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <p className="modal-desc">
            Set the payment amount for <strong>{project?.name}</strong>.
            <br/>Driver: {project?.driverName}
          </p>
          
          <div className="input-group">
            <label>Payment Amount (₹)</label>
            <div className="input-with-icon">
              <IndianRupee size={16} className="input-icon" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount..."
                required
                min="1"
                step="1"
                autoFocus
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!amount || amount <= 0}>
              Confirm Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
