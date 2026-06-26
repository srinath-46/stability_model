// GuaranteedPacker - Bin packing algorithm with strict collision & boundary enforcement
const GAP = 0.5; // small gap between boxes to prevent visual overlap

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
    // Sort: non-fragile first, then by volume (largest first), then by weight
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

      // Sort candidates: prefer lower (y), then leftmost (x), then front (z)
      this.candidates.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 0.1) return a.y - b.y;
        if (Math.abs(a.x - b.x) > 0.1) return a.x - b.x;
        return a.z - b.z;
      });

      for (const pos of this.candidates) {
        const orientations = this.getOrientations(item);

        for (const orient of orientations) {
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
    // Strict boundary check — the box must fit ENTIRELY within the container
    if (pos.x < 0 || pos.y < 0 || pos.z < 0) return false;
    if (pos.x + dims.l > this.w) return false;
    if (pos.y + dims.h > this.h) return false;
    if (pos.z + dims.w > this.d) return false;

    // Collision check — no overlap with any placed box (strict AABB test)
    for (const other of this.packedItems) {
      if (this.boxesOverlap(pos.x, pos.y, pos.z, dims.l, dims.h, dims.w,
        other.x, other.y, other.z, other.l, other.h, other.w)) {
        return false;
      }
    }
    return true;
  }

  // Strict axis-aligned bounding box overlap test
  boxesOverlap(ax, ay, az, al, ah, aw, bx, by, bz, bl, bh, bw) {
    return (
      ax < bx + bl &&
      ax + al > bx &&
      ay < by + bh &&
      ay + ah > by &&
      az < bz + bw &&
      az + aw > bz
    );
  }

  async forcePlacement(item, index, onItemPacked) {
    const orientations = this.getOrientations(item);
    const step = 2; // grid step — balance between precision and speed

    // Try each orientation first, then compute safe loop bounds for that orientation
    for (const orient of orientations) {
      const maxX = this.w - orient.l;
      const maxY = this.h - orient.h;
      const maxZ = this.d - orient.w;

      // Skip orientations that can't physically fit
      if (maxX < 0 || maxY < 0 || maxZ < 0) continue;

      for (let y = 0; y <= maxY; y += step) {
        for (let x = 0; x <= maxX; x += step) {
          for (let z = 0; z <= maxZ; z += step) {
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

    // Remove used candidate
    this.candidates = this.candidates.filter(p =>
      !(Math.abs(p.x - pos.x) < 0.5 && Math.abs(p.y - pos.y) < 0.5 && Math.abs(p.z - pos.z) < 0.5)
    );

    // Add new candidate positions: right, on top, behind (with small gap)
    this.addCandidate(pos.x + dims.l + GAP, pos.y, pos.z);
    this.addCandidate(pos.x, pos.y + dims.h + GAP, pos.z);
    this.addCandidate(pos.x, pos.y, pos.z + dims.w + GAP);

    // Diagonal corner candidates for tighter packing
    this.addCandidate(pos.x + dims.l + GAP, pos.y, pos.z + dims.w + GAP);
    this.addCandidate(pos.x + dims.l + GAP, pos.y + dims.h + GAP, pos.z);
    this.addCandidate(pos.x, pos.y + dims.h + GAP, pos.z + dims.w + GAP);

    this.cleanupCandidates();

    if (onItemPacked) {
      onItemPacked(placedItem, index + 1, this.usedVolume);
    }

    await new Promise(r => setTimeout(r, 50));
  }

  addCandidate(x, y, z) {
    // Only add if within container bounds
    if (x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.h && z < this.d) {
      const isDuplicate = this.candidates.some(p =>
        Math.abs(p.x - x) < 1 && Math.abs(p.y - y) < 1 && Math.abs(p.z - z) < 1
      );
      if (!isDuplicate) {
        this.candidates.push({ x, y, z });
      }
    }
  }

  cleanupCandidates() {
    // Remove candidates that are inside already-placed boxes
    this.candidates = this.candidates.filter(p => {
      for (const box of this.packedItems) {
        if (p.x >= box.x && p.x < box.x + box.l &&
          p.y >= box.y && p.y < box.y + box.h &&
          p.z >= box.z && p.z < box.z + box.w) {
          return false;
        }
      }
      return true;
    });
  }
}
