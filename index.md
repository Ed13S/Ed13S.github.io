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
                    <a href="index.html">About me</a>
                    <a href="projects.html">Projects (<span id="p-count">...</span>)</a>
                    <button id="theme-toggle">Toggle Mode</button>
                </div>
            </div>
        </div>

        <p>My name is Eddie, I am <span id="exact-age">15</span>. I like to program software relating to cyber security. Feel free to check out my projects below additionally at my other website.</p>

        <div class="contact-section">
            <h3>Contact / Feedback</h3>
            <form action="https://formspree.io/f/xykkyyjj" method="POST">
                <input type="email" name="email" placeholder="Your Email" required>
                <textarea name="message" placeholder="Your Message" rows="4" required></textarea>
                <button type="submit" class="form-btn">Send Message</button>
            </form>
        </div>
    </div>

    <script>
        // Age Logic
        function calculateAge(birthDate) {
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        }
        document.getElementById('exact-age').innerText = calculateAge(new Date(2010, 3, 6));

        // Theme Toggle Logic
        const btn = document.getElementById('theme-toggle');
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme) { document.documentElement.setAttribute('data-theme', currentTheme); }

        btn.addEventListener('click', () => {
            let theme = document.documentElement.getAttribute('data-theme');
            let newTheme = theme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });

        // Dynamic Project Counter
        fetch('projects.html')
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, 'text/html');
                const listCount = doc.querySelectorAll('ul li').length;
                document.getElementById('p-count').innerText = listCount + 42;
            });
    </script>
</body>
</html>
