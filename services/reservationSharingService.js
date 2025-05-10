// services/reservationSharingService.js
import databaseService from './databaseService';
import { serverTimestamp } from 'firebase/firestore';

const reservationSharingService = {
 
  async shareReservation(reservationId, recipientEmail, senderUserId) {
    try {
      // Verify reservation exists and belongs to sender
      const reservationResult = await databaseService.getDocumentById(
        'reservations',
        reservationId
      );
      
      if (!reservationResult.success) {
        throw new Error('Reservation not found');
      }
      
      if (reservationResult.data.userId !== senderUserId) {
        throw new Error('You can only share reservations that belong to you');
      }
      
      // Lookup recipient in user_emails collection by document ID (the email)
      const emailResult = await databaseService.getDocumentById(
        'user_emails',
        recipientEmail.toLowerCase() // Try lowercase first
      );
      
      if (!emailResult.success) {
        // Optional: Try with exact case if lowercase fails
        const exactCaseResult = await databaseService.getDocumentById(
          'user_emails',
          recipientEmail
        );
        
        if (!exactCaseResult.success) {
          throw new Error('User not found with the provided email');
        }
        
        // Use the exactCase result
        const recipientUserId = exactCaseResult.data.userId;
        
        // Create invitation
        const invitationData = {
          reservationId: reservationId,
          senderId: senderUserId,
          recipientId: recipientUserId,
          status: 'pending',
          sharedAt: new Date().toISOString(),
          reservation: {
            restaurantId: reservationResult.data.restaurantId,
            restaurantName: reservationResult.data.restaurantName,
            date: reservationResult.data.date,
            time: reservationResult.data.time,
            guests: reservationResult.data.guests
          }
        };
        
        // Create shared reservation document
        const shareResult = await databaseService.createDocument(
          'shared_reservations',
          invitationData
        );
        
        if (!shareResult.success) {
          throw new Error('Failed to create sharing invitation');
        }
        
        return {
          success: true,
          data: {
            shareId: shareResult.id,
            ...invitationData
          }
        };
      }
      
      // If original lookup succeeded, use that data
      const recipientUserId = emailResult.data.userId;
      
      // Create invitation
      const invitationData = {
        reservationId: reservationId,
        senderId: senderUserId,
        recipientId: recipientUserId,
        status: 'pending',
        sharedAt: new Date().toISOString(),
        reservation: {
          restaurantId: reservationResult.data.restaurantId,
          restaurantName: reservationResult.data.restaurantName,
          date: reservationResult.data.date,
          time: reservationResult.data.time,
          guests: reservationResult.data.guests
        }
      };
      
      // Create shared reservation document
      const shareResult = await databaseService.createDocument(
        'shared_reservations',
        invitationData
      );
      
      if (!shareResult.success) {
        throw new Error('Failed to create sharing invitation');
      }
      
      return {
        success: true,
        data: {
          shareId: shareResult.id,
          ...invitationData
        }
      };
    } catch (error) {
      console.log('Error sharing reservation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  
  async getSharedReservations(userId) {
    try {
      // Get reservations shared with the user
      const receivedResult = await databaseService.getDocuments('shared_reservations', [
        databaseService.queries.where('recipientId', '==', userId),
        databaseService.queries.orderBy('sharedAt', 'desc')
      ]);
      
      // Get reservations the user shared with others
      const sentResult = await databaseService.getDocuments('shared_reservations', [
        databaseService.queries.where('senderId', '==', userId),
        databaseService.queries.orderBy('sharedAt', 'desc')
      ]);
      
      return {
        success: true,
        data: {
          received: receivedResult.success ? receivedResult.data : [],
          sent: sentResult.success ? sentResult.data : []
        }
      };
    } catch (error) {
      console.log('Error getting shared reservations:', error);
      return {
        success: false,
        error: error.message,
        data: { received: [], sent: [] }
      };
    }
  },
  
 
  async respondToInvitation(invitationId, userId, response) {
    try {
      // Verify the invitation exists and is for this user
      const invitationResult = await databaseService.getDocumentById('shared_reservations', invitationId);
      
      if (!invitationResult.success) {
        throw new Error('Invitation not found');
      }
      
      const invitation = invitationResult.data;
      
      if (invitation.recipientId !== userId) {
        throw new Error('This invitation is not addressed to you');
      }
      
      if (invitation.status !== 'pending') {
        throw new Error(`This invitation has already been ${invitation.status}`);
      }
      
      // Valid responses
      if (response !== 'accepted' && response !== 'rejected') {
        throw new Error('Invalid response. Must be either "accepted" or "rejected"');
      }
      
      // Update the invitation status
      const updateResult = await databaseService.updateDocument('shared_reservations', invitationId, {
        status: response,
        respondedAt: new Date().toISOString()
      });
      
      // If accepted, add the user to the reservation's guests list
      if (response === 'accepted') {
        // Get the original reservation
        const reservationResult = await databaseService.getDocumentById('reservations', invitation.reservationId);
        
        if (reservationResult.success) {
          const reservation = reservationResult.data;
          
          // Add the user to guests list if not already there
          const guestsList = reservation.guestsList || [];
          if (!guestsList.includes(userId)) {
            guestsList.push(userId);
            
            await databaseService.updateDocument('reservations', invitation.reservationId, {
              guestsList,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
      
      return updateResult;
    } catch (error) {
      console.log('Error responding to invitation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
 
  async cancelInvitation(invitationId, userId) {
    try {
      // Verify the invitation exists and is from this user
      const invitationResult = await databaseService.getDocumentById('shared_reservations', invitationId);
      
      if (!invitationResult.success) {
        throw new Error('Invitation not found');
      }
      
      const invitation = invitationResult.data;
      
      if (invitation.senderId !== userId) {
        throw new Error('You can only cancel invitations that you sent');
      }
      
      if (invitation.status !== 'pending') {
        throw new Error(`This invitation has already been ${invitation.status}`);
      }
      
      // Update the invitation status to cancelled
      return await databaseService.updateDocument('shared_reservations', invitationId, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      });
    } catch (error) {
      console.log('Error cancelling invitation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  async checkIfSharedWithUser(reservationId, userId) {
    try {
      console.log(`Checking if reservation ${reservationId} is shared with user ${userId}`);
      
      // Get all of this user's received invitations
      const receivedResult = await databaseService.getDocuments('shared_reservations', [
        databaseService.queries.where('recipientId', '==', userId)
      ]);
      
      console.log("Received invitations query result:", {
        success: receivedResult.success,
        count: receivedResult.data?.length || 0
      });
      
      if (!receivedResult.success) {
        console.log("Failed to fetch invitations", receivedResult.error);
        return { success: false, error: "Failed to fetch invitations" };
      }
      
      // Log all invitations for debugging
      if (receivedResult.data && receivedResult.data.length > 0) {
        receivedResult.data.forEach((invite, index) => {
          console.log(`Invitation ${index + 1}:`, {
            id: invite.id,
            reservationId: invite.reservationId,
            status: invite.status,
            matches: invite.reservationId === reservationId
          });
        });
        
        // Check if any of them match the reservation ID
        const matchingInvitation = receivedResult.data.find(
          invite => invite.reservationId === reservationId
        );
        
        console.log("Matching invitation found:", !!matchingInvitation);
        if (matchingInvitation) {
          console.log("Match details:", {
            id: matchingInvitation.id,
            status: matchingInvitation.status
          });
        }
        
        return {
          success: true,
          isShared: !!matchingInvitation,
          invitation: matchingInvitation || null
        };
      }
      
      console.log("No invitations found for user");
      return {
        success: true,
        isShared: false,
        invitation: null
      };
    } catch (error) {
      console.log('Error checking shared reservation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export default reservationSharingService;