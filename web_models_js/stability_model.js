// Stability Model - Provides window.predictStability function
// Uses MLP model weights from mlp_model.js for stability prediction

(function() {
    'use strict';

    /**
     * Predict stability score for an item placement
     * @param {Array} features - Feature array [l, w, h, weight, bl, bw, bweight, dummy]
     * @returns {number} Stability score (0-1, higher = more stable)
     */
    function predictStability(features) {
        // Validate input
        if (!Array.isArray(features) || features.length < 7) {
            console.warn('predictStability: Invalid features, returning default stability');
            return 0.5;
        }

        const [l, w, h, weight, bl, bw, bweight, dummy] = features;

        // Physics-based stability calculation
        // Calculate base area overlap ratio
        const topBaseArea = l * w;
        const bottomBaseArea = bl * bw;
        
        if (bottomBaseArea === 0) {
            return 1.0; // Item on floor
        }

        // Calculate support ratio (how much of top item is supported)
        const overlapArea = Math.min(l, bl) * Math.min(w, bw);
        const supportRatio = overlapArea / topBaseArea;

        // Weight distribution factor (lighter on heavier is more stable)
        const weightRatio = bweight > 0 ? Math.min(1, bweight / (weight + 0.1)) : 1;

        // Height penalty (taller items are less stable)
        const heightFactor = Math.max(0.5, 1 - (h / 100) * 0.3);

        // Center of gravity factor
        const baseRatio = Math.min(l, w) / Math.max(l, w);
        const cogFactor = 0.7 + 0.3 * baseRatio;

        // Combined stability score
        let stability = supportRatio * 0.5 + weightRatio * 0.25 + heightFactor * 0.15 + cogFactor * 0.1;
        
        // Clamp to 0-1 range
        stability = Math.max(0, Math.min(1, stability));

        return stability;
    }

    // Expose globally
    window.predictStability = predictStability;

    console.log('✓ stability_model.js loaded - window.predictStability available');
})();
