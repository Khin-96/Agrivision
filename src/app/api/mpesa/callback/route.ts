import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const callbackData = await request.json();
    
    console.log('🟢 M-Pesa Callback received:', JSON.stringify(callbackData, null, 2));

    // Extract callback data
    const stkCallback = callbackData.Body?.stkCallback;
    
    if (stkCallback) {
      const resultCode = stkCallback.ResultCode;
      const resultDesc = stkCallback.ResultDesc;
      const checkoutRequestID = stkCallback.CheckoutRequestID;
      const callbackMetadata = stkCallback.CallbackMetadata;

      if (resultCode === 0) {
        // Payment successful
        console.log('✅ Payment successful:', checkoutRequestID);
        
        // Extract payment details
        if (callbackMetadata?.Item) {
          const items = callbackMetadata.Item;
          const amount = items.find((item: any) => item.Name === 'Amount')?.Value;
          const mpesaReceiptNumber = items.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
          const phoneNumber = items.find((item: any) => item.Name === 'PhoneNumber')?.Value;
          const transactionDate = items.find((item: any) => item.Name === 'TransactionDate')?.Value;

          console.log('💰 Payment Details:', {
            amount,
            mpesaReceiptNumber,
            phoneNumber,
            transactionDate,
            checkoutRequestID
          });

          // TODO: Update your database here
          // - Mark order as paid
          // - Save M-Pesa receipt number
          // - Update inventory, etc.
          
          // Example: Update order status in your database
          // await updateOrderStatus(checkoutRequestID, 'paid', {
          //   mpesaReceiptNumber,
          //   phoneNumber,
          //   amount,
          //   transactionDate
          // });
        }
      } else {
        // Payment failed
        console.error('❌ Payment failed:', {
          resultCode,
          resultDesc,
          checkoutRequestID
        });
        
        // TODO: Update order status to failed in your database
        // await updateOrderStatus(checkoutRequestID, 'failed', { error: resultDesc });
      }
    } else {
      console.warn('⚠️ Unexpected callback format:', callbackData);
    }

    // Always return success to M-Pesa to avoid retries
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Success'
    });

  } catch (error) {
    console.error('🔴 Callback Error:', error);
    
    // Still return success to M-Pesa to avoid retries
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Success'
    });
  }
}