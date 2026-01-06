#!/usr/bin/env node

/**
 * Authentication Flow Test Script
 * This script tests the signup and login endpoints
 */

const axios = require("axios");

// Configuration
const BASE_URL = "http://localhost:3000";
const TEST_EMAIL = "test+" + Date.now() + "@example.com";
const TEST_PASSWORD = "password123";
const TEST_NAME = "Test User";

async function testSignup() {
  console.log("🧪 Testing Signup Process...");

  try {
    const response = await axios.post(`${BASE_URL}/api/v1/auth/signup`, {
      name: TEST_NAME,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    console.log("✅ Signup successful:", response.data);
    return true;
  } catch (error) {
    console.error("❌ Signup failed:", error.response?.data || error.message);
    return false;
  }
}

async function testLogin() {
  console.log("🧪 Testing Login Process...");

  try {
    const response = await axios.post(`${BASE_URL}/api/v1/auth/signin`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    console.log("✅ Login successful:", response.data);
    return true;
  } catch (error) {
    console.error("❌ Login failed:", error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log("🚀 Starting Authentication Flow Tests\n");

  const signupSuccess = await testSignup();
  console.log("");

  if (signupSuccess) {
    const loginSuccess = await testLogin();
    console.log("");

    if (loginSuccess) {
      console.log(
        "🎉 All tests passed! Authentication flow is working correctly.",
      );
    } else {
      console.log("⚠️  Signup worked but login failed.");
    }
  } else {
    console.log("❌ Signup failed, skipping login test.");
  }
}

// Run the tests
runTests().catch(console.error);
