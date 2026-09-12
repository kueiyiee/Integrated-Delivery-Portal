<?php

namespace App\Notifications;

use App\Models\Company;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CompanyVerificationRejected extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(protected Company $company, protected ?User $administrator, protected ?string $note)
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

        return (new MailMessage)
            ->subject("[{$appName}] Company Verification Rejected")
            ->greeting("Hello {$this->company->name},")
            ->line('Your company verification request has been reviewed by the system administration team and was rejected.')
            ->line('Company: ' . $this->company->name)
            ->line('Business email: ' . $this->company->business_email)
            ->line('Registration number: ' . ($this->company->business_registration_number ?? 'N/A'))
            ->line('Verification status: Rejected')
            ->line('Reviewed by: ' . $adminName)
            ->line('Review date: ' . now()->setTimezone('Africa/Addis_Ababa')->format('l, d F Y • H:i:s') . ' EAT (UTC+03:00)')
            ->line('Reason for rejection:')
            ->line($this->note ?? 'Not provided')
            ->line('If you believe this is an error, please respond to the platform administrator with the details requested.')
            ->salutation('Regards, ' . $appName . ' Team');
    }
}
