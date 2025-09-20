import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'

const app = new Hono()

// Add CSP middleware to allow Cloudflare scripts
app.use('*', async (c, next) => {
  await next()
  c.res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' *.cloudflareinsights.com; connect-src 'self' *.supabase.co *.cloudflareinsights.com; style-src 'self' 'unsafe-inline';"
  )
})

const createSupabaseClient = (env) => {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
}

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>PropertyScout - Login</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 400px;
          margin: 50px auto;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        h1 {
          text-align: center;
          color: #333;
          margin-bottom: 10px;
          font-size: 32px;
        }
        .subtitle {
          text-align: center;
          color: #666;
          margin-bottom: 30px;
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .input-group {
          position: relative;
        }
        input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e1e1e1;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.3s;
        }
        input:focus {
          outline: none;
          border-color: #667eea;
        }
        button {
          padding: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
        }
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
        }
        .method-selector {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        .method-btn {
          flex: 1;
          padding: 10px;
          background: #f0f0f0;
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s;
          text-align: center;
          font-size: 14px;
        }
        .method-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .otp-container {
          display: none;
        }
        .otp-container.active {
          display: block;
        }
        .otp-inputs {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin: 20px 0;
        }
        .otp-input {
          width: 50px;
          height: 50px;
          text-align: center;
          font-size: 24px;
          border: 2px solid #e1e1e1;
          border-radius: 8px;
        }
        .otp-input:focus {
          border-color: #667eea;
        }
        .resend-link {
          text-align: center;
          margin-top: 15px;
        }
        .resend-link a {
          color: #667eea;
          text-decoration: none;
          font-size: 14px;
        }
        .error {
          color: #dc3545;
          margin-top: 10px;
          text-align: center;
          padding: 10px;
          background: #f8d7da;
          border-radius: 8px;
          font-size: 14px;
        }
        .success {
          color: #155724;
          margin-top: 10px;
          text-align: center;
          padding: 10px;
          background: #d4edda;
          border-radius: 8px;
          font-size: 14px;
        }
        .info {
          color: #004085;
          margin-top: 10px;
          text-align: center;
          padding: 10px;
          background: #cce5ff;
          border-radius: 8px;
          font-size: 14px;
        }
        .divider {
          text-align: center;
          margin: 20px 0;
          position: relative;
        }
        .divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: #e1e1e1;
        }
        .divider span {
          background: white;
          padding: 0 15px;
          position: relative;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>PropertyScout</h1>
        <p class="subtitle">Sign in to your account</p>

        <div class="method-selector">
          <div class="method-btn active" onclick="selectMethod('magiclink')">Magic Link</div>
          <div class="method-btn" onclick="selectMethod('otp')">OTP Code</div>
        </div>

        <form id="emailForm">
          <div class="input-group">
            <input type="email" id="email" placeholder="Enter your email" required />
          </div>
          <button type="submit" id="submitBtn">Send Magic Link</button>
        </form>

        <div class="otp-container" id="otpContainer">
          <div class="divider">
            <span>Enter verification code</span>
          </div>
          <div class="otp-inputs">
            <input type="text" class="otp-input" maxlength="1" pattern="[0-9]" />
            <input type="text" class="otp-input" maxlength="1" pattern="[0-9]" />
            <input type="text" class="otp-input" maxlength="1" pattern="[0-9]" />
            <input type="text" class="otp-input" maxlength="1" pattern="[0-9]" />
            <input type="text" class="otp-input" maxlength="1" pattern="[0-9]" />
            <input type="text" class="otp-input" maxlength="1" pattern="[0-9]" />
          </div>
          <button type="button" onclick="verifyOTP()" id="verifyBtn">Verify Code</button>
          <div class="resend-link">
            <a href="#" onclick="resendCode()">Resend code</a>
          </div>
        </div>

        <div id="message"></div>
      </div>

      <script>
        let authMethod = 'magiclink';
        let userEmail = '';

        function selectMethod(method) {
          authMethod = method;
          document.querySelectorAll('.method-btn').forEach(btn => btn.classList.remove('active'));
          event.target.classList.add('active');

          const submitBtn = document.getElementById('submitBtn');
          if (method === 'magiclink') {
            submitBtn.textContent = 'Send Magic Link';
          } else {
            submitBtn.textContent = 'Send OTP Code';
          }

          // Reset OTP container
          document.getElementById('otpContainer').classList.remove('active');
          document.getElementById('message').innerHTML = '';
        }

        // Handle OTP input auto-focus
        const otpInputs = document.querySelectorAll('.otp-input');
        otpInputs.forEach((input, index) => {
          input.addEventListener('input', (e) => {
            if (e.target.value && index < otpInputs.length - 1) {
              otpInputs[index + 1].focus();
            }
            if (index === otpInputs.length - 1 && e.target.value) {
              // Auto-verify when last digit is entered
              verifyOTP();
            }
          });

          input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
              otpInputs[index - 1].focus();
            }
          });

          input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/\\D/g, '');
            for (let i = 0; i < Math.min(pastedData.length, otpInputs.length); i++) {
              if (index + i < otpInputs.length) {
                otpInputs[index + i].value = pastedData[i];
              }
            }
            if (pastedData.length >= otpInputs.length - index) {
              verifyOTP();
            }
          });
        });

        document.getElementById('emailForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('email').value;
          userEmail = email;
          const submitBtn = document.getElementById('submitBtn');
          const message = document.getElementById('message');

          submitBtn.disabled = true;
          submitBtn.textContent = 'Sending...';

          try {
            const response = await fetch('/auth/send-otp', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email,
                type: authMethod
              }),
            });

            const data = await response.json();

            if (response.ok) {
              if (authMethod === 'magiclink') {
                message.className = 'success';
                message.innerHTML = 'Magic link sent! Check your email to sign in.';
              } else {
                message.className = 'info';
                message.innerHTML = 'Verification code sent to your email!';
                document.getElementById('otpContainer').classList.add('active');
                otpInputs[0].focus();
              }
            } else {
              message.className = 'error';
              message.textContent = data.error || 'Failed to send authentication email';
            }
          } catch (error) {
            message.className = 'error';
            message.textContent = 'Network error. Please try again.';
          } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = authMethod === 'magiclink' ? 'Send Magic Link' : 'Send OTP Code';
          }
        });

        async function verifyOTP() {
          const code = Array.from(otpInputs).map(input => input.value).join('');
          if (code.length !== 6) {
            message.className = 'error';
            message.textContent = 'Please enter all 6 digits';
            return;
          }

          const verifyBtn = document.getElementById('verifyBtn');
          verifyBtn.disabled = true;
          verifyBtn.textContent = 'Verifying...';

          try {
            const response = await fetch('/auth/verify-otp', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: userEmail,
                token: code
              }),
            });

            const data = await response.json();

            if (response.ok) {
              message.className = 'success';
              message.textContent = 'Signed in successfully!';
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 1000);
            } else {
              message.className = 'error';
              message.textContent = data.error || 'Invalid verification code';
              otpInputs.forEach(input => input.value = '');
              otpInputs[0].focus();
            }
          } catch (error) {
            message.className = 'error';
            message.textContent = 'Network error. Please try again.';
          } finally {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify Code';
          }
        }

        async function resendCode() {
          const email = userEmail;
          if (!email) {
            message.className = 'error';
            message.textContent = 'Please enter your email first';
            return;
          }

          try {
            const response = await fetch('/auth/send-otp', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email,
                type: 'otp'
              }),
            });

            const data = await response.json();

            if (response.ok) {
              message.className = 'info';
              message.textContent = 'New verification code sent!';
              otpInputs.forEach(input => input.value = '');
              otpInputs[0].focus();
            } else {
              message.className = 'error';
              message.textContent = data.error || 'Failed to resend code';
            }
          } catch (error) {
            message.className = 'error';
            message.textContent = 'Network error. Please try again.';
          }
        }
      </script>
    </body>
    </html>
  `)
})

app.post('/auth/send-otp', async (c) => {
  try {
    const supabase = createSupabaseClient(c.env)
    const { email, type } = await c.req.json()

    if (type === 'magiclink') {
      // Send magic link
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${c.req.url.split('/').slice(0, 3).join('/')}/auth/callback`,
        }
      })

      if (error) {
        return c.json({ error: error.message }, 400)
      }

      return c.json({
        message: 'Magic link sent to your email'
      })
    } else {
      // Send OTP code
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        }
      })

      if (error) {
        return c.json({ error: error.message }, 400)
      }

      return c.json({
        message: 'OTP sent to your email'
      })
    }
  } catch (error) {
    return c.json({ error: 'Failed to send authentication email' }, 500)
  }
})

app.post('/auth/verify-otp', async (c) => {
  try {
    const supabase = createSupabaseClient(c.env)
    const { email, token } = await c.req.json()

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    })

    if (error) {
      return c.json({ error: error.message }, 400)
    }

    const response = c.json({
      message: 'Signed in successfully',
      user: data.user
    })

    if (data.session) {
      response.headers.set('Set-Cookie', `sb-access-token=${data.session.access_token}; HttpOnly; Secure; SameSite=Strict; Path=/`)
    }

    return response
  } catch (error) {
    return c.json({ error: 'Invalid verification code' }, 400)
  }
})

app.get('/auth/callback', async (c) => {
  // Handle magic link callback
  const token_hash = c.req.query('token_hash')
  const type = c.req.query('type')

  if (token_hash && type === 'magiclink') {
    // Redirect to dashboard with token for client-side verification
    return c.redirect(`/dashboard?token=${token_hash}&type=${type}`)
  }

  return c.redirect('/')
})

app.post('/auth/signout', async (c) => {
  try {
    const supabase = createSupabaseClient(c.env)

    const { error } = await supabase.auth.signOut()

    if (error) {
      return c.json({ error: error.message }, 400)
    }

    const response = c.json({ message: 'Signed out successfully' })
    response.headers.set('Set-Cookie', `sb-access-token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`)

    return response
  } catch (error) {
    return c.json({ error: 'Sign out failed' }, 500)
  }
})

app.get('/dashboard', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>PropertyScout - Dashboard</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f8f9fa;
          height: 100vh;
          display: flex;
        }
        .sidebar {
          width: 250px;
          background: white;
          box-shadow: 2px 0 10px rgba(0,0,0,0.1);
          height: 100vh;
          overflow-y: auto;
        }
        .sidebar-header {
          padding: 20px;
          background: #007bff;
          color: white;
        }
        .sidebar-header h2 {
          font-size: 18px;
          font-weight: 600;
        }
        .nav-item {
          border-bottom: 1px solid #f0f0f0;
        }
        .nav-link {
          display: block;
          padding: 15px 20px;
          color: #333;
          text-decoration: none;
          transition: background-color 0.3s;
        }
        .nav-link:hover {
          background-color: #f8f9fa;
        }
        .nav-link.active {
          background-color: #007bff;
          color: white;
        }
        .nav-submenu {
          background-color: #f8f9fa;
          border-left: 3px solid #007bff;
        }
        .nav-submenu .nav-link {
          padding-left: 40px;
          font-size: 14px;
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .header {
          background: white;
          padding: 20px 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header h1 {
          color: #333;
          font-size: 24px;
        }
        .sign-out-btn {
          padding: 10px 20px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s;
        }
        .sign-out-btn:hover {
          background: #c82333;
        }
        .content {
          flex: 1;
          padding: 30px;
          overflow-y: auto;
        }
        .content-section {
          display: none;
        }
        .content-section.active {
          display: block;
        }
        .page-title {
          margin-bottom: 20px;
          color: #333;
          font-size: 28px;
          font-weight: 600;
        }
        .tabs {
          display: flex;
          margin-bottom: 20px;
          border-bottom: 1px solid #dee2e6;
        }
        .tab {
          padding: 12px 24px;
          background: none;
          border: none;
          cursor: pointer;
          color: #6c757d;
          font-size: 16px;
          border-bottom: 2px solid transparent;
          transition: all 0.3s;
        }
        .tab.active {
          color: #007bff;
          border-bottom-color: #007bff;
        }
        .tab:hover {
          color: #007bff;
        }
        .leads-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .leads-table {
          width: 100%;
          border-collapse: collapse;
        }
        .leads-table th {
          background: #f8f9fa;
          padding: 15px;
          text-align: left;
          font-weight: 600;
          color: #495057;
          border-bottom: 2px solid #dee2e6;
        }
        .leads-table td {
          padding: 15px;
          border-bottom: 1px solid #dee2e6;
          vertical-align: top;
        }
        .leads-table tr:hover {
          background-color: #f8f9fa;
        }
        .property-image {
          width: 80px;
          height: 60px;
          object-fit: cover;
          border-radius: 4px;
        }
        .property-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .property-address {
          font-weight: 600;
          color: #333;
        }
        .property-details {
          color: #6c757d;
          font-size: 14px;
        }
        .price {
          font-weight: 600;
          color: #28a745;
          font-size: 18px;
        }
        .agent-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .agent-name {
          font-weight: 600;
          color: #333;
        }
        .agent-contact {
          color: #6c757d;
          font-size: 14px;
        }
        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-active {
          background-color: #d4edda;
          color: #155724;
        }
        .status-archived {
          background-color: #f8d7da;
          color: #721c24;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: #6c757d;
        }
        .no-data {
          text-align: center;
          padding: 40px;
          color: #6c757d;
        }
        @media (max-width: 768px) {
          body {
            flex-direction: column;
          }
          .sidebar {
            width: 100%;
            height: auto;
          }
          .main-content {
            height: auto;
          }
        }
      </style>
    </head>
    <body>
      <div class="sidebar">
        <div class="sidebar-header">
          <h2>PropertyScout</h2>
        </div>
        <nav>
          <div class="nav-item">
            <a href="#" class="nav-link" onclick="showSection('dashboard')">Dashboard</a>
          </div>
          <div class="nav-item">
            <a href="#" class="nav-link active" onclick="showSection('property-leads')">Property Leads</a>
            <div class="nav-submenu">
              <a href="#" class="nav-link" onclick="showLeads('current')">Current Leads</a>
              <a href="#" class="nav-link" onclick="showLeads('archived')">Archived</a>
            </div>
          </div>
        </nav>
      </div>

      <div class="main-content">
        <div class="header">
          <h1>Dashboard</h1>
          <button class="sign-out-btn" onclick="signOut()">Sign Out</button>
        </div>

        <div class="content">
          <div id="dashboard-section" class="content-section">
            <h2 class="page-title">Welcome to PropertyScout!</h2>
            <p>You have successfully signed in. This is your dashboard where you can manage your property scouting activities.</p>
          </div>

          <div id="property-leads-section" class="content-section active">
            <h2 class="page-title">Property Leads</h2>

            <div class="tabs">
              <button class="tab active" onclick="showLeads('current')">Current Leads</button>
              <button class="tab" onclick="showLeads('archived')">Archived</button>
            </div>

            <div class="leads-container">
              <div id="leads-content">
                <div class="loading">Loading property leads...</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <script>
        let currentLeadsTab = 'current';

        function showSection(section) {
          document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
          document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

          if (section === 'dashboard') {
            document.getElementById('dashboard-section').classList.add('active');
            document.querySelector('[onclick="showSection(\\'dashboard\\')"]').classList.add('active');
          } else if (section === 'property-leads') {
            document.getElementById('property-leads-section').classList.add('active');
            document.querySelector('[onclick="showSection(\\'property-leads\\')"]').classList.add('active');
            showLeads(currentLeadsTab);
          }
        }

        function showLeads(status) {
          currentLeadsTab = status;

          // Update tab styles
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          // Try to get the target element from event or find it by onclick attribute
          let targetElement = null;
          if (window.event && window.event.target && window.event.target.classList) {
            targetElement = window.event.target;
          } else {
            targetElement = document.querySelector(\`[onclick="showLeads('\${status}')"]\`);
          }

          if (targetElement && targetElement.classList) {
            targetElement.classList.add('active');
          }

          // Load leads data
          loadLeads(status);
        }

        async function loadLeads(status) {
          const leadsContent = document.getElementById('leads-content');
          leadsContent.innerHTML = '<div class="loading">Loading property leads...</div>';

          try {
            const response = await fetch(\`/api/property-leads?status=\${status}\`);
            if (!response.ok) {
              throw new Error('Failed to load leads');
            }

            const leads = await response.json();
            displayLeads(leads);
          } catch (error) {
            leadsContent.innerHTML = '<div class="no-data">Failed to load property leads. Please try again.</div>';
            console.error('Error loading leads:', error);
          }
        }

        function displayLeads(leads) {
          const leadsContent = document.getElementById('leads-content');

          if (!leads || leads.length === 0) {
            leadsContent.innerHTML = '<div class="no-data">No property leads found.</div>';
            return;
          }

          const tableHTML = \`
            <table class="leads-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Details</th>
                  <th>Price</th>
                  <th>Agent</th>
                  <th>Broker</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                \${leads.map(lead => \`
                  <tr>
                    <td>
                      <img src="\${lead.property.image_url}" alt="Property" class="property-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA4MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0zMiAyNEwyNCAzMkgzMlYzNkg0OFYzMkg1NkwzMiAyNFoiIGZpbGw9IiM2QzdTN0QiLz4KPC9zdmc+Cg=='">
                    </td>
                    <td>
                      <div class="property-info">
                        <div class="property-address">\${lead.property.street_address}</div>
                        <div class="property-details">\${lead.property.city}, \${lead.property.state} \${lead.property.zipcode}</div>
                        <div class="property-details">\${lead.property.bedrooms} bed, \${lead.property.bathrooms} bath • \${lead.property.home_type.replace('_', ' ')}</div>
                        \${lead.property.year_built ? \`<div class="property-details">Built \${lead.property.year_built}</div>\` : ''}
                      </div>
                    </td>
                    <td>
                      <div class="price">$\${lead.listing.price.toLocaleString()}</div>
                    </td>
                    <td>
                      <div class="agent-info">
                        <div class="agent-name">\${lead.agent.full_name}</div>
                        \${lead.agent.phone_number ? \`<div class="agent-contact">\${lead.agent.phone_number}</div>\` : ''}
                        \${lead.agent.email ? \`<div class="agent-contact">\${lead.agent.email}</div>\` : ''}
                        \${lead.agent.license_number ? \`<div class="agent-contact">License: \${lead.agent.license_number}</div>\` : ''}
                      </div>
                    </td>
                    <td>
                      <div class="agent-info">
                        <div class="agent-name">\${lead.broker.name}</div>
                        \${lead.broker.phone_number ? \`<div class="agent-contact">\${lead.broker.phone_number}</div>\` : ''}
                      </div>
                    </td>
                    <td>
                      <span class="status-badge status-\${lead.status}">\${lead.status}</span>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          \`;

          leadsContent.innerHTML = tableHTML;
        }

        async function signOut() {
          try {
            const response = await fetch('/auth/signout', {
              method: 'POST',
            });

            if (response.ok) {
              window.location.href = '/';
            } else {
              alert('Sign out failed');
            }
          } catch (error) {
            alert('Network error during sign out');
          }
        }

        // Load current leads on page load
        document.addEventListener('DOMContentLoaded', () => {
          showLeads('current');
        });
      </script>
    </body>
    </html>
  `)
})

app.get('/api/property-leads', async (c) => {
  try {
    const supabase = createSupabaseClient(c.env)
    const status = c.req.query('status') || 'active'

    // Call the Supabase function
    const { data, error } = await supabase.rpc('get_property_leads', {
      p_status: status === 'current' ? 'active' : status
    })

    if (error) {
      console.error('Supabase error:', error)
      return c.json({ error: error.message }, 400)
    }

    return c.json(data || [])
  } catch (error) {
    console.error('API error:', error)
    return c.json({ error: 'Failed to fetch property leads' }, 500)
  }
})

app.get('/api/', (c) => c.json({ name: 'PropertyScout API' }))

export default app
