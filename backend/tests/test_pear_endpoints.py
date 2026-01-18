"""Tests for Pear Protocol router endpoints."""

import pytest
from fastapi.testclient import TestClient

# Test wallet address and client ID provided by user
TEST_WALLET_ADDRESS = "0x6C5149Bc6C61AFC7ec9c5f6ce2147Db6210bA995"
TEST_CLIENT_ID = "HLHackathon1"


class TestPearAuthEndpoints:
    """Tests for Pear authentication endpoints."""

    def test_get_eip712_message(self, client: TestClient) -> None:
        """
        Test getting EIP-712 message for wallet signature.
        
        Wallet: 0x6C5149Bc6C61AFC7ec9c5f6ce2147Db6210bA995
        Client ID: HLHackathon1
        """
        response = client.get(
            "/api/trade/pear/auth/eip712-message",
            params={
                "address": TEST_WALLET_ADDRESS,
                "client_id": TEST_CLIENT_ID,
            },
        )

        # The endpoint should return 200 or 500 if external service unavailable
        if response.status_code == 200:
            data = response.json()
            # Verify EIP-712 structure is returned
            assert "domain" in data
            assert "types" in data
            assert "message" in data

            print(f"\n✅ EIP-712 Message Response:")
            print(f"   Domain: {data.get('domain')}")
            print(f"   Message: {data.get('message')}")
        else:
            # External service error is acceptable in test environment
            assert response.status_code == 500
            print(f"\n⚠️ External service unavailable: {response.json()}")

    def test_get_eip712_message_missing_address(self, client: TestClient) -> None:
        """Test that missing address returns 422 validation error."""
        response = client.get(
            "/api/trade/pear/auth/eip712-message",
            params={"client_id": TEST_CLIENT_ID},
        )

        assert response.status_code == 422  # Validation error

    def test_login_endpoint_validates_request(self, client: TestClient) -> None:
        """Test that login endpoint validates the request format."""
        # Test with invalid request body (missing required fields)
        response = client.post(
            "/api/trade/pear/auth/login",
            json={},  # Missing required fields
        )

        # Should return 422 for validation error
        assert response.status_code == 422

    @pytest.mark.skip(reason="Requires external Pear API - use scripts/test_pear_api.py for integration testing")
    def test_login_endpoint_with_valid_format(self, client: TestClient) -> None:
        """Test login endpoint with valid format but invalid signature."""
        response = client.post(
            "/api/trade/pear/auth/login",
            json={
                "method": "eip712",
                "address": TEST_WALLET_ADDRESS,
                "client_id": TEST_CLIENT_ID,
                "details": {"signature": "invalid_signature"},
            },
        )

        # Should fail with 400, 401, or 500 since signature is invalid
        assert response.status_code in [400, 401, 500]


class TestPearProtectedEndpoints:
    """Tests for protected Pear endpoints (require authentication)."""

    def test_agent_wallet_requires_auth(self, client: TestClient) -> None:
        """Test that agent wallet endpoint requires authentication."""
        response = client.get("/api/trade/pear/agent-wallet")
        assert response.status_code in [401, 403]

    def test_create_agent_wallet_requires_auth(self, client: TestClient) -> None:
        """Test that creating agent wallet requires authentication."""
        response = client.post("/api/trade/pear/agent-wallet")
        assert response.status_code in [401, 403]

    def test_pair_positions_requires_auth(self, client: TestClient) -> None:
        """Test that pair positions endpoint requires authentication."""
        response = client.get("/api/trade/pear/pairs/positions")
        assert response.status_code in [401, 403]

    def test_bucket_strategies_requires_auth(self, client: TestClient) -> None:
        """Test that bucket strategies endpoint requires authentication."""
        response = client.get("/api/trade/pear/buckets")
        assert response.status_code in [401, 403]


class TestPearInteractiveAuth:
    """
    Interactive authentication tests.
    
    These tests require manual wallet signature input.
    Run with: python -m pytest tests/test_pear_endpoints.py::TestPearInteractiveAuth -v -s
    """

    @pytest.mark.skip(reason="Interactive test - run manually with -s flag")
    def test_full_auth_flow_interactive(self, client: TestClient) -> None:
        """
        Full authentication flow with wallet signature.
        
        This test:
        1. Gets the EIP-712 message
        2. Waits for you to sign it with your wallet
        3. Logs in with the signature
        4. Tests authenticated endpoints
        
        Run with: python -m pytest tests/test_pear_endpoints.py::TestPearInteractiveAuth::test_full_auth_flow_interactive -v -s
        """
        import json
        
        print("\n" + "=" * 70)
        print("  INTERACTIVE PEAR AUTHENTICATION TEST")
        print("=" * 70)
        print(f"  Wallet: {TEST_WALLET_ADDRESS}")
        print(f"  Client ID: {TEST_CLIENT_ID}")
        print("=" * 70)
        
        # Step 1: Get EIP-712 message
        print("\n📋 Step 1: Getting EIP-712 message...")
        response = client.get(
            "/api/trade/pear/auth/eip712-message",
            params={
                "address": TEST_WALLET_ADDRESS,
                "client_id": TEST_CLIENT_ID,
            },
        )
        assert response.status_code == 200, f"Failed to get EIP-712 message: {response.text}"
        eip712_data = response.json()
        
        print("\n✅ EIP-712 Message received:")
        print("-" * 70)
        print(json.dumps(eip712_data, indent=2))
        print("-" * 70)
        
        # Step 2: Wait for signature
        print("\n🔐 Step 2: Sign this message with your wallet")
        print("   Use eth_signTypedData_v4 with your wallet")
        print("")
        
        signature = input("📝 Enter the signature (0x...): ").strip()
        assert signature, "No signature provided"
        
        if not signature.startswith("0x"):
            signature = "0x" + signature
        
        print(f"\n   Received: {signature[:20]}...{signature[-10:]}")
        
        # Step 3: Login
        print("\n🔑 Step 3: Logging in with signature...")
        response = client.post(
            "/api/trade/pear/auth/login",
            json={
                "method": "eip712",
                "address": TEST_WALLET_ADDRESS,
                "client_id": TEST_CLIENT_ID,
                "details": {"signature": signature},
            },
        )
        
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        auth_data = response.json()
        
        access_token = auth_data.get("access_token")
        assert access_token, "No access token in response"
        
        print(f"\n✅ Login successful!")
        print(f"   Access Token: {access_token[:40]}...")
        
        # Step 4: Test authenticated endpoints
        print("\n🔒 Step 4: Testing authenticated endpoints...")
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Test agent wallet
        response = client.get("/api/trade/pear/agent-wallet", headers=headers)
        print(f"   GET /agent-wallet: {response.status_code}")
        if response.status_code == 200:
            print(f"       Response: {response.json()}")
        
        # Test positions
        response = client.get("/api/trade/pear/pairs/positions", headers=headers)
        print(f"   GET /pairs/positions: {response.status_code}")
        if response.status_code == 200:
            print(f"       Response: {response.json()}")
        
        # Test buckets
        response = client.get("/api/trade/pear/buckets", headers=headers)
        print(f"   GET /buckets: {response.status_code}")
        if response.status_code == 200:
            print(f"       Response: {response.json()}")
        
        print("\n" + "=" * 70)
        print("  ✅ AUTHENTICATION TEST COMPLETE")
        print("=" * 70)
        print(f"\n   Full Access Token:")
        print(f"   {access_token}")
        print("")


def run_interactive_test():
    """Run the interactive auth test directly."""
    from fastapi.testclient import TestClient as TC
    from app.main import app
    
    client = TC(app)
    test = TestPearInteractiveAuth()
    # Temporarily remove skip
    test.test_full_auth_flow_interactive.__wrapped__(test, client)


if __name__ == "__main__":
    import sys
    
    if "--interactive" in sys.argv or "-i" in sys.argv:
        # Run interactive test directly
        run_interactive_test()
    else:
        # Run pytest
        pytest.main([__file__, "-v"])

# Usage:
# python3 -m pytest tests/test_pear_endpoints.py -v           # Run all tests
# python3 tests/test_pear_endpoints.py --interactive          # Run interactive auth test