import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import ShortVideoAgentSaydiVoicePicker from './ShortVideoAgentSaydiVoicePicker';

jest.mock('./agentVideoApi', () => ({ resolveSaydiVoicePreviewUrl: () => '/sample.mp3' }));
jest.mock('./ShortVideoAgentOmnivoiceVoicePicker', () => ({ voiceAvatarColor: () => '#123456', voiceInitials: () => 'V' }));
const samples: React.ComponentProps<typeof ShortVideoAgentSaydiVoicePicker>['samples'] = [
    { name: 'sample-m', display_name: 'Male sample', gender: 'male', language: 'en' },
    { name: 'sample-f', display_name: 'Female sample', gender: 'female', language: 'en' },
];
const base = { samples, genders: ['male','female'], languages: ['en'], selectedVoice: '', onSelect: jest.fn(), onPlayPreview: jest.fn() };

test('opens with the declared gender and resets correctly when the speaking role changes', async () => {
    const { rerender } = render(<ShortVideoAgentSaydiVoicePicker {...base} defaultGender="female" />);
    expect(screen.getByText('Female sample')).toBeTruthy();
    expect(screen.queryByText('Male sample')).toBeNull();
    rerender(<ShortVideoAgentSaydiVoicePicker {...base} defaultGender="male" />);
    await waitFor(() => expect(screen.getByText('Male sample')).toBeTruthy());
    expect(screen.queryByText('Female sample')).toBeNull();
});

test('unknown/legacy vocal gender shows all samples without guessing names', () => {
    render(<ShortVideoAgentSaydiVoicePicker {...base} defaultGender="all" />);
    expect(screen.getByText('Male sample')).toBeTruthy();
    expect(screen.getByText('Female sample')).toBeTruthy();
});

test('does not silently remove the desired filter when the API has no matching gender', () => {
    render(<ShortVideoAgentSaydiVoicePicker {...base} samples={[samples[0]]} genders={['male']} defaultGender="female" />);
    expect(screen.getByText('0/1 giọng')).toBeTruthy();
    expect(screen.queryByText('Male sample')).toBeNull();
});

test('labels the assigned role, blocks duplicate selection, keeps preview and own selection available', () => {
    const onSelect = jest.fn(), onPlayPreview = jest.fn();
    render(<ShortVideoAgentSaydiVoicePicker {...base} onSelect={onSelect} onPlayPreview={onPlayPreview} currentSpeakerId="giong-daniel"
        voiceAssignments={{ 'sample-f': [{ speakerId: 'giong-rosa', name: 'Rosa' }], 'sample-m': [{ speakerId: 'giong-daniel', name: 'Daniel' }] }} />);
    expect(screen.getByText('Đã gán cho: Rosa (giong-rosa)')).toBeTruthy();
    expect(screen.getByText('Đang dùng cho: Daniel (giong-daniel)')).toBeTruthy();
    fireEvent.click(screen.getByText('Female sample'));
    expect(onSelect).not.toHaveBeenCalled();
    const assignedRow = screen.getByText('Female sample').closest('[role="button"]') as HTMLElement;
    fireEvent.click(within(assignedRow).getByRole('button', { name: 'Nghe thử' }));
    expect(onPlayPreview).toHaveBeenCalledWith(samples[1]);
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Male sample'));
    expect(onSelect).toHaveBeenCalledWith('sample-m');
});
