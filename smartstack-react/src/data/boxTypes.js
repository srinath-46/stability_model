// Box type configurations
export const BOX_TYPES = {
  electronics: {
    name: 'Electronics', code: 0, color: '#a855f7',
    l: { min: 12, max: 18, avg: 15 }, w: { min: 10, max: 15, avg: 12 }, h: { min: 8, max: 12, avg: 10 },
    weight: { min: 2, max: 8 }, fragile: true
  },
  standard: {
    name: 'Standard Parcel', code: 1, color: '#22c55e',
    l: { min: 20, max: 30, avg: 25 }, w: { min: 15, max: 25, avg: 20 }, h: { min: 12, max: 18, avg: 15 },
    weight: { min: 5, max: 20 }, fragile: false
  },
  appliance: {
    name: 'Appliance', code: 2, color: '#3b82f6',
    l: { min: 35, max: 45, avg: 40 }, w: { min: 30, max: 40, avg: 35 }, h: { min: 40, max: 50, avg: 45 },
    weight: { min: 15, max: 40 }, fragile: false
  },
  furniture: {
    name: 'Furniture', code: 3, color: '#f59e0b',
    l: { min: 50, max: 60, avg: 55 }, w: { min: 20, max: 30, avg: 25 }, h: { min: 15, max: 22, avg: 18 },
    weight: { min: 10, max: 30 }, fragile: false
  },
  industrial: {
    name: 'Industrial', code: 4, color: '#ef4444',
    l: { min: 25, max: 35, avg: 30 }, w: { min: 25, max: 35, avg: 30 }, h: { min: 20, max: 30, avg: 25 },
    weight: { min: 50, max: 100 }, fragile: false
  }
};

// Generate random items from input counts
export function generateItems(input) {
  const list = [];
  let id = 0;
  
  Object.entries(input).forEach(([type, count]) => {
    const config = BOX_TYPES[type];
    if (!config) return;
    
    for (let i = 0; i < count; i++) {
      const randRange = (r) => r.min + Math.random() * (r.max - r.min);
      list.push({
        id: id++,
        type,
        name: config.name,
        code: config.code,
        color: config.color,
        fragile: config.fragile,
        l: Math.round(randRange(config.l)),
        w: Math.round(randRange(config.w)),
        h: Math.round(randRange(config.h)),
        weight: randRange(config.weight)
      });
    }
  });
  
  return list;
}

// Calculate max limits for a truck
export function calculateMaxLimits(truck) {
  const truckVolume = truck.w * truck.h * truck.d;
  const limits = {};
  const packingEfficiency = 0.55;
  const usableVolume = truckVolume * packingEfficiency;
  
  Object.entries(BOX_TYPES).forEach(([type, config]) => {
    const avgBoxVolume = config.l.avg * config.w.avg * config.h.avg;
    let maxCount = Math.floor(usableVolume / avgBoxVolume);
    const maxByLength = Math.floor(truck.w / config.l.min);
    const maxByWidth = Math.floor(truck.d / config.w.min);
    const maxByHeight = Math.floor(truck.h / config.h.min);
    const layerMax = maxByLength * maxByWidth * maxByHeight;
    maxCount = Math.min(maxCount, layerMax);
    limits[type] = Math.min(Math.max(1, maxCount), 50);
  });
  
  return limits;
}
