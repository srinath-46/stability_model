// Simple test for the JavaScript models
const { predictPriority } = require('./web_models_js/priority_model.js');
const { predictStability, predictCombined } = require('./web_models_js/stability_model.js');

console.log('🧪 TESTING JAVASCRIPT MODELS');
console.log('=' * 50);

// Test priority model
console.log('\n📦 Testing Priority Model:');
const priorityInput = [1, 30, 20, 15, 5]; // [cat_code, l, w, h, weight]
const priorityScore = predictPriority(priorityInput);
console.log(`Input: ${priorityInput}`);
console.log(`Priority Score: ${priorityScore.toFixed(2)}`);

// Test stability model
console.log('\n⚖️ Testing Stability Model:');
const stabilityInput = [25, 15, 10, 3, 30, 20, 8]; // [l, w, h, weight, bl, bw, bweight]
const stabilityScore = predictStability(stabilityInput);
console.log(`Input: ${stabilityInput}`);
console.log(`Stability Score: ${stabilityScore.toFixed(4)}`);

// Test combined model
console.log('\n🔗 Testing Combined Model:');
const result = predictCombined(priorityInput, stabilityInput);
console.log('Combined Result:', JSON.stringify(result, null, 2));

console.log('\n✅ Testing completed successfully!');
