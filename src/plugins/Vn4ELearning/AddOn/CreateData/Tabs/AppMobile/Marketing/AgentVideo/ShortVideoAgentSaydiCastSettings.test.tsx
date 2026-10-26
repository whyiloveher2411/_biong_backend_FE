import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ShortVideoAgentSaydiCastSettings from './ShortVideoAgentSaydiCastSettings';
import { saydiVoiceCastRequest, fetchSaydiVoiceSamples, saveSaydiVoiceManifest } from './agentVideoApi';

type DrawerMockProps = {open: boolean; children?: React.ReactNode; title?: React.ReactNode};
type PickerMockProps = Pick<React.ComponentProps<typeof import('./ShortVideoAgentSaydiVoicePicker')['default']>, 'samples' | 'onSelect' | 'loading' | 'defaultGender'>;

jest.mock('./agentVideoApi', () => ({ saydiVoiceCastRequest: jest.fn(), fetchSaydiVoiceSamples: jest.fn(), saveSaydiVoiceManifest: jest.fn(), resolveSaydiVoicePreviewUrl: jest.fn() }));
jest.mock('components/molecules/DrawerCustom', () => ({ __esModule: true, default: ({ open, children, title }: DrawerMockProps) => open ? <div role="dialog" aria-label={typeof title === 'string' ? title : undefined}>{children}</div> : null }));
jest.mock('./ShortVideoAgentSaydiVoicePicker', () => ({ __esModule: true, default: ({ samples, onSelect, loading, defaultGender }: PickerMockProps) => <div><span data-testid="automatic-gender">{defaultGender}</span>{loading ? 'Đang tải danh mục' : samples.map((s) => <button key={s.name} onClick={() => void onSelect(s.name)}>Chọn {s.name}</button>)}</div> }));
const request = saydiVoiceCastRequest as jest.Mock;
const fetchSamples = fetchSaydiVoiceSamples as jest.Mock;
const config = { enabled: true, speakers: { 'giong-dan-truyen': { name: 'Người dẫn', voice_sample: '', description: 'Người dẫn truyện ngoài hình' }, 'giong-tom': { name: 'Tom', voice_sample: '', description: 'Tom là người chủ của chó' } } };
beforeEach(() => { request.mockReset(); fetchSamples.mockReset(); (saveSaydiVoiceManifest as jest.Mock).mockReset(); });

test('discovers speech IDs before any assignment, fetches Saydi only after setting click, saves one role with others unassigned', async () => {
    const next = { ...config, speakers: { ...config.speakers, 'giong-tom': { ...config.speakers['giong-tom'], voice_sample: 'voice-h' } } };
    request.mockResolvedValue({ success: true, config: next }).mockResolvedValueOnce({ success: true, config }).mockResolvedValueOnce({ success: true, config: next });
    fetchSamples.mockResolvedValue({ success: true, samples: [{ name: 'voice-h', display_name: 'Nam' }], genders: ['male'], languages: ['en'] });
    render(<ShortVideoAgentSaydiCastSettings shortVideoId={67} disabled={false} />);
    await screen.findByText('giong-tom');
    expect(fetchSamples).not.toHaveBeenCalled();
    expect(screen.queryByText('Thêm nhân vật / giọng')).toBeNull();
    fireEvent.click(screen.getByLabelText('Cài đặt giọng giong-tom'));
    await screen.findByRole('dialog');
    fireEvent.click(await screen.findByText('Chọn voice-h'));
    await waitFor(() => expect(request).toHaveBeenCalledWith(67, next));
    expect(fetchSamples).toHaveBeenCalledWith(67, { forceRefresh: false });
    await screen.findByText(/Đã lưu giọng/);
});

test('does not create a role for an unlabelled or visual-only character', async () => {
    request.mockResolvedValue({ success: true, config: { enabled: false, speakers: {} } });
    render(<ShortVideoAgentSaydiCastSettings shortVideoId={68} />);
    await screen.findByText('Chưa có ID lời đọc trong kịch bản đã lưu.');
    expect(screen.queryByText('Cài đặt giọng')).toBeNull();
    expect(fetchSamples).not.toHaveBeenCalled();
});

test('script revision refreshes actual roles and removes a speaker no longer present', async () => {
    request.mockResolvedValueOnce({ success: true, config }).mockResolvedValueOnce({ success: true, config: { enabled: true, speakers: { 'giong-con-cho': { name: 'Con chó', voice_sample: '' } } } });
    const { rerender } = render(<ShortVideoAgentSaydiCastSettings shortVideoId={69} revision="old" />);
    await screen.findByText('giong-tom');
    rerender(<ShortVideoAgentSaydiCastSettings shortVideoId={69} revision="new" />);
    await screen.findByText('giong-con-cho');
    expect(screen.queryByText('giong-tom')).toBeNull();
});

test('voice JSON import exposes descriptions only after a matching save and rejects mismatch', async () => {
    const unresolved = { enabled: true, speakers: { 'giong-tom': { name: 'tom', voice_sample: '', description: '' } } };
    request.mockResolvedValue({ success: true, config: unresolved, manifest_ready: false });
    (saveSaydiVoiceManifest as jest.Mock).mockResolvedValueOnce({ success: false, message: 'JSON không khớp kịch bản. Thiếu: giong-tom' }).mockResolvedValueOnce({ success: true, manifest_ready: true, config });
    render(<ShortVideoAgentSaydiCastSettings shortVideoId={70} />);
    await screen.findByText('giong-tom');
    expect((screen.getByLabelText('Cài đặt giọng giong-tom') as HTMLButtonElement).disabled).toBe(true);
    // JSON mặc định thu gọn để không chiếm chỗ; bấm tiêu đề mới mở.
    expect(screen.queryByRole('textbox', { name: 'Danh sách giọng (JSON)' })).toBeNull();
    fireEvent.click(screen.getByLabelText('Mở rộng danh sách giọng JSON'));
    fireEvent.change(screen.getByLabelText('Danh sách giọng (JSON)'), { target: { value: '{"voices":[]}' } });
    fireEvent.click(screen.getByText('Lưu danh sách giọng JSON'));
    await screen.findByText('JSON không khớp kịch bản. Thiếu: giong-tom');
    expect(fetchSamples).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Danh sách giọng (JSON)'), { target: { value: JSON.stringify({ voices: [{ id: 'giong-tom', description: 'Tom là người chủ của chó' }] }) } });
    fireEvent.click(screen.getByText('Lưu danh sách giọng JSON'));
    await screen.findByText('Tom là người chủ của chó');
    expect((screen.getByLabelText('Cài đặt giọng giong-tom') as HTMLButtonElement).disabled).toBe(false);
});

test('background auto reload keeps the voice list visible instead of flashing a loading state', async () => {
    jest.useFakeTimers();
    try {
        let resolveRefresh: ((value: unknown) => void) | undefined;
        request.mockResolvedValueOnce({ success: true, config }).mockImplementationOnce(() => new Promise((resolve) => { resolveRefresh = resolve; }));
        render(<ShortVideoAgentSaydiCastSettings shortVideoId={71} />);
        await act(async () => { await Promise.resolve(); });
        expect(screen.getByText('giong-tom')).toBeInTheDocument();
        act(() => { jest.advanceTimersByTime(10000); });
        expect(screen.getByText('giong-tom')).toBeInTheDocument();
        expect(screen.queryByText('Đang quét kịch bản đã lưu…')).toBeNull();
        await act(async () => { resolveRefresh?.({ success: true, config }); });
        expect(screen.getByText('giong-tom')).toBeInTheDocument();
        expect(screen.queryByText('Đang quét kịch bản đã lưu…')).toBeNull();
    } finally {
        jest.useRealTimers();
    }
});

test('role drawer receives explicit gender metadata rather than guessing it from a name', async () => {
    const declared = { ...config, speakers: { ...config.speakers, 'giong-tom': { ...config.speakers['giong-tom'], gender: 'female' } } };
    request.mockResolvedValue({ success: true, config: declared, manifest_ready: true });
    fetchSamples.mockResolvedValue({ success: true, samples: [], genders: ['male', 'female'], languages: ['en'] });
    render(<ShortVideoAgentSaydiCastSettings shortVideoId={71} />);
    await screen.findByText('giong-tom');
    fireEvent.click(screen.getByLabelText('Cài đặt giọng giong-tom'));
    expect(screen.getByTestId('automatic-gender').textContent).toBe('female');
});

test('guards against selecting a sample already assigned to another speaking role before saving', async () => {
    const assigned = { ...config, speakers: { ...config.speakers, 'giong-dan-truyen': { ...config.speakers['giong-dan-truyen'], voice_sample: 'voice-taken' } } };
    request.mockResolvedValue({ success: true, config: assigned, manifest_ready: true });
    fetchSamples.mockResolvedValue({ success: true, samples: [{ name: 'voice-taken', display_name: 'Existing voice' }], genders: [], languages: ['en'] });
    render(<ShortVideoAgentSaydiCastSettings shortVideoId={72} />);
    await screen.findByText('giong-tom');
    fireEvent.click(screen.getByLabelText('Cài đặt giọng giong-tom'));
    fireEvent.click(await screen.findByText('Chọn voice-taken'));
    expect(screen.getAllByText(/Giọng này đã gán cho Người dẫn/).length).toBeGreaterThan(0);
    expect(request.mock.calls.every((args) => args.length === 1)).toBe(true);
});
