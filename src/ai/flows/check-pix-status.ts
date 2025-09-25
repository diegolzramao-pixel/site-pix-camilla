'use server';
/**
 * @fileOverview This file defines a Genkit flow for checking the status of a PIX transaction.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CheckPixStatusInputSchema = z.object({
  transactionId: z.string().describe('The ID of the transaction to check.'),
});
export type CheckPixStatusInput = z.infer<typeof CheckPixStatusInputSchema>;

const CheckPixStatusOutputSchema = z.object({
  status: z.string().describe('The status of the transaction.'),
});
export type CheckPixStatusOutput = z.infer<typeof CheckPixStatusOutputSchema>;

export async function checkPixStatus(
  input: CheckPixStatusInput
): Promise<CheckPixStatusOutput> {
  return checkPixStatusFlow(input);
}

const checkPixStatusFlow = ai.defineFlow(
  {
    name: 'checkPixStatusFlow',
    inputSchema: CheckPixStatusInputSchema,
    outputSchema: CheckPixStatusOutputSchema,
  },
  async ({ transactionId }) => {
    const publicKey = process.env.BLACKCAT_PUBLIC_KEY;
    const secretKey = process.env.BLACKCAT_SECRET_KEY;

    if (!publicKey || !secretKey) {
      throw new Error('API keys for Black Cat Pagamentos are not configured.');
    }

    const auth = 'Basic ' + Buffer.from(publicKey + ':' + secretKey).toString('base64');
    const url = `https://api.blackcatpagamentos.com/v1/transactions/${transactionId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: auth,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Black Cat API Error:', errorBody);
      throw new Error(
        `Failed to check PIX transaction status: ${response.statusText}`
      );
    }

    const data = await response.json();

    return {
      status: data.status,
    };
  }
);
