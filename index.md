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
                <a href="projects.html">Projects</a>
                <a href="https://formspree.io/f/xykkyyjj">Feedback</a>
            </div>
        </div>
    </div>

    <div class="container">
        <h1>About Me</h1>
        <p>My name is Eddie, I am a cybersecurity student. I am {{ "now" | date: "%Y" | minus: 2010 }} years old. 
        I like to program software relating to cyber security. Feel free to check out my projects on the next page or visit my other website.</p>
        
        <p>I focus on building secure tools and learning the mechanics of network defense.</p>
        
        <hr>
        <p>Find more at my <a href="https://eddie13s.wordpress.com">WordPress Blog</a>.</p>
    </div>

</body>
</html>
