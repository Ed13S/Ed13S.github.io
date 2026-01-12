---
layout: null
---
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="style.css">
    <title>About Me | EDDIE13S</title>
</head>
<body>

    <div class="custom-header">
        <div class="inner-header">
            <span>EDDIE13S</span>
            <div class="nav-links">
                <a href="index.html">About me</a>
                <a href="projects.html">Projects (<span id="p-count">0</span>)</a>
                <a href="https://formspree.io/f/xykkyyjj">Feedback</a>
                <button id="theme-toggle">Dark Mode</button>
            </div>
        </div>
    </div>

    <div class="container">
        <h1>About Me</h1>
        <p>My name is Eddie, I am a cybersecurity student. I am {{ "now" | date: "%Y" | minus: 2010 }} years old. 
        I like to program software relating to cyber security. Feel free to check out my projects on the next page.</p>
        
        <p>Currently, I am tracking <span id="p-count-body">0</span> projects on this site.</p>
    </div>

    <script>
        // DARK MODE LOGIC
        const toggle = document.getElementById('theme-toggle');
        toggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', targetTheme);
            toggle.innerText = targetTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
        });

        // PROJECT COUNTER LOGIC
        // This fetches your projects page and counts the <li> tags!
        fetch('projects.html')
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, 'text/html');
                const count = doc.querySelectorAll('ul li').length;
                document.getElementById('p-count').innerText = count;
                document.getElementById('p-count-body').innerText = count;
            });
    </script>
</body>
</html>
