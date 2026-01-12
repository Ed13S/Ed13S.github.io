---
layout: null
---
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="style.css">
    <title>Projects | EDDIE13S</title>
</head>
<body>

    <div class="custom-header">
        <div class="inner-header">
            <span>EDDIE13S</span>
            <div class="nav-links">
                <a href="index.html">About me</a>
                <a href="projects.html">Projects</a>
                <a href="https://formspree.io/f/xykkyyjj">Feedback</a>
                <button id="theme-toggle">Dark Mode</button>
            </div>
        </div>
    </div>

    <div class="container">
        <h1>My Projects</h1>
        <ul>
            <li><strong>Scratch Profile(43 Projects):</strong> <a href="https://tinyurl.com/Siaoq1">View Profile</a></li>
            <li><strong>Idle Website:</strong> <a href="https://tinyurl.com/Idle-website">Visit Site</a></li>
        </ul>
    </div>

    <script>
        const toggle = document.getElementById('theme-toggle');
        toggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', targetTheme);
            toggle.innerText = targetTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
        });
    </script>
</body>
</html>
