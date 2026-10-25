import { stripScriptMarkers, tokenizeScript } from './captionScriptAlign';

test('voice routing IDs never become spoken caption tokens', () => {
    const tagged = '[giong-doc-id: voice-n] She heard a voice. [giong-doc-id: voice-h] Open the door.';
    expect(stripScriptMarkers(tagged)).toBe('She heard a voice. Open the door.');
    expect(tokenizeScript(tagged)).toEqual(tokenizeScript('She heard a voice. Open the door.'));
});
