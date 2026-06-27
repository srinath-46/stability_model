// Truck configurations and pricing factors
// Truck configurations and pricing factors
export const TRUCKS = {
  small: { name: 'Small Van', w: 60, h: 50, d: 40, color: '#22c55e', scale: 0.6, basePrice: 3000, bonusPrice: 1200, perKmRate: 15 },
  medium: { name: 'Medium Truck', w: 100, h: 70, d: 55, color: '#3b82f6', scale: 0.85, basePrice: 6000, bonusPrice: 2500, perKmRate: 22 },
  large: { name: 'Large Semi', w: 140, h: 85, d: 65, color: '#e63946', scale: 1.0, basePrice: 10000, bonusPrice: 4000, perKmRate: 35 },
  xl: { name: 'XL Container', w: 180, h: 100, d: 80, color: '#f59e0b', scale: 1.2, basePrice: 15000, bonusPrice: 6000, perKmRate: 45 }
};

export const TAX_RATE = 0.12; // 12% GST factor
