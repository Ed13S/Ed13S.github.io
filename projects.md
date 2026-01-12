---
layout: null
---
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="style.css">
    <link rel="icon" href="https://img.icons8.com/color/48/security-shield.png" type="image/png">
    <title>Projects | EDDIE13S</title>
</head>
<body>

    <div class="custom-header">
        <div class="inner-header">
            <span>EDDIE13S</span>
            <div class="nav-links">
                <a href="index.html">About me</a>
                <a href="projects.html">Projects</a>
                <button id="theme-toggle">Toggle Mode</button>
            </div>
        </div>
    </div>

    <div class="container">
        <ul>
            <li><strong>Scratch Profile(43 projects):</strong> <a href="https://tinyurl.com/Siaoq1">View Profile</a></li>
            <li><strong>Idle Website:</strong> <a href="https://tinyurl.com/Idle-website">Visit Site</a></li>
        </ul>
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
