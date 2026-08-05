import { appendBeatImageStyleSuffix, beatImageStyleSuffix } from './agentVideoBeatDivisionWhiteboard';

describe('agentVideoBeatDivisionWhiteboard style suffix', () => {
    it('beatImageStyleSuffix trả hybrid suffix cho gen_style mặc định', () => {
        expect(beatImageStyleSuffix()).toContain('hybrid whiteboard collage');
        expect(beatImageStyleSuffix('hybrid')).toContain('hybrid whiteboard collage');
        expect(beatImageStyleSuffix('whiteboard')).toContain('hybrid whiteboard collage');
    });

    it('beatImageStyleSuffix trả collage suffix khi gen_style=collage_art', () => {
        expect(beatImageStyleSuffix('collage_art')).toContain('collage art');
        expect(beatImageStyleSuffix('COLLAGE_ART')).toContain('collage art');
    });

    it('beatImageStyleSuffix trả vox suffix khi gen_style=vox', () => {
        expect(beatImageStyleSuffix('vox')).toContain('vox-style');
        expect(beatImageStyleSuffix('VOX')).toContain('vox-style');
    });

    it('beatImageStyleSuffix trả courtroom suffix khi gen_style=courtroom_sketch', () => {
        expect(beatImageStyleSuffix('courtroom_sketch')).toContain('courtroom sketch');
        expect(beatImageStyleSuffix('COURTROOM_SKETCH')).toContain('courtroom sketch');
    });

    it('appendBeatImageStyleSuffix nối suffix vox/courtroom vào cuối prompt', () => {
        const prompt = 'A tired young adult lying in bed beside a black alarm clock';
        expect(appendBeatImageStyleSuffix(prompt, 'vox')).toContain('vox-style');
        expect(appendBeatImageStyleSuffix(prompt, 'courtroom_sketch')).toContain('courtroom sketch');
    });

    it('appendBeatImageStyleSuffix luôn nối suffix vào cuối prompt', () => {
        const prompt = 'A tired young adult lying in bed beside a black alarm clock';
        const result = appendBeatImageStyleSuffix(prompt, 'hybrid');
        expect(result.startsWith(prompt)).toBe(true);
        expect(result).toContain('high-impact hybrid whiteboard collage');
        expect(result.split(', ').length).toBeGreaterThan(prompt.split(', ').length);
    });

    it('appendBeatImageStyleSuffix trim dấu phẩy cuối prompt cũ trước khi nối', () => {
        const result = appendBeatImageStyleSuffix('some scene description,  ', 'collage_art');
        expect(result).toBe(`some scene description, ${beatImageStyleSuffix('collage_art')}`);
    });

    it('appendBeatImageStyleSuffix không lặp dù prompt đã có style cũ', () => {
        const prompt = 'scene, style suffix hybrid, no watermark';
        const result = appendBeatImageStyleSuffix(prompt, 'hybrid');
        expect(result).toContain('high-impact hybrid whiteboard collage');
        expect(result.split('high-impact hybrid whiteboard collage').length).toBe(2);
    });

    it('appendBeatImageStyleSuffix trả đúng suffix khi prompt rỗng', () => {
        expect(appendBeatImageStyleSuffix('', 'hybrid')).toBe(beatImageStyleSuffix('hybrid'));
    });
});
