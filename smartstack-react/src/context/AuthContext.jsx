import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

// Admin emails and password - these emails will automatically get admin role
const ADMIN_EMAILS = [
  'l.srinath160706@gmail.com',
  'admin@smartstack.com'
  // Add more admin emails here
];
const ADMIN_PASSWORD = 'admin123'; // Hardcoded admin password

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            ...userDoc.data()
          });
        } else {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: 'driver',
            name: firebaseUser.email.split('@')[0]
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Login with email/password
  const login = async (email, password) => {
    try {
      setLoading(true);

      // Check if it's admin login with hardcoded credentials
      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      if (isAdmin && password === ADMIN_PASSWORD) {
        // Hardcoded admin login - set user directly
        const adminUser = {
          uid: 'admin-' + email,
          email: email,
          role: 'admin',
          name: email.split('@')[0]
        };
        setUser(adminUser);

        // Create or update admin user document in Firestore
        const userDocRef = doc(db, 'users', adminUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            email,
            name: adminUser.name,
            role: 'admin',
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
          });
        } else {
          await updateDoc(userDocRef, { lastLoginAt: serverTimestamp() });
        }

        return { success: true };
      }

      // Regular Firebase Auth login
      const result = await signInWithEmailAndPassword(auth, email, password);

      // Check if user doc exists, create if not
      const userDocRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);

      // Determine role - admin if email is in ADMIN_EMAILS
      const role = isAdmin ? 'admin' : 'driver';

      if (!userDoc.exists()) {
        // Create user document
        await setDoc(userDocRef, {
          email,
          name: email.split('@')[0],
          role,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        });
      } else {
        // Update last login timestamp (and role if admin)
        const updates = { lastLoginAt: serverTimestamp() };
        if (isAdmin && userDoc.data().role !== 'admin') {
          updates.role = 'admin';
        }
        await updateDoc(userDocRef, updates);
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.code === 'auth/invalid-credential'
          ? 'Invalid email or password'
          : error.message
      };
    } finally {
      setLoading(false);
    }
  };

  // Register new user
  const register = async (email, password, name, role = 'driver') => {
    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', result.user.uid), {
        email,
        name,
        role,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: error.code === 'auth/email-already-in-use' 
          ? 'Email already registered' 
          : error.message 
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
