# ML-Assisted Stability Predictor

A hybrid ML-assisted stability scoring system that uses TensorFlow.js neural network to approximate physics-based stability scores (0-100) for 3D packed items in a box, with automatic fallback to deterministic physics calculations.

## Quick Start

### JavaScript (Browser)

```html
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js"></script>
<script type="module">
  import { mlAssistedStabilityPredictor } from "./mlAssistedStabilityPredictor-tfjs.js";

  const items = [
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

  const result = await mlAssistedStabilityPredictor(items);
  console.log(result.score, result.riskAssessment, result.details.source);
</script>
```

### JavaScript (Node.js)

```bash
npm install @tensorflow/tfjs
```

```javascript
import * as tf from "@tensorflow/tfjs-node";
globalThis.tf = tf;

import { mlAssistedStabilityPredictor } from "./mlAssistedStabilityPredictor-tfjs.js";
const result = await mlAssistedStabilityPredictor(items);
```

## Training the Model

### 1. Install Python dependencies

```bash
pip install -r requirements.txt
# Or: pip install tensorflow==2.15.0 tensorflowjs==4.22.0 numpy==1.26.4 tqdm==4.66.1
```

### 2. Generate training data

```bash
python generate_data.py
```

This creates `training_data.npz` with ~10,000 samples.

### 3. Train and export model

```bash
python train_and_export.py
```

This creates `tfjs_model/` folder with `model.json` and weight files.

### 4. Test in browser

Open `test-tfjs.html` in a browser (Chrome/Edge/Firefox).

## Architecture

- **Input**: 30-feature normalized vector
- **MLP**: Dense(128, ReLU) → Dropout(0.1) → Dense(64, ReLU) → Dense(32, ReLU) → Dense(1, sigmoid)
- **Output**: Score 0-100 (sigmoid × 100)

### Feature Vector (30 features)

| Index | Description                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------- |
| 0-2   | CoG position (x/width, y/height, z/depth)                                                                     |
| 3     | Average support ratio                                                                                         |
| 4     | Total overhang (normalized)                                                                                   |
| 5     | Item count (/10)                                                                                              |
| 6-29  | Per-item features for 5 items (5 features each): weight/20, vol/1e5, base_area/1e4, center_y_norm, pos_y_norm |

## API Reference

### `mlAssistedStabilityPredictor(items, box?, options?)`

Main async function for stability prediction.

**Parameters:**

- `items`: Array of item objects
- `box`: Box dimensions (default: 100×100×100)
- `options.forceFallback`: Force physics mode
- `options.modelPath`: Custom model path

**Returns:** `{ score, riskAssessment, isSafe, details }`

### `mlAssistedStabilityPredictorSync(items, box?)`

Synchronous physics-only version.

### `initModel(modelPath?)`

Pre-load the TF.js model.

### `setUseTfjs(enabled)`

Toggle TF.js inference on/off.

## Files

| File                                   | Description                           |
| -------------------------------------- | ------------------------------------- |
| `mlAssistedStabilityPredictor-tfjs.js` | Main JavaScript module                |
| `generate_data.py`                     | Training data generation              |
| `train_and_export.py`                  | Model training & TF.js export         |
| `test-tfjs.html`                       | Browser test page                     |
| `requirements.txt`                     | Python dependencies                   |
| `tfjs_model/`                          | Exported TF.js model (after training) |

## License

MIT
