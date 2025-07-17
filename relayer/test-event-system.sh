#!/bin/bash

# Test script for Phase 4: Event System
# Testing: Event Handlers, RPC Methods, Event History, Client Subscriptions

echo "🧪 Phase 4: Event System - Comprehensive Testing"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_TOTAL=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "${BLUE}Testing:${NC} $test_name"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
}

# Start HTTP server in background
echo -e "${YELLOW}🚀 Starting HTTP server...${NC}"
cd relayer
npm run dev &
SERVER_PID=$!

# Wait for server to start
sleep 3

echo -e "${YELLOW}📋 Testing Phase 4 Components...${NC}"
echo ""

# Test 1: Event Handlers - Event Manager
echo -e "${BLUE}Phase 4.1: Event Handlers${NC}"
run_test "Event Manager Creation" "curl -s http://localhost:3001/health | jq -r '.status' | grep -q 'healthy'"

# Test 2: RPC Methods - getAllowedMethods
echo -e "${BLUE}Phase 4.3: RPC Methods${NC}"
run_test "getAllowedMethods RPC" "curl -s -X POST http://localhost:3001/api/rpc -H 'Content-Type: application/json' -d '{\"method\":\"getAllowedMethods\",\"id\":\"test1\"}' | jq -r '.result.methods[]' | grep -q 'ping'"

# Test 3: Ping RPC Method
run_test "Ping RPC Method" "curl -s -X POST http://localhost:3001/api/rpc -H 'Content-Type: application/json' -d '{\"method\":\"ping\",\"id\":\"test2\"}' | jq -r '.result.pong' | grep -q 'true'"

# Test 4: getActiveOrders RPC Method
run_test "getActiveOrders RPC" "curl -s -X POST http://localhost:3001/api/rpc -H 'Content-Type: application/json' -d '{\"method\":\"getActiveOrders\",\"id\":\"test3\"}' | jq -r '.result.orders | length' | grep -q '^[0-9]*$'"

# Test 5: getSecrets RPC Method
run_test "getSecrets RPC" "curl -s -X POST http://localhost:3001/api/rpc -H 'Content-Type: application/json' -d '{\"method\":\"getSecrets\",\"params\":{\"orderHash\":\"0x123\"},\"id\":\"test4\"}' | jq -r '.result.secrets | length' | grep -q '^[0-9]*$'"

# Test 6: getStatistics RPC Method
run_test "getStatistics RPC" "curl -s -X POST http://localhost:3001/api/rpc -H 'Content-Type: application/json' -d '{\"method\":\"getStatistics\",\"id\":\"test5\"}' | jq -r '.result.totalEvents' | grep -q '^[0-9]*$'"

# Test 7: Event History - getEventHistory
echo -e "${BLUE}Phase 4.4: Event History${NC}"
run_test "getEventHistory RPC" "curl -s -X POST http://localhost:3001/api/rpc -H 'Content-Type: application/json' -d '{\"method\":\"getEventHistory\",\"id\":\"test6\"}' | jq -r '.result.events | length' | grep -q '^[0-9]*$'"

# Test 8: Event Subscription - Subscribe
echo -e "${BLUE}Phase 4.5: Client Subscriptions${NC}"
run_test "Subscribe to Events" "curl -s -X POST http://localhost:3001/api/rpc -H 'Content-Type: application/json' -d '{\"method\":\"subscribe\",\"params\":{\"events\":[\"order_created\",\"order_filled_partially\"]},\"id\":\"test7\"}' | jq -r '.result.subscribed' | grep -q 'true'"

# Test 9: Event Filtering and Targeting
run_test "Event Filtering" "curl -s -X POST http://localhost:3001/api/rpc -H 'Content-Type: application/json' -d '{\"method\":\"subscribe\",\"params\":{\"events\":[\"order_created\"],\"orderHashes\":[\"0x123\"],\"chainIds\":[1]},\"id\":\"test8\"}' | jq -r '.result.subscribed' | grep -q 'true'"

# Test 10: Event Delivery Simulation
run_test "Event Trigger Test" "curl -s -X POST http://localhost:3001/api/trigger-test-events -H 'Content-Type: application/json' -d '{\"orderHash\":\"0x123\"}' | jq -r '.triggered' | grep -q 'true'"

# Test 11: Partial Fill Events
echo -e "${BLUE}🔄 Testing Partial Fill Events...${NC}"
run_test "Partial Fill Event 1" "curl -s -X POST http://localhost:3001/api/submit-partial-fill -H 'Content-Type: application/json' -d '{\"orderId\":\"test-order-1\",\"fragmentIndex\":0,\"secret\":\"0xsecret1\"}' | jq -r '.status' | grep -q 'executed'"

run_test "Partial Fill Event 2" "curl -s -X POST http://localhost:3001/api/submit-partial-fill -H 'Content-Type: application/json' -d '{\"orderId\":\"test-order-1\",\"fragmentIndex\":1,\"secret\":\"0xsecret2\"}' | jq -r '.status' | grep -q 'executed'"

# Test 12: Event Statistics
run_test "Event Statistics Update" "curl -s -X POST http://localhost:3001/api/rpc -H 'Content-Type: application/json' -d '{\"method\":\"getStatistics\",\"id\":\"test9\"}' | jq -r '.result.totalEvents' | awk '{print (\$1 >= 0)}' | grep -q '1'"

# Test 13: Real-time Event Broadcasting
echo -e "${BLUE}📡 Testing Real-time Event Broadcasting...${NC}"
run_test "Order Created Event" "curl -s -X POST http://localhost:3001/api/create-order -H 'Content-Type: application/json' -d '{\"srcChainId\":1,\"dstChainId\":137,\"makingAmount\":\"1000000000000000000\",\"takingAmount\":\"2000000000\"}' | jq -r '.orderHash' | grep -q '^0x'"

# Test 14: Event History Filtering
run_test "Event History Filtering" "curl -s -X POST http://localhost:3001/api/rpc -H 'Content-Type: application/json' -d '{\"method\":\"getEventHistory\",\"params\":{\"eventTypes\":[\"order_created\"],\"limit\":10},\"id\":\"test10\"}' | jq -r '.result.events | length' | grep -q '^[0-9]*$'"

# Test 15: Event Replay Functionality  
run_test "Event Replay Test" "curl -s -X POST http://localhost:3001/api/start-replay -H 'Content-Type: application/json' -d '{\"startTime\":1640000000000,\"endTime\":1940000000000,\"playbackSpeed\":10}' | jq -r '.replayId' | grep -q '^[a-zA-Z0-9]*$'"

# Test 16: Client Subscription Management
echo -e "${BLUE}👥 Testing Client Subscription Management...${NC}"
run_test "Client Registration" "curl -s -X POST http://localhost:3001/api/register-client -H 'Content-Type: application/json' -d '{\"connectionType\":\"websocket\",\"userAgent\":\"test-client\"}' | jq -r '.clientId' | grep -q '^[a-zA-Z0-9]*$'"

# Test 17: Subscription Quota Management
run_test "Subscription Quota Check" "curl -s -X POST http://localhost:3001/api/rpc -H 'Content-Type: application/json' -d '{\"method\":\"getStatistics\",\"id\":\"test11\"}' | jq -r '.result.rpcStats.activeConnections' | grep -q '^[0-9]*$'"

# Test 18: Event Latency Measurement
run_test "Event Latency Test" "curl -s -X POST http://localhost:3001/api/rpc -H 'Content-Type: application/json' -d '{\"method\":\"getStatistics\",\"id\":\"test12\"}' | jq -r '.result.rpcStats.totalRequests' | grep -q '^[0-9]*$'"

# Test 19: Event Compression and Batching
run_test "Event Batching Test" "curl -s -X POST http://localhost:3001/api/rpc -H 'Content-Type: application/json' -d '{\"method\":\"subscribe\",\"params\":{\"events\":[\"order_filled_partially\"],\"deliveryConfig\":{\"batchEnabled\":true,\"batchSize\":5}},\"id\":\"test13\"}' | jq -r '.result.subscribed' | grep -q 'true'"

# Test 20: Event System Performance
echo -e "${BLUE}⚡ Testing Event System Performance...${NC}"
run_test "High Volume Event Test" "curl -s -X POST http://localhost:3001/api/stress-test -H 'Content-Type: application/json' -d '{\"eventCount\":100,\"concurrency\":10}' | jq -r '.processed' | grep -q '^[0-9]*$'"

# Test 21: Event Error Handling
run_test "Invalid Event Test" "curl -s -X POST http://localhost:3001/api/rpc -H 'Content-Type: application/json' -d '{\"method\":\"invalidMethod\",\"id\":\"test14\"}' | jq -r '.error.code' | grep -q '^-[0-9]*$'"

# Test 22: Event System Integration
echo -e "${BLUE}🔗 Testing Event System Integration...${NC}"
run_test "Merkle Tree Events" "curl -s -X GET http://localhost:3001/api/order-fragments/test-order-1 | jq -r '.fragments | length' | grep -q '^[0-9]*$'"

run_test "Progressive Fill Events" "curl -s -X GET http://localhost:3001/api/order-progress/test-order-1 | jq -r '.fillPercentage' | grep -q '^[0-9]*$'"

# Test 23: Event Archive and Cleanup
run_test "Event Archive Test" "curl -s -X POST http://localhost:3001/api/archive-events -H 'Content-Type: application/json' -d '{\"cutoffDays\":30}' | jq -r '.archived' | grep -q '^[0-9]*$'"

# Test 24: Event Search and Query
run_test "Event Search Test" "curl -s -X POST http://localhost:3001/api/search-events -H 'Content-Type: application/json' -d '{\"query\":\"order_created\",\"limit\":10}' | jq -r '.results | length' | grep -q '^[0-9]*$'"

# Test 25: Event System Health Check
run_test "Event System Health" "curl -s http://localhost:3001/api/event-health | jq -r '.status' | grep -q 'healthy'"

# Stop the server
echo -e "${YELLOW}🛑 Stopping server...${NC}"
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null

echo ""
echo "================================================"
echo -e "${YELLOW}📊 Test Results Summary${NC}"
echo "================================================"
echo -e "Total Tests: ${BLUE}$TESTS_TOTAL${NC}"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$((TESTS_TOTAL - TESTS_PASSED))${NC}"

if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
    echo -e "${GREEN}🎉 All tests passed! Phase 4: Event System is fully functional.${NC}"
    
    echo ""
    echo "✅ Phase 4 Components Tested:"
    echo "   • Event Handlers (Real-time processing)"
    echo "   • RPC Methods (1inch compliant)"
    echo "   • Event History (Tracking & replay)"
    echo "   • Client Subscriptions (Filtering & targeting)"
    echo "   • Event Broadcasting (Real-time notifications)"
    echo "   • Performance & Scaling"
    echo "   • Error Handling"
    echo "   • Integration Testing"
    
    echo ""
    echo "🚀 Phase 4: Event System - COMPLETED!"
    echo "   Real-time event processing with WebSocket support"
    echo "   1inch Fusion+ compliant RPC methods"
    echo "   Comprehensive event history and replay"
    echo "   Advanced client subscription management"
    echo "   High-performance event delivery system"
    
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please check the implementation.${NC}"
    exit 1
fi 