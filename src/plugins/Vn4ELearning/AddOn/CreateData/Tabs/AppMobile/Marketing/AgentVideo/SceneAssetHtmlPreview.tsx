import React from 'react';
import {characterPreviewDocument} from './sceneAssetCharacterPreview';
import {Alert, Box, CircularProgress} from '@mui/material';
import type {PhotoFaceTargets} from './photoFaceLandmarks';

const runtimeUrl = '/three.min.js?v=0.186.1';
const loaderPattern = /<script\b[^>]*\bsrc\s*=\s*["'](?:[^"']*\/)?three(?:\.min)?\.js[^"']*["'][^>]*>\s*<\/script>/gi;
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

const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
/** Only plain finite numbers (and known string ids) cross the iframe boundary into the fit. */
export function validPhotoFaceTargets(value:unknown):PhotoFaceTargets|null {
    const t=value as PhotoFaceTargets|undefined;
    if(!t||typeof t!=='object'||t.version!==2||!t.points||!t.frame||!t.layer||!t.scale||!t.parameters||!t.profiles||typeof t.head!=='string')return null;
    const pair=(p:unknown)=>Array.isArray(p)&&p.length===2&&p.every(finite);
    const points=Object.entries(t.points);
    if(points.length>64||!points.every(([,p])=>pair(p)))return null;
    if(![t.frame.rx,t.frame.ry,t.layer.width,t.layer.height,t.scale.x,t.scale.y].every(finite)||!Object.values(t.parameters).every(finite))return null;
    if(!Array.isArray(t.outline)||t.outline.length<2||t.outline.length>128||!t.outline.every(pair))return null;
    const ys=t.profiles.y,widths=Object.entries(t.profiles.widths||{});
    if(!Array.isArray(ys)||ys.length<2||ys.length>128||!ys.every(finite)||!Array.isArray(t.profiles.jaw)||t.profiles.jaw.length!==ys.length||!t.profiles.jaw.every(finite))return null;
    if(!widths.length||widths.length>32||!widths.every(([id,w])=>/^[a-z0-9_]{1,40}$/.test(id)&&Array.isArray(w)&&w.length===ys.length&&w.every(finite)))return null;
    return {version:2,points:Object.fromEntries(points) as PhotoFaceTargets['points'],frame:{rx:t.frame.rx,ry:t.frame.ry},layer:{width:t.layer.width,height:t.layer.height},
        scale:{x:t.scale.x,y:t.scale.y},outline:t.outline.map(p=>[p[0],p[1]] as [number,number]),profiles:{y:[...ys],widths:Object.fromEntries(widths.map(([id,w])=>[id,[...w]])),jaw:[...t.profiles.jaw]},
        parameters:{...t.parameters},head:t.head,...(finite(t.noseDepth)?{noseDepth:t.noseDepth}:{})};
}

export default function SceneAssetHtmlPreview({html, title, kind, height = '65vh', previewMessage, onPasteImage,onPhotoOutline,onPhotoTargets}: {html: string; title: string; kind?: string; height?: string; previewMessage?: Record<string, unknown>; onPasteImage?:(file:File)=>void;onPhotoOutline?:(points:number[][])=>void;onPhotoTargets?:(targets:PhotoFaceTargets)=>void}) {
    const frame = React.useRef<HTMLIFrameElement>(null);
    React.useEffect(()=>{
        if(!onPasteImage&&!onPhotoOutline&&!onPhotoTargets)return;
        const receive=(event:MessageEvent)=>{
            if(event.source!==frame.current?.contentWindow)return;
            if(event.data?.type==='sv-design-face-outline'){
                const points=event.data.points;
                if(Array.isArray(points)&&points.length<=256&&points.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>typeof n==='number'&&Number.isFinite(n))))onPhotoOutline?.(points);
                return;
            }
            if(event.data?.type==='sv-design-face-targets'){
                const targets=validPhotoFaceTargets(event.data.targets);
                if(targets)onPhotoTargets?.(targets);
                return;
            }
            if(event.data?.type!=='sv-design-photo-paste')return;
            const file=event.data.file;
            if(file instanceof Blob&&file.type.startsWith('image/'))onPasteImage?.(file instanceof File?file:new File([file],'clipboard.png',{type:file.type}));
        };
        window.addEventListener('message',receive);return ()=>window.removeEventListener('message',receive);
    },[onPasteImage,onPhotoOutline,onPhotoTargets]);
    const sendPreviewMessage = () => { if (previewMessage) frame.current?.contentWindow?.postMessage(previewMessage, '*'); };
    React.useEffect(sendPreviewMessage, [previewMessage]);
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
    const enablePaste=!!onPasteImage;
    const previewDocument=React.useMemo(()=>{
        if(!enablePaste)return prepared.document;
        const bridge=`<script>document.addEventListener('paste',function(event){var items=Array.from(event.clipboardData&&event.clipboardData.items||[]);var item=items.find(function(item){return item.kind==='file'&&item.type.indexOf('image/')===0;});var file=item&&item.getAsFile();if(file){event.preventDefault();parent.postMessage({type:'sv-design-photo-paste',file:file},'*');}});</script>`;
        return prepared.document.replace(/<\/body>/i,()=>bridge+'</body>');
    },[prepared.document,enablePaste]);
    if (error || prepared.error) return <Alert severity="error">{error || prepared.error}</Alert>;
    if (!prepared.document || readySource !== html) return <Box role="status" sx={{height, display: 'grid', placeItems: 'center'}}><CircularProgress aria-label="Đang tải preview hồ sơ"/></Box>;
    return <iframe ref={frame} onLoad={sendPreviewMessage} title={title} sandbox="allow-scripts" srcDoc={previewDocument} style={{width: '100%', height, border: 0, display: 'block'}}/>;
}
