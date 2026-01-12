---
layout: null
---
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="style.css">
    <link rel="icon" href="https://img.icons8.com/color/48/security-shield.png" type="image/png">
    <title>EDDIE13S</title>
</head>
<body>
    <div class="container">
        <div class="custom-header">
            <div class="inner-header">
                <span>EDDIE13S</span>
                <div class="nav-links">
                    <a href="index.html">About</a>
                    <a href="feedback.html">Feedback</a>
                    <button id="theme-toggle">Mode</button>
                </div>
            </div>
        </div>

        <p>My name is Eddie, I am <span id="exact-age">15</span>. I like to program software relating to cyber security. Feel free to check out my projects below additionally at my other website.</p>

        <a href="feedback.html" class="post-card">
            <div class="post-date">January 11, 2023</div>
            <span class="post-title">Feedback Form</span>
            <div class="post-category">Uncategorized</div>
        </a>

        <a href="https://github.com/Ed13S" class="post-card">
            <div class="post-date">January 11, 2023</div>
            <span class="post-title">Check out my profile at GitHub @Ed13S</span>
            <div class="post-category">Information, Profiles</div>
        </a>

        <a href="feedback.html" class="post-card">
            <div class="post-date">January 12, 2026</div>
            <span class="post-title">Contact Me Form</span>
            <div class="post-category">Uncategorized</div>
        </a>

        <a href="https://otp-secret-messages--Eddie13S.replit.app" class="post-card">
            <div class="post-date">January 24, 2023</div>
            <span class="post-title">My favourite project</span>
            <div class="post-category">Programs</div>
        </a>

        <a href="https://scratch.mit.edu/users/ED13SED13s/" class="post-card">
            <div class="post-date">January 14, 2023</div>
            <span class="post-title">Scratch profile</span>
            <div class="post-category">Information, Profiles</div>
        </a>

        <a href="https://replit.com/@Eddie13S" class="post-card">
            <div class="post-date">January 11, 2023</div>
            <span class="post-title">Replit profile</span>
            <div class="post-category">Information, Profiles</div>
        </a>
    </div>

    <script>
        function calculateAge(birthDate) {
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
            return age;
        }
        document.getElementById('exact-age').innerText = calculateAge(new Date(2010, 2, 6));

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
