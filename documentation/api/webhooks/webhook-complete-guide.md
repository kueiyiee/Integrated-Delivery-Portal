# Webhook System - Complete Testing Walkthrough

## 🎯 What You'll Learn

1. How to create webhooks from the UI
2. How to test webhooks with real endpoints
3. How to verify webhook payloads
4. How to handle webhook authentication
5. How to debug webhook failures

---

## 📍 Part 1: Create Your First Webhook (UI Method)

### Step-by-Step Instructions

#### 1. Open Admin Panel
Navigate to: `http://localhost/admin/webhooks`

You should see:
- "Webhook Endpoints" title
- A creation form with fields
- An empty list below

#### 2. Fill the Form with Sample Data

**Example 1: Testing with webhook.site**

| Field | Value |
|-------|-------|
| Name | `Test Webhook - webhook.site` |
| Description | `Testing webhook payload delivery` |
| Target URL | `https://webhook.site/PASTE-YOUR-UNIQUE-ID-HERE` |
| HTTP Method | `POST` |
| Retry Count | `3` |
| Timeout (seconds) | `10` |
| Event | `delivery.created` |

**Steps:**
1. Go to https://webhook.site in a new tab
2. Copy your unique URL (looks like: `https://webhook.site/12345678-...`)
3. Paste it in the "Target URL" field
4. Fill other fields as shown above
5. Click **"Create webhook"**

#### 3. Copy the Secret
After clicking create, you'll see:
```
Webhook endpoint created
Secret: wh_abc123def456...

[Copy Secret]
```

**IMPORTANT:** Click "Copy Secret" and save it. This secret is shown only once!

#### 4. Webhook Successfully Created!
The webhook now appears in the list below showing:
- Name: "Test Webhook - webhook.site"
- Status: Active
- Ready to receive events

---

## 🧪 Part 2: Test the Webhook Works

### Method 1: Using webhook.site (Easiest)

#### Step 1: Create Webhook (from Part 1 above)
Your webhook is now listening and ready to receive events.

#### Step 2: Trigger a Delivery Event
In your delivery app, create a new delivery:
1. Go to Deliveries section
2. Create a new delivery
3. Fill in details and save

#### Step 3: See Webhook Fire in Real-Time
1. Go back to https://webhook.site (the tab you opened earlier)
2. You should see a new request appear!
3. Click it to see the full payload

**Expected Payload:**
```json
{
  "event": "delivery.created",
  "timestamp": "2026-07-14T10:30:45Z",
  "data": {
    "id": 1,
    "order_id": "ORD-2026-001",
    "driver_id": 1,
    "customer_name": "John Doe",
    "customer_phone": "+1-234-567-8900",
    "pickup_location": "Warehouse A",
    "delivery_location": "123 Main St, City, State",
    "status": "pending",
    "created_at": "2026-07-14T10:30:45Z",
    "updated_at": "2026-07-14T10:30:45Z"
  }
}
```

---

## 🔌 Part 3: Real Integration Examples

### Example 1: E-Commerce Platform Integration

**Scenario:** You want to update a Shopify store when deliveries are created

**Setup Webhook:**
```
Name:              Shopify Delivery Sync
Description:       Automatically sync delivery data to Shopify
Target URL:        https://your-shop.myshopify.com/webhooks/deliveries
HTTP Method:       POST
Retry Count:       5
Timeout:           30 seconds
Event:             delivery.created
```

**Your Shopify Endpoint Handler:**
```javascript
// Node.js example with Express
app.post('/webhooks/deliveries', (req, res) => {
  const payload = req.body;
  
  // Verify signature (optional but recommended)
  const signature = req.headers['x-webhook-signature'];
  
  // Update Shopify order with delivery status
  const { order_id, status, driver_id } = payload.data;
  
  // Call Shopify API to update order metadata
  shopify.updateOrder(order_id, {
    delivery_status: status,
    driver_id: driver_id
  });
  
  res.json({ received: true });
});
```

---

### Example 2: ERP System Integration

**Scenario:** You want to sync delivery records with your ERP system

**Setup Webhook:**
```
Name:              ERP Delivery Sync
Description:       Send delivery data to ERP system
Target URL:        https://erp.company.com/api/v1/deliveries/webhook
HTTP Method:       POST
Retry Count:       3
Timeout:           10 seconds
Event:             delivery.created,delivery.completed
```

**Your ERP Endpoint Handler:**
```python
# Python Flask example
@app.route('/api/v1/deliveries/webhook', methods=['POST'])
def handle_delivery_webhook():
    data = request.get_json()
    event = data.get('event')
    delivery = data.get('data')
    
    if event == 'delivery.created':
        # Create delivery record in ERP
        erp_api.create_delivery({
            'external_id': delivery['id'],
            'order_id': delivery['order_id'],
            'driver': f"Driver #{delivery['driver_id']}",
            'from': delivery['pickup_location'],
            'to': delivery['delivery_location'],
            'status': 'PENDING'
        })
    
    elif event == 'delivery.completed':
        # Mark delivery as complete in ERP
        erp_api.update_delivery(delivery['id'], {
            'status': 'COMPLETED',
            'completed_at': delivery['updated_at']
        })
    
    return {'status': 'received'}, 200
```

---

### Example 3: Analytics Platform

**Scenario:** Track all delivery events for reporting

**Setup Webhook:**
```
Name:              Analytics Pipeline
Description:       Send events to analytics platform
Target URL:        https://analytics.company.com/api/events
HTTP Method:       POST
Retry Count:       3
Timeout:           15 seconds
Event:             delivery.created,delivery.updated,delivery.completed,delivery.failed
```

**Your Analytics Handler:**
```javascript
// JavaScript with Mixpanel
app.post('/api/events', (req, res) => {
  const { event, timestamp, data } = req.body;
  
  // Send to Mixpanel
  mixpanel.track('Delivery Event', {
    event_type: event,
    delivery_id: data.id,
    order_id: data.order_id,
    timestamp: new Date(timestamp),
    status: data.status,
    location: data.delivery_location
  });
  
  res.json({ ok: true });
});
```

---

## 🔒 Security & Verification

### How to Verify Webhook Authenticity

The system uses HMAC-SHA256 to sign all webhooks. You receive:
- `X-Webhook-Signature` header with the signature
- Your stored secret for verification

**Example Verification (Node.js):**
```javascript
const crypto = require('crypto');

app.post('/webhooks', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET;
  const payload = JSON.stringify(req.body);
  
  // Calculate expected signature
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  // Verify
  if (signature === expected) {
    // Process webhook safely
    processWebhook(req.body);
  } else {
    // Invalid signature - reject
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.json({ received: true });
});
```

---

## 📊 Monitoring & Debugging

### Check Webhook Status

From `/admin/webhooks` page:

1. **View Created Webhooks** - See all active webhooks
2. **Status Indicator** - Shows "active" or "inactive"
3. **Last Delivery** - When it last received an event
4. **Test Manually** - Send a test event from UI
5. **View Details** - Click any webhook to see config

### Check Logs

```bash
# View webhook delivery logs
tail -f storage/logs/laravel.log | grep webhook

# Find specific webhook attempts
grep "webhook_id: 1" storage/logs/laravel.log
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Webhook not triggering | No matching event | Check events list includes trigger event |
| Connection refused | Wrong URL | Verify target URL is correct and running |
| Timeout errors | Target too slow | Increase timeout_seconds (max 60) |
| 404 Not Found | Endpoint doesn't exist | Verify endpoint path is correct |
| 500 Error | Target server error | Check target server logs |
| Retrying repeatedly | Network issue | Check firewall and connectivity |

---

## 🧪 Testing with Different Scenarios

### Scenario 1: High-Reliability Service
```
HTTP Method:       POST
Retry Count:       5
Timeout:           30 seconds
Status:            active
```
Use for: Financial services, compliance tracking

### Scenario 2: Fast Real-Time Service
```
HTTP Method:       POST
Retry Count:       2
Timeout:           5 seconds
Status:            active
```
Use for: Real-time dashboards, live updates

### Scenario 3: Background Processing
```
HTTP Method:       POST
Retry Count:       10
Timeout:           60 seconds
Status:            active
```
Use for: Batch processing, data warehousing

---

## ✅ Production Checklist

- [ ] Webhook target URL is HTTPS (not HTTP)
- [ ] Target endpoint returns 200-299 status on success
- [ ] Target endpoint handles retries gracefully
- [ ] Secret is stored securely in environment variables
- [ ] Webhook signature is verified before processing
- [ ] Failed webhooks are logged and monitored
- [ ] Retry count is appropriate for your use case
- [ ] Timeout is not too short for your endpoint
- [ ] Error handling is implemented
- [ ] You monitor webhook delivery in admin panel

---

## 🚀 Next Steps

1. **Create your first webhook** - Use `/admin/webhooks`
2. **Test with webhook.site** - See real payloads
3. **Implement your endpoint** - Use sample code from Part 3
4. **Deploy to production** - Use HTTPS and proper security
5. **Monitor activity** - Check admin panel regularly

**Webhooks are ready to use!** 🎉
