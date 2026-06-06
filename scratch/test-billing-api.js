import http from 'http';

const loginData = JSON.stringify({
  username: 'billing',
  password: 'billing123'
});

// Helper to make HTTP requests
function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data ? JSON.parse(data) : null
        });
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function run() {
  try {
    console.log('Logging in as billing counter agent...');
    const loginRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, loginData);

    if (loginRes.statusCode !== 200) {
      console.error('Login failed:', loginRes.data);
      process.exit(1);
    }

    const token = loginRes.data.token;
    console.log('Login successful. Testing endpoint authorization restrictions...\n');

    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test 1: GET /api/reports/dashboard-summary (Should be 403)
    const reportRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/reports/dashboard-summary',
      method: 'GET',
      headers: authHeaders
    });
    console.log(`GET /api/reports/dashboard-summary -> Status: ${reportRes.statusCode} (Expected: 403)`);
    if (reportRes.statusCode !== 403) {
      throw new Error(`Report endpoint should return 403, got ${reportRes.statusCode}`);
    }

    // Test 2: POST /api/medicines (Should be 403)
    const medPostData = JSON.stringify({ name: 'Test Med', brandName: 'Test Brand', category: 'Tablets', quantity: 10, purchasePrice: 10, sellingPrice: 15, expiryDate: '2027-01-01', manufacturer: 'Test' });
    const medRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines',
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Length': Buffer.byteLength(medPostData)
      }
    }, medPostData);
    console.log(`POST /api/medicines -> Status: ${medRes.statusCode} (Expected: 403)`);
    if (medRes.statusCode !== 403) {
      throw new Error(`Add medicine endpoint should return 403, got ${medRes.statusCode}`);
    }

    // Test 3: POST /api/customers (Should be 403)
    const custPostData = JSON.stringify({ name: 'Test Cust', mobile: '9999999999' });
    const custRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/customers',
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Length': Buffer.byteLength(custPostData)
      }
    }, custPostData);
    console.log(`POST /api/customers -> Status: ${custRes.statusCode} (Expected: 403)`);
    if (custRes.statusCode !== 403) {
      throw new Error(`Add customer endpoint should return 403, got ${custRes.statusCode}`);
    }

    // Test 4: GET /api/sales (Should be 403)
    const salesHistoryRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/sales',
      method: 'GET',
      headers: authHeaders
    });
    console.log(`GET /api/sales (Sales History) -> Status: ${salesHistoryRes.statusCode} (Expected: 403)`);
    if (salesHistoryRes.statusCode !== 403) {
      throw new Error(`Sales history endpoint should return 403, got ${salesHistoryRes.statusCode}`);
    }

    // Test 5: POST /api/sales (Checkout - Should succeed, return 201)
    // Find a medicine ID in stock first
    const medicinesRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicines?search=Calpol',
      method: 'GET',
      headers: authHeaders
    });
    const calpolId = medicinesRes.data[0].id;

    const checkoutData = JSON.stringify({
      customerName: 'Ganga API Role Test',
      customerMobile: '9955550233',
      items: [{ id: calpolId, quantity: 1 }],
      paymentMethod: 'Cash'
    });

    const checkoutRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/sales',
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Length': Buffer.byteLength(checkoutData)
      }
    }, checkoutData);
    console.log(`POST /api/sales (Checkout) -> Status: ${checkoutRes.statusCode} (Expected: 201)`);
    if (checkoutRes.statusCode !== 201) {
      throw new Error(`Checkout should succeed with 201, got ${checkoutRes.statusCode}`);
    }

    console.log('\nAll API route security tests passed successfully!');
  } catch (err) {
    console.error('API Verification failed:', err.message);
    process.exit(1);
  }
}

run();
