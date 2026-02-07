/**
 * ML-Assisted Stability Predictor (TensorFlow.js Hybrid Version)
 * 
 * A hybrid stability scoring system that uses a TensorFlow.js neural network
 * for primary inference, with automatic fallback to deterministic physics-based
 * calculations when the model is unavailable or disabled.
 * 
 * @module mlAssistedStabilityPredictor-tfjs
 * @version 2.0.0-tfjs
 * @license MIT
 * 
 * ============================================================================
 * ARCHITECTURE
 * ============================================================================
 * 
 * Input: Feature vector (30 floats, normalized [0,1])
 * MLP: Dense(128, ReLU) → Dropout(0.1) → Dense(64, ReLU) → Dense(32, ReLU) → Dense(1, sigmoid)
 * Output: Score 0-100 (sigmoid * 100)
 * 
 * Feature Vector Structure (30 features):
 * [0-2]   : CoG norms (x/width, y/height, z/depth)
 * [3]     : Average support ratio
 * [4]     : Total overhang (normalized)
 * [5]     : Item count (normalized, /10)
 * [6-29]  : Per-item features for up to 5 items (5 features each = 25 total):
 *           - weight/20, vol/1e5, base_area/1e4, center_y_norm, pos_y_norm
 * 
 * ============================================================================
 * USAGE (Browser)
 * ============================================================================
 * 
 * <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js"></script>
 * <script type="module">
 *   import { mlAssistedStabilityPredictor, initModel } from './mlAssistedStabilityPredictor-tfjs.js';
 *   
 *   // Optional: pre-load model
 *   await initModel('./tfjs_model/model.json');
 *   
 *   const result = await mlAssistedStabilityPredictor(items);
 *   console.log(result.score, result.details.source);
 * </script>
 * 
 * ============================================================================
 * USAGE (Node.js)
 * ============================================================================
 * 
 * // Install: npm install @tensorflow/tfjs-node
 * import * as tf from '@tensorflow/tfjs-node';
 * globalThis.tf = tf;
 * 
 * import { mlAssistedStabilityPredictor } from './mlAssistedStabilityPredictor-tfjs.js';
 * const result = await mlAssistedStabilityPredictor(items);
 */

// ============================================================================
// TENSORFLOW.JS CONFIGURATION
// ============================================================================

/**
 * Toggle for TensorFlow.js inference.
 * Set to false to force physics fallback mode (useful for testing/debugging).
 */
let USE_TFJS = true;

/**
 * Whether to compute physics details even when using TF.js inference.
 * Useful for debugging and comparing model predictions vs physics.
 */
const COMPUTE_PHYSICS_DETAILS_IN_TFJS_MODE = true;

/**
 * Default path to the TensorFlow.js model files.
 * Can be a relative path, absolute path, or CDN URL.
 */
let DEFAULT_MODEL_PATH = './tfjs_model/model.json';

/**
 * Fixed feature vector size for the neural network.
 * Must match the input_shape of the trained model.
 * Structure: 6 global features + 6 items × 4 features each = 30
 */
const FEATURE_VECTOR_SIZE = 30;

/**
 * Maximum number of items to encode individual features for.
 * Items beyond this count contribute only to aggregate features.
 */
const MAX_INDIVIDUAL_ITEMS = 6;

/**
 * Features per item in the feature vector.
 */
const FEATURES_PER_ITEM = 4;

// ============================================================================
// MODEL STATE (Module-level singleton)
// ============================================================================

let _loadedModel = null;
let _modelLoadPromise = null;
let _modelLoadError = null;

// ============================================================================
// CONFIGURATION CONSTANTS
// Physics-based penalty weights
// ============================================================================

const ML_CONFIG = {
  // Box default dimensions (can be overridden)
  DEFAULT_BOX: { width: 100, height: 100, depth: 100 },
  
  // Center of Gravity (CoG) penalty weights
  COG_LATERAL_PENALTY_PER_10_PERCENT: 10,
  COG_VERTICAL_PENALTY_PER_10_PERCENT: 20,
  COG_IDEAL_Y_RATIO: 1 / 3,
  COG_CRITICAL_Y_RATIO: 0.5,
  
  // Support ratio weights
  SUPPORT_IDEAL_RATIO: 0.8,
  SUPPORT_PENALTY_MULTIPLIER: 20,
  SUPPORT_MAX_PENALTY: 50,
  
  // Overhang penalty weights
  OVERHANG_PENALTY_PER_UNIT: 5,
  OVERHANG_MAX_PENALTY: 30,
  
  // Risk assessment thresholds
  RISK_SAFE_THRESHOLD: 80,
  RISK_MODERATE_THRESHOLD: 50
};

// ============================================================================
// HELPER FUNCTIONS (Utility Layer)
// ============================================================================

/**
 * Calculates the geometric center point of an item in 3D space.
 * @param {Object} item - Item with position and dimensions
 * @returns {Object} Center coordinates {x, y, z}
 */
function calculateItemCenter(item) {
  return {
    x: item.position.x + item.dimensions.width / 2,
    y: item.position.y + item.dimensions.height / 2,
    z: item.position.z + item.dimensions.depth / 2
  };
}

/**
 * Calculates the overlapping area between two items in the x-z plane.
 * @param {Object} itemA - First item
 * @param {Object} itemB - Second item
 * @returns {number} Overlapping area in square units
 */
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

/**
 * Checks if itemA is directly below itemB (supporting it).
 * @param {Object} itemA - Potential supporting item
 * @param {Object} itemB - Potential supported item
 * @returns {boolean} True if itemA supports itemB
 */
function isBelow(itemA, itemB) {
  const itemATop = itemA.position.y + itemA.dimensions.height;
  const itemBBottom = itemB.position.y;
  
  const epsilon = 0.001;
  const isVerticallyAdjacent = Math.abs(itemATop - itemBBottom) < epsilon;
  const hasOverlap = calculateOverlapArea(itemA, itemB) > 0;
  
  return isVerticallyAdjacent && hasOverlap;
}

/**
 * Checks if two items overlap in 3D space.
 * @param {Object} itemA - First item
 * @param {Object} itemB - Second item
 * @returns {boolean} True if items overlap
 */
function checkItemsOverlap3D(itemA, itemB) {
  const overlapX = (itemA.position.x < itemB.position.x + itemB.dimensions.width) &&
                   (itemA.position.x + itemA.dimensions.width > itemB.position.x);
  const overlapY = (itemA.position.y < itemB.position.y + itemB.dimensions.height) &&
                   (itemA.position.y + itemA.dimensions.height > itemB.position.y);
  const overlapZ = (itemA.position.z < itemB.position.z + itemB.dimensions.depth) &&
                   (itemA.position.z + itemA.dimensions.depth > itemB.position.z);
  
  return overlapX && overlapY && overlapZ;
}

/**
 * Validates an item object.
 * @param {Object} item - Item to validate
 * @returns {Object} Validation result {valid: boolean, error?: string}
 */
function validateItem(item) {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: 'Item must be an object' };
  }
  if (typeof item.id !== 'string' && typeof item.id !== 'number') {
    return { valid: false, error: 'Item must have a valid id' };
  }
  if (!item.position || typeof item.position.x !== 'number' ||
      typeof item.position.y !== 'number' || typeof item.position.z !== 'number') {
    return { valid: false, error: `Item ${item.id}: Invalid position` };
  }
  if (!item.dimensions || typeof item.dimensions.width !== 'number' ||
      typeof item.dimensions.height !== 'number' || typeof item.dimensions.depth !== 'number') {
    return { valid: false, error: `Item ${item.id}: Invalid dimensions` };
  }
  if (item.dimensions.width <= 0 || item.dimensions.height <= 0 || item.dimensions.depth <= 0) {
    return { valid: false, error: `Item ${item.id}: Dimensions must be positive` };
  }
  if (typeof item.weight !== 'number' || item.weight < 0) {
    return { valid: false, error: `Item ${item.id}: Weight must be a non-negative number` };
  }
  return { valid: true };
}

// ============================================================================
// CORE PHYSICS CALCULATORS (Fallback and debugging)
// ============================================================================

/**
 * Calculates Center of Gravity (CoG) and stability penalty.
 * @param {Array} items - Array of item objects
 * @param {Object} box - Box dimensions
 * @returns {Object} {cog: {x, y, z}, penalty: number}
 */
function calculateCoGPenalty(items, box) {
  const weightedItems = items.filter(item => item.weight > 0);
  
  if (weightedItems.length === 0) {
    return {
      cog: { x: box.width / 2, y: 0, z: box.depth / 2 },
      penalty: 0
    };
  }
  
  const totalWeight = weightedItems.reduce((sum, item) => sum + item.weight, 0);
  
  let cogX = 0, cogY = 0, cogZ = 0;
  for (const item of weightedItems) {
    const center = calculateItemCenter(item);
    cogX += center.x * item.weight;
    cogY += center.y * item.weight;
    cogZ += center.z * item.weight;
  }
  
  cogX /= totalWeight;
  cogY /= totalWeight;
  cogZ /= totalWeight;
  
  const idealX = box.width / 2;
  const idealZ = box.depth / 2;
  const idealY = box.height * ML_CONFIG.COG_IDEAL_Y_RATIO;
  
  const halfWidth = box.width / 2;
  const halfDepth = box.depth / 2;
  const deviationX = Math.abs(cogX - idealX) / halfWidth;
  const deviationZ = Math.abs(cogZ - idealZ) / halfDepth;
  const deviationY = Math.max(0, (cogY - idealY) / (box.height - idealY));
  
  let penalty = 0;
  penalty += (deviationX / 0.1) * ML_CONFIG.COG_LATERAL_PENALTY_PER_10_PERCENT;
  penalty += (deviationZ / 0.1) * ML_CONFIG.COG_LATERAL_PENALTY_PER_10_PERCENT;
  
  if (cogY > box.height * ML_CONFIG.COG_CRITICAL_Y_RATIO) {
    penalty += (deviationY / 0.1) * ML_CONFIG.COG_VERTICAL_PENALTY_PER_10_PERCENT;
  } else if (cogY > idealY) {
    penalty += (deviationY / 0.1) * ML_CONFIG.COG_LATERAL_PENALTY_PER_10_PERCENT;
  }
  
  return {
    cog: {
      x: parseFloat(cogX.toFixed(2)),
      y: parseFloat(cogY.toFixed(2)),
      z: parseFloat(cogZ.toFixed(2))
    },
    penalty: parseFloat(Math.min(50, penalty).toFixed(2))
  };
}

/**
 * Calculates support ratio penalty.
 * @param {Array} items - Array of item objects
 * @returns {Object} {average: number, penalty: number}
 */
function calculateSupportRatioPenalty(items) {
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
  
  let penalty = 0;
  if (averageRatio < ML_CONFIG.SUPPORT_IDEAL_RATIO) {
    const deficit = ML_CONFIG.SUPPORT_IDEAL_RATIO - averageRatio;
    penalty = deficit * ML_CONFIG.SUPPORT_PENALTY_MULTIPLIER;
    penalty = Math.min(penalty, ML_CONFIG.SUPPORT_MAX_PENALTY);
  }
  
  return {
    average: parseFloat(averageRatio.toFixed(2)),
    penalty: parseFloat(penalty.toFixed(2))
  };
}

/**
 * Calculates overhang penalty.
 * @param {Array} items - Array of item objects
 * @returns {Object} {totalOverhang: number, penalty: number}
 */
function calculateOverhangPenalty(items) {
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
  
  let penalty = totalOverhang * ML_CONFIG.OVERHANG_PENALTY_PER_UNIT;
  penalty = Math.min(penalty, ML_CONFIG.OVERHANG_MAX_PENALTY);
  
  return {
    totalOverhang: parseFloat(totalOverhang.toFixed(2)),
    penalty: parseFloat(penalty.toFixed(2))
  };
}

/**
 * Detects overlapping items.
 * @param {Array} items - Array of item objects
 * @returns {Object} {hasOverlaps: boolean, pairs: Array, penalty: number}
 */
function detectOverlappingItems(items) {
  const overlappingPairs = [];
  
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (checkItemsOverlap3D(items[i], items[j])) {
        overlappingPairs.push([items[i].id, items[j].id]);
      }
    }
  }
  
  const penalty = overlappingPairs.length > 0 ? 50 : 0;
  
  return {
    hasOverlaps: overlappingPairs.length > 0,
    pairs: overlappingPairs,
    penalty: penalty
  };
}

// ============================================================================
// TENSORFLOW.JS MODEL MANAGEMENT
// ============================================================================

/**
 * Gets the TensorFlow.js library reference.
 * Handles both browser (global tf) and Node.js environments.
 * @returns {Object|null} TensorFlow.js tf object or null if unavailable
 */
function getTf() {
  if (typeof globalThis !== 'undefined' && globalThis.tf) {
    return globalThis.tf;
  }
  if (typeof window !== 'undefined' && window.tf) {
    return window.tf;
  }
  if (typeof global !== 'undefined' && global.tf) {
    return global.tf;
  }
  return null;
}

/**
 * Loads the TensorFlow.js model from specified path.
 * @param {string} [modelPath] - Path to model.json (default: DEFAULT_MODEL_PATH)
 * @returns {Promise<boolean>} True if model loaded successfully
 */
async function loadTFModel(modelPath = DEFAULT_MODEL_PATH) {
  const tf = getTf();
  if (!tf) {
    _modelLoadError = new Error('TensorFlow.js not available');
    return false;
  }
  
  try {
    _loadedModel = await tf.loadLayersModel(modelPath);
    _modelLoadError = null;
    return true;
  } catch (err) {
    _modelLoadError = err;
    _loadedModel = null;
    return false;
  }
}

/**
 * Initializes and loads the TensorFlow.js model.
 * Call this at app startup for faster first prediction.
 * Model is cached after first load.
 * 
 * @param {string} [modelPath] - Path to model.json (default: DEFAULT_MODEL_PATH)
 * @returns {Promise<boolean>} True if model loaded successfully
 */
async function initModel(modelPath = DEFAULT_MODEL_PATH) {
  if (_loadedModel) {
    return true;
  }
  
  if (_modelLoadPromise) {
    return _modelLoadPromise;
  }
  
  _modelLoadPromise = loadTFModel(modelPath);
  return _modelLoadPromise;
}

/**
 * Disposes the loaded model and frees GPU/memory resources.
 */
function disposeModel() {
  if (_loadedModel) {
    _loadedModel.dispose();
    _loadedModel = null;
  }
  _modelLoadPromise = null;
  _modelLoadError = null;
}

/**
 * Returns the current model loading state.
 * @returns {Object} {loaded: boolean, error: Error|null}
 */
function getModelStatus() {
  return {
    loaded: _loadedModel !== null,
    error: _modelLoadError
  };
}

/**
 * Set model path configuration.
 * @param {string} path - New model path
 */
function setModelPath(path) {
  DEFAULT_MODEL_PATH = path;
}

/**
 * Toggle TF.js inference on/off.
 * @param {boolean} enabled - Whether to use TF.js inference
 */
function setUseTfjs(enabled) {
  USE_TFJS = enabled;
}

// ============================================================================
// FEATURE EXTRACTION FOR NEURAL NETWORK
// ============================================================================

/**
 * Extracts a fixed-length feature vector from a packing arrangement.
 * All features are normalized to [0, 1] range for neural network input.
 * 
 * Feature vector structure (30 features total):
 * [0-2]   : CoG norms (x/width, y/height, z/depth)
 * [3]     : Average support ratio
 * [4]     : Total overhang (normalized)
 * [5]     : Item count (normalized, /10)
 * [6-29]  : Per-item features for up to 6 items (4 features × 6 items = 24):
 *           For each item: weight/20, vol/1e5, base_area/1e4, center_y_norm
 * 
 * @param {Array} items - Array of item objects
 * @param {Object} box - Box dimensions {width, height, depth}
 * @returns {Float32Array} Fixed-length feature vector of size FEATURE_VECTOR_SIZE (30)
 */
function extractFeatures(items, box = ML_CONFIG.DEFAULT_BOX) {
  const features = new Float32Array(FEATURE_VECTOR_SIZE);
  
  // Handle empty input
  if (!items || items.length === 0) {
    features[0] = 0.5; // x at center
    features[1] = 0;   // y at floor
    features[2] = 0.5; // z at center
    features[3] = 1.0; // perfect support
    features[4] = 0;   // no overhang
    features[5] = 0;   // no items
    // Rest are zeros (per-item features)
    return features;
  }
  
  // Sort items by y-position for consistent ordering
  const sortedItems = [...items].sort((a, b) => a.position.y - b.position.y);
  
  // Feature [0-2]: Normalized CoG position
  const cogResult = calculateCoGPenalty(sortedItems, box);
  features[0] = Math.min(1, Math.max(0, cogResult.cog.x / box.width));
  features[1] = Math.min(1, Math.max(0, cogResult.cog.y / box.height));
  features[2] = Math.min(1, Math.max(0, cogResult.cog.z / box.depth));
  
  // Feature [3]: Average support ratio
  const supportResult = calculateSupportRatioPenalty(sortedItems);
  features[3] = supportResult.average;
  
  // Feature [4]: Total overhang (normalized)
  const overhangResult = calculateOverhangPenalty(sortedItems);
  const boxPerimeter = 2 * (box.width + box.depth);
  features[4] = Math.min(1, overhangResult.totalOverhang / boxPerimeter);
  
  // Feature [5]: Normalized item count
  features[5] = Math.min(1, items.length / 10);
  
  // Features [6-29]: Per-item features (4 features × 6 items = 24 features)
  // For each item: weight/20, vol/1e5, base_area/1e4, center_y_norm
  for (let i = 0; i < MAX_INDIVIDUAL_ITEMS; i++) {
    const baseIdx = 6 + i * FEATURES_PER_ITEM;
    
    if (i < sortedItems.length) {
      const item = sortedItems[i];
      const volume = item.dimensions.width * item.dimensions.height * item.dimensions.depth;
      const baseArea = item.dimensions.width * item.dimensions.depth;
      const center = calculateItemCenter(item);
      
      features[baseIdx + 0] = Math.min(1, item.weight / 20);              // weight/20
      features[baseIdx + 1] = Math.min(1, volume / 1e5);                   // vol/1e5
      features[baseIdx + 2] = Math.min(1, baseArea / 1e4);                 // base_area/1e4
      features[baseIdx + 3] = Math.min(1, center.y / box.height);          // center_y_norm
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

// ============================================================================
// TENSORFLOW.JS INFERENCE
// ============================================================================

/**
 * Runs inference using the TensorFlow.js model.
 * Properly manages tensor lifecycle to prevent memory leaks.
 * 
 * @param {Float32Array} features - Feature vector
 * @returns {Promise<number|null>} Predicted score (0-100) or null if inference fails
 */
async function runTfjsInference(features) {
  const tf = getTf();
  if (!tf || !_loadedModel) {
    return null;
  }
  
  let inputTensor = null;
  let outputTensor = null;
  
  try {
    // Create input tensor [1, FEATURE_VECTOR_SIZE]
    inputTensor = tf.tensor2d([Array.from(features)], [1, FEATURE_VECTOR_SIZE]);
    
    // Run prediction
    outputTensor = _loadedModel.predict(inputTensor);
    
    // Extract scalar value (model outputs sigmoid 0-1)
    const outputData = await outputTensor.data();
    const rawScore = outputData[0];
    
    // Scale to 0-100 and clamp
    const score = Math.max(0, Math.min(100, rawScore * 100));
    
    return parseFloat(score.toFixed(2));
  } catch (err) {
    console.error('TF.js inference error:', err);
    return null;
  } finally {
    // Always dispose tensors to prevent memory leaks
    if (inputTensor) inputTensor.dispose();
    if (outputTensor) outputTensor.dispose();
  }
}

// ============================================================================
// PHYSICS-BASED FALLBACK PREDICTOR
// ============================================================================

/**
 * Runs the original physics-based stability prediction.
 * Used as fallback when TF.js is unavailable or disabled.
 * 
 * @param {Array} items - Array of item objects
 * @param {Object} box - Box dimensions
 * @returns {Object} Full prediction result with source = 'physics'
 */
function runPhysicsFallback(items, box) {
  // Handle empty array
  if (!Array.isArray(items) || items.length === 0) {
    return {
      score: 100,
      riskAssessment: 'Safe',
      isSafe: true,
      details: {
        source: 'physics',
        centerOfGravity: { x: box.width / 2, y: 0, z: box.depth / 2, penalty: 0 },
        supportRatio: { average: 1.0, penalty: 0 },
        overhang: { totalPenalty: 0 },
        notes: 'Empty arrangement - perfect stability by default'
      }
    };
  }
  
  const sortedItems = [...items].sort((a, b) => a.position.y - b.position.y);
  const totalWeight = sortedItems.reduce((sum, item) => sum + item.weight, 0);
  
  // Compute all penalties
  const overlapCheck = detectOverlappingItems(sortedItems);
  const cogResult = calculateCoGPenalty(sortedItems, box);
  const supportResult = calculateSupportRatioPenalty(sortedItems);
  const overhangResult = calculateOverhangPenalty(sortedItems);
  
  // Calculate score
  let totalPenalty = cogResult.penalty + 
                     supportResult.penalty + 
                     overhangResult.penalty +
                     overlapCheck.penalty;
  
  let score = Math.max(0, Math.min(100, 100 - totalPenalty));
  if (!Number.isFinite(score)) score = 0;
  score = parseFloat(score.toFixed(2));
  
  // Risk assessment
  let riskAssessment;
  if (score > ML_CONFIG.RISK_SAFE_THRESHOLD) {
    riskAssessment = 'Safe';
  } else if (score >= ML_CONFIG.RISK_MODERATE_THRESHOLD) {
    riskAssessment = 'Moderate Risk';
  } else {
    riskAssessment = 'High Risk';
  }
  
  const result = {
    score: score,
    riskAssessment: riskAssessment,
    isSafe: score > ML_CONFIG.RISK_SAFE_THRESHOLD,
    details: {
      source: 'physics',
      centerOfGravity: {
        x: cogResult.cog.x,
        y: cogResult.cog.y,
        z: cogResult.cog.z,
        penalty: cogResult.penalty
      },
      supportRatio: {
        average: supportResult.average,
        penalty: supportResult.penalty
      },
      overhang: {
        totalPenalty: overhangResult.penalty
      }
    }
  };
  
  if (overlapCheck.hasOverlaps) {
    result.details.overlapWarning = {
      detected: true,
      pairs: overlapCheck.pairs,
      penalty: overlapCheck.penalty
    };
  }
  
  result.details.metadata = {
    itemCount: items.length,
    totalWeight: parseFloat(totalWeight.toFixed(2)),
    boxDimensions: { ...box }
  };
  
  return result;
}

// ============================================================================
// MAIN PREDICTOR FUNCTION (Async, TF.js + Fallback)
// ============================================================================

/**
 * ML-Assisted Stability Predictor (TensorFlow.js Hybrid)
 * 
 * Evaluates the stability of a 3D packed arrangement using:
 * 1. TensorFlow.js neural network inference (primary, if available)
 * 2. Physics-based calculation (fallback)
 * 
 * The result includes details.source to indicate which method was used.
 * 
 * @param {Array} items - Array of item objects with id, position, dimensions, weight
 * @param {Object} [box] - Box dimensions (defaults to 100x100x100)
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.forceFallback=false] - Force physics fallback
 * @param {string} [options.modelPath] - Custom model path for lazy loading
 * @returns {Promise<Object>} Stability assessment result
 */
async function mlAssistedStabilityPredictor(items, box = ML_CONFIG.DEFAULT_BOX, options = {}) {
  const { forceFallback = false, modelPath = DEFAULT_MODEL_PATH } = options;
  
  // Input validation
  if (Array.isArray(items)) {
    for (const item of items) {
      const validation = validateItem(item);
      if (!validation.valid) {
        throw new Error(`Validation error: ${validation.error}`);
      }
    }
  }
  
  // Determine if we should attempt TF.js inference
  const shouldUseTfjs = USE_TFJS && !forceFallback;
  
  let tfjsScore = null;
  
  if (shouldUseTfjs) {
    // Attempt to load model if not already loaded
    const tf = getTf();
    if (tf && !_loadedModel && !_modelLoadError) {
      await initModel(modelPath);
    }
    
    // Extract features and run inference
    if (_loadedModel) {
      const features = extractFeatures(items, box);
      tfjsScore = await runTfjsInference(features);
    }
  }
  
  // If TF.js inference succeeded
  if (tfjsScore !== null) {
    // Determine risk from score
    let riskAssessment;
    if (tfjsScore > ML_CONFIG.RISK_SAFE_THRESHOLD) {
      riskAssessment = 'Safe';
    } else if (tfjsScore >= ML_CONFIG.RISK_MODERATE_THRESHOLD) {
      riskAssessment = 'Moderate Risk';
    } else {
      riskAssessment = 'High Risk';
    }
    
    const result = {
      score: tfjsScore,
      riskAssessment: riskAssessment,
      isSafe: tfjsScore > ML_CONFIG.RISK_SAFE_THRESHOLD,
      details: {
        source: 'tfjs'
      }
    };
    
    // Optionally compute physics details for debugging
    if (COMPUTE_PHYSICS_DETAILS_IN_TFJS_MODE && Array.isArray(items) && items.length > 0) {
      const sortedItems = [...items].sort((a, b) => a.position.y - b.position.y);
      const totalWeight = sortedItems.reduce((sum, item) => sum + item.weight, 0);
      
      const cogResult = calculateCoGPenalty(sortedItems, box);
      const supportResult = calculateSupportRatioPenalty(sortedItems);
      const overhangResult = calculateOverhangPenalty(sortedItems);
      const overlapCheck = detectOverlappingItems(sortedItems);
      
      result.details.centerOfGravity = {
        x: cogResult.cog.x,
        y: cogResult.cog.y,
        z: cogResult.cog.z,
        penalty: cogResult.penalty
      };
      result.details.supportRatio = {
        average: supportResult.average,
        penalty: supportResult.penalty
      };
      result.details.overhang = {
        totalPenalty: overhangResult.penalty
      };
      
      if (overlapCheck.hasOverlaps) {
        result.details.overlapWarning = {
          detected: true,
          pairs: overlapCheck.pairs,
          penalty: overlapCheck.penalty
        };
      }
      
      result.details.metadata = {
        itemCount: items.length,
        totalWeight: parseFloat(totalWeight.toFixed(2)),
        boxDimensions: { ...box }
      };
      
      // Compute what physics would have scored for comparison
      const physicsScore = 100 - (cogResult.penalty + supportResult.penalty + 
                                   overhangResult.penalty + overlapCheck.penalty);
      result.details.physicsScoreComparison = parseFloat(Math.max(0, Math.min(100, physicsScore)).toFixed(2));
    }
    
    return result;
  }
  
  // Fallback to physics-based calculation
  return runPhysicsFallback(items, box);
}

// ============================================================================
// SYNCHRONOUS PHYSICS-ONLY PREDICTOR (Backward compatibility)
// ============================================================================

/**
 * Synchronous version that only uses physics calculation.
 * Use this if you don't want async/await or TF.js dependency.
 * 
 * @param {Array} items - Array of item objects
 * @param {Object} [box] - Box dimensions
 * @returns {Object} Stability assessment result
 */
function mlAssistedStabilityPredictorSync(items, box = ML_CONFIG.DEFAULT_BOX) {
  // Validate items
  if (Array.isArray(items)) {
    for (const item of items) {
      const validation = validateItem(item);
      if (!validation.valid) {
        throw new Error(`Validation error: ${validation.error}`);
      }
    }
  }
  
  return runPhysicsFallback(items, box);
}

// ============================================================================
// DEMO FUNCTION
// ============================================================================

/**
 * Async demonstration showcasing both TF.js and physics fallback modes.
 * @param {Object} [options] - Demo options
 * @param {string} [options.modelPath] - Path to TF.js model
 */
async function demo(options = {}) {
  const { modelPath = DEFAULT_MODEL_PATH } = options;
  
  console.log('='.repeat(70));
  console.log('ML-ASSISTED STABILITY PREDICTOR (TF.js Hybrid) - DEMONSTRATION');
  console.log('Version: 2.0.0-tfjs');
  console.log('='.repeat(70));
  console.log();
  
  // Check TF.js availability
  const tf = getTf();
  console.log(`TensorFlow.js available: ${tf ? 'Yes' : 'No'}`);
  console.log(`USE_TFJS setting: ${USE_TFJS}`);
  console.log(`Feature vector size: ${FEATURE_VECTOR_SIZE}`);
  console.log();
  
  // Attempt to load model
  if (tf && USE_TFJS) {
    console.log(`Attempting to load model from: ${modelPath}`);
    const loaded = await initModel(modelPath);
    console.log(`Model loaded: ${loaded}`);
    if (!loaded && _modelLoadError) {
      console.log(`Load error: ${_modelLoadError.message}`);
    }
    console.log();
  }
  
  // Test data - 6 test cases
  const testCases = [
    {
      name: 'Stable Pyramid Stack',
      items: [
        { id: 'base', position: { x: 10, y: 0, z: 10 }, dimensions: { width: 80, height: 20, depth: 80 }, weight: 15 },
        { id: 'middle', position: { x: 20, y: 20, z: 20 }, dimensions: { width: 60, height: 20, depth: 60 }, weight: 10 },
        { id: 'top', position: { x: 30, y: 40, z: 30 }, dimensions: { width: 40, height: 15, depth: 40 }, weight: 5 }
      ]
    },
    {
      name: 'Top-Heavy with Overhang',
      items: [
        { id: 'small-base', position: { x: 40, y: 0, z: 40 }, dimensions: { width: 20, height: 10, depth: 20 }, weight: 2 },
        { id: 'heavy-top', position: { x: 20, y: 10, z: 20 }, dimensions: { width: 60, height: 40, depth: 60 }, weight: 20 }
      ]
    },
    {
      name: 'Well-Supported Stack',
      items: [
        { id: '1', position: { x: 20, y: 0, z: 20 }, dimensions: { width: 60, height: 30, depth: 60 }, weight: 10 },
        { id: '2', position: { x: 25, y: 30, z: 25 }, dimensions: { width: 50, height: 20, depth: 50 }, weight: 5 },
        { id: '3', position: { x: 30, y: 50, z: 30 }, dimensions: { width: 40, height: 10, depth: 40 }, weight: 2 }
      ]
    },
    {
      name: 'Empty Box',
      items: []
    },
    {
      name: 'Single Centered Item',
      items: [
        { id: 'only', position: { x: 25, y: 0, z: 25 }, dimensions: { width: 50, height: 30, depth: 50 }, weight: 10 }
      ]
    },
    {
      name: 'Five Items Stacked',
      items: [
        { id: 'a', position: { x: 10, y: 0, z: 10 }, dimensions: { width: 80, height: 15, depth: 80 }, weight: 12 },
        { id: 'b', position: { x: 15, y: 15, z: 15 }, dimensions: { width: 70, height: 15, depth: 70 }, weight: 10 },
        { id: 'c', position: { x: 20, y: 30, z: 20 }, dimensions: { width: 60, height: 15, depth: 60 }, weight: 8 },
        { id: 'd', position: { x: 25, y: 45, z: 25 }, dimensions: { width: 50, height: 15, depth: 50 }, weight: 6 },
        { id: 'e', position: { x: 30, y: 60, z: 30 }, dimensions: { width: 40, height: 15, depth: 40 }, weight: 4 }
      ]
    }
  ];
  
  const results = {};
  
  // Run TF.js mode (or physics if TF.js unavailable)
  console.log('--- PRIMARY MODE (TF.js if available, else Physics) ---');
  console.log();
  
  for (const testCase of testCases) {
    console.log(`TEST: ${testCase.name}`);
    console.log('-'.repeat(40));
    
    try {
      const result = await mlAssistedStabilityPredictor(testCase.items);
      console.log(`Score: ${result.score} | Risk: ${result.riskAssessment} | Source: ${result.details.source}`);
      if (result.details.physicsScoreComparison !== undefined) {
        console.log(`Physics comparison score: ${result.details.physicsScoreComparison}`);
      }
      results[testCase.name] = { primary: result };
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }
    console.log();
  }
  
  // Run forced physics fallback for comparison
  console.log('--- FORCED PHYSICS FALLBACK MODE ---');
  console.log();
  
  for (const testCase of testCases) {
    console.log(`TEST: ${testCase.name}`);
    console.log('-'.repeat(40));
    
    try {
      const result = await mlAssistedStabilityPredictor(testCase.items, ML_CONFIG.DEFAULT_BOX, { forceFallback: true });
      console.log(`Score: ${result.score} | Risk: ${result.riskAssessment} | Source: ${result.details.source}`);
      if (results[testCase.name]) {
        results[testCase.name].fallback = result;
      }
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }
    console.log();
  }
  
  // Summary
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  
  for (const testCase of testCases) {
    const r = results[testCase.name];
    if (r) {
      const primarySource = r.primary?.details?.source || 'N/A';
      const primaryScore = r.primary?.score ?? 'N/A';
      const fallbackScore = r.fallback?.score ?? 'N/A';
      console.log(`${testCase.name.padEnd(25)} | Primary (${primarySource}): ${primaryScore} | Fallback: ${fallbackScore}`);
    }
  }
  
  console.log('='.repeat(70));
  console.log();
  console.log('Demo complete. Model status:', getModelStatus());
  
  return results;
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

// Default export (async version)
export default mlAssistedStabilityPredictor;

// Named exports
export {
  // Main functions
  mlAssistedStabilityPredictor,
  mlAssistedStabilityPredictorSync,
  
  // Model management
  initModel,
  loadTFModel,
  disposeModel,
  getModelStatus,
  setModelPath,
  setUseTfjs,
  
  // Feature extraction (for training data generation)
  extractFeatures,
  FEATURE_VECTOR_SIZE,
  MAX_INDIVIDUAL_ITEMS,
  FEATURES_PER_ITEM,
  
  // Helper functions
  calculateItemCenter,
  calculateOverlapArea,
  isBelow,
  validateItem,
  
  // Physics calculators (for fallback and debugging)
  calculateCoGPenalty,
  calculateSupportRatioPenalty,
  calculateOverhangPenalty,
  detectOverlappingItems,
  
  // Demo and config
  demo,
  ML_CONFIG,
  
  // Configuration
  USE_TFJS,
  COMPUTE_PHYSICS_DETAILS_IN_TFJS_MODE,
  DEFAULT_MODEL_PATH
};
