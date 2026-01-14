'use client';

import React from 'react';

export interface TurboPhoneCardProps {
  phoneNumberId?: string | null;
  settingsPhoneNumberId?: string | null;
}

export function TurboPhoneCard({
  phoneNumberId,
  settingsPhoneNumberId,
}: TurboPhoneCardProps) {
  return (
    <div className="bg-zinc-900/40 border border-white/10 rounded-xl p-4">
      <div className="text-xs text-gray-500">Phone Number ID</div>
      <div className="mt-2 text-sm text-white font-mono break-all">
        {phoneNumberId || settingsPhoneNumberId || '-'}
      </div>
    </div>
  );
}
