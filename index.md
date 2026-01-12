---
layout: null
---
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="style.css">
    <title>About Me | EDDIE13S</title>
</head>
<body>

    <div class="custom-header">
        <div class="inner-header">
            <span>EDDIE13S</span>
            <div class="nav-links">
                <a href="index.html">About</a>
                <a href="projects.html">Projects (<span id="p-count">...</span>)</a>
                <button id="theme-toggle">Toggle Mode</button>
            </div>
        </div>
    </div>

    <div class="container">
        <h1>System.About(Eddie)</h1>
        <p><strong>Status:</strong> Cybersecurity Student</p>
        <p><strong>Age:</strong> {{ "now" | date: "%Y" | minus: 2010 }}</p>
        <p>My name is Eddie. I program software relating to cyber security. This site is hosted on GitHub Pages for maximum security and zero-database vulnerabilities.</p>
        
        <hr>
        <p>Currently overseeing <strong><span id="p-count-body">...</span></strong> active projects across all platforms.</p>
    </div>

    <script>
        // DARK MODE LOGIC
        const btn = document.getElementById('theme-toggle');
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme) { document.documentElement.setAttribute('data-theme', currentTheme); }

        btn.addEventListener('click', () => {
            let theme = document.documentElement.getAttribute('data-theme');
            let newTheme = theme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });

        // PROJECT COUNTER + 43
        fetch('projects.html')
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, 'text/html');
                const listCount = doc.querySelectorAll('ul li').length;
                const totalCount = listCount + 43; // Adding your 43 projects
                document.getElementById('p-count').innerText = totalCount;
                document.getElementById('p-count-body').innerText = totalCount;
            });
    </script>
</body>
</html>
