import React from 'react';
import {Accordion, AccordionSummary, AccordionDetails, Alert, Box, Button, Divider, MenuItem, Stack, TextField, Typography} from '@mui/material';
import {newStoryV2, parseStoryV2, spokenStoryItems, StoryV2, StoryItemType} from './storyV2';
import ShortVideoRemotionPlayer from '../ShortVideoRemotionPlayer';
import {buildShortVideoRenderManifest} from 'helpers/marketingShortVideoManifestApi';
import type {ShortVideoRenderManifest} from 'helpers/shortVideoRenderManifest';
import StoryV2Preview from './StoryV2Preview';
import {fetchSaydiVoiceSamples, resolveSaydiVoicePreviewUrl, type SaydiVoiceSampleItem, storyV2Request} from './agentVideoApi';

const labels: Record<StoryItemType, string> = {narration: 'Người dẫn — đọc', dialogue: 'Nhân vật — đọc', screen_text: 'Chữ trên màn hình — không đọc', action: 'Hành động — không đọc, không hiện chữ'};
type Props = {shortVideoId: number; initialScript: string; onSaved: () => void};
function StoryV2Editor({shortVideoId, initialScript, onSaved}: Props) {
    const sourceStory = React.useMemo(() => parseStoryV2(initialScript), [initialScript]);
    const [story, setStory] = React.useState<StoryV2 | null>(sourceStory);
    const [selectedBeatId, setSelectedBeatId] = React.useState('');
    const [saydiVoices, setSaydiVoices] = React.useState<SaydiVoiceSampleItem[]>([]);
    const [voiceError, setVoiceError] = React.useState('');
    const [voiceLoading, setVoiceLoading] = React.useState(false);
    const [voiceSearch, setVoiceSearch] = React.useState('');
    const [catalogRevision, setCatalogRevision] = React.useState(0);
    React.useEffect(() => {
        let cancelled = false;
        setVoiceLoading(true); setVoiceError('');
        void fetchSaydiVoiceSamples(shortVideoId, {forceRefresh: catalogRevision > 0}).then((catalog) => {
            if (!catalog.success) throw new Error(typeof catalog.message === 'string' ? catalog.message : 'Không tải được danh sách giọng từ API Saydi');
            if (!cancelled) setSaydiVoices(catalog.samples ?? []);
        }).catch((e) => {if (!cancelled) setVoiceError(e instanceof Error ? e.message : 'Không tải được giọng Saydi');})
            .finally(() => {if (!cancelled) setVoiceLoading(false);});
        return () => {cancelled = true;};
    }, [shortVideoId, catalogRevision]);
    React.useEffect(() => {setSelectedBeatId('');}, [shortVideoId]);
    const activeBeatId = story?.beats.some((beat) => beat.id === selectedBeatId) ? selectedBeatId : story?.beats[0]?.id;
    const spokenLines = React.useMemo(() => story ? spokenStoryItems(story) : [], [story]);
    const missingSpeakers = Array.from(new Set(spokenLines.map((item) => item.speaker_id || 'narrator'))).filter((id) => {
        const voice = story?.speakers[id]?.voice;
        return !voice || !(voice.provider === 'saydi' ? voice.voice_sample : voice.voice_code);
    });
    const [error, setError] = React.useState(''); const [busy, setBusy] = React.useState(false);
    const [raw, setRaw] = React.useState(''); const [dirty, setDirty] = React.useState(false);
    const [clips, setClips] = React.useState<{id: string; speaker_id: string; audio_url: string; text: string}[]>([]);
    const [manifest, setManifest] = React.useState<ShortVideoRenderManifest | null>(null);
    const [videoUrl, setVideoUrl] = React.useState('');
    const [summary, setSummary] = React.useState('');
    React.useEffect(() => { setStory(sourceStory); setDirty(false); setClips([]); setSummary(''); setManifest(null); setVideoUrl(''); }, [sourceStory, shortVideoId]);
    React.useEffect(() => {
        let cancelled = false;
        void storyV2Request(shortVideoId, 'get').then((res) => {
            if (!cancelled && res.success && res.story_timeline) { setClips(res.story_timeline.speech_clips); setSummary(`Timeline: ${res.story_timeline.duration_sec.toFixed(2)}s · ${res.story_timeline.pending_utterances.length} câu cần audio`); }
        }).catch(() => undefined);
        return () => { cancelled = true; };
    }, [shortVideoId, initialScript]);
    const update = (next: StoryV2) => { setStory(next); setDirty(true); setError(''); setClips([]); setManifest(null); setVideoUrl(''); };
    const run = async (op: 'save' | 'generate_audio', utterance?: string) => {
        if (!story) return; setBusy(true); setError('');
        try {
            const res = await storyV2Request(shortVideoId, op, op === 'save' ? story : undefined, utterance);
            if (!res.success) throw new Error(typeof res.message === 'string' ? res.message : JSON.stringify(res.message));
            setDirty(false); onSaved();
            window.dispatchEvent(new CustomEvent('whatif-audio-updated', {detail: {shortVideoId}}));
            const fresh = await storyV2Request(shortVideoId, 'get');
            if (fresh.story_timeline) { setClips(fresh.story_timeline.speech_clips); setSummary(`Timeline: ${fresh.story_timeline.duration_sec.toFixed(2)}s · ${fresh.story_timeline.pending_utterances.length} câu cần audio`); }
        } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
    };
    return <Stack spacing={2} sx={{p: 2, border: 1, borderColor: 'divider', borderRadius: 1}}>
        <Typography variant="h6">TTS What-if: 1. Gán giọng → 2. Tạo audio → 3. Nghe toàn video</Typography>
        <Typography variant="body2">Chữ kể chuyện không được đọc. Thoại dùng giọng riêng từng người. SVG và âm thanh cùng timeline.</Typography>
        {!story ? <Button onClick={() => update(newStoryV2())}>Tạo kịch bản đa lớp</Button> : <>
            {initialScript.trim() && !sourceStory ? <Alert severity="warning">Lưu sẽ chuyển video này sang kịch bản đa lớp; video khác không thay đổi.</Alert> : null}
            <Stack direction="row" spacing={1}><TextField label="Ngôn ngữ" value={story.language} onChange={(e) => update({...story, language: e.target.value})} /><Button disabled={busy} onClick={() => {const data = JSON.stringify(story, null, 2); void navigator.clipboard.writeText(data).catch(() => setError('Không copy được'));}}>Copy kịch bản</Button></Stack>
            <Typography variant="subtitle1">1. Gán giọng cho từng người nói</Typography>
            <Stack direction="row" spacing={1}><TextField size="small" label="Tìm giọng Saydi theo tên / giới tính / ngôn ngữ" value={voiceSearch} onChange={(e) => setVoiceSearch(e.target.value)} /><Button disabled={voiceLoading} onClick={() => setCatalogRevision((n) => n + 1)}>{voiceLoading ? 'Đang tải giọng…' : 'Tải lại từ API Saydi'}</Button></Stack>
            <Alert severity="info">Chọn Saydi rồi chọn tên giọng cho từng hàng. Người dẫn dùng hàng narrator; thoại nhân vật dùng hàng có ID tương ứng. Lưu cấu hình trước khi tạo audio. Nhân vật chỉ xuất hiện trên hình không cần gán giọng.</Alert>
            {voiceError ? <Alert severity="warning">{voiceError}. Tải lại tab để nạp danh mục giọng.</Alert> : null}
            {Object.entries(story.speakers).map(([id, speaker]) => {
                const voice = speaker.voice;
                const options = saydiVoices.filter((option) => `${option.display_name} ${option.name} ${option.gender ?? ''} ${option.language ?? ''}`.toLocaleLowerCase().includes(voiceSearch.toLocaleLowerCase()));
                const lineCount = spokenLines.filter((item) => item.speaker_id === id).length;
                const change = (patch: Partial<typeof speaker>) => update({...story, speakers: {...story.speakers, [id]: {...speaker, ...patch}}});
                return <Stack key={id} spacing={1} sx={{p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1}}>
                    <Typography variant="subtitle2">{id === 'narrator' ? 'Người dẫn truyện' : speaker.name ?? id} · {lineCount} câu đọc · ID: {id}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                    <TextField label={`Tên (${id})`} value={speaker.name ?? id} onChange={(e) => change({name: e.target.value})} />
                    <TextField select label="Dịch vụ giọng" sx={{minWidth: 130}} value={voice?.provider ?? ''} onChange={(e) => change({voice: e.target.value ? {provider: e.target.value as 'saydi' | 'vbee', lang_code: story.language, speed: 1} : null})}><MenuItem value="">Chưa gán</MenuItem><MenuItem value="saydi">Saydi</MenuItem><MenuItem value="vbee">Vbee</MenuItem></TextField>
                    {voice ? <>{voice.provider === 'saydi' ? <TextField select label={`Giọng Saydi cho ${speaker.name ?? id}`} sx={{minWidth: 240}} disabled={voiceLoading || busy} value={voice.voice_sample ?? ''} helperText={voiceLoading ? 'Đang tải danh mục giọng…' : 'Giọng được giữ riêng cho người nói này'} onChange={(e) => change({voice: {...voice, voice_sample: e.target.value, lang_code: story.language}})}>
                        <MenuItem value="">Chọn giọng Saydi</MenuItem>
                        {voice.voice_sample && !options.some((option) => option.name === voice.voice_sample) ? <MenuItem value={voice.voice_sample}>{voice.voice_sample} (giọng đã lưu)</MenuItem> : null}
                        {options.map((option) => <MenuItem key={option.name} value={option.name}>{option.display_name || option.name}</MenuItem>)}
                    </TextField> : <TextField label="Mã giọng Vbee trong catalog" value={voice.voice_code ?? ''} onChange={(e) => change({voice: {...voice, voice_code: e.target.value}})} />}<TextField type="number" label="Tốc độ" inputProps={{min: 0.5, max: 2, step: 0.1}} value={voice.speed ?? 1} onChange={(e) => change({voice: {...voice, speed: Number(e.target.value)}})} /></> : null}
                    </Stack>
                    {voice?.provider === 'saydi' && voice.voice_sample ? <audio controls preload="none" aria-label={`Nghe mẫu ${speaker.name ?? id}`} src={resolveSaydiVoicePreviewUrl(saydiVoices.find((sample) => sample.name === voice.voice_sample) ?? voice.voice_sample)} /> : null}
                </Stack>;
            })}
            <Button onClick={() => { const id = `character_${Object.keys(story.speakers).length + 1}`; update({...story, characters: [...(story.characters ?? []), {id, description: ''}], speakers: {...story.speakers, [id]: {name: id, character_id: id, voice: null}}}); }}>Thêm nhân vật / giọng</Button>
            <Typography variant="subtitle1">2. Lưu cấu hình và tạo audio</Typography>
            <Stack direction="row" spacing={1}><Button variant="contained" disabled={busy} onClick={() => void run('save')}>Lưu giọng và kịch bản</Button><Button disabled={busy || dirty || spokenLines.length === 0 || missingSpeakers.length > 0} onClick={() => void run('generate_audio')}>Tạo các câu còn thiếu audio</Button></Stack>
            <Typography variant="caption">Thời lượng audio được đo sau TTS; beat tự nới nếu câu dài hơn dự kiến. Chọn giọng trong danh mục Saydi; không tự đổi giọng khi lỗi.</Typography>
            {summary ? <Alert severity="info">{summary}</Alert> : null}
            {missingSpeakers.length ? <Alert severity="warning">Chưa gán đủ giọng: {missingSpeakers.map((id) => story.speakers[id]?.name ?? id).join(', ')}. Chọn giọng rồi lưu trước khi tạo audio.</Alert> : null}
            <Divider />
            <Typography variant="subtitle1">3. Nghe liên tục lời dẫn, thoại và SFX</Typography>
            <StoryV2Preview shortVideoId={shortVideoId} revision={initialScript} />
            <Accordion><AccordionSummary>Chỉnh ngoại hình nhân vật (tùy chọn)</AccordionSummary><AccordionDetails>
            <Typography variant="subtitle1">Ngoại hình nhân vật (không ảnh hưởng lựa chọn giọng)</Typography>
            {(story.characters ?? []).map((character, ci) => <TextField key={character.id} label={`Ngoại hình ${character.id}`} multiline rows={2} value={character.description ?? JSON.stringify(character)} onChange={(e) => update({...story, characters: story.characters?.map((c, i) => i === ci ? {...c, description: e.target.value} : c)})} />)}
            </AccordionDetails></Accordion>
            <Typography variant="subtitle1">Sửa nội dung / tạo audio riêng từng beat</Typography>
            <TextField select label="Beat đang chỉnh" value={activeBeatId ?? ''} onChange={(e) => setSelectedBeatId(e.target.value)} helperText="Chỉ mở một beat mỗi lần để thao tác mượt với kịch bản dài; các beat khác vẫn được giữ khi lưu.">
                {story.beats.map((beat, index) => <MenuItem key={beat.id} value={beat.id}>{index + 1}. {beat.id} · {beat.items.length} nội dung</MenuItem>)}
            </TextField>
            <Button disabled={busy || dirty || missingSpeakers.length > 0} onClick={async () => {if (!activeBeatId) return; setBusy(true); setError(''); try {const result = await storyV2Request(shortVideoId, 'generate_beat_audio', undefined, undefined, activeBeatId); if (!result.success) throw new Error(JSON.stringify(result.errors ?? result.message)); onSaved(); window.dispatchEvent(new CustomEvent('whatif-audio-updated', {detail: {shortVideoId}}));} catch(e) {setError(e instanceof Error ? e.message : String(e));} finally {setBusy(false);}}}>Tạo đủ audio của beat đang chọn</Button>
            {story.beats.map((beat, bi) => ({beat, bi})).filter(({beat}) => beat.id === activeBeatId).map(({beat, bi}) => <Box key={beat.id} sx={{borderTop: 1, borderColor: 'divider', pt: 2}}>
                <Stack direction="row" spacing={1} alignItems="center"><Typography>{beat.id}</Typography><TextField label="Thời lượng dự kiến (s)" type="number" inputProps={{min: 0.1, max: 120, step: 0.1}} value={beat.duration_hint_sec} onChange={(e) => update({...story, beats: story.beats.map((b, i) => i === bi ? {...b, duration_hint_sec: Number(e.target.value)} : b)})} /><Button disabled={story.beats.length === 1} onClick={() => update({...story, beats: story.beats.filter((_, i) => i !== bi)})}>Xóa beat</Button></Stack>
                <TextField fullWidth multiline rows={3} label="Visual: bối cảnh, nhân vật, diễn biến và kết thúc" value={beat.visual_description ?? ''} onChange={(e) => update({...story, beats: story.beats.map((b, i) => i === bi ? {...b, visual_description: e.target.value} : b)})} sx={{my: 1}} />
                {beat.items.map((item, ii) => {
                    const patch = (value: Partial<typeof item>) => update({...story, beats: story.beats.map((b, i) => i === bi ? {...b, items: b.items.map((it, j) => j === ii ? {...it, ...value} : it)} : b)});
                    const spoken = item.type === 'dialogue' || item.type === 'narration';
                    return <Stack key={item.id} spacing={1} sx={{my: 2}}>
                        <Stack direction="row" spacing={1}><TextField select label="Loại nội dung" value={item.type} sx={{minWidth: 250}} onChange={(e) => patch({type: e.target.value as StoryItemType, speaker_id: e.target.value === 'narration' ? 'narrator' : item.speaker_id || 'hero'})}>{Object.entries(labels).map(([type, label]) => <MenuItem key={type} value={type}>{label}</MenuItem>)}</TextField>
                            {spoken ? <TextField select label="Người nói" value={item.speaker_id ?? 'narrator'} sx={{minWidth: 160}} onChange={(e) => patch({speaker_id: e.target.value})}>{Object.entries(story.speakers).map(([id, speaker]) => <MenuItem key={id} value={id}>{speaker.name ?? id}</MenuItem>)}</TextField> : null}
                            <Button onClick={() => update({...story, beats: story.beats.map((b, i) => i === bi ? {...b, items: b.items.filter((_, j) => j !== ii)} : b)})}>Xóa</Button></Stack>
                        <TextField multiline rows={3} fullWidth label={labels[item.type]} value={item.text} onChange={(e) => patch({text: e.target.value})} />
                        <Stack direction="row" spacing={1}><TextField type="number" label="Bắt đầu trong beat (s), trống = tự xếp" value={item.start_sec ?? ''} onChange={(e) => patch({start_sec: e.target.value === '' ? undefined : Number(e.target.value), after_id: undefined})} />{!spoken ? <TextField type="number" label="Hiển thị / hành động (s)" value={item.duration_sec ?? ''} onChange={(e) => patch({duration_sec: e.target.value === '' ? undefined : Number(e.target.value)})} /> : <Button disabled={busy || dirty} onClick={() => void run('generate_audio', item.id)}>Tạo lại câu này</Button>}</Stack>
                        <TextField select label="Xếp sau nội dung (tự theo thời lượng audio)" value={item.after_id ?? ''} onChange={(e) => patch({after_id: e.target.value || undefined, start_sec: undefined})}><MenuItem value="">Không neo</MenuItem>{beat.items.slice(0, ii).map((prior) => <MenuItem key={prior.id} value={prior.id}>{prior.id}: {prior.text.slice(0, 50)}</MenuItem>)}</TextField>
                        {item.type === 'action' ? <>
                            {(item.events ?? []).map((event, ei) => <Stack key={ei} direction="row" spacing={1}><TextField label="Event ID cho SFX" value={event.id} onChange={(e) => patch({events: item.events?.map((ev, i) => i === ei ? {...ev, id: e.target.value} : ev)})} /><TextField type="number" label="Giây tính từ đầu hành động" value={event.at_sec} onChange={(e) => patch({events: item.events?.map((ev, i) => i === ei ? {...ev, at_sec: Number(e.target.value)} : ev)})} /><Button onClick={() => patch({events: item.events?.filter((_, i) => i !== ei)})}>Xóa event</Button></Stack>)}
                            <Button onClick={() => patch({events: [...(item.events ?? []), {id: `${item.id}.event_${(item.events?.length ?? 0) + 1}`, at_sec: 0}]})}>Thêm mốc hành động / SFX</Button>
                        </> : null}
                        {clips.filter((clip) => clip.id === item.id && clip.audio_url).map((clip) => <audio key={clip.id} controls src={clip.audio_url} preload="none" />)}
                    </Stack>;
                })}
                <Button onClick={() => {let n = 1; const ids = new Set(story.beats.flatMap((b) => b.items.map((i) => i.id))); while (ids.has(`item_${n}`)) n++; update({...story, beats: story.beats.map((b, i) => i === bi ? {...b, items: [...b.items, {id: `item_${n}`, type: 'action', text: ''}]} : b)}); }}>Thêm nội dung</Button>
            </Box>)}
            <Button onClick={() => {let n = 1; while (story.beats.some((b) => b.id === `beat_${n}`)) n++; update({...story, beats: [...story.beats, {id: `beat_${n}`, duration_hint_sec: 3, items: [{id: `action_beat_${n}`, type: 'action', text: ''}]}]});}}>Thêm beat</Button>
            <Divider />
            <Typography variant="subtitle1">Xuất video sau khi đủ HTML và audio</Typography>
            <Typography variant="caption">Dùng player này cho timeline đa lớp. Sau khi lưu HTML trong tab Render, build lại preview tại đây. Chỉnh timing trong kịch bản; timeline này được tính từ audio thực tế.</Typography>
            <Stack direction="row" spacing={1}>
                <Button disabled={busy || dirty} onClick={async () => {setBusy(true); setError(''); try {const res = await buildShortVideoRenderManifest(shortVideoId); setManifest(res.manifest ?? null);} catch (e) {setError(e instanceof Error ? e.message : String(e));} finally {setBusy(false);}}}>Build / làm mới preview</Button>
                <Button disabled={busy || dirty || !manifest || Boolean(manifest.warnings?.length)} onClick={async () => {setBusy(true); setError(''); try {const res = await storyV2Request(shortVideoId, 'render'); if (!res.success) throw new Error(typeof res.message === 'string' ? res.message : JSON.stringify(res.message)); setVideoUrl(res.video_url ?? '');} catch (e) {setError(e instanceof Error ? e.message : String(e));} finally {setBusy(false);}}}>Xuất MP4 bằng Remotion</Button>
            </Stack>
            {manifest?.warnings?.length ? <Alert severity="warning">{manifest.warnings.join('; ')}</Alert> : null}
            {manifest ? <ShortVideoRemotionPlayer manifest={manifest} /> : null}
            {videoUrl ? <Box component="video" controls src={videoUrl} sx={{width: '100%', maxHeight: 600}} /> : null}

        </>}
        <Accordion defaultExpanded={!story}><AccordionSummary>Nhập / thay kịch bản JSON (nâng cao)</AccordionSummary><AccordionDetails>
        <TextField label="Nhập kịch bản What-if từ chatbot (JSON)" multiline minRows={3} value={raw} onChange={(e) => setRaw(e.target.value)} />
        <Button disabled={!raw.trim() || busy} onClick={() => {const value = parseStoryV2(raw); if (value) {update(value); setRaw('');} else setError('Cần JSON schema whatif_2d_story_v2 có beats');}}>Đưa vào editor</Button>
        </AccordionDetails></Accordion>
        {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>;
}

export default React.memo(StoryV2Editor);
