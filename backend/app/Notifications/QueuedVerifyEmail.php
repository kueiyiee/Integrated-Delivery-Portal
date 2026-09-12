<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\URL;

class QueuedVerifyEmail extends VerifyEmail implements ShouldQueue
{
    use Queueable;

    public function __construct(protected ?string $token = null)
    {
    }

    public function toMail($notifiable): MailMessage
    {
        $verificationUrl = $this->verificationUrl($notifiable);

        $appName = config('app.name', 'Delivery Portal');
        $expiryMinutes = (int) config('auth.verification.expire', 1440);

        $supportEmail = config('platform.support_email', 'support@yourdomain.com');

        return (new MailMessage)
            ->subject("[{$appName}] Verify Your Email Address")
            ->greeting("Hello {$notifiable->name},")
            ->line("Thank you for registering with {$appName}. To complete your registration please verify your business email address by clicking the button below.")
            ->action('Verify Email Address', $verificationUrl)
            ->line('If the button above does not work, copy and paste the following URL into your browser:')
            ->line($verificationUrl)
            ->line('For your security, this link will expire in '.$expiryMinutes.' minutes.')
            ->line('After verifying your email address, your account will become active immediately and you will be able to log in to access your company dashboard. (Note: API Key generation and third-party integrations will remain locked until a system administrator approves your company.)')
            ->line('If you did not request this registration, no further action is required.')
            ->salutation('Regards, '. $appName . ' Security Team');
    }

    protected function verificationUrl($notifiable)
    {
        $expiry = now()->addMinutes(config('auth.verification.expire', 1440));
        $token = $this->token ?? $notifiable->beginEmailVerification();

        return URL::temporarySignedRoute(
            'api.v1.auth.verify-email',
            $expiry,
            ['id' => $notifiable->getKey(), 'hash' => sha1($notifiable->getEmailForVerification()), 'token' => $token]
        );
    }
}
