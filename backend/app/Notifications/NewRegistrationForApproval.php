<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewRegistrationForApproval extends Notification implements ShouldQueue
{
    use Queueable;

    protected $registrant;

    public function __construct($registrant)
    {
        $this->registrant = $registrant;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        $appName = config('app.name', 'Delivery Portal');
        $link = config('app.url') . '/admin/company-approvals';

        return (new MailMessage)
            ->subject("[{$appName}] New Registration Requires Approval")
            ->greeting('Hello,')
            ->line("A new company registration has been submitted by {$this->registrant->name} ({$this->registrant->email}).")
            ->line('Please review and approve or reject this registration in the System Administration Console.')
            ->action('Review Pending Registrations', $link)
            ->line('Thank you for securing the delivery portal.');
    }
}
