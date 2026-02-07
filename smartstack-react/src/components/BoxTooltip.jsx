import { Box, Info, Ruler, Weight, MapPin, Shield } from 'lucide-react';
import './BoxTooltip.css';

export default function BoxTooltip({ item, position }) {
  if (!item || !position) return null;

  return (
    <div 
      className="box-tooltip"
      style={{ 
        left: position.x + 15, 
        top: position.y + 15,
        display: 'block'
      }}
    >
      <h3><Box size={16} /> Product Details</h3>
      <div className="detail"><Info size={12} /> Type: <span>{item.name}</span></div>
      <div className="detail">ID: <span>#{item.id}</span></div>
      <div className="detail"><Ruler size={12} /> Dimensions: <span>{item.l}×{item.w}×{item.h} cm</span></div>
      <div className="detail"><Weight size={12} /> Weight: <span>{item.weight?.toFixed(1)} kg</span></div>
      <div className="detail"><MapPin size={12} /> Position: <span>({item.x?.toFixed(0)}, {item.y?.toFixed(0)}, {item.z?.toFixed(0)})</span></div>
      <div className="detail"><Shield size={12} /> Stability: <span>{((item.stability || 0) * 100).toFixed(0)}%</span></div>
    </div>
  );
}
