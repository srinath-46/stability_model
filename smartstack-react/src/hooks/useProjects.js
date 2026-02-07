import { useState } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

export function useProjects() {
  const [projects, setProjects] = useState([]);

  // Get all projects (for admin)
  const getAllProjects = async () => {
    try {
      // Simple query without orderBy to avoid index requirements
      const snapshot = await getDocs(collection(db, 'projects'));
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      }));
      // Sort client-side
      projectsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setProjects(projectsList);
      return projectsList;
    } catch (error) {
      console.error('Error fetching all projects:', error);
      return [];
    }
  };

  // Get projects by driver UID
  const getProjectsByDriver = async (driverUid) => {
    if (!driverUid) return [];
    try {
      // Simple query with just the where clause
      const q = query(
        collection(db, 'projects'),
        where('driverUid', '==', driverUid)
      );
      const snapshot = await getDocs(q);
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      }));
      // Sort client-side
      projectsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setProjects(projectsList);
      return projectsList;
    } catch (error) {
      console.error('Error fetching driver projects:', error);
      return [];
    }
  };

  // Add a new project
  const addProject = async (project) => {
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        ...project,
        status: 'submitted',
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding project:', error);
      return { success: false, error: error.message };
    }
  };

  // Get a single project by ID
  const getProject = async (projectId) => {
    if (!projectId) return null;
    try {
      const docSnap = await getDoc(doc(db, 'projects', projectId));
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting project:', error);
      return null;
    }
  };

  // Update a project
  const updateProject = async (projectId, updates) => {
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating project:', error);
      return { success: false, error: error.message };
    }
  };

  // Delete a project
  const deleteProject = async (projectId) => {
    try {
      await deleteDoc(doc(db, 'projects', projectId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting project:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    projects,
    getAllProjects,
    getProjectsByDriver,
    addProject,
    getProject,
    updateProject,
    deleteProject
  };
}
