import { ajax } from 'hook/useApi';
import type {CharacterDesignCatalog, CharacterDesignConfig} from './shortVideoSceneAssets';

export type SeriesCastProfile = {role?: string; personality?: string; signature?: string; speech?: string; voice?: string; age?: string};
export type SeriesCastMember = {
    id: string; name: string; profile: SeriesCastProfile; design: CharacterDesignConfig;
    design_revision: string; revision: string; status: 'active' | 'archived'; sort: number; updated_at?: string;
};
export type SeriesCastResponse = {
    success?: boolean; message?: string | {content?: string};
    cast?: SeriesCastMember[]; member?: SeriesCastMember | null;
    designer?: CharacterDesignCatalog & {expected_revision?: string};
    profile_fields?: Record<string, {label: string; max: number}>;
};

export function seriesCastRequest(operation: string, data: Record<string, unknown> = {}): Promise<SeriesCastResponse> {
    return ajax({url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/series-cast', method: 'POST', loading: false,
        data: {operation, ...data}}) as Promise<SeriesCastResponse>;
}

export function seriesCastMessage(res: SeriesCastResponse): string {
    return typeof res.message === 'string' ? res.message : res.message?.content || 'Không thực hiện được thao tác.';
}

/** Lowercase ASCII id suggested from a Vietnamese name ("Hùng" → "hung"). */
export function seriesCastSuggestId(name: string): string {
    const base = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()
        .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
    return /^[a-z]/.test(base) ? base : base ? `nv_${base}`.slice(0, 41) : '';
}

export const SERIES_CAST_PROFILE_FIELDS: {key: keyof SeriesCastProfile; label: string; placeholder: string; multiline?: boolean}[] = [
    {key: 'role', label: 'Vai trò trong series', placeholder: 'VD: Anh trai cả, nhân viên văn phòng hay lo xa', multiline: true},
    {key: 'personality', label: 'Tính cách', placeholder: 'VD: Tốt bụng, hấp tấp, hay tự tin quá mức', multiline: true},
    {key: 'signature', label: 'Dấu hiệu nhận diện', placeholder: 'VD: Áo xanh ngọc, tóc vuốt lệch, hay gãi đầu'},
    {key: 'speech', label: 'Cách nói / câu cửa miệng', placeholder: 'VD: Nói nhanh, hay nói "chắc chắn luôn!"'},
    {key: 'voice', label: 'Giọng', placeholder: 'VD: gemini:Puck'},
    {key: 'age', label: 'Độ tuổi', placeholder: 'VD: 25–30'},
];
