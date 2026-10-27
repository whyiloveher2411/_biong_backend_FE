/** Same ten story emotions as workflow character-performance.md; two extra rest poses. */
export const CHARACTER_EMOTIONS = {
    neutral:'Bình thường', happy:'Vui', sad:'Buồn', angry:'Giận', surprised:'Ngạc nhiên',
    worried:'Lo lắng', smug:'Đắc ý', thinking:'Suy nghĩ', crying:'Khóc', laughing:'Cười lớn',
    deadpan:'Vô cảm', blink:'Nhắm mắt',
};
export type CharacterEmotion = keyof typeof CHARACTER_EMOTIONS;
