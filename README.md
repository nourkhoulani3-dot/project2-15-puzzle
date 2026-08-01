# Creatures, Waves & Bites — 15 Puzzle

## Course
CSC 4370/6370 — Web Programming  
Project 2 — Summer 2026 Final Project

## Team
- Hayley Vu
- Nour Khoulani

## Project Summary
This project is a responsive, full-stack implementation of the classic 15 Puzzle. It contains three themed modes:

1. Creatures Mode
2. Waves Mode
3. Bites Mode

The board is represented by a one-dimensional JavaScript array containing values 1–15 and 0 for the empty position.

## Features
- Guaranteed-solvable shuffle using 240 valid moves
- Tile movement validation
- Timer and move counter
- Three-use Magic Hint feature
- Hold-to-preview completed board
- Day/Night theme toggle
- Keyboard controls
- Responsive CSS Grid and Flexbox layout
- PHP JSON API
- MySQL persistent leaderboard
- Prepared statements and server-side validation
- localStorage fallback when the backend is unavailable
- Session analytics

## Folder Structure
```text
15_puzzle_final_project/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
├── assets/
│   ├── creatures.svg
│   ├── waves.svg
│   └── bites.svg
├── api/
│   ├── db.php
│   ├── score.php
│   └── leaderboard.php
├── sql/
│   └── schema.sql
└── README.md
```

## Local Testing
PHP must serve the project because the leaderboard endpoints are PHP files.

From inside the project folder:

```bash
php -S localhost:8000
```

Then open:

```text
http://localhost:8000
```

The game still works without a database. Scores will use localStorage if the PHP/MySQL connection is unavailable.

## Database Setup on CODD
1. Log in through SSH.
2. Open the MySQL command-line client.
3. Select your assigned database.
4. Run the commands inside `sql/schema.sql`.
5. Edit `api/db.php` with the assigned database name, username, and password.
6. Upload the full project folder to `public_html`.
7. Test `api/leaderboard.php?mode=creatures`.

## Security
- PDO prepared statements
- Server-side input validation
- Mode allowlist
- Integer validation
- JSON request/response format
- Generic server error responses

## Keyboard Controls
Use the arrow keys to move a tile into the empty space.

## AI Disclosure
AI tools were used to assist with project organization, code drafting, debugging support, and documentation. The team reviewed, tested, and adapted the final implementation.
