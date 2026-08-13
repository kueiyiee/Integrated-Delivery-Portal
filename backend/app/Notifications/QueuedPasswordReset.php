<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\URL;

class QueuedPasswordReset extends ResetPasswordNotification implements ShouldQueue
{
    use Queueable;

    public function toMail($notifiable): MailMessage
    {
        $appName = config('app.name', 'Delivery Portal');
        $resetUrl = $this->buildResetUrl($notifiable);

        return (new MailMessage)
            ->subject("[{$appName}] Reset Your Password")
            ->greeting("Hello {$notifiable->name},")
            ->line('We received a request to reset the password for your account.')
            ->line('Use the button below to securely choose a new password for your Delivery Portal account.')
            ->action('Reset Password', $resetUrl)
            ->line('If the button does not work, copy and paste the following URL into your browser:')
            ->line($resetUrl)
            ->line('If you did not request this change, you can safely ignore this message.')
            ->line('For your security, this link will expire in 60 minutes.')
            ->salutation('Regards, ' . $appName . ' Security Team');
    }

    protected function buildResetUrl($notifiable): string
    {
        $frontendBase = rtrim(config('app.frontend_url', config('app.url', 'http://localhost:5173')), '/');
        $token = $this->token;

        return $frontendBase . '/reset-password?email=' . urlencode($notifiable->getEmailForPasswordReset()) . '&token=' . urlencode($token);
    }
}
