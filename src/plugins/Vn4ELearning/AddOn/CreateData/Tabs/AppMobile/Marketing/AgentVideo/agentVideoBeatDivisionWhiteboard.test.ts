import {
    appendBeatImageStyleSuffix,
    applyImageTextLang,
    beatImageStyleSuffix,
    buildBeatDivisionWhiteboardImagePromptBlock,
    buildBeatDivisionWhiteboardOutputRules,
    imageTextLangRuleBlock,
    imageTextLangSuffixRule,
    normalizeImageTextLang,
    resolveBeatVoiceContent,
    stripVoiceMarkers,
} from './agentVideoBeatDivisionWhiteboard';

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
        expect(beatImageStyleSuffix('vox')).toMatch(/vox-style/i);
        expect(beatImageStyleSuffix('VOX')).toMatch(/vox-style/i);
    });

    it('beatImageStyleSuffix trả courtroom suffix khi gen_style=courtroom_sketch', () => {
        expect(beatImageStyleSuffix('courtroom_sketch')).toContain('hand-drawn reportage illustration');
        expect(beatImageStyleSuffix('COURTROOM_SKETCH')).toContain('hand-drawn reportage illustration');
    });

    it('beatImageStyleSuffix theo imageTextLang=en đổi Vietnamese → English', () => {
        expect(beatImageStyleSuffix('hybrid', 'vi')).toContain('Vietnamese hand-lettered');
        expect(beatImageStyleSuffix('hybrid', 'en')).toContain('English hand-lettered');
        expect(beatImageStyleSuffix('hybrid', 'en')).not.toContain('Vietnamese');
    });

    it('normalizeImageTextLang nhận vi/en, lạ → vi', () => {
        expect(normalizeImageTextLang('en')).toBe('en');
        expect(normalizeImageTextLang('ENGLISH')).toBe('en');
        expect(normalizeImageTextLang('vi')).toBe('vi');
        expect(normalizeImageTextLang('')).toBe('vi');
        expect(normalizeImageTextLang('fr')).toBe('vi');
    });

    it('applyImageTextLang đổi chữ tiếng Việt + ví dụ label sang English', () => {
        const input = 'text_overlay: 3 NGUYÊN LIỆU + những điều bạn muốn làm, Vietnamese labels';
        expect(applyImageTextLang(input, 'vi')).toBe(input);
        const en = applyImageTextLang(input, 'en');
        expect(en).toContain('3 INGREDIENTS');
        expect(en).toContain('things you want to do');
        expect(en).toContain('English labels');
        expect(en).not.toContain('NGUYÊN LIỆU');
    });

    it('imageTextLangRuleBlock trả rule tiếng Anh khi lang=en', () => {
        const vi = imageTextLangRuleBlock('vi').join('\n');
        expect(vi).toContain('tiếng Việt');
        expect(vi).toContain('GAN NHIỄM MỠ | MỠ TÍCH TỤ');
        const en = imageTextLangRuleBlock('en').join('\n');
        expect(en).toContain('tiếng Anh');
        expect(en).toContain('FATTY LIVER | FAT BUILD-UP');
        expect(en).toContain('3–6 label');
    });

    it('buildBeatDivisionWhiteboardImagePromptBlock(en) không còn rule chữ tiếng Việt', () => {
        const vi = buildBeatDivisionWhiteboardImagePromptBlock('vox', 'vi');
        expect(vi).toContain('tiếng Việt');
        expect(vi).toContain('GAN NHIỄM MỠ');
        const en = buildBeatDivisionWhiteboardImagePromptBlock('vox', 'en');
        expect(en).toContain('English');
        expect(en).toContain('3–6 label');
        expect(en).not.toContain('3 NGUYÊN LIỆU');
    });

    it('buildBeatDivisionWhiteboardOutputRules chứa rule mức độ liên quan cao nhất', () => {
        const rules = buildBeatDivisionWhiteboardOutputRules('vox');
        expect(rules.join('\n')).toContain('RELEVANCE PRIORITY');
        expect(rules.join('\n')).toContain('phrase_anchor');
        expect(rules.join('\n')).toContain('1–2 beat lân cận');
    });

    it('appendBeatImageStyleSuffix nối suffix vox/courtroom vào cuối prompt', () => {
        const prompt = 'A tired young adult lying in bed beside a black alarm clock';
        expect(appendBeatImageStyleSuffix(prompt, 'vox')).toMatch(/vox-style/i);
        expect(appendBeatImageStyleSuffix(prompt, 'courtroom_sketch')).toContain('hand-drawn reportage illustration');
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
        expect(result).toContain(
            `some scene description, ${beatImageStyleSuffix('collage_art')}, ${imageTextLangSuffixRule('vi')}`,
        );
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

    it('appendBeatImageStyleSuffix thêm key style vào trong JSON khi prompt là JSON', () => {
        const jsonPrompt = JSON.stringify({
            purpose: 'p',
            context: 'c',
            subject: 's',
            action: 'a',
            scene: 's',
            text_overlay: 't',
            mood: 'm',
            composition: 'c',
            must_avoid: 'm',
        });
        const result = appendBeatImageStyleSuffix(jsonPrompt, 'vox');
        const parsed = JSON.parse(result);
        expect(parsed.style).toMatch(/vox-style/i);
        expect(parsed.purpose).toBe('p');
        expect(parsed.must_avoid).toBe('m');
    });

    it('appendBeatImageStyleSuffix thêm key text_language vào JSON khi lang=en', () => {
        const jsonPrompt = JSON.stringify({
            purpose: 'p',
            context: 'c',
            subject: 's',
            action: 'a',
            scene: 's',
            text_overlay: 't',
            mood: 'm',
            composition: 'c',
            must_avoid: 'm',
        });
        const parsed = JSON.parse(appendBeatImageStyleSuffix(jsonPrompt, 'vox', 'en'));
        expect(parsed.text_language).toContain('3-6 separate short labels');
        expect(parsed.style).toMatch(/vox-style/i);
    });

    it('appendBeatImageStyleSuffix xử lý image_prompt đã decode từ beat-map', () => {
        // Mô phỏng: beat-map lưu `\"` escape, khi decode runtime value có nháy kép thật.
        const beatMap = JSON.parse(JSON.stringify({
            image_prompt: JSON.stringify({ purpose: 'p', context: 'c' }),
        }));
        const result = appendBeatImageStyleSuffix(beatMap.image_prompt, 'hybrid');
        const parsed = JSON.parse(result);
        expect(parsed.style).toContain('hybrid whiteboard collage');
        expect(parsed.purpose).toBe('p');
    });

    it('stripVoiceMarkers bỏ BGM/SFX/Dừng khỏi text', () => {
        expect(stripVoiceMarkers('[BGM: lofi ambient] [SFX: vine boom] Thử tưởng tượng một hóa chất'))
            .toBe('Thử tưởng tượng một hóa chất');
        expect(stripVoiceMarkers('[BGM: nhạc nền]  Dòng lời thoại   [Dừng nhạc]')).toBe('Dòng lời thoại');
        expect(stripVoiceMarkers('Không có marker')).toBe('Không có marker');
    });

    it('resolveBeatVoiceContent lấy phrase_anchor đã strip marker của beat', () => {
        const sections = [
            { id: 'beat_1', phrase_anchor: '[BGM: x] [SFX: y] Nội dung dòng đầu' },
            { id: 'beat_2', phrase_anchor: '[SFX: boom] Nội dung dòng hai' },
        ];
        expect(resolveBeatVoiceContent(sections, 'beat_1')).toBe('Nội dung dòng đầu');
        expect(resolveBeatVoiceContent(sections, 'beat_2')).toBe('Nội dung dòng hai');
        expect(resolveBeatVoiceContent(sections, 'beat_9')).toBe('');
        expect(resolveBeatVoiceContent(null, 'beat_1')).toBe('');
    });

    it('appendBeatImageStyleSuffix thêm key voice_content vào JSON khi có voice', () => {
        const jsonPrompt = JSON.stringify({
            purpose: 'p',
            context: 'c',
            subject: 's',
            action: 'a',
            scene: 's',
            text_overlay: 't',
            mood: 'm',
            composition: 'c',
            must_avoid: 'm',
        });
        const parsed = JSON.parse(appendBeatImageStyleSuffix(jsonPrompt, 'vox', 'vi', 'Nội dung lời thoại beat'));
        expect(parsed.voice_content).toBe('Nội dung lời thoại beat');
        const parsed2 = JSON.parse(appendBeatImageStyleSuffix(jsonPrompt, 'vox', 'vi', ''));
        expect(parsed2.voice_content).toBeUndefined();
    });

    it('appendBeatImageStyleSuffix nối voice_content vào text prompt khi có voice', () => {
        const result = appendBeatImageStyleSuffix('mô tả cảnh', 'vox', 'vi', 'lời thoại beat');
        expect(result).toContain('the voiceover for this beat says: "lời thoại beat"');
    });
});
