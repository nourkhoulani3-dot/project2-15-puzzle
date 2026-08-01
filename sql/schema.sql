CREATE TABLE IF NOT EXISTS leaderboard_scores (
    score_id INT AUTO_INCREMENT PRIMARY KEY,
    player_name VARCHAR(50) NOT NULL,
    variant_mode VARCHAR(30) NOT NULL,
    moves_count INT NOT NULL,
    solve_time_seconds INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_leaderboard (
        variant_mode,
        solve_time_seconds,
        moves_count
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
