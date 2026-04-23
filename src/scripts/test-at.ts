import { sendSMS } from '@/lib/africastalking';

export async function testAfricaTalking() {
  console.log(' Starting Africa\'s Talking Integration Test...');

  try {
    // 1. Test SMS
    // Replace with your phone number for real test
    const testPhone = "+254711223344";
    console.log(` Sending test SMS to ${testPhone}...`);

    // In sandbox mode, this might not actually send but should return successfully
    const smsResult = await sendSMS(testPhone, "Hello from AgriVision! Your Africa's Talking integration is now active.");
    console.log(' SMS Result:', JSON.stringify(smsResult, null, 2));

    return {
      success: true,
      sms: smsResult
    };
  } catch (error: any) {
    console.error(' Test Failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
