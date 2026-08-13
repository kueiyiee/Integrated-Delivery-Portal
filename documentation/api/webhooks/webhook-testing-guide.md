# Webhook Testing Guide

## Quick Start: Create Sample Webhooks

You can now create webhooks directly from the UI at `/admin/webhooks` or use these sample payloads with API calls.

## Sample 1: E-Commerce Integration
Create a webhook to send delivery updates to your e-commerce platform:

```bash
curl -X POST http://localhost/api/v1/admin/webhooks \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "E-Commerce Delivery Updates",
    "description": "Sends real-time delivery status updates to Shopify/WooCommerce",
    "target_url": "https://your-shop.example.com/webhooks/delivery",
    "http_method": "POST",
    "retry_count": 5,
    "timeout_seconds": 30,
    "events": ["delivery.created", "delivery.updated", "delivery.completed"]
  }'
```

**What it does:**
- When a delivery is created, updated, or completed, a POST request is sent to your shop
- If delivery fails, it retries up to 5 times
- Each request waits max 30 seconds for response

---

## Sample 2: ERP System Integration
Send delivery data to your enterprise resource planning system:

```bash
curl -X POST http://localhost/api/v1/admin/webhooks \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ABC Logistics ERP Integration",
    "description": "Syncs delivery records with ABC ERP system",
    "target_url": "https://erp.abclogistics.com/api/webhooks/logistics",
    "http_method": "POST",
    "retry_count": 3,
    "timeout_seconds": 10,
    "events": ["delivery.created", "delivery.completed"]
  }'
```

---

## Sample 3: Analytics & Reporting
Send events to your analytics platform:

```bash
curl -X POST http://localhost/api/v1/admin/webhooks \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Analytics Platform",
    "description": "Tracks all delivery events for analytics and reporting",
    "target_url": "https://analytics.company.com/api/events",
    "http_method": "POST",
    "retry_count": 3,
    "timeout_seconds": 15,
    "events": ["delivery.created", "delivery.updated", "delivery.completed", "delivery.failed"]
  }'
```

---

## Sample 4: SMS/Email Notification Service
Send delivery notifications to customers via third-party service:

```bash
curl -X POST http://localhost/api/v1/admin/webhooks \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Notifications",
    "description": "Sends SMS/Email notifications for delivery status",
    "target_url": "https://api.twilio.com/v1/webhooks/delivery-notification",
    "http_method": "POST",
    "retry_count": 2,
    "timeout_seconds": 20,
    "events": ["delivery.completed", "delivery.failed"]
  }'
```

---

## What Happens When a Delivery Event Occurs

When any delivery event is triggered, the system:

1. **Collects** all webhooks subscribed to that event
2. **Prepares** the webhook payload with delivery details
3. **Signs** the request with a secret (HMAC-SHA256) for security
4. **Sends** POST/GET/PUT/PATCH/DELETE request to the target URL
5. **Checks** response status
6. **Retries** if failed (based on retry_count setting)
7. **Logs** delivery attempt with timestamp and status

---

## Webhook Payload Example

When a delivery is created, you'll receive:

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

## Verify Webhook Reception

Once you create a webhook, you can:

1. **Monitor** the webhook activity in the admin panel
2. **Test** the webhook manually from the UI
3. **Check** delivery logs for success/failure
4. **View** retry attempts and error messages

---

## Security Features

- ✅ **Secret-based signatures**: Every request is signed with a rotating secret
- ✅ **Retry logic**: Automatic retries with exponential backoff
- ✅ **Timeout controls**: Prevent hanging requests
- ✅ **Event filtering**: Subscribe only to events you care about
- ✅ **Status tracking**: Track all delivery attempts

---

## Testing Locally

Use a free webhook testing service like **webhook.site**:

1. Go to https://webhook.site
2. Copy your unique URL
3. Create a webhook with that URL
4. Trigger a delivery event
5. See the webhook payload in real-time

---

## Key Fields Explained

| Field | Purpose | Default |
|-------|---------|---------|
| **name** | Display name for the webhook | Required |
| **description** | What this webhook does | Optional |
| **target_url** | Where to send events | Required, must be HTTPS |
| **http_method** | POST, GET, PUT, PATCH, DELETE | POST |
| **retry_count** | How many times to retry on failure | 3 (0-10) |
| **timeout_seconds** | Max wait time per request | 10 (1-60) |
| **events** | Which events trigger this webhook | Required |

---

## Troubleshooting

### "Connection refused"
- Verify the target URL is accessible from your server
- Check firewall rules
- Ensure the endpoint is listening on the specified port

### "Request timeout"
- Increase `timeout_seconds` (max 60)
- Check if target server is slow
- Verify network connectivity

### "Webhook not firing"
- Confirm webhook is in "active" status
- Check that the event is listed in the webhook
- Review webhook logs for errors

---

## Next Steps

1. ✅ Create your first webhook from `/admin/webhooks`
2. ✅ Trigger a delivery event
3. ✅ Monitor the webhook delivery status
4. ✅ View detailed logs and response data
5. ✅ Adjust retry settings as needed

All webhook activity is logged and audited for compliance!
