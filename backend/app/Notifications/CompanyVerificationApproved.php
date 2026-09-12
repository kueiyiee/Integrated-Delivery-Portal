<?php

namespace App\Notifications;

use App\Models\Company;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CompanyVerificationApproved extends Notification implements ShouldQueue
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
            ->subject("[{$appName}] Company Verification Approved")
            ->greeting("Hello {$this->company->name},")
            ->line('Your company verification has been approved by our system administration team.')
            ->line('Company: ' . $this->company->name)
            ->line('Business email: ' . $this->company->business_email)
            ->line('Registration number: ' . ($this->company->business_registration_number ?? 'N/A'))
            ->line('Verification status: Verified')
            ->line('Approved by: ' . $adminName)
            ->line('Approval date: ' . now()->setTimezone('Africa/Addis_Ababa')->format('l, d F Y • H:i:s') . ' EAT (UTC+03:00)')
            ->line('What this means: once the user who registered your company has verified their email address they will be able to sign in. If the registrant has not yet verified their email, please ask them to check their inbox for the verification link or request a new one via the sign-in page.')
            ->line("If you need assistance or would like us to verify the email on your behalf, contact support at {$supportEmail}.")
            ->salutation('Regards, ' . $appName . ' Team');
    }
}
