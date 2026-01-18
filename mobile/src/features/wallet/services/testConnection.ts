/**
 * Quick connection test utility
 * Add this to help debug API connectivity issues
 */

import axios from 'axios';
import { Platform } from 'react-native';

const getApiBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }
  return 'http://10.0.11.138:8000';
};

/**
 * Test 1: Can we reach the backend health endpoint?
 */
export async function testHealthEndpoint(): Promise<void> {
  const url = `${getApiBaseUrl()}/health`;
  
  console.log('\n' + '='.repeat(80));
  console.log('🏥 TEST 1: Health Endpoint');
  console.log('='.repeat(80));
  console.log('🌐 Platform:', Platform.OS);
  console.log('📡 URL:', url);
  
  try {
    console.log('⏳ Making request...');
    const response = await axios.get(url, { timeout: 5000 });
    console.log('✅ SUCCESS!');
    console.log('📊 Status:', response.status);
    console.log('📦 Data:', response.data);
    console.log('='.repeat(80) + '\n');
    return response.data;
  } catch (error: any) {
    console.error('❌ FAILED!');
    console.error('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Connection refused - backend might not be running or wrong IP');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('💡 Connection timeout - check your network/firewall');
    } else if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📦 Data:', error.response.data);
    }
    
    console.log('='.repeat(80) + '\n');
    throw error;
  }
}

/**
 * Test 2: Can we get EIP-712 message?
 */
export async function testEIP712Endpoint(): Promise<void> {
  const url = `${getApiBaseUrl()}/api/trade/pear/auth/eip712-message`;
  const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  
  console.log('\n' + '='.repeat(80));
  console.log('🔐 TEST 2: EIP-712 Message Endpoint');
  console.log('='.repeat(80));
  console.log('📡 URL:', url);
  console.log('📍 Test Address:', testAddress);
  
  try {
    console.log('⏳ Making request...');
    const response = await axios.get(url, {
      params: {
        address: testAddress.toLowerCase(),
        client_id: 'APITRADER'
      },
      timeout: 5000,
    });
    console.log('✅ SUCCESS!');
    console.log('📊 Status:', response.status);
    console.log('📦 Data:', JSON.stringify(response.data, null, 2));
    console.log('='.repeat(80) + '\n');
    return response.data;
  } catch (error: any) {
    console.error('❌ FAILED!');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📦 Data:', error.response.data);
    }
    
    console.log('='.repeat(80) + '\n');
    throw error;
  }
}

/**
 * Run all connection tests
 */
export async function runConnectionTests(): Promise<void> {
  console.log('\n\n');
  console.log('🚀 STARTING CONNECTION TESTS');
  console.log('='.repeat(80));
  
  try {
    // Test 1: Health endpoint
    await testHealthEndpoint();
    
    // Test 2: EIP-712 endpoint
    await testEIP712Endpoint();
    
    console.log('\n✅ ALL TESTS PASSED!');
    console.log('Your backend is accessible and working correctly.\n\n');
  } catch (error) {
    console.log('\n❌ TESTS FAILED!');
    console.log('Check the error messages above for details.\n\n');
  }
}

/**
 * Get current API configuration
 */
export function getAPIConfig(): void {
  console.log('\n' + '='.repeat(80));
  console.log('⚙️  CURRENT API CONFIGURATION');
  console.log('='.repeat(80));
  console.log('🌐 Platform:', Platform.OS);
  console.log('📡 API Base URL:', getApiBaseUrl());
  console.log('📡 Health:', `${getApiBaseUrl()}/health`);
  console.log('📡 EIP-712:', `${getApiBaseUrl()}/api/trade/pear/auth/eip712-message`);
  console.log('📡 Login:', `${getApiBaseUrl()}/api/trade/pear/auth/login`);
  console.log('='.repeat(80) + '\n');
}
