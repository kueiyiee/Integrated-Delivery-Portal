<?php
$host = '127.0.0.1';
$port = 3306;
$db = 'delivery_portal';
$user = 'root';
$pass = '';
$schemaFile = __DIR__ . '/../database/schema/mysql-schema.sql';

if (! file_exists($schemaFile)) {
    echo "Schema file not found: $schemaFile\n";
    exit(1);
}

$mysqli = new mysqli($host, $user, $pass, $db, $port);
if ($mysqli->connect_errno) {
    echo "Connect failed: ({$mysqli->connect_errno}) {$mysqli->connect_error}\n";
    exit(1);
}

$sql = file_get_contents($schemaFile);
if ($sql === false) {
    echo "Failed to read schema file\n";
    exit(1);
}

// Execute multi-statement SQL
if ($mysqli->multi_query($sql)) {
    do {
        if ($result = $mysqli->store_result()) {
            $result->free();
        }
    } while ($mysqli->more_results() && $mysqli->next_result());

    if ($mysqli->errno) {
        echo "Finished with errors: ({$mysqli->errno}) {$mysqli->error}\n";
        exit(1);
    }

    echo "Schema imported successfully into '{$db}'.\n";
    exit(0);
} else {
    echo "Import failed: ({$mysqli->errno}) {$mysqli->error}\n";
    exit(1);
}
