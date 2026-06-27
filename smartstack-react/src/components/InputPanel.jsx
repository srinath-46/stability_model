import { useState, useEffect } from 'react';
import { TRUCKS } from '../data/trucks';
import { BOX_TYPES, calculateMaxLimits } from '../data/boxTypes';
import { Package, Truck, Smartphone, Box, Monitor, Armchair, Cog, AlertTriangle, Rocket, RotateCcw } from 'lucide-react';
import './InputPanel.css';

const BOX_ICONS = {
  electronics: Smartphone,
  standard: Package,
  appliance: Monitor,
  furniture: Armchair,
  industrial: Cog
};

const TRUCK_ICONS = {
  small: '🚐',
  medium: Truck,
  large: Truck,
  xl: Truck
};

export default function InputPanel({
  truckKey,
  onTruckChange,
  boxCounts,
<<<<<<< HEAD
export default function InputPanel({
  truckKey,
  onTruckChange,
  boxCounts,
  onBoxCountChange,
  distance,
  onDistanceChange,
  distance,
  onDistanceChange,
=======
  onBoxCountChange,
  distance,
  onDistanceChange,
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
  onLoadCargo,
  onReset,
  disabled = false
}) {
  const [limits, setLimits] = useState({});
  const [capacityUsage, setCapacityUsage] = useState(0);
  const [warning, setWarning] = useState('');

  useEffect(() => {
    const truck = TRUCKS[truckKey];
    const newLimits = calculateMaxLimits(truck);
    setLimits(newLimits);

<<<<<<< HEAD

=======
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
    Object.entries(boxCounts).forEach(([type, count]) => {
      if (count > newLimits[type]) {
        onBoxCountChange(type, newLimits[type]);
      }
    });
  }, [truckKey]);

  useEffect(() => {
    const truck = TRUCKS[truckKey];
    const truckVolume = truck.w * truck.h * truck.d;
    const usableVolume = truckVolume * 0.55;

<<<<<<< HEAD

=======
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
    let totalVolume = 0;
    Object.entries(boxCounts).forEach(([type, count]) => {
      const config = BOX_TYPES[type];
      if (config) {
        const avgVol = config.l.avg * config.w.avg * config.h.avg;
        totalVolume += avgVol * count;
      }
    });

<<<<<<< HEAD

    const usage = (totalVolume / usableVolume) * 100;
    setCapacityUsage(Math.min(100, usage));


=======
    const usage = (totalVolume / usableVolume) * 100;
    setCapacityUsage(Math.min(100, usage));

>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
    if (totalVolume > usableVolume) {
      setWarning('Too many boxes! Reduce quantity or select larger truck.');
    } else {
      setWarning('');
    }
  }, [boxCounts, truckKey]);

  const totalItems = Object.values(boxCounts).reduce((sum, c) => sum + c, 0);

  return (
    <div className="input-panel">
      <h2><Package size={18} /> Shipment Configuration</h2>

<<<<<<< HEAD

=======
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
      <div className="section-title"><Truck size={14} /> Select Truck Size</div>
      <div className="truck-options">
        {Object.entries(TRUCKS).map(([key, truck]) => (
          <div
<<<<<<< HEAD
          <div
=======
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
            key={key}
            className={`truck-option ${truckKey === key ? 'selected' : ''}`}
            onClick={() => !disabled && onTruckChange(key)}
          >
            <div className="icon"><Truck size={24} /></div>
            <div className="name">{truck.name}</div>
            <div className="dims">{truck.w}×{truck.h}×{truck.d}</div>
            <div className="price-label">Base: ₹{truck.basePrice.toLocaleString()}</div>
<<<<<<< HEAD
            <div className="price-label">Base: ₹{truck.basePrice.toLocaleString()}</div>
=======
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
          </div>
        ))}
      </div>

<<<<<<< HEAD

=======
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
      <div className="section-title"><Box size={14} /> Package Quantities</div>
      <div className="box-inputs">
        {Object.entries(BOX_TYPES).map(([type, config]) => {
          const IconComponent = BOX_ICONS[type];
          return (
            <div key={type} className={`box-row ${type}`}>
              <div className="box-info">
                <div className="name">
                  <IconComponent size={16} /> {config.name}
                </div>
                <div className="dims">
                  {config.fragile ? 'Fragile • ' : ''}{config.l.avg}×{config.w.avg}×{config.h.avg} • {config.weight.min}-{config.weight.max}kg
                </div>
              </div>
              <div className="box-input-wrap">
                <input
                  type="number"
                  value={boxCounts[type] || 0}
                  min={0}
                  max={limits[type] || 50}
                  onChange={(e) => onBoxCountChange(type, Math.max(0, Math.min(limits[type] || 50, parseInt(e.target.value) || 0)))}
                  disabled={disabled}
                />
                <span className="max-label">max: {limits[type] || 50}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="section-title"><Rocket size={14} /> Trip Logistics</div>
      <div className="distance-input-row">
<<<<<<< HEAD
        <div className="name">Total Distance (km)</div>
=======
        <div className="name">Est. Route Distance (km)</div>
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
        <input
          type="number"
          value={distance}
          min={1}
          max={5000}
          onChange={(e) => onDistanceChange(Math.max(1, parseInt(e.target.value) || 0))}
          disabled={disabled}
        />
      </div>

      <div className="total-bar">
        Total: <strong>{totalItems}</strong> packages
        <div className="capacity-row">
          <span>Est. Capacity:</span>
          <span className="est-usage" style={{ color: warning ? '#ef4444' : '#22c55e' }}>
            {capacityUsage.toFixed(0)}%
          </span>
        </div>
      </div>

<<<<<<< HEAD

=======
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
      {warning && (
        <div className="capacity-warning">
          <AlertTriangle size={14} /> {warning}
        </div>
      )}

<<<<<<< HEAD

      <div className="action-buttons">
        <button
          className="btn-run"
        <button
          className="btn-run"
=======
      <div className="action-buttons">
        <button
          className="btn-run"
>>>>>>> fbd8a42d4931724e17fa2ebcfb2fc40e48c67247
          onClick={onLoadCargo}
          disabled={disabled || warning || totalItems === 0}
        >
          <Rocket size={16} /> LOAD CARGO
        </button>
        <button className="btn-reset" onClick={onReset} disabled={disabled}>
          <RotateCcw size={16} /> Clear
        </button>
      </div>
    </div>
  );
}
