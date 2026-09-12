<?php
$in = __DIR__ . '/../database/schema/mysql-schema.sql.bak';
$out = __DIR__ . '/../database/schema/mysql-schema.clean.sql';
if (! file_exists($in)) {
    echo "Input schema not found: $in\n";
    exit(1);
}
$content = file_get_contents($in);
// Remove occurrences of OLD_SQL_NOTES and SQL_NOTES directives
$content = preg_replace('/\/\*!\d+\s+SET\s+@?OLD_SQL_NOTES=.*?\*\//s', '', $content);
$content = preg_replace('/\/\*!\d+\s+SET\s+SQL_NOTES=.*?\*\//s', '', $content);
file_put_contents($out, $content);
echo "Wrote cleaned schema to: $out\n";
exit(0);
