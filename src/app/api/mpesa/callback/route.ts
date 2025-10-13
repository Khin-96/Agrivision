import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('M-Pesa Callback received:', JSON.stringify(body, null, 2))

    // Extract callback data
    const { Body } = body

    if (!Body || !Body.stkCallback) {
      return NextResponse.json(
        { error: 'Invalid callback format' },
        { status: 400 }
      )
    }

    const { stkCallback } = Body
    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback

    // ResultCode 0 means success
    if (ResultCode === 0) {
      console.log('✅ Payment successful!')
      console.log('MerchantRequestID:', MerchantRequestID)
      console.log('CheckoutRequestID:', CheckoutRequestID)

      // Extract payment details from CallbackMetadata
      if (CallbackMetadata && CallbackMetadata.Item) {
        const metadata: Record<string, any> = {}
        
        CallbackMetadata.Item.forEach((item: any) => {
          metadata[item.Name] = item.Value
        })

        console.log('Payment Details:', {
          Amount: metadata.Amount,
          MpesaReceiptNumber: metadata.MpesaReceiptNumber,
          TransactionDate: metadata.TransactionDate,
          PhoneNumber: metadata.PhoneNumber,
        })

        // TODO: Store payment details in your database
        // Example:
        // await db.payment.create({
        //   data: {
        //     merchantRequestId: MerchantRequestID,
        //     checkoutRequestId: CheckoutRequestID,
        //     amount: metadata.Amount,
        //     mpesaReceiptNumber: metadata.MpesaReceiptNumber,
        //     phoneNumber: metadata.PhoneNumber,
        //     transactionDate: metadata.TransactionDate,
        //     status: 'completed',
        //   },
        // })

        // TODO: Update order status to "paid"
        // TODO: Send confirmation email/SMS to customer
      }
    } else {
      // Payment failed or was cancelled
      console.log('❌ Payment failed or cancelled')
      console.log('ResultCode:', ResultCode)
      console.log('ResultDesc:', ResultDesc)

      // TODO: Update order status to "failed" or "cancelled"
      // TODO: Notify customer about failed payment
    }

    // Always return success to M-Pesa to acknowledge receipt
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Success',
    })

  } catch (error) {
    console.error('Callback error:', error)
    
    // Still return success to M-Pesa to avoid retries
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Success',
    })
  }
}

// M-Pesa also sends GET requests to check if callback URL is alive
export async function GET() {
  return NextResponse.json({
    message: 'M-Pesa callback endpoint is active',
  })
}