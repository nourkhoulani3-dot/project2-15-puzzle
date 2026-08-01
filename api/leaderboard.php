<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Only GET requests are allowed.'
    ]);
    exit;
}

require_once __DIR__ . '/db.php';

$mode = trim((string)($_GET['mode'] ?? 'creatures'));
$allowedModes = ['creatures', 'waves', 'bites'];

if (!in_array($mode, $allowedModes, true)) {
    http_response_code(422);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid puzzle mode.'
    ]);
    exit;
}

try {
    $pdo = getDatabaseConnection();

    $statement = $pdo->prepare(
        'SELECT
            score_id,
            player_name,
            variant_mode,
            moves_count,
            solve_time_seconds,
            created_at
         FROM leaderboard_scores
         WHERE variant_mode = :variant_mode
         ORDER BY solve_time_seconds ASC, moves_count ASC
         LIMIT 10'
    );

    $statement->execute([
        ':variant_mode' => $mode
    ]);

    echo json_encode($statement->fetchAll());
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'The leaderboard is temporarily unavailable.'
    ]);
}
