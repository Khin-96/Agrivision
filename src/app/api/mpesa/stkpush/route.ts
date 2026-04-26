import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// M-Pesa configuration - USING HARDCODED VALUES TO ENSURE CORRECTNESS
const MPESA_CONFIG = {
  AUTH_URL: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
  STK_PUSH_URL: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
  SHORTCODE: '174379',
  CONSUMER_KEY: 'RAENbwj0rkQ5LG1dlVzdpQyeAOSY0d3oK4M7beqJ4wfNC99K',
  CONSUMER_SECRET: 'MJH2D6WXMDVxdApTgJeIKMVZu7hV28EX0KmsexlARAwVdetwYAgnCzsCjWiTxiM9',
  PASSKEY: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
  CALLBACK_URL: 'https://khin-mpesa.loca.lt/api/mpesa/callback'
};

// Get current timestamp in required format
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// Generate Lipa Na M-Pesa password (EXACTLY like the simulator)
function generatePassword() {
  const timestamp = getTimestamp();
  const data = MPESA_CONFIG.SHORTCODE + MPESA_CONFIG.PASSKEY + timestamp;
  const password = Buffer.from(data).toString('base64');

  console.log(' Password Generation Debug:', {
    shortcode: MPESA_CONFIG.SHORTCODE,
    passkey: MPESA_CONFIG.PASSKEY,
    timestamp: timestamp,
    dataString: data,
    password: password,
    passwordLength: password.length
  });

  return {
    password: password,
    timestamp: timestamp
  };
}

// Get access token
async function getAccessToken() {
  try {
    const credentials = Buffer.from(`${MPESA_CONFIG.CONSUMER_KEY}:${MPESA_CONFIG.CONSUMER_SECRET}`).toString('base64');

    console.log(' Auth Debug:', {
      consumerKey: MPESA_CONFIG.CONSUMER_KEY,
      consumerSecret: '***' + MPESA_CONFIG.CONSUMER_SECRET.slice(-4),
      authHeader: 'Basic ' + credentials.slice(0, 20) + '...'
    });

    const response = await fetch(MPESA_CONFIG.AUTH_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Auth failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Access token received');
    return data.access_token;
  } catch (error) {
    console.error('Access token error:', error);
    throw error;
  }
}

// Initiate STK Push
async function initiateSTKPush(phone: string, amount: number) {
  try {
    const accessToken = await getAccessToken();
    const { password, timestamp } = generatePassword();

    const payload = {
      BusinessShortCode: MPESA_CONFIG.SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: MPESA_CONFIG.SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: MPESA_CONFIG.CALLBACK_URL,
      AccountReference: 'Agrivision',
      TransactionDesc: 'Cart Payment'
    };

    console.log(' STK Push Request:', {
      url: MPESA_CONFIG.STK_PUSH_URL,
      payload: {
        ...payload,
        Password: password.slice(0, 20) + '...' // Partial for verification
      }
    });

    const response = await fetch(MPESA_CONFIG.STK_PUSH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    const responseText = await response.text();
    console.log(' STK Push Response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    });

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid JSON response: ${responseText}`);
    }

    if (!response.ok) {
      throw new Error(data.errorMessage || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('STK Push Error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { phone, amount, items } = await request.json();

    console.log('Received payment request:', { phone, amount, itemsCount: items?.length });

    // Validate input
    if (!phone || !amount) {
      return NextResponse.json(
        { error: 'Phone and amount are required', success: false },
        { status: 400 }
      );
    }

    // Format phone number
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0') && formattedPhone.length === 10) {
      formattedPhone = `254${formattedPhone.substring(1)}`;
    }

    // Validate phone format
    if (!/^2547\d{8}$/.test(formattedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use 2547XXXXXXXX or 07XXXXXXXX', success: false },
        { status: 400 }
      );
    }

    // Validate amount
    if (amount < 1 || amount > 150000) {
      return NextResponse.json(
        { error: 'Amount must be between 1 and 150,000 KES', success: false },
        { status: 400 }
      );
    }

    console.log('Initiating STK Push...');
    const result = await initiateSTKPush(formattedPhone, amount);

    console.log('STK Push Result:', result);

    if (result.ResponseCode === '0') {
      // 🔹 Trigger n8n Notification Workflow immediately
      try {
        const n8nWebhookUrl = 'https://khin.app.n8n.cloud/webhook/agrivision-payment';
        
        // Use the first item's details for the email, or aggregate
        const mainItem = items && items.length > 0 ? items[0] : { name: 'Agrivision Products', quantity: 1, price: amount };
        
        // Fetch session to get real buyer details
        const session = await getServerSession(authOptions);
        const buyerName = session?.user?.name || 'Valued Customer';
        const buyerEmail = session?.user?.email || 'buyer@example.com';
        
        // Fetch seller details if we have a farmerId from the item
        let sellerName = 'Agrivision Partner';
        let sellerEmail = 'seller@example.com'; // Default fallback
        
        if (mainItem.farmerId) {
            const seller = await prisma.user.findUnique({ where: { id: mainItem.farmerId } });
            if (seller) {
                sellerName = seller.name || sellerName;
                sellerEmail = seller.email || sellerEmail;
            }
        }
        
        const notificationData = {
          orderId: result.CheckoutRequestID || `ORD-${Date.now()}`,
          buyerName: buyerName, 
          buyerEmail: buyerEmail,
          buyerPhone: formattedPhone,
          sellerName: sellerName,
          sellerEmail: sellerEmail,
          productName: mainItem.name,
          productQuantity: mainItem.quantity || 1,
          unitPrice: mainItem.price,
          totalAmount: amount,
          deliveryLocation: 'See order details', // Could be updated if you capture delivery location in Cart
          mpesaReceipt: 'Pending Confirmation', // Daraja confirmation hasn't happened yet
          transactionDate: new Date().toISOString(),
          paymentMethod: 'M-Pesa'
        };

        // Fire and forget webhook trigger
        fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notificationData)
        }).then(res => {
          if (res.ok) console.log('🚀 n8n Notification triggered successfully (STK Push)');
          else console.error('🔴 n8n webhook error:', res.statusText);
        }).catch(err => console.error('🔴 Failed to trigger n8n notification:', err));

      } catch (n8nError) {
        console.error('🔴 Failed to set up n8n notification:', n8nError);
      }

      return NextResponse.json({
        success: true,
        message: 'STK Push initiated successfully. Check your phone to complete payment.',
        data: {
          CheckoutRequestID: result.CheckoutRequestID,
          CustomerMessage: result.CustomerMessage,
          ResponseCode: result.ResponseCode,
          ResponseDescription: result.ResponseDescription
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.ResponseDescription || 'STK Push failed',
        data: result
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('🔴 API Error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        success: false
      },
      { status: 500 }
    );
  }
}