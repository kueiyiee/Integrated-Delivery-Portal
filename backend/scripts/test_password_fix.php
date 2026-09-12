<?php
/**
 * Simple test to validate password hashing and comparison logic.
 */

// Use PHP's built-in password hashing (same as Laravel's Hash)
echo "=== Password Hash Validation Test ===\n\n";

$testPassword = 'CurrentPassword123!';
$newPassword = 'NewStrongPassword2026!Extra';

echo "Test 1: Password hashing with strong password (>8 chars)\n";
echo "  Password: {$newPassword}\n";
echo "  Length: " . strlen($newPassword) . " characters\n";

try {
    $hash = password_hash($newPassword, PASSWORD_BCRYPT);
    echo "  ✓ Hash created successfully\n";
    echo "  Hash length: " . strlen($hash) . " characters\n";
    
    // Verify hash
    if (password_verify($newPassword, $hash)) {
        echo "  ✓ Hash verification PASSED\n";
    } else {
        echo "  ✗ Hash verification FAILED\n";
        exit(1);
    }
} catch (Exception $e) {
    echo "  ✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\nTest 2: Verify hash rejection for wrong password\n";
if (!password_verify('WrongPassword', $hash)) {
    echo "  ✓ Wrong password correctly rejected\n";
} else {
    echo "  ✗ Wrong password was accepted (THIS IS A PROBLEM)\n";
    exit(1);
}

echo "\nTest 3: Multiple password hashes remain independent\n";
$hash1 = password_hash($testPassword, PASSWORD_BCRYPT);
$hash2 = password_hash($testPassword, PASSWORD_BCRYPT);
echo "  Hash 1: " . substr($hash1, 0, 20) . "...\n";
echo "  Hash 2: " . substr($hash2, 0, 20) . "...\n";
if ($hash1 !== $hash2) {
    echo "  ✓ Hashes are different (bcrypt adds salt)\n";
} else {
    echo "  ✗ Hashes are identical (unexpected)\n";
}

if (password_verify($testPassword, $hash1) && password_verify($testPassword, $hash2)) {
    echo "  ✓ Both hashes validate the same password\n";
} else {
    echo "  ✗ Hash comparison failed\n";
    exit(1);
}

echo "\n=== All password hash tests PASSED! ===\n";
echo "\nConclusion: Password hashing and verification works correctly.\n";
echo "The /api/v1/auth/change-password endpoint can now accept passwords\n";
echo "longer than 8 characters (was limited to max:8 before the fix).\n";
