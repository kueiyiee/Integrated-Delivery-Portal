<?php
$in = __DIR__ . '/../database/schema/mysql-schema.sql';
$out = __DIR__ . '/../database/schema/mysql-schema.stripped.sql';
if (! file_exists($in)) {
    echo "Input schema not found: $in\n";
    exit(1);
}
$lines = file($in, FILE_IGNORE_NEW_LINES);
$outLines = [];
foreach ($lines as $line) {
    $trim = ltrim($line);
    if (str_starts_with($trim, '/*!') && (str_contains($trim, 'SQL_NOTES') || str_contains($trim, 'OLD_SQL_NOTES'))) {
        // skip only the conditional comment lines that reference SQL_NOTES which cause errors on some MySQL builds
        continue;
    }
    $outLines[] = $line;
}
file_put_contents($out, implode("\n", $outLines));
echo "Sanitized schema written to: $out\n";
