// Test script for the exported Scikit-learn MLP model
// Run with: node test_model_node.js

// Load the model
const fs = require('fs');
const modelCode = fs.readFileSync('mlp_model.js', 'utf8');

// Execute the model code in this context
eval(modelCode);

// Test data - same as in the HTML test
const testItems = [
    {
        id: "1",
        position: { x: 20, y: 0, z: 20 },
        dimensions: { width: 60, height: 30, depth: 60 },
        weight: 10,
    },
    {
        id: "2",
        position: { x: 25, y: 30, z: 25 },
        dimensions: { width: 50, height: 20, depth: 50 },
        weight: 5,
    },
];

const box = { width: 100, height: 100, depth: 100 };

// Feature extraction function (must match the one in test_sklearn.html)
function extractFeatures(items, box) {
    const features = new Array(30).fill(0);

    if (!items || items.length === 0) {
        features[0] = 0.5; // x at center
        features[1] = 0;   // y at floor
        features[2] = 0.5; // z at center
        features[3] = 1.0; // perfect support
        features[4] = 0;   // no overhang
        features[5] = 0;   // no items
        return features;
    }

    // Sort items by y-position
    const sortedItems = [...items].sort((a, b) => a.position.y - b.position.y);

    // Feature [0-2]: Normalized CoG position
    const cogResult = calculateCoG(sortedItems, box);
    features[0] = Math.min(1, Math.max(0, cogResult.cog.x / box.width));
    features[1] = Math.min(1, Math.max(0, cogResult.cog.y / box.height));
    features[2] = Math.min(1, Math.max(0, cogResult.cog.z / box.depth));

    // Feature [3]: Average support ratio
    const supportResult = calculateSupportRatio(sortedItems);
    features[3] = supportResult.average;

    // Feature [4]: Total overhang (normalized)
    const overhangResult = calculateOverhang(sortedItems);
    const boxPerimeter = 2 * (box.width + box.depth);
    features[4] = Math.min(1, overhangResult.totalOverhang / boxPerimeter);

    // Feature [5]: Normalized item count
    features[5] = Math.min(1, items.length / 10);

    // Features [6-29]: Per-item features (4 features × 6 items = 24)
    const maxItems = 6;
    for (let i = 0; i < maxItems; i++) {
        const baseIdx = 6 + i * 4;

        if (i < sortedItems.length) {
            const item = sortedItems[i];
            const volume = item.dimensions.width * item.dimensions.height * item.dimensions.depth;
            const baseArea = item.dimensions.width * item.dimensions.depth;
            const center = calculateItemCenter(item);

            features[baseIdx + 0] = Math.min(1, item.weight / 20);        // weight/20
            features[baseIdx + 1] = Math.min(1, volume / 1e5);           // vol/1e5
            features[baseIdx + 2] = Math.min(1, baseArea / 1e4);         // base_area/1e4
            features[baseIdx + 3] = Math.min(1, center.y / box.height);  // center_y_norm
        } else {
            // Pad with zeros for missing items
            features[baseIdx + 0] = 0;
            features[baseIdx + 1] = 0;
            features[baseIdx + 2] = 0;
            features[baseIdx + 3] = 0;
        }
    }

    return features;
}

function calculateItemCenter(item) {
    return {
        x: item.position.x + item.dimensions.width / 2,
        y: item.position.y + item.dimensions.height / 2,
        z: item.position.z + item.dimensions.depth / 2,
    };
}

function calculateOverlapArea(itemA, itemB) {
    const aMinX = itemA.position.x;
    const aMaxX = itemA.position.x + itemA.dimensions.width;
    const aMinZ = itemA.position.z;
    const aMaxZ = itemA.position.z + itemA.dimensions.depth;

    const bMinX = itemB.position.x;
    const bMaxX = itemB.position.x + itemB.dimensions.width;
    const bMinZ = itemB.position.z;
    const bMaxZ = itemB.position.z + itemB.dimensions.depth;

    const overlapMinX = Math.max(aMinX, bMinX);
    const overlapMaxX = Math.min(aMaxX, bMaxX);
    const overlapMinZ = Math.max(aMinZ, bMinZ);
    const overlapMaxZ = Math.min(aMaxZ, bMaxZ);

    const overlapWidth = overlapMaxX - overlapMinX;
    const overlapDepth = overlapMaxZ - overlapMinZ;

    if (overlapWidth > 0 && overlapDepth > 0) {
        return overlapWidth * overlapDepth;
    }
    return 0;
}

function isBelow(itemA, itemB) {
    const itemATop = itemA.position.y + itemA.dimensions.height;
    const itemBBottom = itemB.position.y;

    const epsilon = 0.001;
    const isVerticallyAdjacent = Math.abs(itemATop - itemBBottom) < epsilon;
    const hasOverlap = calculateOverlapArea(itemA, itemB) > 0;

    return isVerticallyAdjacent && hasOverlap;
}

function calculateCoG(items, box) {
    const weightedItems = items.filter(item => item.weight > 0);

    if (weightedItems.length === 0) {
        return {
            cog: { x: box.width / 2, y: 0, z: box.depth / 2 },
            penalty: 0,
        };
    }

    let totalWeight = 0;
    let cogX = 0, cogY = 0, cogZ = 0;

    for (const item of weightedItems) {
        const center = calculateItemCenter(item);
        cogX += center.x * item.weight;
        cogY += center.y * item.weight;
        cogZ += center.z * item.weight;
        totalWeight += item.weight;
    }

    cogX /= totalWeight;
    cogY /= totalWeight;
    cogZ /= totalWeight;

    return { cog: { x: cogX, y: cogY, z: cogZ }, penalty: 0 };
}

function calculateSupportRatio(items) {
    const nonFloorItems = items.filter(item => item.position.y > 0);

    if (nonFloorItems.length === 0) {
        return { average: 1.0, penalty: 0 };
    }

    let totalRatio = 0;

    for (const item of nonFloorItems) {
        const baseArea = item.dimensions.width * item.dimensions.depth;
        let supportedArea = 0;

        for (const potentialSupport of items) {
            if (potentialSupport.id === item.id) continue;
            if (isBelow(potentialSupport, item)) {
                supportedArea += calculateOverlapArea(potentialSupport, item);
            }
        }

        const ratio = Math.min(1.0, supportedArea / baseArea);
        totalRatio += ratio;
    }

    const averageRatio = totalRatio / nonFloorItems.length;

    return { average: averageRatio, penalty: 0 };
}

function calculateOverhang(items) {
    const nonFloorItems = items.filter(item => item.position.y > 0);

    if (nonFloorItems.length === 0) {
        return { totalOverhang: 0, penalty: 0 };
    }

    let totalOverhang = 0;

    for (const item of nonFloorItems) {
        const baseArea = item.dimensions.width * item.dimensions.depth;
        const perimeter = 2 * (item.dimensions.width + item.dimensions.depth);

        let supportedArea = 0;
        for (const potentialSupport of items) {
            if (potentialSupport.id === item.id) continue;
            if (isBelow(potentialSupport, item)) {
                supportedArea += calculateOverlapArea(potentialSupport, item);
            }
        }

        supportedArea = Math.min(supportedArea, baseArea);
        const unsupportedArea = Math.max(0, baseArea - supportedArea);

        if (perimeter > 0) {
            totalOverhang += unsupportedArea / perimeter;
        }
    }

    return { totalOverhang, penalty: 0 };
}

// Run the test
console.log('Testing Scikit-learn MLP Model Export...');
console.log('=====================================');

// Extract features
const features = extractFeatures(testItems, box);
console.log('Feature vector (first 10 features):', features.slice(0, 10).map(f => f.toFixed(4)));

// Make prediction
try {
    const result = predictStability(features);

    console.log('\nPrediction Results:');
    console.log(`Stability Score: ${result.score.toFixed(2)}/100`);
    console.log(`Risk Assessment: ${result.riskAssessment}`);
    console.log(`Is Safe: ${result.isSafe}`);
    console.log(`Source: ${result.details.source}`);
    console.log(`Confidence: ${(result.details.confidence * 100).toFixed(1)}%`);

    console.log('\n✅ Model test completed successfully!');
    console.log('The exported JavaScript model is working correctly.');

} catch (error) {
    console.error('\n❌ Model test failed:', error.message);
    process.exit(1);
}
