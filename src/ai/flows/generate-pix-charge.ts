'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a Pix charge via Black Cat Pagamentos API.
 *
 * It includes:
 * - generatePixCharge: A function to trigger the Pix charge generation flow.
 * - GeneratePixChargeInput: An empty input type for the function.
 * - GeneratePixChargeOutput: The output type containing the generated Pix copy-paste key.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GeneratePixChargeInputSchema = z.object({});
export type GeneratePixChargeInput = z.infer<
  typeof GeneratePixChargeInputSchema
>;

const GeneratePixChargeOutputSchema = z.object({
  copyPasteKey: z.string().describe('The PIX copy-paste key.'),
  transactionId: z.string().describe('The ID of the transaction.'),
});
export type GeneratePixChargeOutput = z.infer<
  typeof GeneratePixChargeOutputSchema
>;

export async function generatePixCharge(
  input: GeneratePixChargeInput
): Promise<GeneratePixChargeOutput> {
  return generatePixChargeFlow(input);
}

const generatePixChargeFlow = ai.defineFlow(
  {
    name: 'generatePixChargeFlow',
    inputSchema: GeneratePixChargeInputSchema,
    outputSchema: GeneratePixChargeOutputSchema,
  },
  async () => {
    const publicKey = process.env.BLACKCAT_PUBLIC_KEY;
    const secretKey = process.env.BLACKCAT_SECRET_KEY;

    if (!publicKey || !secretKey) {
      throw new Error('API keys for Black Cat Pagamentos are not configured.');
    }

    const auth = 'Basic ' + Buffer.from(publicKey + ':' + secretKey).toString('base64');
    const url = 'https://api.blackcatpagamentos.com/v1/transactions';

    const payload = {
      amount: 4000, // R$ 40,00 in cents
      paymentMethod: 'pix',
      currency: 'BRL',
      items: [
        {
          title: 'Consulta',
          unitPrice: 4000,
          quantity: 1,
          tangible: false,
        },
      ],
      customer: {
          name: "Cliente Anônimo",
          email: "cliente@email.com",
          document: {
            type: "cpf",
            number: "00000000000"
          },
          address: {
            street: "Rua Fictícia",
            streetNumber: "123",
            zipCode: "01001000",
            neighborhood: "Bairro Fictício",
            city: "Cidade Fictícia",
            state: "SP",
            country: "BR"
          }
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Black Cat API Error:', errorBody);
      throw new Error(`Failed to create PIX transaction: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.pix || !data.pix.qrcode) {
        console.error('Incomplete PIX data from API:', data);
        throw new Error('PIX QR Code not found in API response.');
    }
    if (!data.id) {
        console.error('Transaction ID not found in API response:', data);
        throw new Error('Transaction ID not found in API response.');
    }


    return {
      copyPasteKey: data.pix.qrcode,
      transactionId: String(data.id),
    };
  }
);
