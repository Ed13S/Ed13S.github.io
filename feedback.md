---
layout: null
---
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="style.css">
    <link rel="icon" href="https://img.icons8.com/color/48/security-shield.png" type="image/png">
    <title>Feedback | EDDIE13S</title>
</head>
<body>
    <div class="container">
        <div class="custom-header">
            <div class="inner-header">
                <span>EDDIE13S</span>
                <div class="nav-links">
                    <a href="index.html">Back</a>
                    <button id="theme-toggle">Mode</button>
                </div>
            </div>
        </div>

        <h2>Contact / Feedback</h2>
        <form action="https://formspree.io/f/xgooelrv" method="POST">
            <input type="email" name="email" placeholder="Your Email" required>
            <textarea name="message" placeholder="Your Message" rows="6" required></textarea>
            <button type="submit" class="form-btn">Send Message</button>
        </form>
    </div>

    <script>
        const btn = document.getElementById('theme-toggle');
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme) { document.documentElement.setAttribute('data-theme', currentTheme); }

        btn.addEventListener('click', () => {
            let theme = document.documentElement.getAttribute('data-theme');
            let newTheme = theme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    </script>
</body>
</html>
