<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'slug' => $this->slug,
            'status' => $this->status,
            'company_code' => $this->company_code,
            'business_email' => $this->business_email,
            'phone' => $this->phone,
            'address' => $this->address,
            'about' => $this->about,
            'business_hours' => $this->business_hours,
            'social_links' => $this->social_links,
            'business_registration_number' => $this->business_registration_number,
            'tax_number' => $this->tax_number,
            'industry' => $this->industry,
            'country' => $this->country,
            'region' => $this->region,
            'subscription_status' => $this->subscription_status,
            'approval_status' => $this->approval_status,
            'approval_stage' => $this->approval_stage,
            'email_verified_at' => optional($this->email_verified_at)?->toISOString(),
            'admin_verified_at' => optional($this->admin_verified_at)?->toISOString(),
            'admin_verification_status' => $this->admin_verification_status,
            'admin_approval_status' => method_exists($this, 'getAdminApprovalStatus') ? $this->getAdminApprovalStatus() : ($this->admin_verification_status ?? $this->approval_status),
            'admin_verification_note' => $this->admin_verification_note,
            'admin_verified_by' => $this->admin_verified_by,
            'admin_verifier' => $this->whenLoaded('adminVerifier', function () {
                return [
                    'id' => $this->adminVerifier?->id,
                    'name' => $this->adminVerifier?->name,
                    'email' => $this->adminVerifier?->email,
                ];
            }),
            'created_at' => optional($this->created_at)?->toISOString(),
            'updated_at' => optional($this->updated_at)?->toISOString(),
            'deletion_type' => $this->deletion_type,
            'deletion_reason' => $this->deletion_reason,
            'metadata' => $this->metadata,
        ];
    }
}
