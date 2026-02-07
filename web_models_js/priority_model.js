// Priority Model - Provides window.predictPriority function
// Determines packing order based on item properties

(function() {
    'use strict';

    /**
     * Predict priority score for packing order
     * @param {Array} features - Feature array [catCode, l, w, h, weight, dummy]
     * @returns {number} Priority score (higher = pack first/bottom)
     */
    function predictPriority(features) {
        // Validate input
        if (!Array.isArray(features) || features.length < 5) {
            console.warn('predictPriority: Invalid features, returning default priority');
            return 0.5;
        }

        const [catCode, l, w, h, weight, dummy] = features;

        // Priority heuristics for stable packing:
        // 1. Heavier items should go first (bottom)
        // 2. Larger base area items should go first
        // 3. Lower height items are preferred at bottom

        const baseArea = l * w;
        const volume = l * w * h;

        // Weight factor (0-1, heavier = higher priority)
        const weightScore = Math.min(1, weight / 20) * 0.4;

        // Base area factor (larger base = higher priority)
        const baseAreaScore = Math.min(1, baseArea / 10000) * 0.35;

        // Height factor (shorter = higher priority for bottom)
        const heightScore = Math.max(0, 1 - h / 100) * 0.15;

        // Category bonus (certain categories may have priority)
        const catBonus = (catCode === 1 || catCode === 2) ? 0.1 : 0;

        // Combined priority score
        let priority = weightScore + baseAreaScore + heightScore + catBonus;
        
        // Clamp and normalize
        priority = Math.max(0, Math.min(1, priority));

        return priority;
    }

    // Expose globally
    window.predictPriority = predictPriority;

    console.log('✓ priority_model.js loaded - window.predictPriority available');
})();
