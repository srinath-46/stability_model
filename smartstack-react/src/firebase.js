import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCixZxH3bFNfj0hfZMc2Ha9QRU39nLHo6U",
  authDomain: "smart-stack-b6dd7.firebaseapp.com",
  projectId: "smart-stack-b6dd7",
  storageBucket: "smart-stack-b6dd7.firebasestorage.app",
  messagingSenderId: "371598524708",
  appId: "1:371598524708:web:27111bbe6da693774473b1",
  measurementId: "G-H7DJT0TWEY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export auth and firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
