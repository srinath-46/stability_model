"""
Custom Data Training Script for ML-Assisted Stability Predictor
Load your own training data and train the model.

Usage:
    1. Prepare your data in the format shown below
    2. Modify the load_custom_data() function to load your data
    3. Run: python custom_data_training.py

Expected Data Format:
Your data should be a list of samples, where each sample is:
{
    "items": [
        {
            "id": "item_id",
            "position": {"x": float, "y": float, "z": float},
            "dimensions": {"width": float, "height": float, "depth": float},
            "weight": float
        },
        ... (up to 6 items)
    ],
    "stability_score": float  # 0-100 (higher = more stable)
}

Example data structure:
[
    {
        "items": [
            {
                "id": "box1",
                "position": {"x": 10, "y": 0, "z": 10},
                "dimensions": {"width": 30, "height": 20, "depth": 30},
                "weight": 5.0
            },
            {
                "id": "box2",
                "position": {"x": 15, "y": 20, "z": 15},
                "dimensions": {"width": 25, "height": 15, "depth": 25},
                "weight": 3.0
            }
        ],
        "stability_score": 85.5
    },
    ... more samples
]
"""

import os
import numpy as np
import json
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.preprocessing import StandardScaler

# Configuration
FEATURE_VECTOR_SIZE = 30
BOX = {"width": 100, "height": 100, "depth": 100}

# Training hyperparameters (same as before)
HIDDEN_LAYER_SIZES = (128, 64, 32)
MAX_ITER = 1000
LEARNING_RATE_INIT = 0.001
RANDOM_STATE = 42


def load_custom_data(data_file="your_training_data.json"):
    """
    Load your custom training data.

    Modify this function to load your data from any format:
    - JSON file
    - CSV file
    - Database
    - API endpoint
    - etc.

    Returns:
        X: numpy array of features (n_samples, 30)
        y: numpy array of normalized scores (n_samples,) in range [0, 1]
    """
    print(f"Loading custom training data from {data_file}...")

    # Example: Load from JSON file
    if os.path.exists(data_file):
        with open(data_file, 'r') as f:
            data = json.load(f)
    else:
        print(f"Data file {data_file} not found!")
        print("Please create your training data file or modify this function.")
        return None, None

    print(f"Loaded {len(data)} training samples")

    # Convert to feature vectors and labels
    X = []
    y = []

    for sample in data:
        items = sample["items"]
        stability_score = sample["stability_score"]

        # Extract features (same as generate_data.py)
        features = extract_features(items, BOX)
        X.append(features)

        # Normalize score to 0-1 range
        normalized_score = stability_score / 100.0
        y.append(normalized_score)

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.float32)

    print(f"Converted to {len(y)} feature vectors with {X.shape[1]} features each")
    print(f"Score range: {y.min()*100:.2f} - {y.max()*100:.2f}")

    return X, y


def calculate_item_center(item):
    """Calculate geometric center of an item."""
    return {
        "x": item["position"]["x"] + item["dimensions"]["width"] / 2,
        "y": item["position"]["y"] + item["dimensions"]["height"] / 2,
        "z": item["position"]["z"] + item["dimensions"]["depth"] / 2,
    }


def calculate_overlap_area(item_a, item_b):
    """Calculate overlapping area between two items in x-z plane."""
    a_min_x = item_a["position"]["x"]
    a_max_x = item_a["position"]["x"] + item_a["dimensions"]["width"]
    a_min_z = item_a["position"]["z"]
    a_max_z = item_a["position"]["z"] + item_a["dimensions"]["depth"]

    b_min_x = item_b["position"]["x"]
    b_max_x = item_b["position"]["x"] + item_b["dimensions"]["width"]
    b_min_z = item_b["position"]["z"]
    b_max_z = item_b["position"]["z"] + item_b["dimensions"]["depth"]

    overlap_min_x = max(a_min_x, b_min_x)
    overlap_max_x = min(a_max_x, b_max_x)
    overlap_min_z = max(a_min_z, b_min_z)
    overlap_max_z = min(a_max_z, b_max_z)

    overlap_width = overlap_max_x - overlap_min_x
    overlap_depth = overlap_max_z - overlap_min_z

    if overlap_width > 0 and overlap_depth > 0:
        return overlap_width * overlap_depth
    return 0


def is_below(item_a, item_b):
    """Check if item_a is directly below item_b (supporting it)."""
    item_a_top = item_a["position"]["y"] + item_a["dimensions"]["height"]
    item_b_bottom = item_b["position"]["y"]

    epsilon = 0.001
    is_vertically_adjacent = abs(item_a_top - item_b_bottom) < epsilon
    has_overlap = calculate_overlap_area(item_a, item_b) > 0

    return is_vertically_adjacent and has_overlap


def calculate_cog_penalty(items, box):
    """Calculate Center of Gravity penalty."""
    weighted_items = [item for item in items if item["weight"] > 0]

    if len(weighted_items) == 0:
        return {
            "cog": {"x": box["width"] / 2, "y": 0, "z": box["depth"] / 2},
            "penalty": 0,
        }

    total_weight = sum(item["weight"] for item in weighted_items)

    cog_x, cog_y, cog_z = 0, 0, 0
    for item in weighted_items:
        center = calculate_item_center(item)
        cog_x += center["x"] * item["weight"]
        cog_y += center["y"] * item["weight"]
        cog_z += center["z"] * item["weight"]

    cog_x /= total_weight
    cog_y /= total_weight
    cog_z /= total_weight

    return {"cog": {"x": cog_x, "y": cog_y, "z": cog_z}, "penalty": 0}


def calculate_support_ratio_penalty(items):
    """Calculate support ratio penalty."""
    non_floor_items = [item for item in items if item["position"]["y"] > 0]

    if len(non_floor_items) == 0:
        return {"average": 1.0, "penalty": 0}

    total_ratio = 0

    for item in non_floor_items:
        base_area = item["dimensions"]["width"] * item["dimensions"]["depth"]
        supported_area = 0

        for potential_support in items:
            if potential_support["id"] == item["id"]:
                continue
            if is_below(potential_support, item):
                supported_area += calculate_overlap_area(potential_support, item)

        ratio = min(1.0, supported_area / base_area) if base_area > 0 else 0
        total_ratio += ratio

    average_ratio = total_ratio / len(non_floor_items)

    return {"average": average_ratio, "penalty": 0}


def calculate_overhang_penalty(items):
    """Calculate overhang penalty."""
    non_floor_items = [item for item in items if item["position"]["y"] > 0]

    if len(non_floor_items) == 0:
        return {"total_overhang": 0, "penalty": 0}

    total_overhang = 0

    for item in non_floor_items:
        base_area = item["dimensions"]["width"] * item["dimensions"]["depth"]
        perimeter = 2 * (item["dimensions"]["width"] + item["dimensions"]["depth"])

        supported_area = 0
        for potential_support in items:
            if potential_support["id"] == item["id"]:
                continue
            if is_below(potential_support, item):
                supported_area += calculate_overlap_area(potential_support, item)

        supported_area = min(supported_area, base_area)
        unsupported_area = max(0, base_area - supported_area)

        if perimeter > 0:
            total_overhang += unsupported_area / perimeter

    return {"total_overhang": total_overhang, "penalty": 0}


def extract_features(items, box=BOX):
    """
    Extract feature vector from packing arrangement.
    MUST match JavaScript extractFeatures() exactly.
    """
    features = np.zeros(FEATURE_VECTOR_SIZE, dtype=np.float32)

    # Handle empty input
    if not items or len(items) == 0:
        features[0] = 0.5  # x at center
        features[1] = 0  # y at floor
        features[2] = 0.5  # z at center
        features[3] = 1.0  # perfect support
        features[4] = 0  # no overhang
        features[5] = 0  # no items
        return features

    # Sort items by y-position
    sorted_items = sorted(items, key=lambda x: x["position"]["y"])

    # Feature [0-2]: Normalized CoG position
    cog_result = calculate_cog_penalty(sorted_items, box)
    features[0] = min(1, max(0, cog_result["cog"]["x"] / box["width"]))
    features[1] = min(1, max(0, cog_result["cog"]["y"] / box["height"]))
    features[2] = min(1, max(0, cog_result["cog"]["z"] / box["depth"]))

    # Feature [3]: Average support ratio
    support_result = calculate_support_ratio_penalty(sorted_items)
    features[3] = support_result["average"]

    # Feature [4]: Total overhang (normalized)
    overhang_result = calculate_overhang_penalty(sorted_items)
    box_perimeter = 2 * (box["width"] + box["depth"])
    features[4] = min(1, overhang_result["total_overhang"] / box_perimeter)

    # Feature [5]: Normalized item count
    features[5] = min(1, len(items) / 10)

    # Features [6-29]: Per-item features (4 features × 6 items = 24)
    max_items = 6
    for i in range(max_items):
        base_idx = 6 + i * 4

        if i < len(sorted_items):
            item = sorted_items[i]
            volume = (
                item["dimensions"]["width"]
                * item["dimensions"]["height"]
                * item["dimensions"]["depth"]
            )
            base_area = item["dimensions"]["width"] * item["dimensions"]["depth"]
            center = calculate_item_center(item)

            features[base_idx + 0] = min(1, item["weight"] / 20)  # weight/20
            features[base_idx + 1] = min(1, volume / 1e5)  # vol/1e5
            features[base_idx + 2] = min(1, base_area / 1e4)  # base_area/1e4
            features[base_idx + 3] = min(1, center["y"] / box["height"])  # center_y_norm
        else:
            # Pad with zeros for missing items
            features[base_idx + 0] = 0
            features[base_idx + 1] = 0
            features[base_idx + 2] = 0
            features[base_idx + 3] = 0

    return features


def train_and_export_model(X, y):
    """Train the model and export to JavaScript."""

    print("\nTraining MLP model...")

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.1, random_state=RANDOM_STATE
    )

    print(f"Data split: {len(y_train)} training, {len(y_test)} test samples")

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train model
    model = MLPRegressor(
        hidden_layer_sizes=HIDDEN_LAYER_SIZES,
        max_iter=MAX_ITER,
        learning_rate_init=LEARNING_RATE_INIT,
        random_state=RANDOM_STATE,
        verbose=True,
        early_stopping=True,
        validation_fraction=0.2,
        n_iter_no_change=10
    )

    model.fit(X_train_scaled, y_train)

    print(f"Training completed after {model.n_iter_} iterations")
    print(f"Final loss: {model.loss_:.6f}")

    # Evaluate
    y_pred = model.predict(X_test_scaled)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = mean_squared_error(y_test, y_pred, squared=False)

    print("
Test Results:")
    print(".2f")
    print(".2f")

    # Export to JavaScript
    export_to_javascript(model, scaler, "custom_mlp_model.js")

    # Save model info
    save_model_info(model, scaler, mae*100, rmse*100, "custom_model_info.json")

    print("\n" + "=" * 60)
    print("CUSTOM TRAINING COMPLETE")
    print("=" * 60)
    print("Files created:")
    print("  - custom_mlp_model.js (JavaScript model)")
    print("  - custom_model_info.json (model metadata)")
    print("\nTo use in JavaScript:")
    print("  <script src='custom_mlp_model.js'></script>")
    print("  const result = predictStability(featureArray);")


def export_to_javascript(model, scaler, output_file):
    """Export the trained model to JavaScript."""

    print("
Exporting model to JavaScript...")

    # Extract weights and biases
    weights = []
    biases = []

    for i in range(len(model.coefs_)):
        weights.append(model.coefs_[i].tolist())
        biases.append(model.intercepts_[i].tolist())

    # Create JavaScript implementation
    js_model_code = f"""
// Custom Trained ML-Assisted Stability Predictor
// Model: MLPRegressor with {HIDDEN_LAYER_SIZES} hidden layers

// Model weights and biases
const model_weights = {json.dumps(weights)};
const model_biases = {json.dumps(biases)};

// Scaler parameters
const scaler_mean = {scaler.mean_.tolist()};
const scaler_scale = {scaler.scale_.tolist()};

// Activation functions
function relu(x) {{
    return Math.max(0, x);
}}

function linear(x) {{
    return x;
}}

// Matrix multiplication helper
function matMul(A, B) {{
    const result = [];
    for (let i = 0; i < A.length; i++) {{
        result[i] = [];
        for (let j = 0; j < B[0].length; j++) {{
            let sum = 0;
            for (let k = 0; k < B.length; k++) {{
                sum += A[i][k] * B[k][j];
            }}
            result[i][j] = sum;
        }}
    }}
    return result;
}}

// Vector addition helper
function vecAdd(a, b) {{
    return a.map((val, i) => val + b[i]);
}}

// Apply activation to vector
function applyActivation(vec, activation) {{
    return vec.map(activation);
}}

// Forward pass through the network
function forwardPass(input) {{
    let current = input;

    // Hidden layers with ReLU
    for (let i = 0; i < model_weights.length - 1; i++) {{
        current = matMul([current], model_weights[i])[0];
        current = vecAdd(current, model_biases[i]);
        current = applyActivation(current, relu);
    }}

    // Output layer (linear activation)
    current = matMul([current], model_weights[model_weights.length - 1])[0];
    current = vecAdd(current, model_biases[model_biases.length - 1]);
    current = applyActivation(current, linear);

    return current[0]; // Single output
}}

// Main prediction function
function predictStability(features) {{
    // Validate input
    if (!Array.isArray(features) || features.length !== {FEATURE_VECTOR_SIZE}) {{
        throw new Error(`Expected {FEATURE_VECTOR_SIZE} features, got ${{features.length}}`);
    }}

    // Standardize features
    const scaled_features = features.map((val, i) => (val - scaler_mean[i]) / scaler_scale[i]);

    // Make prediction
    const prediction = forwardPass(scaled_features);

    // Ensure output is in [0, 1] range
    const score = Math.max(0, Math.min(1, prediction));

    return {{
        score: score * 100,
        normalizedScore: score,
        riskAssessment: score > 0.8 ? 'Low Risk' : score > 0.6 ? 'Medium Risk' : 'High Risk',
        isSafe: score > 0.7,
        details: {{
            source: 'custom-sklearn-MLP',
            confidence: Math.abs(score - 0.5) * 2
        }}
    }};
}}

// Export the main function
if (typeof module !== 'undefined' && module.exports) {{
    module.exports = {{ predictStability }};
}} else if (typeof window !== 'undefined') {{
    window.predictStability = predictStability;
}}
"""

    with open(output_file, 'w') as f:
        f.write(js_model_code)

    print(f"Model exported to {output_file}")


def save_model_info(model, scaler, mae, rmse, info_file):
    """Save model metadata."""

    info = {
        "model_type": "Custom Trained MLPRegressor",
        "hidden_layer_sizes": HIDDEN_LAYER_SIZES,
        "max_iter": MAX_ITER,
        "learning_rate_init": LEARNING_RATE_INIT,
        "random_state": RANDOM_STATE,
        "n_features": FEATURE_VECTOR_SIZE,
        "scaler_mean": scaler.mean_.tolist(),
        "scaler_scale": scaler.scale_.tolist(),
        "n_layers": model.n_layers_,
        "final_loss": model.loss_,
        "n_iterations": model.n_iter_,
        "test_mae": mae,
        "test_rmse": rmse,
        "exported_to": "custom_mlp_model.js"
    }

    with open(info_file, 'w') as f:
        json.dump(info, f, indent=2)

    print(f"Model info saved to {info_file}")


def main():
    """Main function."""

    print("=" * 60)
    print("Custom Data Training for ML-Assisted Stability Predictor")
    print("=" * 60)

    # Load your custom data
    X, y = load_custom_data("your_training_data.json")

    if X is None:
        print("\nNo data loaded. Please:")
        print("1. Create your training data file (your_training_data.json)")
        print("2. Or modify the load_custom_data() function to load your data")
        print("3. Format should match the example in the docstring")
        return

    # Train and export
    train_and_export_model(X, y)


if __name__ == '__main__':
    main()
