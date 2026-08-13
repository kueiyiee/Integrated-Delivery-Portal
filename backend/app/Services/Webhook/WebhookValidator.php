<?php

namespace App\Services\Webhook;

use InvalidArgumentException;

class WebhookValidator
{
    /**
     * Validate a webhook URL for safe public delivery.
     * Throws InvalidArgumentException on invalid.
     */
    public function validateUrl(string $url, string $environment = 'production'): void
    {
        $parts = parse_url(trim($url));
        if ($parts === false || empty($parts['host']) || empty($parts['scheme'])) {
            throw new InvalidArgumentException('Invalid URL format.');
        }

        $scheme = strtolower($parts['scheme']);
        if (! in_array($scheme, ['http', 'https'], true)) {
            throw new InvalidArgumentException('Unsupported URL protocol. Only HTTP/HTTPS are allowed.');
        }

        // In production require HTTPS
        if ($environment === 'production' && $scheme !== 'https') {
            throw new InvalidArgumentException('Only HTTPS endpoints are allowed for production webhooks.');
        }

        $host = $parts['host'];

        // Reject obvious local hostnames
        $lower = strtolower($host);
        if ($lower === 'localhost' || $lower === '127.0.0.1' || $lower === '::1') {
            throw new InvalidArgumentException('Localhost or loopback addresses are not allowed.');
        }

        // If host is IP literal, check for private/reserved ranges
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            if (! filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                throw new InvalidArgumentException('IP address is private or reserved and cannot be used for webhooks.');
            }
            return;
        }

        // Resolve DNS entries (A and AAAA) and ensure no private ranges
        $addresses = [];
        $a = gethostbynamel($host);
        if (is_array($a)) {
            $addresses = array_merge($addresses, $a);
        }

        if (function_exists('dns_get_record')) {
            $aaaa = dns_get_record($host, DNS_AAAA);
            if (is_array($aaaa)) {
                foreach ($aaaa as $rr) {
                    if (! empty($rr['ipv6'])) {
                        $addresses[] = $rr['ipv6'];
                    }
                }
            }
        }

        if (empty($addresses)) {
            // If we couldn't resolve, be conservative
            throw new InvalidArgumentException('Could not resolve hostname for webhook URL.');
        }

        foreach ($addresses as $addr) {
            if (! filter_var($addr, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                throw new InvalidArgumentException('Resolved address for host is private or reserved.');
            }
        }

        // Optionally follow one redirect (HEAD) to ensure final location is also safe
        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_NOBODY, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
            $res = curl_exec($ch);
            if ($res !== false) {
                $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $location = curl_getinfo($ch, CURLINFO_REDIRECT_URL) ?: curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
                if ($location && $location !== $url) {
                    // recursively validate final URL but avoid infinite recursion by forcing a simple check
                    $parts2 = parse_url($location);
                    if ($parts2 && ! empty($parts2['host'])) {
                        $host2 = $parts2['host'];
                        if (filter_var($host2, FILTER_VALIDATE_IP)) {
                            if (! filter_var($host2, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                                throw new InvalidArgumentException('Webhook redirects to a private or reserved address.');
                            }
                        } else {
                            $resolved = gethostbynamel($host2) ?: [];
                            foreach ($resolved as $r) {
                                if (! filter_var($r, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                                    throw new InvalidArgumentException('Webhook redirects to a private or reserved address.');
                                }
                            }
                        }
                    }
                }
            }
            curl_close($ch);
        }
    }
}
