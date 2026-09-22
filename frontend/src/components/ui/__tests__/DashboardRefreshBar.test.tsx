import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardRefreshBar } from '../DashboardRefreshBar';

describe('DashboardRefreshBar', () => {
  it('renders with status and refresh button', () => {
    const onRefresh = vi.fn();
    const onToggleAutoRefresh = vi.fn();

    render(
      <DashboardRefreshBar
        loading={false}
        error={null}
        lastUpdated="2026-07-13T12:34:00.000Z"
        statusLabel="Live data"
        onRefresh={onRefresh}
        autoRefreshEnabled={false}
        onToggleAutoRefresh={onToggleAutoRefresh}
      />,
    );

    expect(screen.getByText('Live data')).toBeInTheDocument();
    expect(screen.getByText('Last updated: 12:34')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Refresh now/i }));
    expect(onRefresh).toHaveBeenCalled();
  });
});
