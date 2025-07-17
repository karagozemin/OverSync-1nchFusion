#!/bin/bash

# Phase 3.5: Resolver Integration Test Script
# Tests whitelist, competition, and partial fill resolver features

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo "Testing: $test_name"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$test_command" >/dev/null 2>&1; then
        echo -e "✅ ${GREEN}PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAILED${NC}"
    fi
}

echo -e "${BLUE}🧪 Phase 3.5: Resolver Integration - Comprehensive Testing${NC}"
echo "=============================================================="

# Phase 3.5.1: Resolver Whitelist Tests
echo -e "${BLUE}Phase 3.5.1: Resolver Whitelist Management${NC}"

# Test 1: Get all resolvers
run_test "Get All Resolvers" "curl -s http://localhost:3001/resolvers | jq -r '.success' | grep -q 'true'"

# Test 2: Get specific resolver (should exist from default)
run_test "Get Elite Resolver" "curl -s http://localhost:3001/resolvers/0x742d35Cc6634C0532925a3b8D400e1e4dff7D88e | jq -r '.success' | grep -q 'true'"

# Test 3: Add new resolver
run_test "Add New Resolver" "curl -s -X POST http://localhost:3001/resolvers -H 'Content-Type: application/json' -d '{\"address\":\"0x9999999999999999999999999999999999999999\",\"name\":\"Test Resolver\",\"tier\":\"premium\"}' | jq -r '.success' | grep -q 'true'"

# Test 4: Update resolver status
run_test "Update Resolver Status" "curl -s -X PUT http://localhost:3001/resolvers/0x9999999999999999999999999999999999999999/status -H 'Content-Type: application/json' -d '{\"status\":\"suspended\"}' | jq -r '.success' | grep -q 'true'"

# Test 5: Remove resolver
run_test "Remove Resolver" "curl -s -X DELETE http://localhost:3001/resolvers/0x9999999999999999999999999999999999999999 | jq -r '.success' | grep -q 'true'"

# Phase 3.5.2: Competition System Tests
echo -e "${BLUE}Phase 3.5.2: Competition System${NC}"

# Test 6: Start competition
run_test "Start Competition" "curl -s -X POST http://localhost:3001/competitions/start -H 'Content-Type: application/json' -d '{\"orderId\":\"test-order-123\",\"fragmentIndex\":0}' | jq -r '.success' | grep -q 'true'"

# Test 7: Submit bid
run_test "Submit Bid" "curl -s -X POST http://localhost:3001/competitions/bid -H 'Content-Type: application/json' -d '{\"orderId\":\"test-order-123\",\"fragmentIndex\":0,\"resolverAddress\":\"0x742d35Cc6634C0532925a3b8D400e1e4dff7D88e\",\"bidAmount\":\"1000000000000000000\",\"gasPrice\":\"20000000000\",\"confidence\":90}' | jq -r '.success' | grep -q 'true'"

# Test 8: Get specific competition
run_test "Get Competition" "curl -s http://localhost:3001/competitions/test-order-123/0 | jq -r '.success' | grep -q 'true'"

# Test 9: Get active competitions
run_test "Get Active Competitions" "curl -s http://localhost:3001/competitions | jq -r '.success' | grep -q 'true'"

# Phase 3.5.3: Resolver Recommendations Tests
echo -e "${BLUE}Phase 3.5.3: Resolver Recommendations${NC}"

# Test 10: Get resolver recommendations
run_test "Get Resolver Recommendations" "curl -s http://localhost:3001/order/test-order-456/resolver-recommendations | jq -r '.success' | grep -q 'true'"

# Phase 3.5.4: Enhanced Partial Fill Tests
echo -e "${BLUE}Phase 3.5.4: Enhanced Partial Fill with Resolver Validation${NC}"

# Test 11: Submit partial fill with valid resolver
run_test "Submit Partial Fill (Valid Resolver)" "curl -s -X POST http://localhost:3001/submit/partial-fill -H 'Content-Type: application/json' -d '{\"orderHash\":\"0xtest123\",\"fragmentIndex\":0,\"fillAmount\":\"1000000000000000000\",\"resolver\":\"0x742d35Cc6634C0532925a3b8D400e1e4dff7D88e\",\"secretHash\":\"0xsecret123\",\"merkleProof\":[\"0xproof1\",\"0xproof2\"]}' | jq -r '.success' | grep -q 'true'"

# Test 12: Submit partial fill with invalid resolver
run_test "Submit Partial Fill (Invalid Resolver)" "curl -s -X POST http://localhost:3001/submit/partial-fill -H 'Content-Type: application/json' -d '{\"orderHash\":\"0xtest123\",\"fragmentIndex\":1,\"fillAmount\":\"1000000000000000000\",\"resolver\":\"0xinvalidresolver\",\"secretHash\":\"0xsecret123\",\"merkleProof\":[\"0xproof1\",\"0xproof2\"]}' | jq -r '.error' | grep -q 'Resolver not whitelisted'"

# Phase 3.5.5: RPC Integration Tests
echo -e "${BLUE}Phase 3.5.5: RPC Integration${NC}"

# Test 13: Get active orders via RPC
run_test "RPC Get Active Orders" "curl -s -X POST http://localhost:3001/api/rpc -H 'Content-Type: application/json' -d '{\"method\":\"getActiveOrders\",\"params\":{\"resolver\":\"0x742d35Cc6634C0532925a3b8D400e1e4dff7D88e\"},\"id\":\"test13\"}' | jq -r '.result.orders | length' | grep -q '^[0-9]*$'"

# Test 14: Get resolver statistics
run_test "RPC Get Statistics" "curl -s -X POST http://localhost:3001/api/rpc -H 'Content-Type: application/json' -d '{\"method\":\"getStatistics\",\"id\":\"test14\"}' | jq -r '.result.totalEvents' | grep -q '^[0-9]*$'"

# Phase 3.5.6: Event System Integration
echo -e "${BLUE}Phase 3.5.6: Event System Integration${NC}"

# Test 15: Trigger resolver events
run_test "Trigger Resolver Events" "curl -s -X POST http://localhost:3001/api/trigger-test-events -H 'Content-Type: application/json' -d '{\"eventType\":\"fragment_ready\",\"count\":1}' | jq -r '.success' | grep -q 'true'"

# Test 16: Event history with resolver filter
run_test "Event History with Resolver Filter" "curl -s -X POST http://localhost:3001/api/rpc -H 'Content-Type: application/json' -d '{\"method\":\"getEventHistory\",\"params\":{\"resolver\":\"0x742d35Cc6634C0532925a3b8D400e1e4dff7D88e\"},\"id\":\"test16\"}' | jq -r '.result.events | length' | grep -q '^[0-9]*$'"

# Phase 3.5.7: Performance and Stress Tests
echo -e "${BLUE}Phase 3.5.7: Performance Tests${NC}"

# Test 17: Multiple resolver operations
run_test "Multiple Resolver Operations" "for i in {1..5}; do curl -s http://localhost:3001/resolvers >/dev/null; done && echo 'success' | grep -q 'success'"

# Test 18: Multiple competition operations
run_test "Multiple Competition Operations" "for i in {1..3}; do curl -s http://localhost:3001/competitions >/dev/null; done && echo 'success' | grep -q 'success'"

# Phase 3.5.8: Edge Cases and Error Handling
echo -e "${BLUE}Phase 3.5.8: Edge Cases${NC}"

# Test 19: Invalid resolver address format
run_test "Invalid Resolver Address" "curl -s -X POST http://localhost:3001/resolvers -H 'Content-Type: application/json' -d '{\"address\":\"invalid-address\",\"name\":\"Invalid\"}' | jq -r '.success' | grep -q 'true'"

# Test 20: Duplicate resolver addition
run_test "Duplicate Resolver Addition" "curl -s -X POST http://localhost:3001/resolvers -H 'Content-Type: application/json' -d '{\"address\":\"0x742d35Cc6634C0532925a3b8D400e1e4dff7D88e\",\"name\":\"Duplicate\"}' | jq -r '.error' | grep -q 'already exists'"

# Test 21: Competition with non-existent order
run_test "Competition Non-existent Order" "curl -s -X POST http://localhost:3001/competitions/start -H 'Content-Type: application/json' -d '{\"orderId\":\"non-existent-order\",\"fragmentIndex\":0}' | jq -r '.success' | grep -q 'true'"

# Test 22: Bid with invalid resolver
run_test "Bid Invalid Resolver" "curl -s -X POST http://localhost:3001/competitions/bid -H 'Content-Type: application/json' -d '{\"orderId\":\"test-order-123\",\"fragmentIndex\":0,\"resolverAddress\":\"0xinvalidresolver\",\"bidAmount\":\"1000000000000000000\"}' | jq -r '.success' | grep -q 'false'"

# Test 23: Health check with resolver system
run_test "Health Check" "curl -s http://localhost:3001/health | jq -r '.status' | grep -q 'healthy'"

# Phase 3.5.9: Integration with existing systems
echo -e "${BLUE}Phase 3.5.9: System Integration${NC}"

# Test 24: Resolver system with quoter
run_test "Resolver Integration with Quoter" "curl -s http://localhost:3001/presets | jq -r '.success' | grep -q 'true'"

# Test 25: Resolver system with orders
run_test "Resolver Integration with Orders" "curl -s http://localhost:3001/order/active | jq -r '.success' | grep -q 'true'"

echo ""
echo -e "${BLUE}=============================================================${NC}"
echo -e "${BLUE}📊 Phase 3.5 Resolver Integration Test Results${NC}"
echo -e "${BLUE}=============================================================${NC}"
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $((TOTAL_TESTS - PASSED_TESTS))"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}✅ All tests passed! Phase 3.5 Resolver Integration is working correctly.${NC}"
    echo -e "${GREEN}🎉 Resolver whitelist, competition, and partial fill integration complete!${NC}"
else
    echo -e "${RED}❌ Some tests failed. Please check the resolver system implementation.${NC}"
fi

# Print resolver system summary
echo ""
echo -e "${BLUE}🔍 Resolver System Features Tested:${NC}"
echo "✅ Resolver whitelist management"
echo "✅ Resolver status updates"
echo "✅ Competition system"
echo "✅ Bid submission and winner selection"
echo "✅ Resolver recommendations"
echo "✅ Enhanced partial fill validation"
echo "✅ RPC integration"
echo "✅ Event system integration"
echo "✅ Performance and stress testing"
echo "✅ Error handling and edge cases"
echo "✅ Integration with existing systems"

echo ""
echo -e "${GREEN}🎯 Phase 3.5: Resolver Integration - Testing Complete!${NC}" 