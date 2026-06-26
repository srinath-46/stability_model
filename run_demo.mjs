import { demo } from './mlAssistedStabilityPredictor-tfjs.js';

demo().then(() => {
  console.log("Demo finished.");
}).catch(err => {
  console.error("Demo failed:", err);
});
