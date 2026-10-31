import React from 'react';
import { Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, Stack, TextField } from '@mui/material';
import { parseShortVideoCookieApiMessage, readZohoMail, signupClaudeCookie } from 'helpers/marketingShortVideoCookieApi';

type Props = { onSaved: () => void };
export default function ClaudeSignupControl({ onSaved }: Props) {
    const [email, setEmail] = React.useState('');
    const [name, setName] = React.useState('Spacedev');
    const [acceptAgeTerms, setAcceptAgeTerms] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [notice, setNotice] = React.useState<{ error: boolean; text: string } | null>(null);
    const run = async (signup: boolean) => {
        if (busy) return;
        setBusy(true); setNotice(null);
        try {
            if (signup) {
                const result = await signupClaudeCookie(email.trim(), name.trim(), acceptAgeTerms);
                setNotice({ error: !result.success, text: result.success
                    ? `Đã đăng ký và lưu ${result.cookie_count || 0} cookie Claude.`
                    : result.error || parseShortVideoCookieApiMessage(result, 'Đăng ký chưa hoàn tất.') });
                if (result.success) onSaved();
            } else {
                const result = await readZohoMail(email.trim());
                setNotice({ error: !result.success, text: result.success
                    ? `Đã kết nối Zoho. Đọc ${result.scanned || 0} thư gần nhất, tìm thấy ${result.emails?.length || 0} thư cho địa chỉ này.`
                    : result.error || 'Không đọc được Zoho.' });
            }
        } catch (error) {
            setNotice({ error: true, text: error instanceof Error ? error.message : String(error) });
        } finally { setBusy(false); }
    };
    return <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
        <Stack spacing={1.5}>
            <Alert severity="info">Đăng ký Claude bằng email, xác nhận qua Zoho, hoàn tất onboarding và lưu cookie. Chrome hiển thị trong quá trình chạy. Thông tin Zoho lấy từ cấu hình server.</Alert>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField label="Email đăng ký Claude" type="email" size="small" value={email} disabled={busy}
                    onChange={(event) => setEmail(event.target.value)} fullWidth />
                <TextField label="Tên hiển thị" size="small" value={name} disabled={busy}
                    onChange={(event) => setName(event.target.value)} />
            </Stack>
            <FormControlLabel control={<Checkbox checked={acceptAgeTerms} disabled={busy}
                onChange={(event) => setAcceptAgeTerms(event.target.checked)} />}
                label="Tôi xác nhận chủ tài khoản từ 18 tuổi trở lên và đồng ý Consumer Terms, Acceptable Use Policy của Anthropic." />
            <Stack direction="row" spacing={1}>
                <Button variant="outlined" disabled={busy || !email.trim()} onClick={() => void run(false)}>Kiểm tra Zoho</Button>
                <Button variant="contained" disabled={busy || !email.trim() || !name.trim() || !acceptAgeTerms} onClick={() => void run(true)}
                    startIcon={busy ? <CircularProgress size={14} color="inherit" /> : undefined}>Đăng ký Claude và lưu cookie</Button>
            </Stack>
            {notice ? <Alert severity={notice.error ? 'error' : 'success'}>{notice.text}</Alert> : null}
        </Stack>
    </Box>;
}
