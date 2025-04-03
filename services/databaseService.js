import { db } from "../services/firebaseConfig";


const databaseService = {
  async listDocuments(dbID, collectionName, queries = []) {
    try {
      const response = await db.listDocuments(dbID, collectionName, queries);
      console.log(response.documents);
      return { data: response.documents || [], error: null };
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  },
};
export default databaseService;
