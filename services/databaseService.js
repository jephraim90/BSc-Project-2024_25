
import { 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit,
    serverTimestamp
  } from "firebase/firestore";
  import { db } from "../services/firebaseConfig";
  
  const databaseService = {

    async createDocument(collectionName, data) {
      try {
        // Add timestamps
        const dataWithTimestamp = {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, collectionName), dataWithTimestamp);
        return { 
          id: docRef.id, 
          success: true, 
          error: null 
        };
      } catch (error) {
        console.error("Error creating document:", error);
        return { 
          id: null, 
          success: false, 
          error: error.message 
        };
      }
    },

    async getDocuments(collectionName, queryConstraints = []) {
      try {
        let q;
        
        if (queryConstraints.length > 0) {
          q = query(collection(db, collectionName), ...queryConstraints);
        } else {
          q = collection(db, collectionName);
        }
        
        const querySnapshot = await getDocs(q);
        const documents = [];
        
        querySnapshot.forEach((doc) => {
          documents.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        return { 
          data: documents, 
          success: true, 
          error: null 
        };
      } catch (error) {
        console.error("Error fetching documents:", error);
        return { 
          data: [], 
          success: false, 
          error: error.message 
        };
      }
    },

    async getDocumentById(collectionName, documentId) {
      try {
        const docRef = doc(db, collectionName, documentId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          return { 
            data: { id: docSnap.id, ...docSnap.data() }, 
            success: true, 
            error: null 
          };
        } else {
          return { 
            data: null, 
            success: false, 
            error: "Document not found" 
          };
        }
      } catch (error) {
        console.error("Error fetching document:", error);
        return { 
          data: null, 
          success: false, 
          error: error.message 
        };
      }
    },

    async updateDocument(collectionName, documentId, data) {
      try {
        const docRef = doc(db, collectionName, documentId);
        
        // Add updated timestamp
        const dataWithTimestamp = {
          ...data,
          updatedAt: serverTimestamp()
        };
        
        await updateDoc(docRef, dataWithTimestamp);
        return { 
          success: true, 
          error: null 
        };
      } catch (error) {
        console.error("Error updating document:", error);
        return { 
          success: false, 
          error: error.message 
        };
      }
    },

    async deleteDocument(collectionName, documentId) {
      try {
        const docRef = doc(db, collectionName, documentId);
        await deleteDoc(docRef);
        return { 
          success: true, 
          error: null 
        };
      } catch (error) {
        console.error("Error deleting document:", error);
        return { 
          success: false, 
          error: error.message 
        };
      }
    },
  
    queries: {
    
      where: (field, operator, value) => where(field, operator, value),
      
     
      orderBy: (field, direction = 'asc') => orderBy(field, direction),
      
    
      limit: (limitCount) => limit(limitCount)
    }
  };
  
  export default databaseService;