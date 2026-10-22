export type StoryItemType = 'narration' | 'dialogue' | 'screen_text' | 'action';
export type StoryVoice = {provider: 'saydi' | 'vbee'; voice_sample?: string; voice_code?: string; lang_code?: string; speed?: number};
export type StoryItem = {id: string; type: StoryItemType; text: string; speaker_id?: string; start_sec?: number; duration_sec?: number; after_id?: string; events?: {id: string; at_sec: number}[]};
export type StoryV2 = {
    schema_version: 'whatif_2d_story_v2'; language: string; title?: string; renderer?: 'svg2d';
    characters?: {id: string; description?: string}[];
    speakers: Record<string, {name?: string; character_id?: string; voice?: StoryVoice | null}>;
    beats: {id: string; duration_hint_sec: number; visual_description?: string; items: StoryItem[]}[];
};
export function parseStoryV2(raw: string): StoryV2 | null {
    try {
        const value = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
        if (value?.schema_version !== 'whatif_2d_story_v2' || !Array.isArray(value.beats) || !value.beats.length || !value.speakers || typeof value.speakers !== 'object' || Array.isArray(value.speakers)) return null;
        if (Object.values(value.speakers).some((speaker: any) => !speaker || typeof speaker !== 'object' || (speaker.voice != null && (typeof speaker.voice !== 'object' || !['saydi', 'vbee'].includes(speaker.voice.provider))))) return null;
        if (value.characters !== undefined && (!Array.isArray(value.characters) || value.characters.some((c: any) => !c || typeof c.id !== 'string'))) return null;
        if (value.beats.some((beat: any) => !beat || typeof beat.id !== 'string' || !Array.isArray(beat.items) || beat.items.some((item: any) => !item || typeof item.id !== 'string' || typeof item.text !== 'string' || !['narration', 'dialogue', 'screen_text', 'action'].includes(item.type) || (item.events !== undefined && (!Array.isArray(item.events) || item.events.some((event: any) => !event || typeof event.id !== 'string' || typeof event.at_sec !== 'number')))))) return null;
        return {...value, language: value.language || 'vi'};
    } catch { return null; }
}
export function newStoryV2(): StoryV2 {
    return {schema_version: 'whatif_2d_story_v2', language: 'vi', renderer: 'svg2d',
        characters: [{id: 'hero', description: 'Stickman đầu tròn, thân tối, khăn xanh teal'}],
        speakers: {narrator: {name: 'Người dẫn', voice: null}, hero: {name: 'Nhân vật chính', character_id: 'hero', voice: null}},
        beats: [{id: 'beat_1', duration_hint_sec: 3, visual_description: '', items: [{id: 'text_hook', type: 'screen_text', text: 'Nếu bạn dừng được thời gian?', duration_sec: 3}]}]};
}
export function spokenStoryItems(story: StoryV2): StoryItem[] {
    return story.beats.flatMap((beat) => beat.items.filter((item) => item.type === 'narration' || item.type === 'dialogue'));
}
