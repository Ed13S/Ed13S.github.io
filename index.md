:root {
    --bg-color: #e0d7ff; 
    --text-color: blue;
    --border-color: blue;
}

[data-theme="dark"] {
    --bg-color: #1a0033; 
    --text-color: #00eaff;
    --border-color: #00eaff;
}

body {
    font-family: monospace;
    background-color: var(--bg-color);
    color: var(--text-color);
    margin: 0;
    padding: 0;
    line-height: 1.6;
    transition: 0.3s;
    min-height: 100vh; /* Ensures purple covers the whole screen even if page is short */
}

.custom-header {
    border: 3px solid var(--border-color);
    padding: 10px;
    margin: 20px;
}

.inner-header {
    border: 2px solid var(--border-color);
    padding: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: bold;
}

.nav-links a, #theme-toggle {
    color: var(--border-color);
    text-decoration: none;
    margin-left: 15px;
    background: none;
    border: 1px solid var(--border-color);
    padding: 5px 10px;
    cursor: pointer;
    font-family: monospace;
}

.container {
    max-width: 800px;
    margin: 40px auto;
    padding: 0 20px;
}
