/**
 * Dịch key/label trích từ response chatbot YouTube sang tiếng Việt.
 * Chỉ dịch key/label — nội dung (value/text) giữ nguyên tiếng Anh.
 */

const LABEL_VI: Record<string, string> = {
    // Title response
    'target audience': 'Khán giả mục tiêu',
    'primary motivation': 'Động lực chính',
    'primary reason they would click': 'Lý do chính họ sẽ click',
    'curiosity': 'Tò mò',
    'emotional impact': 'Cảm xúc',
    'clarity': 'Rõ ràng',
    'viral potential': 'Khả năng lan truyền',
    'ctr potential': 'Tiềm năng CTR',
    'emotional hook': 'Điểm chạm cảm xúc',
    'shareability': 'Khả năng chia sẻ',
    'pattern interrupt': 'Phá vỡ lối mòn',
    'proven youtube meta': 'Meta YouTube đã kiểm chứng',
    'transformational framing': 'Góc nhìn chuyển hóa',
    'high stakes': 'Tính cược cao',
    'authority': 'Uy tín',
    'direct and punchy': 'Trực diện, mạnh',
    'inclusive language': 'Ngôn từ gần gũi',
    'strong curiosity gap': 'Khoảng trống tò mò lớn',
    'narrative tension': 'Căng thẳng tự sự',
    'story-driven': 'Dẫn dắt bằng câu chuyện',
    'emotional weight': 'Sức nặng cảm xúc',
    'contrarian angle': 'Góc nhìn trái chiều',
    'high ctr trigger': 'Kích thích CTR cao',
    'broad appeal': 'Hấp dẫn đại chúng',
    'authority & evidence': 'Uy tín & bằng chứng',
    'definitive framing': 'Định hình dứt khoát',
    'balanced tone': 'Tông cân bằng',
    'scale and awe': 'Quy mô & choáng ngợp',
    'mystery box': 'Hộp bí ẩn',
    'visual potential': 'Tiềm năng hình ảnh',
    'controversial/unexpected': 'Gây tranh cãi/bất ngờ',
    'question format': 'Dạng câu hỏi',
    'niche authority': 'Uy tín ngách',
    'philosophical depth': 'Chiều sâu triết lý',
    'transformational': 'Chuyển hóa',
    'broad reach': 'Tầm tiếp cận rộng',
    'why it is the strongest option': 'Vì sao đây là lựa chọn mạnh nhất',
    'psychological triggers used': 'Các yếu tố tâm lý được dùng',
    'audience segment it will attract': 'Nhóm khán giả thu hút được',

    // Thumbnail response — video analysis
    'core topic': 'Chủ đề chính',
    'biggest surprise': 'Điểm bất ngờ nhất',
    'most emotional moment': 'Khoảnh khắc xúc động nhất',
    'most valuable outcome': 'Kết quả giá trị nhất',
    'most shocking fact': 'Sự thật gây sốc nhất',
    'strongest curiosity gap': 'Khoảng trống tò mò mạnh nhất',
    'most visually representable idea': 'Ý tưởng dễ hình ảnh hóa nhất',
    'most memorable scene': 'Cảnh đáng nhớ nhất',
    'most viral angle': 'Góc viral mạnh nhất',

    // Thumbnail response — psychological triggers
    'contrarian opinion': 'Quan điểm trái chiều',
    'surprise/shock': 'Bất ngờ/sốc',
    'mystery': 'Bí ẩn',
    'emotional reaction': 'Phản ứng cảm xúc',

    // Thumbnail response — "Why it could go viral"
    'why viewers stop scrolling': 'Vì sao người xem dừng cuộn',
    'curiosity gap': 'Khoảng trống tò mò',
    'emotion triggered': 'Cảm xúc kích hoạt',

    // Thumbnail response — JSON score_breakdown + hook
    'hook': 'Điểm chạm',
    'why it could work': 'Vì sao có thể hiệu quả',
    'curiosity_gap': 'Khoảng trống tò mò',
    'emotional_impact': 'Tác động cảm xúc',
    'visual_clarity': 'Độ rõ hình ảnh',
    'title_thumbnail_synergy': 'Đồng bộ tiêu đề + ảnh',
    'visual_distinctiveness': 'Độ khác biệt hình ảnh',
    'viral_score': 'Điểm viral',

    // Thumbnail response — visual composition
    'main subject': 'Chủ thể chính',
    'facial expression': 'Biểu cảm',
    'camera framing': 'Khung hình',
    'objects': 'Đối tượng',
    'background': 'Bối cảnh',
    'focus point': 'Điểm nhấn',

    // Thumbnail response — winner
    'why it is strongest': 'Vì sao mạnh nhất',
    'psychological triggers': 'Yếu tố tâm lý',
    'audience it attracts': 'Khán giả thu hút',
    'potential weaknesses': 'Điểm yếu tiềm ẩn',

    // Thumbnail response — packaging advice
    'best matching title style': 'Phong cách tiêu đề phù hợp',
    'expected ctr strength': 'Dự kiến độ mạnh CTR',
    'risk factors': 'Rủi ro',
    'suggested a/b test': 'Gợi ý test A/B',
};

export function translateYoutubeLabel(label: string): string {
    const key = String(label || '').trim().toLowerCase();
    if (!key) {
        return '';
    }
    if (LABEL_VI[key]) {
        return LABEL_VI[key];
    }
    if (key.startsWith('combination ')) {
        return `Kết hợp ${String(label).trim().slice('combination '.length)}`;
    }
    if (key.startsWith('concept ')) {
        return `Ý tưởng ${String(label).trim().slice('concept '.length)}`;
    }
    return label;
}
