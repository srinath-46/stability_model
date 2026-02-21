import { useState } from 'react';
import {
    collection,
    doc,
    getDocs,
    query,
    where,
    deleteDoc,
    orderBy
} from 'firebase/firestore';
import { db } from '../firebase';

export function useDrivers() {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Get all users with role 'driver'
    const getAllDrivers = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'users'),
                where('role', '==', 'driver')
            );

            const snapshot = await getDocs(q);
            const driversList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
            }));

            // Sort client-side to avoid needing a composite index for role + createdAt initially
            driversList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setDrivers(driversList);
            return driversList;
        } catch (error) {
            console.error('Error fetching drivers:', error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    // Delete a driver
    const deleteDriver = async (driverId) => {
        try {
            await deleteDoc(doc(db, 'users', driverId));
            setDrivers(prev => prev.filter(d => d.id !== driverId));
            return { success: true };
        } catch (error) {
            console.error('Error deleting driver:', error);
            return { success: false, error: error.message };
        }
    };

    return {
        drivers,
        loading,
        getAllDrivers,
        deleteDriver
    };
}
