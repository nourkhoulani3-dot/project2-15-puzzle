<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Only POST requests are allowed.'
    ]);
    exit;
}

require_once __DIR__ . '/db.php';

$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody ?: '', true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid JSON request body.'
    ]);
    exit;
}

$playerName = trim((string)($data['player_name'] ?? ''));
$variantMode = trim((string)($data['variant_mode'] ?? ''));
$movesCount = filter_var($data['moves_count'] ?? null, FILTER_VALIDATE_INT);
$solveTime = filter_var($data['solve_time_seconds'] ?? null, FILTER_VALIDATE_INT);

$allowedModes = ['creatures', 'waves', 'bites'];

if (
    $playerName === '' ||
    strlen($playerName) > 50 ||
    !in_array($variantMode, $allowedModes, true) ||
    $movesCount === false ||
    $movesCount < 1 ||
    $solveTime === false ||
    $solveTime < 0
) {
    http_response_code(422);
    echo json_encode([
        'status' => 'error',
        'message' => 'Please provide valid score information.'
    ]);
    exit;
}

try {
    $pdo = getDatabaseConnection();

    $statement = $pdo->prepare(
        'INSERT INTO leaderboard_scores
        (player_name, variant_mode, moves_count, solve_time_seconds)
        VALUES (:player_name, :variant_mode, :moves_count, :solve_time_seconds)'
    );

    $statement->execute([
        ':player_name' => $playerName,
        ':variant_mode' => $variantMode,
        ':moves_count' => $movesCount,
        ':solve_time_seconds' => $solveTime
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Score recorded successfully.'
    ]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'The score could not be stored at this time.'
    ]);
}
