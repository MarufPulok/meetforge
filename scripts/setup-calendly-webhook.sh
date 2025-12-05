#!/bin/bash

# Calendly Webhook Setup Script
# This script helps you set up the Calendly webhook for automatic meeting booking tracking

echo "==========================================";
echo "  Calendly Webhook Setup for MeetForge"
echo "==========================================";
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Get Your Calendly API Token${NC}"
echo "-------------------------------------------"
echo "1. Go to: https://calendly.com/integrations/api_webhooks"
echo "2. Click 'Generate New Token' or use existing token"
echo "3. Copy the Personal Access Token"
echo ""
read -p "Enter your Calendly API Token: " CALENDLY_TOKEN

if [ -z "$CALENDLY_TOKEN" ]; then
    echo -e "${RED}Error: API token is required${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Get Your Organization UUID${NC}"
echo "-------------------------------------------"
echo "Fetching your organization details..."

ORG_RESPONSE=$(curl -s --request GET \
  --url https://api.calendly.com/users/me \
  --header "Authorization: Bearer $CALENDLY_TOKEN" \
  --header 'Content-Type: application/json')

ORG_URI=$(echo "$ORG_RESPONSE" | grep -o '"current_organization":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ORG_URI" ]; then
    echo -e "${RED}Error: Could not fetch organization URI. Please check your API token.${NC}"
    echo "Response: $ORG_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Organization URI: $ORG_URI${NC}"

echo ""
echo -e "${BLUE}Step 3: Enter Your Webhook URL${NC}"
echo "-------------------------------------------"
echo "This is the public URL where Calendly will send webhook events."
echo ""
echo "Options:"
echo "  Production: https://your-domain.com/api/calendly/webhook"
echo "  Development (ngrok): https://abc123.ngrok.io/api/calendly/webhook"
echo ""
read -p "Enter your webhook URL: " WEBHOOK_URL

if [ -z "$WEBHOOK_URL" ]; then
    echo -e "${RED}Error: Webhook URL is required${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 4: Generate Signing Key${NC}"
echo "-------------------------------------------"
echo "Generating a random signing key..."

SIGNING_KEY=$(openssl rand -hex 32)
echo -e "${GREEN}✓ Signing Key: $SIGNING_KEY${NC}"
echo -e "${YELLOW}Important: Save this signing key - you'll need to add it to your .env file!${NC}"

echo ""
echo -e "${BLUE}Step 5: Create Webhook Subscription${NC}"
echo "-------------------------------------------"
echo "Creating webhook subscription..."

WEBHOOK_RESPONSE=$(curl -s --request POST \
  --url https://api.calendly.com/webhook_subscriptions \
  --header "Authorization: Bearer $CALENDLY_TOKEN" \
  --header 'Content-Type: application/json' \
  --data "{
    \"url\": \"$WEBHOOK_URL\",
    \"events\": [\"invitee.created\", \"invitee.canceled\"],
    \"organization\": \"$ORG_URI\",
    \"scope\": \"organization\",
    \"signing_key\": \"$SIGNING_KEY\"
  }")

# Check if webhook was created successfully
if echo "$WEBHOOK_RESPONSE" | grep -q '"resource"'; then
    echo -e "${GREEN}✓✓✓ Webhook subscription created successfully!${NC}"
    echo ""
    echo "Webhook Details:"
    echo "$WEBHOOK_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$WEBHOOK_RESPONSE"
else
    echo -e "${RED}✗ Failed to create webhook subscription${NC}"
    echo "Response: $WEBHOOK_RESPONSE"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}IMPORTANT: Add this to your .env file:${NC}"
echo ""
echo "CALENDLY_WEBHOOK_SIGNING_KEY=$SIGNING_KEY"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Add the signing key to your .env file"
echo "2. Restart your application"
echo "3. Book a test meeting via your Calendly link"
echo "4. Check your app logs for: '✅ Lead {email} marked as MEETING_BOOKED'"
echo ""
echo "Done! Your webhook is now active."
