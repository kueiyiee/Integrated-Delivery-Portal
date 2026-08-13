import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ToastProvider } from '../../../components/ui/ToastProvider';
import CompanySettingsPage from '../CompanySettingsPage';

const { fetchCompany, updateCompany, deleteCompanyLogo, updateCompanyPassword } = vi.hoisted(() => ({
  fetchCompany: vi.fn(),
  updateCompany: vi.fn(),
  deleteCompanyLogo: vi.fn(),
  updateCompanyPassword: vi.fn(),
}));

vi.mock('../../../services/client', () => ({
  fetchCompany,
  updateCompany,
  deleteCompanyLogo,
  updateCompanyPassword,
}));

describe('CompanySettingsPage logo persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchCompany.mockResolvedValue({
      id: 7,
      name: 'Acme Logistics',
      business_email: 'hello@acme.example',
      phone: '15555555555',
      address: '1 Market Street',
      about: 'Delivery logistics',
      social_links: { website: 'https://acme.example' },
      logo_url: '/storage/company_logos/acme.png',
      metadata: { company_logo_url: '/storage/company_logos/acme.png' },
      primary_contact: null,
    });
    updateCompany.mockResolvedValue({
      id: 7,
      name: 'Acme Logistics',
      business_email: 'hello@acme.example',
      phone: '15555555555',
      address: '1 Market Street',
      about: 'Delivery logistics',
      social_links: { website: 'https://acme.example' },
      logo_url: '/storage/company_logos/acme.png',
      metadata: { company_logo_url: '/storage/company_logos/acme.png' },
      primary_contact: null,
    });
    deleteCompanyLogo.mockResolvedValue({
      id: 7,
      name: 'Acme Logistics',
      metadata: {},
    });
    updateCompanyPassword.mockResolvedValue({ message: 'Password updated.' });
  });

  it('keeps the saved company logo visible right after a successful save', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <CompanySettingsPage />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(fetchCompany).toHaveBeenCalledTimes(1));

    await waitFor(() => expect(screen.getByAltText('Company logo')).toBeInTheDocument());

    expect(screen.getByAltText('Company logo')).toHaveAttribute('src', expect.stringContaining('/storage/company_logos/acme.png'));
  });
});
