# Webhook System - Quick Start Guide

## ✅ System Status: All Tests Passing

Your webhook system is fully functional and ready to use!

---

## 🚀 Quick Start in 3 Steps

### Step 1: Navigate to Webhooks Admin
1. Go to `/admin/webhooks` in your browser
2. You'll see the webhook creation form

### Step 2: Create Your First Webhook
Fill in the form with your details:

```
Name:              E-Commerce Integration
Description:       Syncs delivery updates to our shop
Target URL:        https://your-shop.example.com/webhooks/delivery
HTTP Method:       POST
Retry Count:       5
Timeout (seconds): 30
Event:             delivery.created
```

Then click **"Create webhook"**

### Step 3: Copy the Secret
After creation, you'll see a secret code displayed ONCE. **Copy it now** - this is used to verify webhook authenticity.

---

## 📋 Sample Webhook Configurations

### Sample 1: E-Commerce Shop
```
Name:              Shopify Integration
Description:       Send delivery updates to Shopify
Target URL:        https://your-shop.shopify.com/admin/webhooks/delivery
HTTP Method:       POST
Retry Count:       5
Timeout:           30 seconds
Events:            delivery.created, delivery.completed
```

### Sample 2: Enterprise ERP
```
Name:              ABC Logistics ERP
Description:       Sync to ERP system
Target URL:        https://erp.abclogistics.com/api/webhooks/delivery
HTTP Method:       POST
Retry Count:       3
Timeout:           10 seconds
Events:            delivery.created, delivery.completed
```

### Sample 3: Analytics Platform
```
Name:              Analytics Dashboard
Description:       Track all delivery metrics
Target URL:        https://analytics.company.com/api/events
HTTP Method:       POST
Retry Count:       3
Timeout:           15 seconds
Events:            delivery.created, delivery.updated, delivery.completed, delivery.failed
```

### Sample 4: Notification Service
```
Name:              Customer Notifications
Description:       SMS/Email alerts
Target URL:        https://api.notifications.com/v1/delivery
HTTP Method:       POST
Retry Count:       2
Timeout:           20 seconds
Events:            delivery.completed, delivery.failed
```

---

## 🔄 How Webhooks Work

When a delivery event happens:

```
1. EVENT TRIGGERED
   ↓
2. SYSTEM FINDS MATCHING WEBHOOKS
   ↓
3. CREATES SECURE PAYLOAD WITH DELIVERY DATA
   ↓
4. SIGNS REQUEST WITH SECRET (HMAC-SHA256)
   ↓
5. SENDS HTTP REQUEST TO TARGET URL
   ↓
6. CHECKS RESPONSE
   ├─ Success (200-299) → Log and finish
   └─ Failure → Retry based on retry_count
   ↓
7. LOG DELIVERY ATTEMPT
```

---

## 📨 Sample Webhook Payload

When triggered, your webhook receives:

```json
{
  "event": "delivery.created",
  "timestamp": "2026-07-14T09:22:44Z",
  "data": {
    "id": 123,
    "order_id": "ORD-2026-001",
    "driver_id": 5,
    "customer_name": "John Doe",
    "customer_phone": "+1-234-567-8900",
    "pickup_location": "Warehouse A",
    "delivery_location": "123 Main St, City, State",
    "status": "pending",
    "created_at": "2026-07-14T09:22:44Z",
    "updated_at": "2026-07-14T09:22:44Z"
  }
}
```

---

## 🛠️ Testing Your Webhooks Locally

### Option 1: Use Webhook.site (Easiest)
1. Visit: https://webhook.site
2. Copy your unique URL
3. Create a webhook with that URL as target
4. Trigger an event
5. **See the exact request received in real-time!**

### Option 2: Use ngrok (For Local Testing)
```bash
# Terminal 1: Start your local server
php artisan serve

# Terminal 2: Expose to internet
ngrok http 8000

# Use ngrok URL as webhook target
https://your-ngrok-url.ngrok.io/api/webhooks/delivery
```

### Option 3: Use cURL to Test
```bash
curl -X POST https://webhook.site/your-unique-id \
  -H "Content-Type: application/json" \
  -d '{
    "event": "delivery.created",
    "timestamp": "2026-07-14T09:22:44Z",
    "data": {
      "id": 123,
      "order_id": "ORD-2026-001",
      "status": "pending"
    }
  }'
```

---

## 🔐 Security Features

✅ **Secret-Based Authentication**
- Each webhook has a unique secret
- Every request is signed with HMAC-SHA256
- Your endpoint can verify authenticity

✅ **Retry Logic**
- Automatic retries on failure
- Configurable retry count (0-10)
- Exponential backoff between retries

✅ **Timeout Protection**
- Set max wait time (1-60 seconds)
- Prevents hanging connections

✅ **Event Filtering**
- Subscribe only to events you need
- Reduces unnecessary traffic

✅ **Audit Logging**
- All attempts logged
- View success/failure status
- Track retry counts

---

## 🎯 Common Use Cases

| Use Case | Target URL | Events | Retries | Timeout |
|----------|-----------|--------|---------|---------|
| E-Commerce | shop.com/webhooks | delivery.created, delivery.completed | 5 | 30s |
| ERP System | erp.com/api/webhooks | delivery.created, delivery.completed | 3 | 10s |
| Analytics | analytics.com/api | ALL EVENTS | 3 | 15s |
| SMS Alerts | sms.service/api | delivery.completed | 2 | 20s |
| Inventory | inventory.app/api | delivery.completed | 3 | 25s |

---

## 🐛 Troubleshooting

### Webhook not triggering?
- ✓ Check webhook is in "active" status
- ✓ Confirm target URL is correct
- ✓ Verify events list includes the trigger event
- ✓ Check server logs for errors

### Getting connection errors?
- ✓ Test target URL manually with cURL
- ✓ Verify HTTPS certificate (if using HTTPS)
- ✓ Check firewall allows outbound connections
- ✓ Ensure target server is running

### Timeouts happening?
- ✓ Increase timeout_seconds (max 60)
- ✓ Check if target server is slow
- ✓ Verify network connectivity

### Want to test manually?
```bash
# From backend directory:
php artisan webhook:test {webhook_id} {event}

# Example:
php artisan webhook:test 1 delivery.created
```

---

## 📊 Monitoring Webhooks

From the admin panel at `/admin/webhooks`:

1. **View all webhooks** - See status, URL, retry settings
2. **View webhook details** - Click any webhook to see full config
3. **Monitor activity** - See last delivery attempt time and status
4. **Test manually** - Send a test event to verify it works
5. **Update settings** - Change retry count, timeout, target URL
6. **Delete webhooks** - Remove endpoints you no longer need

---

## 🔧 API Integration

### Create via API
```bash
curl -X POST http://localhost/api/v1/admin/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Webhook",
    "description": "Integration with my system",
    "target_url": "https://example.com/webhooks",
    "http_method": "POST",
    "retry_count": 3,
    "timeout_seconds": 10,
    "events": ["delivery.created", "delivery.completed"]
  }'
```

### Response
```json
{
  "data": {
    "id": 1,
    "name": "My Webhook",
    "target_url": "https://example.com/webhooks",
    "status": "active",
    "created_at": "2026-07-14T09:22:44Z"
  },
  "secret": "wh_abc123def456..."
}
```

---

## ✨ Next Steps

1. ✅ Create your first webhook
2. ✅ Test with webhook.site
3. ✅ Verify payload reception
4. ✅ Implement endpoint handler
5. ✅ Deploy to production
6. ✅ Monitor activity in admin panel

**Your webhook system is production-ready!** 🎉
