#!/bin/bash

# Get the LAN IP address
LAN_IP=$(ifconfig | grep -E "inet.*broadcast" | awk '{print $2}' | head -1)

echo "=== Stamp Network Configuration Test ==="
echo "Your MacBook's LAN IP: $LAN_IP"
echo ""
echo "Access URLs:"
echo "  Local access:  http://localhost:4000"
echo "  LAN access:    http://$LAN_IP:4000"
echo ""
echo "Backend API URLs (auto-detected by frontend):"
echo "  From localhost: http://localhost:8000"
echo "  From LAN:       http://$LAN_IP:8000"
echo ""
echo "Testing API endpoints..."

# Test local backend
echo -n "Testing localhost backend... "
if curl -s http://localhost:8000/ > /dev/null; then
    echo "✅ OK"
else
    echo "❌ Failed"
fi

# Test LAN backend
echo -n "Testing LAN backend... "
if curl -s http://$LAN_IP:8000/ > /dev/null; then
    echo "✅ OK"
else
    echo "❌ Failed"
fi

echo ""
echo "To test from other devices:"
echo "1. Make sure your device is on the same network"
echo "2. Open http://$LAN_IP:4000 in a browser"
echo "3. The frontend will automatically use http://$LAN_IP:8000 for API calls"
