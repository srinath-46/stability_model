// GuaranteedPacker - Bin packing algorithm
export class GuaranteedPacker {
  constructor(w, h, d) {
    this.w = w;
    this.h = h;
    this.d = d;
    this.packedItems = [];
    this.candidates = [{ x: 0, y: 0, z: 0 }];
    this.usedVolume = 0;
  }

  async pack(items, onItemPacked) {
    // Sort: non-fragile first, then by volume, then by weight
    items.sort((a, b) => {
      if (a.fragile !== b.fragile) return a.fragile ? 1 : -1;
      const volA = a.l * a.w * a.h;
      const volB = b.l * b.w * b.h;
      if (Math.abs(volB - volA) > 100) return volB - volA;
      return b.weight - a.weight;
    });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let placed = false;

      this.candidates.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 0.1) return a.y - b.y;
        if (Math.abs(a.x - b.x) > 0.1) return a.x - b.x;
        return a.z - b.z;
      });

      for (let pos of this.candidates) {
        const orientations = this.getOrientations(item);
        
        for (let orient of orientations) {
          if (this.canPlace(orient, pos)) {
            await this.placeItem(item, orient, pos, i, onItemPacked);
            placed = true;
            break;
          }
        }
        if (placed) break;
      }

      if (!placed) {
        placed = await this.forcePlacement(item, i, onItemPacked);
      }
    }
    
    return this.packedItems;
  }

  getOrientations(item) {
    const { l, w, h } = item;
    return [
      { l, w, h }, { l: w, w: l, h }, { l: h, w, h: l },
      { l, w: h, h: w }, { l: w, w: h, h: l }, { l: h, w: l, h: w }
    ];
  }

  canPlace(dims, pos) {
    if (pos.x + dims.l > this.w || pos.y + dims.h > this.h || pos.z + dims.w > this.d) return false;
    
    for (let other of this.packedItems) {
      if (this.intersect({ x: pos.x, y: pos.y, z: pos.z, ...dims }, other)) return false;
    }
    return true;
  }

  async forcePlacement(item, index, onItemPacked) {
    const orientations = this.getOrientations(item);
    
    for (let y = 0; y <= this.h - item.h; y += 5) {
      for (let x = 0; x <= this.w - item.l; x += 5) {
        for (let z = 0; z <= this.d - item.w; z += 5) {
          for (let orient of orientations) {
            const pos = { x, y, z };
            if (this.canPlace(orient, pos)) {
              await this.placeItem(item, orient, pos, index, onItemPacked);
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  async placeItem(item, dims, pos, index, onItemPacked) {
    const placedItem = { 
      ...item, 
      x: pos.x, y: pos.y, z: pos.z, 
      l: dims.l, w: dims.w, h: dims.h,
      stability: pos.y === 0 ? 1.0 : 0.85
    };
    
    this.packedItems.push(placedItem);
    this.usedVolume += (dims.l * dims.w * dims.h);

    this.candidates = this.candidates.filter(p => !(p.x === pos.x && p.y === pos.y && p.z === pos.z));
    this.addCandidate(pos.x + dims.l, pos.y, pos.z);
    this.addCandidate(pos.x, pos.y + dims.h, pos.z);
    this.addCandidate(pos.x, pos.y, pos.z + dims.w);
    this.cleanupCandidates();

    if (onItemPacked) {
      onItemPacked(placedItem, index + 1, this.usedVolume);
    }
    
    await new Promise(r => setTimeout(r, 50));
  }

  intersect(a, b) {
    return (a.x < b.x + b.l && a.x + a.l > b.x &&
            a.y < b.y + b.h && a.y + a.h > b.y &&
            a.z < b.z + b.w && a.z + a.w > b.z);
  }

  addCandidate(x, y, z) {
    if (x < this.w && y < this.h && z < this.d) {
      if (!this.candidates.some(p => Math.abs(p.x - x) < 1 && Math.abs(p.y - y) < 1 && Math.abs(p.z - z) < 1)) {
        this.candidates.push({ x, y, z });
      }
    }
  }

  cleanupCandidates() {
    this.candidates = this.candidates.filter(p => {
      for (let box of this.packedItems) {
        if (p.x >= box.x && p.x < box.x + box.l &&
            p.y >= box.y && p.y < box.y + box.h &&
            p.z >= box.z && p.z < box.z + box.w) return false;
      }
      return true;
    });
  }
}
