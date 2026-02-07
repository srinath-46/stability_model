// Test script for combined priority and stability predictions
// Run with: node test_combined_models.js

const fs = require('fs');

// Load the models
const priorityCode = fs.readFileSync('web_models_js/priority_model.js', 'utf8');
const stabilityCode = fs.readFileSync('web_models_js/stability_model.js', 'utf8');

// Execute the model code
eval(priorityCode);
eval(stabilityCode);

console.log('🧪 TESTING COMBINED PRIORITY & STABILITY PREDICTIONS');
console.log('=' * 60);

// Test cases with different item combinations
const testCases = [
    {
        name: 'Heavy Item on Light Base',
        priorityInput: [2, 50, 40, 30, 70], // Heavy item: cat_code=2, l=50, w=40, h=30, weight=70
        stabilityInput: [30, 25, 20, 15, 40, 35, 10] // Top: l=30,w=25,h=20,weight=15; Bottom: l=40,w=35,weight=10
    },
    {
        name: 'Fragile Item on Stable Base',
        priorityInput: [1, 20, 15, 10, 5], // Fragile item: cat_code=1, l=20, w=15, h=10, weight=5
        stabilityInput: [25, 20, 15, 8, 50, 45, 25] // Top: l=25,w=20,h=15,weight=8; Bottom: l=50,w=45,weight=25
    },
    {
        name: 'Common Item on Common Base',
        priorityInput: [0, 35, 30, 25, 12], // Common item: cat_code=0, l=35, w=30, h=25, weight=12
        stabilityInput: [35, 30, 25, 12, 40, 35, 15] // Top: l=35,w=30,h=25,weight=12; Bottom: l=40,w=35,weight=15
    }
];

testCases.forEach((testCase, index) => {
    console.log(`\n📦 Test Case ${index + 1}: ${testCase.name}`);
    console.log('-'.repeat(50));

    try {
        const result = predictCombined(testCase.priorityInput, testCase.stabilityInput);

        console.log('🎯 PRIORITY ANALYSIS:');
        console.log(`   Raw Score: ${result.priority.score.toFixed(2)}/10`);
        console.log(`   Normalized: ${(result.priority.normalizedScore * 100).toFixed(1)}%`);
        console.log(`   Assessment: ${result.priority.assessment}`);

        console.log('\n⚖️ STABILITY ANALYSIS:');
        console.log(`   Raw Score: ${(result.stability.score * 100).toFixed(1)}/100`);
        console.log(`   Normalized: ${(result.stability.normalizedScore * 100).toFixed(1)}%`);
        console.log(`   Assessment: ${result.stability.assessment}`);
        console.log(`   Risk Level: ${result.stability.riskLevel}`);

        console.log('\n📊 OVERALL RECOMMENDATION:');
        console.log(`   Is Safe: ${result.overall.isSafe ? '✅ Yes' : '❌ No'}`);
        console.log(`   Recommendation: ${result.overall.recommendation}`);

    } catch (error) {
        console.log(`❌ Error in prediction: ${error.message}`);
    }
});

console.log('\n' + '=' * 60);
console.log('✅ Combined model testing completed!');
console.log('=' * 60);
