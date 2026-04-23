import africastalking from 'africastalking';

const username = process.env.AFRICASTALKING_USERNAME || 'sandbox';
const apiKey = process.env.AFRICASTALKING_API_KEY;

let at: any = null;

if (apiKey && apiKey !== 'your_api_key') {
  at = africastalking({
    apiKey,
    username,
  });
}

export const sms = at ? at.SMS : null;
export const voice = at ? at.VOICE : null;
export const ussd = at ? at.USSD : null;

/**
 * Sends an SMS message to one or more recipients
 * @param to Phone number or array of phone numbers
 * @param message Message content
 * @returns Africa's Talking response
 */
export async function sendSMS(to: string | string[], message: string) {
  if (!sms) {
    throw new Error("Africa's Talking SMS not initialized. check API key.");
  }

  const options = {
    to: Array.isArray(to) ? to : [to],
    message,
    from: process.env.AFRICASTALKING_SENDER_ID || undefined,
  };

  try {
    const result = await sms.send(options);
    console.log(' SMS sent successfully:', result);
    return result;
  } catch (error) {
    console.error(' Failed to send SMS:', error);
    throw error;
  }
}

/**
 * Initiates an outbound voice call
 * @param to Recipient phone number
 * @returns Africa's Talking response
 */
export async function makeCall(to: string) {
  if (!voice) {
    throw new Error("Africa's Talking Voice not initialized.");
  }

  const options = {
    callFrom: process.env.AFRICASTALKING_PHONE_NUMBER, // Your registered AT number
    callTo: [to],
  };

  try {
    const result = await voice.call(options);
    console.log(' Call initiated:', result);
    return result;
  } catch (error) {
    console.error(' Failed to initiate call:', error);
    throw error;
  }
}
