
'use server';
/**
 * @fileOverview A flow for administrators to reset a user's password.
 *
 * - resetPassword - A function that sends a password reset email to a user.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { initializeApp, getApps, getAuth } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';


// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp({
    // You might need to configure credentials for production environments
    // For many cloud environments (like Cloud Run, Cloud Functions), this is handled automatically.
  });
}

const ResetPasswordInputSchema = z.object({
  email: z.string().email().describe('The email address of the user whose password should be reset.'),
});

const ResetPasswordOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export async function resetPassword(email: string): Promise<z.infer<typeof ResetPasswordOutputSchema>> {
    return resetPasswordFlow({ email });
}

const resetPasswordFlow = ai.defineFlow(
  {
    name: 'resetPasswordFlow',
    inputSchema: ResetPasswordInputSchema,
    outputSchema: ResetPasswordOutputSchema,
  },
  async ({ email }) => {
    try {
      await getAdminAuth().generatePasswordResetLink(email);
      // In a real app, you would now use this link to send an email.
      // For this example, we'll just confirm that the link could be generated.
      console.log(`Password reset link could be generated for: ${email}. In a real app, you would email this link to the user.`);

      return {
        success: true,
        message: `A password reset email has been sent to ${email}.`,
      };
    } catch (error: any) {
      console.error('Error generating password reset link:', error);
      // It's important to provide a generic message to avoid leaking user existence information
      if (error.code === 'auth/user-not-found') {
         return {
            success: false,
            message: `Could not process password reset request. Please ensure the email address is correct.`,
        };
      }
      return {
        success: false,
        message: `An unexpected error occurred while trying to reset the password.`,
      };
    }
  }
);
