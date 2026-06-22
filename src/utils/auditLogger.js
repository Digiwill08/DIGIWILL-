import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const logActivity = async (currentUser, action, details, collectionName = '', documentId = '') => {
  if (!currentUser) return;
  try {
    await addDoc(collection(db, 'auditoria_logs'), {
      fecha: serverTimestamp(),
      created_by: currentUser.uid,
      userId: currentUser.uid,
      userEmail: currentUser.email,
      accion: action,
      detalles: details,
      coleccion: collectionName,
      documentoId: documentId
    });
  } catch (error) {
    console.error("Error logging activity to auditoria_logs:", error);
  }
};
