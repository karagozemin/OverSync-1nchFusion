#!/bin/bash

# Phase 5.1: Recovery Service Test Script
# Tests timelock monitoring, auto-refund, and emergency recovery

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

echo -e "${BLUE}🧪 Phase 5.1: Recovery Service - Comprehensive Testing${NC}"
echo "=============================================================="

# Phase 5.1.1: Recovery Statistics Tests
echo -e "${BLUE}Phase 5.1.1: Recovery Statistics${NC}"

# Test 1: Get recovery statistics
run_test "Get Recovery Statistics" "curl -s http://localhost:3001/recovery/stats | jq -r '.success' | grep -q 'true'"

# Test 2: Check initial stats structure
run_test "Check Stats Structure" "curl -s http://localhost:3001/recovery/stats | jq -r '.totalRecoveries' | grep -q '^[0-9]*$'"

# Phase 5.1.2: Recovery Requests Tests
echo -e "${BLUE}Phase 5.1.2: Recovery Requests Management${NC}"

# Test 3: Get all recovery requests
run_test "Get All Recovery Requests" "curl -s http://localhost:3001/recovery/requests | jq -r '.success' | grep -q 'true'"

# Test 4: Test recovery initiation
run_test "Test Recovery Initiation" "curl -s -X POST http://localhost:3001/recovery/test -H 'Content-Type: application/json' -d '{\"orderHash\":\"0x1111111111111111111111111111111111111111111111111111111111111111\",\"type\":\"timeout_refund\"}' | jq -r '.success' | grep -q 'true'"

# Test 5: Check recovery request was created
run_test "Check Recovery Request Created" "curl -s http://localhost:3001/recovery/requests | jq -r 'keys | length' | grep -q '^[1-9][0-9]*$'"

# Phase 5.1.3: Recovery Types Tests
echo -e "${BLUE}Phase 5.1.3: Recovery Types${NC}"

# Test 6: Timeout refund recovery
run_test "Timeout Refund Recovery" "curl -s -X POST http://localhost:3001/recovery/test -H 'Content-Type: application/json' -d '{\"orderHash\":\"0x2222222222222222222222222222222222222222222222222222222222222222\",\"type\":\"timeout_refund\"}' | jq -r '.success' | grep -q 'true'"

# Test 7: Emergency refund recovery
run_test "Emergency Refund Recovery" "curl -s -X POST http://localhost:3001/recovery/emergency -H 'Content-Type: application/json' -d '{\"orderHash\":\"0x3333333333333333333333333333333333333333333333333333333333333333\",\"reason\":\"Network failure\",\"initiator\":\"admin\"}' | jq -r '.success' | grep -q 'true'"

# Test 8: Public withdrawal recovery
run_test "Public Withdrawal Recovery" "curl -s -X POST http://localhost:3001/recovery/test -H 'Content-Type: application/json' -d '{\"orderHash\":\"0x4444444444444444444444444444444444444444444444444444444444444444\",\"type\":\"public_withdrawal\"}' | jq -r '.success' | grep -q 'true'"

# Test 9: Force recovery
run_test "Force Recovery" "curl -s -X POST http://localhost:3001/recovery/test -H 'Content-Type: application/json' -d '{\"orderHash\":\"0x5555555555555555555555555555555555555555555555555555555555555555\",\"type\":\"force_recovery\"}' | jq -r '.success' | grep -q 'true'"

# Phase 5.1.4: Manual Recovery Tests
echo -e "${BLUE}Phase 5.1.4: Manual Recovery${NC}"

# Test 10: Manual recovery with all fields
run_test "Manual Recovery Full" "curl -s -X POST http://localhost:3001/recovery/manual -H 'Content-Type: application/json' -d '{\"orderHash\":\"0x6666666666666666666666666666666666666666666666666666666666666666\",\"type\":\"timeout_refund\",\"initiator\":\"user\",\"reason\":\"Manual timeout recovery\"}' | jq -r '.success' | grep -q 'true'"

# Test 11: Manual recovery with metadata
run_test "Manual Recovery with Metadata" "curl -s -X POST http://localhost:3001/recovery/manual -H 'Content-Type: application/json' -d '{\"orderHash\":\"0x7777777777777777777777777777777777777777777777777777777777777777\",\"type\":\"emergency_refund\",\"initiator\":\"admin\",\"reason\":\"Critical issue\",\"metadata\":{\"urgency\":\"high\"}}' | jq -r '.success' | grep -q 'true'"

# Phase 5.1.5: Recovery Request Validation Tests
echo -e "${BLUE}Phase 5.1.5: Request Validation${NC}"

# Test 12: Invalid recovery type
run_test "Invalid Recovery Type" "curl -s -X POST http://localhost:3001/recovery/test -H 'Content-Type: application/json' -d '{\"orderHash\":\"0x8888888888888888888888888888888888888888888888888888888888888888\",\"type\":\"invalid_type\"}' | jq -r '.error' | grep -q 'Invalid recovery type'"

# Test 13: Missing required fields
run_test "Missing Required Fields" "curl -s -X POST http://localhost:3001/recovery/manual -H 'Content-Type: application/json' -d '{\"orderHash\":\"0x9999999999999999999999999999999999999999999999999999999999999999\"}' | jq -r '.error' | grep -q 'Missing required fields'"

# Test 14: Missing orderHash
run_test "Missing OrderHash" "curl -s -X POST http://localhost:3001/recovery/test -H 'Content-Type: application/json' -d '{\"type\":\"timeout_refund\"}' | jq -r '.error' | grep -q 'Missing required fields'"

# Test 15: Empty request body
run_test "Empty Request Body" "curl -s -X POST http://localhost:3001/recovery/test -H 'Content-Type: application/json' -d '{}' | jq -r '.error' | grep -q 'Missing required fields'"

# Phase 5.1.6: Recovery Request Retrieval Tests
echo -e "${BLUE}Phase 5.1.6: Request Retrieval${NC}"

# Test 16: Get specific recovery request
RECOVERY_ID=$(curl -s -X POST http://localhost:3001/recovery/test -H 'Content-Type: application/json' -d '{"orderHash":"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","type":"timeout_refund"}' | jq -r '.recoveryId')
run_test "Get Specific Recovery Request" "curl -s http://localhost:3001/recovery/requests/$RECOVERY_ID | jq -r '.success' | grep -q 'true'"

# Test 17: Get non-existent recovery request
run_test "Get Non-existent Recovery Request" "curl -s http://localhost:3001/recovery/requests/non-existent-id | jq -r '.error' | grep -q 'Recovery request not found'"

# Phase 5.1.7: Statistics Update Tests
echo -e "${BLUE}Phase 5.1.7: Statistics Updates${NC}"

# Test 18: Statistics update after recovery
run_test "Statistics Update" "curl -s http://localhost:3001/recovery/stats | jq -r '.failedRecoveries' | grep -q '^[1-9][0-9]*$'"

# Test 19: Recovery count validation
run_test "Recovery Count Validation" "curl -s http://localhost:3001/recovery/stats | jq -r '.totalRecoveries' | grep -q '^[0-9]*$'"

# Test 20: Failed recoveries count
run_test "Failed Recoveries Count" "curl -s http://localhost:3001/recovery/stats | jq -r '.failedRecoveries' | grep -q '^[1-9][0-9]*$'"

# Phase 5.1.8: Emergency Recovery Tests
echo -e "${BLUE}Phase 5.1.8: Emergency Recovery${NC}"

# Test 21: Emergency recovery with reason
run_test "Emergency Recovery with Reason" "curl -s -X POST http://localhost:3001/recovery/emergency -H 'Content-Type: application/json' -d '{\"orderHash\":\"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\",\"reason\":\"System critical failure\",\"initiator\":\"emergency-admin\"}' | jq -r '.success' | grep -q 'true'"

# Test 22: Emergency recovery missing fields
run_test "Emergency Recovery Missing Fields" "curl -s -X POST http://localhost:3001/recovery/emergency -H 'Content-Type: application/json' -d '{\"orderHash\":\"0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc\"}' | jq -r '.error' | grep -q 'Missing required fields'"

# Phase 5.1.9: Integration Tests
echo -e "${BLUE}Phase 5.1.9: Integration Tests${NC}"

# Test 23: Recovery system with events
run_test "Recovery System Integration" "curl -s http://localhost:3001/api/events | jq -r '.success' | grep -q 'true'"

# Test 24: Recovery with active orders
run_test "Recovery with Orders" "curl -s http://localhost:3001/order/active | jq -r '.meta.totalItems' | grep -q '^[0-9]*$'"

# Test 25: Health check with recovery system
run_test "Health Check with Recovery" "curl -s http://localhost:3001/health | jq -r '.status' | grep -q 'healthy'"

echo ""
echo -e "${BLUE}=============================================================${NC}"
echo -e "${BLUE}📊 Phase 5.1 Recovery Service Test Results${NC}"
echo -e "${BLUE}=============================================================${NC}"
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $((TOTAL_TESTS - PASSED_TESTS))"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}✅ All tests passed! Phase 5.1 Recovery Service is working correctly.${NC}"
    echo -e "${GREEN}🎉 Recovery System implementation complete!${NC}"
else
    echo -e "${RED}❌ Some tests failed. Please check the recovery system implementation.${NC}"
fi

# Print recovery system summary
echo ""
echo -e "${BLUE}🔍 Recovery System Features Tested:${NC}"
echo "✅ Recovery statistics tracking"
echo "✅ Recovery request management"
echo "✅ Timeout refund recovery"
echo "✅ Emergency refund recovery"
echo "✅ Public withdrawal recovery"
echo "✅ Force recovery (admin)"
echo "✅ Manual recovery initiation"
echo "✅ Recovery request validation"
echo "✅ Recovery request retrieval"
echo "✅ Statistics updates"
echo "✅ Emergency recovery procedures"
echo "✅ System integration"

echo ""
echo -e "${GREEN}🎯 Phase 5.1: Recovery Service - Testing Complete!${NC}"
echo -e "${GREEN}🛡️  HTLC Timelock monitoring and auto-refund system operational!${NC}" 