export const TEMPLATES: Record<string, { label: string; description: string; code: string }> = {
  starter: {
    label: "Starter Page",
    description: "A minimal page with a heading, a button and a click handler.",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Page</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      line-height: 1.6;
      color: #1a1a2e;
      padding: 2rem;
      background: #fafafa;
    }
    h1 { color: #e94560; margin-bottom: 0.5rem; }
    p { color: #555; max-width: 600px; }
    button {
      margin-top: 1rem;
      padding: 0.6rem 1rem;
      border: 0;
      border-radius: 8px;
      background: #e94560;
      color: #fff;
      font: inherit;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>Hello, World!</h1>
  <p>Edit the HTML, CSS and JS tabs to see live changes in the preview panel.</p>
  <button id="greet" type="button">Say hello</button>
  <script>
    const button = document.getElementById("greet");
    button.addEventListener("click", () => {
      console.log("Hello from the JS tab");
      button.textContent = "Check the console";
    });
  </script>
</body>
</html>`,
  },
  card: {
    label: "Profile Card",
    description: "A centered profile card on a gradient background.",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: 'Segoe UI', system-ui, sans-serif;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 2.5rem;
      width: 320px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
    .avatar {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f093fb, #f5576c);
      margin: 0 auto 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      color: white;
    }
    .card h2 { font-size: 1.3rem; color: #1a1a2e; }
    .card p { color: #888; font-size: 0.9rem; margin: 0.3rem 0 1.2rem; }
    .stats {
      display: flex;
      justify-content: space-around;
      border-top: 1px solid #eee;
      padding-top: 1rem;
    }
    .stats div { text-align: center; }
    .stats strong { display: block; color: #1a1a2e; font-size: 1.1rem; }
    .stats span { font-size: 0.75rem; color: #aaa; text-transform: uppercase; }
    .btn {
      display: inline-block;
      margin-top: 1.2rem;
      padding: 0.6rem 2rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 25px;
      font-size: 0.9rem;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="avatar">JD</div>
    <h2>Jane Doe</h2>
    <p>Full-Stack Developer</p>
    <div class="stats">
      <div><strong>142</strong><span>Projects</span></div>
      <div><strong>8.5k</strong><span>Followers</span></div>
      <div><strong>320</strong><span>Following</span></div>
    </div>
    <button class="btn">Follow</button>
  </div>
</body>
</html>`,
  },
  form: {
    label: "Contact Form",
    description: "A styled contact form with labelled fields.",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f4f8;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }
    .form-container {
      background: white;
      padding: 2.5rem;
      border-radius: 12px;
      width: 400px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    h2 { margin-bottom: 0.3rem; color: #1a1a2e; }
    .subtitle { color: #888; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .field { margin-bottom: 1rem; }
    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 0.3rem;
    }
    input, textarea {
      width: 100%;
      padding: 0.65rem 0.8rem;
      border: 1.5px solid #ddd;
      border-radius: 8px;
      font-size: 0.9rem;
      font-family: inherit;
      transition: border 0.2s;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102,126,234,0.15);
    }
    textarea { resize: vertical; min-height: 100px; }
    .btn {
      width: 100%;
      padding: 0.75rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn:hover { background: #5a6fd6; }
  </style>
</head>
<body>
  <div class="form-container">
    <h2>Get in Touch</h2>
    <p class="subtitle">We'd love to hear from you</p>
    <form onsubmit="event.preventDefault(); alert('Message sent!')">
      <div class="field">
        <label for="name">Full Name</label>
        <input type="text" id="name" placeholder="John Doe" required>
      </div>
      <div class="field">
        <label for="email">Email</label>
        <input type="email" id="email" placeholder="john@example.com" required>
      </div>
      <div class="field">
        <label for="msg">Message</label>
        <textarea id="msg" placeholder="Your message..." required></textarea>
      </div>
      <button type="submit" class="btn">Send Message</button>
    </form>
  </div>
</body>
</html>`,
  },
  grid: {
    label: "CSS Grid Gallery",
    description: "A gallery laid out with CSS Grid.",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #111;
      padding: 1.5rem;
    }
    h1 {
      color: white;
      text-align: center;
      margin-bottom: 1.5rem;
      font-size: 1.5rem;
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
      max-width: 800px;
      margin: 0 auto;
    }
    .item {
      aspect-ratio: 1;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      cursor: pointer;
      transition: transform 0.3s;
    }
    .item:hover { transform: scale(1.03); }
    .item:nth-child(1) { background: linear-gradient(135deg, #f093fb, #f5576c); }
    .item:nth-child(2) { background: linear-gradient(135deg, #4facfe, #00f2fe); }
    .item:nth-child(3) { background: linear-gradient(135deg, #43e97b, #38f9d7); }
    .item:nth-child(4) { background: linear-gradient(135deg, #fa709a, #fee140); }
    .item:nth-child(5) { background: linear-gradient(135deg, #a18cd1, #fbc2eb); }
    .item:nth-child(6) { background: linear-gradient(135deg, #fccb90, #d57eeb); }
    .item:nth-child(7) { background: linear-gradient(135deg, #667eea, #764ba2); }
    .item:nth-child(8) { background: linear-gradient(135deg, #ff9a9e, #fecfef); }
    .label {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0.8rem;
      background: rgba(0,0,0,0.5);
      color: white;
      font-size: 0.85rem;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <h1>CSS Grid Gallery</h1>
  <div class="gallery">
    <div class="item"><div class="label">Sunset</div></div>
    <div class="item"><div class="label">Ocean</div></div>
    <div class="item"><div class="label">Forest</div></div>
    <div class="item"><div class="label">Desert</div></div>
    <div class="item"><div class="label">Mountains</div></div>
    <div class="item"><div class="label">Aurora</div></div>
    <div class="item"><div class="label">Galaxy</div></div>
    <div class="item"><div class="label">Clouds</div></div>
  </div>
</body>
</html>`,
  },
  navbar: {
    label: "Responsive Navbar",
    description: "A navigation bar that adapts to small screens.",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #fafafa; }
    nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.8rem 2rem;
      background: white;
      box-shadow: 0 1px 8px rgba(0,0,0,0.08);
      position: sticky;
      top: 0;
    }
    .logo {
      font-size: 1.3rem;
      font-weight: 800;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .nav-links { display: flex; gap: 1.5rem; list-style: none; }
    .nav-links a {
      text-decoration: none;
      color: #555;
      font-weight: 500;
      font-size: 0.95rem;
      transition: color 0.2s;
    }
    .nav-links a:hover { color: #667eea; }
    .cta {
      padding: 0.5rem 1.2rem;
      background: #667eea;
      color: white !important;
      border-radius: 6px;
      -webkit-text-fill-color: white;
    }
    .hero {
      text-align: center;
      padding: 5rem 2rem;
    }
    .hero h1 { font-size: 2.5rem; color: #1a1a2e; margin-bottom: 0.8rem; }
    .hero p { color: #888; font-size: 1.1rem; max-width: 500px; margin: 0 auto; }
  </style>
</head>
<body>
  <nav>
    <div class="logo">Brand</div>
    <ul class="nav-links">
      <li><a href="#">Home</a></li>
      <li><a href="#">Features</a></li>
      <li><a href="#">Pricing</a></li>
      <li><a href="#" class="cta">Get Started</a></li>
    </ul>
  </nav>
  <div class="hero">
    <h1>Build Something Amazing</h1>
    <p>A beautiful responsive navbar built with pure HTML and CSS. No JavaScript needed.</p>
  </div>
</body>
</html>`,
  },
  animation: {
    label: "CSS Animation",
    description: "Keyframe animations written in plain CSS.",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #0f0f23;
      font-family: 'Segoe UI', system-ui, sans-serif;
      overflow: hidden;
    }
    .loader {
      display: flex;
      gap: 8px;
      margin-bottom: 2rem;
    }
    .loader span {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      animation: bounce 1.4s ease-in-out infinite;
    }
    .loader span:nth-child(1) { background: #f5576c; animation-delay: 0s; }
    .loader span:nth-child(2) { background: #ffd93d; animation-delay: 0.15s; }
    .loader span:nth-child(3) { background: #6bcb77; animation-delay: 0.3s; }
    .loader span:nth-child(4) { background: #4d96ff; animation-delay: 0.45s; }
    .loader span:nth-child(5) { background: #a855f7; animation-delay: 0.6s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1.2); opacity: 1; }
    }

    .text {
      color: white;
      font-size: 1.5rem;
      font-weight: 300;
      letter-spacing: 0.5em;
      text-transform: uppercase;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    .ring {
      width: 120px;
      height: 120px;
      border: 3px solid transparent;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1.5s linear infinite;
      margin-bottom: 2rem;
      position: relative;
    }
    .ring::before {
      content: '';
      position: absolute;
      inset: 6px;
      border: 3px solid transparent;
      border-top-color: #f5576c;
      border-radius: 50%;
      animation: spin 1s linear reverse infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="ring"></div>
  <div class="loader">
    <span></span><span></span><span></span><span></span><span></span>
  </div>
  <div class="text">Loading</div>
</body>
</html>`,
  },
  landing: {
    label: "Mini Landing Page",
    description: "A small landing page with features and a footer.",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a2e; }
    .hero {
      min-height: 60vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
    }
    .hero h1 { font-size: 2.5rem; margin-bottom: 0.8rem; }
    .hero p { font-size: 1.1rem; opacity: 0.9; max-width: 500px; margin: 0 auto 1.5rem; }
    .hero-btn {
      display: inline-block;
      padding: 0.8rem 2rem;
      background: white;
      color: #667eea;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 1rem;
      transition: transform 0.2s;
    }
    .hero-btn:hover { transform: translateY(-2px); }
    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
      max-width: 800px;
      margin: -3rem auto 3rem;
      padding: 0 1.5rem;
    }
    .feature {
      background: white;
      padding: 1.8rem;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      text-align: center;
    }
    .feature .icon { font-size: 2rem; margin-bottom: 0.8rem; }
    .feature h3 { margin-bottom: 0.4rem; font-size: 1rem; }
    .feature p { font-size: 0.85rem; color: #666; line-height: 1.5; }
    footer {
      text-align: center;
      padding: 1.5rem;
      background: #f8f9fa;
      color: #888;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="hero">
    <div>
      <h1>Ship Faster</h1>
      <p>Build beautiful web experiences with clean HTML and CSS. No frameworks, no build tools, just code.</p>
      <a href="#features" class="hero-btn">Explore Features</a>
    </div>
  </div>
  <div class="features" id="features">
    <div class="feature">
      <div class="icon">\u26A1</div>
      <h3>Lightning Fast</h3>
      <p>Zero dependencies means instant load times.</p>
    </div>
    <div class="feature">
      <div class="icon">\uD83C\uDFA8</div>
      <h3>Beautiful Design</h3>
      <p>Modern gradients and clean typography.</p>
    </div>
    <div class="feature">
      <div class="icon">\uD83D\uDD12</div>
      <h3>Secure by Default</h3>
      <p>No external requests, fully self-contained.</p>
    </div>
  </div>
  <footer>&copy; 2026 MyApp. Built with HTML &amp; CSS.</footer>
</body>
</html>`,
  },
};
