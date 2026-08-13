<?php

namespace App\Notifications;

use App\Models\Company;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CompanyEmailVerifiedByAdmin extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(protected Company $company, protected ?User $administrator)
    {
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $appName = config('app.name', 'Delivery Portal');
        $adminName = $this->administrator?->name ?? 'System Administrator';
        $supportEmail = config('platform.support_email', 'support@yourdomain.com');

        return (new MailMessage)
            ->subject("[{$appName}] Email Verified by Administrator")
            ->greeting("Hello {$this->company->name},")
            ->line('An administrator has verified the business email address associated with your company registration.')
            ->line('Company: ' . $this->company->name)
            ->line('Business email: ' . $this->company->business_email)
            ->line('If your account has already been approved by an administrator, you can now sign in. If you are still unable to sign in, please contact your administrator or reach out to support at ' . $supportEmail . '.')
            ->salutation('Regards, ' . $appName . ' Team');
    }
}
