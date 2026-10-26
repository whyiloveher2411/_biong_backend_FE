import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import BeatVoiceSummary from './BeatVoiceSummary';
import { saydiVoiceCastRequest, fetchSaydiVoiceSamples } from './agentVideoApi';

jest.mock('./agentVideoApi', () => ({ saydiVoiceCastRequest: jest.fn(), fetchSaydiVoiceSamples:jest.fn(), saveSaydiVoiceManifest:jest.fn(), resolveSaydiVoicePreviewUrl:jest.fn() }));
const request = saydiVoiceCastRequest as jest.Mock;
const roles = { narrator: {}, rosa: {}, daniel: {} };
const rosa = { id: 'rosa', name: 'Rosa', description: 'Người chủ tiệm', voice_sample: 'sample-f' };
const narrator = { id: 'narrator', name: 'Người dẫn', description: 'Giọng ngoài hình', voice_sample: '' };
beforeEach(() => {request.mockReset();(fetchSaydiVoiceSamples as jest.Mock).mockReset();});

test('shows actual speaking roles including narrator; maintains distinct video-wide colors across beats', async () => {
    request.mockResolvedValueOnce({ success: true, config: { speakers: roles }, beat_voices: [narrator, rosa] })
        .mockResolvedValueOnce({ success: true, config: { speakers: roles }, beat_voices: [rosa] });
    const view = render(<BeatVoiceSummary shortVideoId={67} beatId="beat_1" />);
    const first = await screen.findByLabelText('Giọng đọc: Rosa (rosa)');
    const color = first.getAttribute('data-voice-color');
    expect(screen.getByLabelText('Giọng đọc: Người dẫn (narrator)').getAttribute('data-voice-color')).not.toBe(color);
    expect(request).toHaveBeenCalledWith(67, undefined, 'beat_1');
    view.rerender(<BeatVoiceSummary shortVideoId={67} beatId="beat_2" />);
    const second = await screen.findByLabelText('Giọng đọc: Rosa (rosa)');
    expect(second.getAttribute('data-voice-color')).toBe(color);
    expect(screen.queryByLabelText('Giọng đọc: Người dẫn (narrator)')).toBeNull();
});

test('switching beat rejects stale voice responses instead of showing previous beat speakers', async () => {
    let old: (r: unknown) => void = () => undefined;
    request.mockImplementationOnce(() => new Promise((r) => { old = r; }))
        .mockResolvedValueOnce({ success: true, config: { speakers: roles }, beat_voices: [rosa] });
    const view = render(<BeatVoiceSummary shortVideoId={67} beatId="beat_1" compact />);
    view.rerender(<BeatVoiceSummary shortVideoId={67} beatId="beat_2" compact />);
    await screen.findByLabelText('Giọng đọc: Rosa (rosa)');
    await act(async () => old({ success: true, config: { speakers: roles }, beat_voices: [narrator] }));
    expect(screen.queryByLabelText('Giọng đọc: Người dẫn (narrator)')).toBeNull();
});

test('does not imply no voices are used when loading fails', async () => {
    request.mockRejectedValue(new Error('Không tải được giọng'));
    render(<BeatVoiceSummary shortVideoId={67} beatId="beat_1" />);
    expect((await screen.findByRole('alert')).textContent).toContain('Không tải được giọng');
    expect(screen.queryByText('Beat chưa có ID giọng đọc.')).toBeNull();
});

jest.mock('components/molecules/DrawerCustom',()=>({__esModule:true,default:({open,children,title}:{open:boolean;children?:React.ReactNode;title?:React.ReactNode})=>open?<div role="dialog" aria-label={typeof title==='string'?title:undefined}>{children}</div>:null}));
type PickerProps=Pick<React.ComponentProps<typeof import('./ShortVideoAgentSaydiVoicePicker')['default']>,'samples'|'onSelect'|'defaultGender'>;
jest.mock('./ShortVideoAgentSaydiVoicePicker',()=>({__esModule:true,default:({samples,onSelect,defaultGender}:PickerProps)=><div><span>Filter: {defaultGender}</span>{samples.map(s=><button key={s.name} onClick={()=>void onSelect(s.name)}>Chọn {s.name}</button>)}</div>}));
test('voice shortcut opens the existing role drawer with gender filter and saves its Saydi sample',async()=>{
 let assigned='';
 request.mockImplementation((id:number,config?:{speakers:Record<string,{voice_sample:string}>},beatId?:string)=>{
  if(config)assigned=config.speakers.rosa.voice_sample;
  const full={enabled:true,speakers:{rosa:{name:'Rosa',description:'Chủ tiệm bánh',gender:'female',voice_sample:assigned}}};
  return Promise.resolve({success:true,manifest_ready:true,config:full,...(beatId?{beat_voices:[{...rosa,voice_sample:assigned}]}:{})});
 });
 (fetchSaydiVoiceSamples as jest.Mock).mockResolvedValue({success:true,samples:[{name:'sample-new',display_name:'Nữ'}],genders:['female'],languages:['en']});
 render(<BeatVoiceSummary shortVideoId={67} beatId="beat_1" compact/>);
 fireEvent.click(await screen.findByRole('button',{name:'Giọng đọc: Rosa (rosa)'}));
 await screen.findByRole('dialog',{name:'Giọng đọc: Rosa'});
 expect(await screen.findByText('Filter: female')).toBeTruthy();
 fireEvent.click(await screen.findByRole('button',{name:'Chọn sample-new'}));
 await waitFor(()=>expect(assigned).toBe('sample-new'));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
 expect(fetchSaydiVoiceSamples).toHaveBeenCalledWith(67,{forceRefresh:false});
});
