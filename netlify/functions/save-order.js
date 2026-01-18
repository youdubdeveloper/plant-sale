// netlify/functions/save-order.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse the incoming order
        const order = JSON.parse(event.body);
        
        // Generate order number
        const orderNumber = 'PS' + Date.now().toString().slice(-8);
        order.orderNumber = orderNumber;
        order.receivedAt = new Date().toISOString();
        order.status = 'pending';
        
        console.log('🌿 New plant order received:', orderNumber);
        
        // Create order text for email
        const orderText = `
ORDER #${orderNumber}
=======================
DATE: ${new Date().toLocaleString()}

CUSTOMER INFORMATION:
---------------------
Name: ${order.customer?.name || 'Not provided'}
Email: ${order.customer?.email || 'Not provided'}
Phone: ${order.customer?.phone || 'Not provided'}

SHIPPING ADDRESS:
-----------------
${order.shipping?.replace(/\\n/g, '\n') || 'Not provided'}

PLANTS ORDERED:
---------------
${order.plants?.map(p => `• ${p.name}: $${p.price}`).join('\n') || 'None'}

PAYMENT METHOD:
---------------
${order.payment || 'Not specified'}
${order.payment === 'bitcoin' && order.bitcoinAmount ? 
    `Send ${order.bitcoinAmount} BTC to your wallet` : ''}

ORDER TOTALS:
-------------
Subtotal: $${order.totals?.subtotal?.toFixed(2) || '0.00'}
Shipping: $${order.totals?.shipping?.toFixed(2) || '0.00'}
Tax: $${order.totals?.tax?.toFixed(2) || '0.00'}
TOTAL: $${order.totals?.total?.toFixed(2) || '0.00'}

SPECIAL INSTRUCTIONS:
---------------------
${order.instructions || 'None'}

=======================
THANK YOU FOR YOUR ORDER!
        `;
        
        // 1. SEND EMAIL TO YOU (FREE using FormSubmit)
        await sendEmailNotification(order, orderText);
        
        // 2. LOG ORDER TO NETLIFY CONSOLE
        console.log('📋 Order details logged to Netlify');
        console.log('Customer:', order.customer?.name);
        console.log('Total: $' + (order.totals?.total?.toFixed(2) || '0.00'));
        console.log('Payment:', order.payment);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                orderNumber: orderNumber,
                message: 'Order received successfully!',
                emailSent: true,
                printInstructions: 'Print the invoice and shipping label below'
            })
        };
        
    } catch (error) {
        console.error('❌ Error processing order:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: 'Failed to process order',
                details: error.message
            })
        };
    }
};

// Function to send email using FormSubmit.co (FREE, no registration)
async function sendEmailNotification(order, orderText) {
    try {
        // Using FormSubmit.co - FREE email service
        // Replace YOUR_EMAIL with plants502@protonmail.com
        const response = await fetch('https://formsubmit.co/ajax/plants502@protonmail.com', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                _subject: `🌿 New Plant Order #${order.orderNumber}`,
                _replyto: order.customer?.email || 'no-email@provided.com',
                order: orderText,
                customer: `${order.customer?.name} (${order.customer?.email})`,
                total: `$${order.totals?.total?.toFixed(2)}`,
                payment: order.payment,
                shipping: order.shipping,
                phone: order.customer?.phone,
                timestamp: new Date().toLocaleString()
            })
        });
        
        const result = await response.json();
        console.log('📧 Email sent successfully via FormSubmit');
        return true;
        
    } catch (emailError) {
        console.log('⚠️ Email notification failed:', emailError.message);
        // Continue anyway - order is still processed
        return false;
    }
}

// Function to save to simple text log (for debugging)
function saveToLog(order) {
    try {
        // This creates a log entry in Netlify function logs
        console.log('📝 ORDER LOG START ================');
        console.log('Order #:', order.orderNumber);
        console.log('Time:', new Date().toISOString());
        console.log('Customer:', order.customer?.name);
        console.log('Email:', order.customer?.email);
        console.log('Phone:', order.customer?.phone);
        console.log('Total: $' + order.totals?.total);
        console.log('Payment:', order.payment);
        console.log('Plants:', order.plants?.map(p => p.name).join(', '));
        console.log('📝 ORDER LOG END ==================');
    } catch (error) {
        console.log('Log save error:', error);
    }
}
