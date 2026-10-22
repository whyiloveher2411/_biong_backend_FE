import {newStoryV2, parseStoryV2, spokenStoryItems} from './storyV2';
test('silent story imports with no TTS utterances', () => {
    const story = newStoryV2();
    expect(parseStoryV2(JSON.stringify(story))).toEqual(story);
    expect(spokenStoryItems(story)).toEqual([]);
});
test('only narration and dialogue are spoken, preserving speaker', () => {
    const story = newStoryV2();
    story.beats[0].items.push({id: 'action', type: 'action', text: 'Reach'}, {id: 'line', type: 'dialogue', speaker_id: 'hero', text: 'Hello'}, {id: 'voice', type: 'narration', speaker_id: 'narrator', text: 'One day'});
    expect(spokenStoryItems(story).map((x) => x.speaker_id)).toEqual(['hero', 'narrator']);
});
test('malformed JSON shapes do not crash editor', () => {
    expect(parseStoryV2('{bad')).toBeNull();
    expect(parseStoryV2('{"schema_version":"whatif_2d_story_v2","beats":[{}]}')).toBeNull();
    expect(parseStoryV2(JSON.stringify({...newStoryV2(), speakers: []}))).toBeNull();
    expect(parseStoryV2(JSON.stringify({...newStoryV2(), characters: 'bad'}))).toBeNull();
});
test('chatbot fenced JSON can be imported', () => {
    expect(parseStoryV2('```json\n' + JSON.stringify(newStoryV2()) + '\n```')).not.toBeNull();
});
