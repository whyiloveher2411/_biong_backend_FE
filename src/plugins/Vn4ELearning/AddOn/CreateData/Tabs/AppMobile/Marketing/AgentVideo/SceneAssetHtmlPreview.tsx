import React from 'react';
import {characterPreviewDocument} from './sceneAssetCharacterPreview';
import {Alert, Box, CircularProgress} from '@mui/material';

const runtimeUrl = '/three.min.js?v=0.186.1';
const loaderPattern = /<script\b[^>]*\bsrc\s*=\s*["'][^"']*\/three(?:\.min)?\.js[^"']*["'][^>]*>\s*<\/script>/gi;
let runtimeRequest: Promise<string> | null = null;
function runtimeSource(): Promise<string> {
    if (!runtimeRequest) {
        // The parent can fetch same-origin assets; an opaque sandbox cannot request loopback.
        runtimeRequest = fetch(runtimeUrl).then(async response => {
            if (!response.ok) throw new Error(`Không tải được Three.js r186 (HTTP ${response.status}).`);
            const source = await response.text();
            if (!source.includes('__SV_THREE_VERSION') || !source.includes('0.186.1')) {
                throw new Error('Máy chủ chưa cung cấp đúng bundle Three.js 0.186.1.');
            }
            return source;
        }).catch(error => { runtimeRequest = null; throw error; });
    }
    return runtimeRequest;
}

export default function SceneAssetHtmlPreview({html, title, kind, height = '65vh'}: {html: string; title: string; kind?: string; height?: string}) {
    const [runtime, setRuntime] = React.useState('');
    const [error, setError] = React.useState('');
    const [readySource, setReadySource] = React.useState('');
    React.useEffect(() => {
        let active = true;
        setError(''); setReadySource('');
        loaderPattern.lastIndex = 0;
        const needsRuntime = kind === 'character' || loaderPattern.test(html);
        const prepare = needsRuntime ? runtimeSource() : Promise.resolve('');
        void prepare.then(source => {if (active) {setRuntime(source); setReadySource(html);}})
            .catch(e => {if (active) setError(e instanceof Error ? e.message : 'Không mở được preview hồ sơ.');});
        return () => {active = false;};
    }, [html, kind]);
    // Cache the runtime only, not a finished iframe document. A template update must
    // rebuild srcDoc even when the saved character HTML has not changed.
    const buildCharacterDocument = characterPreviewDocument;
    const prepared = React.useMemo(() => {
        if (readySource !== html) return {document: '', error: ''};
        try {
            if (kind === 'character') {
                const document = buildCharacterDocument(html, runtime);
                if (!document) throw new Error('Hồ sơ nhân vật thiếu sv-asset-module. Hãy tạo lại hồ sơ.');
                return {document, error: ''};
            }
            loaderPattern.lastIndex = 0;
            const inlineRuntime = runtime.replace(/<\/script/gi, '<\\/script');
            return {document: html.replace(loaderPattern, () => `<script data-sv-three-version="0.186.1">${inlineRuntime}</script>`), error: ''};
        } catch (e) {return {document: '', error: e instanceof Error ? e.message : 'Không mở được preview hồ sơ.'};}
    }, [html, kind, runtime, readySource, buildCharacterDocument]);
    if (error || prepared.error) return <Alert severity="error">{error || prepared.error}</Alert>;
    if (!prepared.document || readySource !== html) return <Box role="status" sx={{height, display: 'grid', placeItems: 'center'}}><CircularProgress aria-label="Đang tải preview hồ sơ"/></Box>;
    return <iframe title={title} sandbox="allow-scripts" srcDoc={prepared.document} style={{width: '100%', height, border: 0, display: 'block'}}/>;
}
