<?php

$data = json_encode(['email' => 'systemadmin@d.com', 'password' => 'Adminsite@21']);
$opts = ['http' => ['method' => 'POST', 'header' => "Content-Type: application/json\r\n", 'content' => $data]];
$res = @file_get_contents('http://localhost/api/v1/auth/login', false, stream_context_create($opts));
if ($res === false) {
    echo "LOGIN_REQUEST_FAILED\n";
    exit(1);
}

echo $res . "\n";

$obj = json_decode($res, true);
if (isset($obj['token'])) {
    $token = $obj['token'];
    $opts2 = ['http' => ['method' => 'GET', 'header' => "Authorization: Bearer $token\r\n"]];
    $me = @file_get_contents('http://localhost/api/v1/auth/me', false, stream_context_create($opts2));
    if ($me === false) {
        echo "ME_REQUEST_FAILED\n";
        exit(2);
    }
    echo "---ME---\n" . $me . "\n";
} else {
    echo "NO_TOKEN_RETURNED\n";
    exit(3);
}
