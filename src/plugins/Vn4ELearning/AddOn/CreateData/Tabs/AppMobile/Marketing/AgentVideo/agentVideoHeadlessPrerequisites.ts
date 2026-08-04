/**
 * Hướng dẫn vận hành cho bước Headless / Gemini Web.
 * Gemini không có daemon riêng — queue worker spawn Puppeteer; relay chỉ để xem preview.
 */

export const HEADLESS_WORKER_CMD = './run_worker.sh';

export const HEADLESS_PREVIEW_RELAY_CMD =
    'cd resources/views/plugins/vn4-e-learning/inc/marketing-ai && npm run headless-preview:relay:local';

export const HEADLESS_GEMINI_LOGIN_CMD =
    'cd resources/views/plugins/vn4-e-learning/inc/marketing-ai && GEMINI_WEB_OPEN_BROWSER=1 GEMINI_WEB_HEADLESS=false node scripts/run-gemini-web-beat.mjs';

export const HEADLESS_NPM_INSTALL_CMD =
    'cd resources/views/plugins/vn4-e-learning/inc/marketing-ai && npm install';

export type HeadlessPrerequisiteKind =
    | 'worker'
    | 'preview_relay'
    | 'gemini_login'
    | 'npm_install'
    | 'general';

export function classifyHeadlessError(message: string): HeadlessPrerequisiteKind | null {
    const text = String(message || '').trim().toLowerCase();
    if (!text) {
        return null;
    }
    if (
        text.includes('npm install')
        || text.includes('chưa cài dependencies')
        || text.includes('không tìm thấy runner')
        || text.includes('node_modules')
    ) {
        return 'npm_install';
    }
    if (
        text.includes('đăng nhập')
        || text.includes('login')
        || text.includes('gemini yêu cầu')
        || text.includes('user_data_dir')
        || text.includes('session')
    ) {
        return 'gemini_login';
    }
    if (
        text.includes('relay')
        || text.includes('8791')
        || text.includes('headless preview')
        || text.includes('preview chưa')
        || text.includes('websocket preview')
    ) {
        return 'preview_relay';
    }
    if (
        text.includes('worker')
        || text.includes('queue')
        || text.includes('đang chờ job')
        || text.includes('pending quá lâu')
    ) {
        return 'worker';
    }
    if (
        text.includes('gemini')
        || text.includes('puppeteer')
        || text.includes('chrome')
        || text.includes('headless')
        || text.includes('socket hang up')
        || text.includes('không khởi chạy được node')
    ) {
        return 'general';
    }
    return null;
}

export function headlessPrerequisiteHowto(kind: HeadlessPrerequisiteKind): string {
    switch (kind) {
        case 'npm_install':
            return `Cài deps Gemini Web (trong repo backend):\n${HEADLESS_NPM_INSTALL_CMD}`;
        case 'gemini_login':
            return [
                'Đăng nhập Google cho profile Chrome Gemini (chạy 1 lần, headed):',
                HEADLESS_GEMINI_LOGIN_CMD,
                'Sau khi login xong, tắt headed (GEMINI_WEB_OPEN_BROWSER=0) và chạy lại bước.',
            ].join('\n');
        case 'preview_relay':
            return [
                'Bật headless preview relay (xem live Chrome trong CMS):',
                HEADLESS_PREVIEW_RELAY_CMD,
                'Health: GET http://127.0.0.1:8791/healthz',
            ].join('\n');
        case 'worker':
            return [
                'Bật queue worker (bắt buộc — không có thì job Gemini không chạy):',
                `Trong thư mục backend (_biong_backend): ${HEADLESS_WORKER_CMD}`,
            ].join('\n');
        case 'general':
        default:
            return [
                'Bước Headless/Gemini cần:',
                `1) Queue worker: ${HEADLESS_WORKER_CMD} (trong _biong_backend)`,
                `2) (Tuỳ chọn) Preview live: ${HEADLESS_PREVIEW_RELAY_CMD}`,
                `3) Nếu Gemini bắt login Google: ${HEADLESS_GEMINI_LOGIN_CMD}`,
            ].join('\n');
    }
}

/** Gắn hướng dẫn start vào message lỗi nếu nhận diện được. */
export function appendHeadlessHowtoToError(message: string): string {
    const kind = classifyHeadlessError(message);
    if (!kind) {
        return message;
    }
    const howto = headlessPrerequisiteHowto(kind);
    if (message.includes(HEADLESS_WORKER_CMD) || message.includes('headless-preview:relay')) {
        return message;
    }
    return `${message}\n\n→ Cách bật lại:\n${howto}`;
}
