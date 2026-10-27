import React from 'react';
import {CHARACTER_EMOTIONS} from 'helpers/characterEmotions';
import {
    Box,
    Alert,
    Slider,
    TextField,
    MenuItem,
    Button,
    CircularProgress,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import {CharacterConfig, loadCharacterRuntime} from 'helpers/marketingShortVideoModel3dApi';
import type { SxProps, Theme } from '@mui/material/styles';

export type Model3dPreviewHandle = {
    /** Chụp khung hình hiện tại thành PNG blob (để lưu làm thumbnail). */
    captureThumbnail: () => Promise<Blob | null>;
    /** Đưa camera/khung nhìn về mặc định. */
    resetView: () => void;
};

type Props = {
    /** URL file .glb/.gltf (nên là URL proxy same-origin để tránh CORS). */
    url: string;
    character?: CharacterConfig;
    height?: number;
    sx?: SxProps<Theme>;
    onLoaded?: () => void;
    onError?: (message: string) => void;
};

type PreviewRuntime = {
    capture: () => Promise<Blob | null>;
    reset: () => void;
    dispose: () => void;
};

/** Kích thước render cố định (vuông) — ảnh thumbnail cũng lấy đúng kích thước này. */
const PREVIEW_SIZE = 512;
/** Giá trị khi không chạy animation (giữ nguyên bind pose). */
const NO_CLIP = '';

/**
 * Preview model 3D (three.js) + các nút chọn clip/animation để xem thử + chụp
 * thumbnail. Danh sách clip hiển thị thành hàng nút bấm phía TRÊN box preview.
 * Dùng dynamic import để chỉ tải three.js khi thực sự mở preview.
 */
const Model3dPreview = React.forwardRef<Model3dPreviewHandle, Props>(function Model3dPreview(
    { url, sx, onLoaded, onError, character },
    ref,
) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [failed, setFailed] = React.useState(false);
    const [clipNames, setClipNames] = React.useState<string[]>([]);
    const [activeClip, setActiveClip] = React.useState<string>(NO_CLIP);
    const [paused, setPaused] = React.useState(false);

    const characterRef = React.useRef(character); characterRef.current=character;
    const engineRef = React.useRef<ANY>(null);
    const [additiveNames,setAdditiveNames] = React.useState<string[]>([]);
    const [weights,setWeights] = React.useState<Record<string,number>>({});
    const weightsRef = React.useRef(weights); weightsRef.current=weights;
    const clipRef = React.useRef(activeClip); clipRef.current=activeClip;
    const pausedRef = React.useRef(paused); pausedRef.current=paused;
    const [appearanceError,setAppearanceError] = React.useState('');
    const [expression,setExpression]=React.useState('default');
    const expressionRef=React.useRef(expression); expressionRef.current=expression;
    const [faceCloseup,setFaceCloseup]=React.useState(false);
    const faceViewRef=React.useRef<((closeup:boolean)=>void) | null>(null);
    const [speaking,setSpeaking] = React.useState(false);
    const speakingRef = React.useRef(speaking); speakingRef.current=speaking;
    const runtimeRef = React.useRef<PreviewRuntime | null>(null);
    const actionsRef = React.useRef<Map<string, ANY> | null>(null);
    const activeActionRef = React.useRef<ANY>(null);
    const mixerRef = React.useRef<ANY>(null);

    const onLoadedRef = React.useRef(onLoaded);
    onLoadedRef.current = onLoaded;
    const onErrorRef = React.useRef(onError);
    onErrorRef.current = onError;

    React.useEffect(() => {
        if (engineRef.current) { try {engineRef.current.rebuild(character); setAppearanceError('');} catch(e) {setAppearanceError(e instanceof Error?e.message:'Không lắp được ngoại hình.');} }
    },[character]);

    React.useImperativeHandle(ref, () => ({
        captureThumbnail: () => (runtimeRef.current ? runtimeRef.current.capture() : Promise.resolve(null)),
        resetView: () => {
            runtimeRef.current?.reset();
        },
    }), []);

    /** Phát 1 clip theo tên (NO_CLIP = dừng về bind pose). */
    const playClip = React.useCallback((name: string) => {
        if (engineRef.current) return;
        const mixer = mixerRef.current;
        const actions = actionsRef.current;
        if (!mixer || !actions) {
            return;
        }
        if (activeActionRef.current) {
            activeActionRef.current.fadeOut(0.2);
            activeActionRef.current = null;
        }
        if (!name) {
            return;
        }
        const action = actions.get(name);
        if (!action) {
            return;
        }
        action.reset();
        action.setEffectiveTimeScale(1);
        action.setEffectiveWeight(1);
        action.fadeIn(0.2).play();
        activeActionRef.current = action;
    }, []);

    const handleSelectClip = (name: string) => {
        setActiveClip(name);
        setPaused(false);
        if (mixerRef.current) {
            mixerRef.current.timeScale = 1;
        }
        playClip(name);
    };

    const handleTogglePause = () => {
        setPaused((prev) => {
            const next = !prev;
            if (mixerRef.current) {
                mixerRef.current.timeScale = next ? 0 : 1;
            }
            return next;
        });
    };

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container || !url) {
            return undefined;
        }

        let disposed = false;
        let raf = 0;
        let three: ANY = null;
        let renderer: ANY = null;
        let scene: ANY = null;
        let camera: ANY = null;
        let controls: ANY = null;
        let root: ANY = null;
        let mixer: ANY = null;
        let clock: ANY = null;

        const runtime: PreviewRuntime = {
            capture: async () => null,
            reset: () => undefined,
            dispose: () => undefined,
        };
        runtimeRef.current = runtime;
        actionsRef.current = null;
        activeActionRef.current = null;
        mixerRef.current = null;

        setLoading(true);
        setFailed(false);
        setClipNames([]);
        setAdditiveNames([]); setWeights({}); setSpeaking(false); setExpression('default'); setFaceCloseup(false); setAppearanceError('');
        setActiveClip(NO_CLIP);
        setPaused(false);
        container.innerHTML = '';

        const setup = async () => {
            try {
                three = await import('three');
                const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
                const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
                if (disposed) {
                    return;
                }

                try {
                    renderer = new three.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
                } catch {
                    throw new Error('Trình duyệt không hỗ trợ WebGL');
                }
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                renderer.setSize(PREVIEW_SIZE, PREVIEW_SIZE, false);
                renderer.domElement.style.width = '100%';
                renderer.domElement.style.height = '100%';
                renderer.domElement.style.display = 'block';
                container.appendChild(renderer.domElement);

                scene = new three.Scene();
                scene.background = new three.Color(0xf3f4f6);

                camera = new three.PerspectiveCamera(45, 1, 0.01, 5000);

                scene.add(new three.HemisphereLight(0xffffff, 0x8d8d8d, 1.1));
                const keyLight = new three.DirectionalLight(0xffffff, 2.0);
                keyLight.position.set(4, 7, 5);
                scene.add(keyLight);
                const fillLight = new three.DirectionalLight(0xffffff, 0.8);
                fillLight.position.set(-5, 3, -4);
                scene.add(fillLight);
                scene.add(new three.AmbientLight(0xffffff, 0.5));

                controls = new OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.1;
                controls.enablePan = false;
                controls.rotateSpeed = 0.9;

                const loader = new GLTFLoader();
                const gltf: ANY = await loader.loadAsync(url);
                if (disposed) {
                    return;
                }

                root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
                scene.add(root);

                // Căn giữa model về gốc tọa độ + fit camera theo bounding box.
                const box = new three.Box3().setFromObject(root);
                const size = new three.Vector3();
                box.getSize(size);
                const center = new three.Vector3();
                box.getCenter(center);
                root.position.x -= center.x;
                root.position.y -= center.y;
                root.position.z -= center.z;

                const maxDim = Math.max(size.x, size.y, size.z) || 1;
                const fovRad = (camera.fov * Math.PI) / 180;
                const distance = (maxDim / 2 / Math.tan(fovRad / 2)) * 1.7;
                const viewDir = new three.Vector3(2.2, 1.6, 2.8).normalize().multiplyScalar(distance);

                const applyDefaultView = () => {
                    camera.position.copy(viewDir);
                    camera.lookAt(0, 0, 0);
                    controls.target.set(0, 0, 0);
                    controls.minDistance = maxDim * 0.4;
                    controls.maxDistance = maxDim * 6;
                    controls.update();
                };
                applyDefaultView();

                // Animation clips: dựng mixer + map tên clip → action.
                const clips: ANY[] = Array.isArray(gltf.animations) ? gltf.animations : [];
                let firstClipName = NO_CLIP;
                if (clips.length > 0) {
                    mixer = new three.AnimationMixer(root);
                    mixerRef.current = mixer;
                    const actions = new Map<string, ANY>();
                    const names: string[] = [];
                    clips.forEach((clip: ANY, index: number) => {
                        const rawName = String((clip && clip.name) || '').trim();
                        const name = rawName !== '' ? rawName : `clip_${index}`;
                        actions.set(name, mixer.clipAction(clip));
                        names.push(name);
                    });
                    actionsRef.current = actions;
                    setClipNames(names);
                    firstClipName = names[0] || NO_CLIP;
                    setActiveClip(firstClipName);
                    if (firstClipName) {
                        playClip(firstClipName);
                    }
                }

                if (characterRef.current) {
                    const shared = await loadCharacterRuntime();
                    if (disposed) return;
                    if (mixer) {mixer.stopAllAction(); mixer.uncacheRoot(root);}
                    const engine=shared.create(three,root,clips,characterRef.current);
                    engineRef.current=engine;
                    setClipNames(engine.baseClips); setAdditiveNames(engine.additiveClips);
                    setActiveClip(engine.baseClips.includes('idle')?'idle':engine.baseClips[0] || NO_CLIP);
                    mixer=null; mixerRef.current=null;
                }
                faceViewRef.current=(closeup:boolean)=>{
                    if(!closeup){applyDefaultView();return;}
                    const head=engineRef.current?.bones.head;
                    if(!head)return;
                    const target=head.getWorldPosition(new three.Vector3());target.y+=maxDim*.06;
                    controls.target.copy(target);camera.position.copy(target).add(new three.Vector3(0,.02,maxDim*.70));controls.update();
                };
                clock = new three.Timer();
                let elapsed=0, emotionStart=0, previousEmotion='';

                const render = () => {
                    if (disposed) {
                        return;
                    }
                    raf = requestAnimationFrame(render);
                    clock.update(); const delta=clock.getDelta();
                    if (engineRef.current) {
                        if (!pausedRef.current) elapsed+=delta;
                        const emotion=expressionRef.current==='default'?characterRef.current?.expression:expressionRef.current;
                        if(emotion!==previousEmotion){previousEmotion=emotion || '';emotionStart=elapsed;}
                        engineRef.current.pose(elapsed,{emotionTime:elapsed-emotionStart,clip:clipRef.current,additive:weightsRef.current,speaking:speakingRef.current,expression:expressionRef.current==='default'?characterRef.current?.expression:expressionRef.current});
                    } else if (mixer) {mixer.update(delta);}
                    controls.update();
                    renderer.render(scene, camera);
                };
                render();

                runtime.capture = async () => {
                    if (disposed || !renderer || !scene || !camera) {
                        return null;
                    }
                    renderer.render(scene, camera);
                    return new Promise<Blob | null>((resolve) => {
                        try {
                            renderer.domElement.toBlob(
                                (blob: Blob | null) => resolve(blob),
                                'image/png',
                            );
                        } catch {
                            resolve(null);
                        }
                    });
                };
                runtime.reset = applyDefaultView;

                setLoading(false);
                onLoadedRef.current?.();
            } catch (err) {
                if (disposed) {
                    return;
                }
                setLoading(false);
                setFailed(true);
                onErrorRef.current?.(err instanceof Error ? err.message : 'Không tải được model');
            }
        };

        setup();

        return () => {
            disposed = true;
            if (raf) {
                cancelAnimationFrame(raf);
            }
            try {
                if (engineRef.current) {engineRef.current.dispose(); engineRef.current=null;}
                if (mixer) {
                    mixer.stopAllAction();
                    if (root && typeof mixer.uncacheRoot === 'function') {
                        mixer.uncacheRoot(root);
                    }
                }
                if (root && typeof root.traverse === 'function') {
                    root.traverse((obj: ANY) => {
                        if (obj && obj.geometry && typeof obj.geometry.dispose === 'function') {
                            obj.geometry.dispose();
                        }
                        const material = obj ? obj.material : null;
                        if (Array.isArray(material)) {
                            material.forEach((item: ANY) => item && typeof item.dispose === 'function' && item.dispose());
                        } else if (material && typeof material.dispose === 'function') {
                            material.dispose();
                        }
                    });
                }
                if (controls && typeof controls.dispose === 'function') {
                    controls.dispose();
                }
                if (renderer && typeof renderer.dispose === 'function') {
                    renderer.dispose();
                }
                if (renderer && renderer.domElement && renderer.domElement.parentNode) {
                    renderer.domElement.parentNode.removeChild(renderer.domElement);
                }
            } catch {
                // ignore cleanup errors
            }
            actionsRef.current = null;
            activeActionRef.current = null;
            mixerRef.current = null;
            runtimeRef.current = null; faceViewRef.current=null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, !!character]);

    const hasClips = clipNames.length > 0;

    return (
        <Box
            sx={[
                {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    width: '100%',
                    maxWidth: 480,
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
        >
            {hasClips ? (
                <Stack
                    direction="row"
                    spacing={0.75}
                    useFlexGap
                    flexWrap="wrap"
                    alignItems="center"
                >
                    <Button
                        size="small"
                        variant={activeClip === NO_CLIP ? 'contained' : 'outlined'}
                        onClick={() => handleSelectClip(NO_CLIP)}
                        sx={{ textTransform: 'none' }}
                    >
                        Không animation
                    </Button>
                    {clipNames.map((name) => (
                        <Button
                            key={name}
                            size="small"
                            variant={activeClip === name ? 'contained' : 'outlined'}
                            onClick={() => handleSelectClip(name)}
                            sx={{ textTransform: 'none' }}
                        >
                            {({idle:'Đứng',walk:'Đi bộ',run:'Chạy'} as Record<string,string>)[name] || name}
                        </Button>
                    ))}
                    <Tooltip title={paused ? 'Chạy' : 'Tạm dừng'}>
                        <span>
                            <IconButton size="small" onClick={handleTogglePause} disabled={!activeClip}>
                                {paused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>
            ) : null}
            {appearanceError && <Alert severity="error">{appearanceError}</Alert>}
            {character?.enabled && <Stack spacing={1}>
                <TextField select size="small" label="Thử biểu cảm" value={expression} onChange={e=>setExpression(e.target.value)}>
                    <MenuItem value="default">Theo cấu hình đã lưu</MenuItem>
                    {Object.entries(CHARACTER_EMOTIONS).map(([id,label])=><MenuItem key={id} value={id}>{label}</MenuItem>)}
                </TextField>
                <Stack direction="row" spacing={1}><Button size="small" variant={speaking?'contained':'outlined'} onClick={()=>setSpeaking(v=>!v)}>Thử nói chuyện</Button><Button size="small" variant={faceCloseup?'contained':'outlined'} onClick={()=>{setFaceCloseup(!faceCloseup);faceViewRef.current?.(!faceCloseup);}}>{faceCloseup?'Xem toàn thân':'Cận khuôn mặt'}</Button></Stack>
            </Stack>}
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1 / 1',
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'grey.100',
                    overflow: 'hidden',
                }}
            >
                <Box ref={containerRef} sx={{ width: '100%', height: '100%' }} />
                {loading && !failed ? (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1,
                            bgcolor: 'rgba(255,255,255,0.7)',
                        }}
                    >
                        <CircularProgress size={26} />
                        <Typography variant="caption" color="text.secondary">
                            Đang tải model…
                        </Typography>
                    </Box>
                ) : null}
                {failed ? (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 2,
                            textAlign: 'center',
                        }}
                    >
                        <Typography variant="caption" color="text.secondary">
                            Không hiển thị được preview 3D.
                        </Typography>
                    </Box>
                ) : null}
                {!loading && !failed ? (
                    <Tooltip title="Xoay lại khung nhìn">
                        <IconButton
                            size="small"
                            onClick={() => runtimeRef.current?.reset()}
                            sx={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                bgcolor: 'rgba(255,255,255,0.8)',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.95)' },
                            }}
                        >
                            <RestartAltOutlinedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                ) : null}
            </Box>
            {additiveNames.length>0 && <Box component="details"><Box component="summary" sx={{cursor:'pointer',fontWeight:600,p:1}}>Phối thêm chuyển động</Box><Stack spacing={1} sx={{p:1.5,border:'1px solid',borderColor:'divider',borderRadius:1.5}}>
                <Typography variant="subtitle2">Phối thêm chuyển động</Typography>
                {additiveNames.map(name=><Box key={name}><Typography variant="caption">{({sneak_pose:'Dáng rón rén',sad_pose:'Dáng buồn',agree:'Gật đầu',headShake:'Lắc đầu'} as Record<string,string>)[name] || name} · {Math.round((weights[name] || 0)*100)}%</Typography>
                    <Slider aria-label={name} min={0} max={1} step={.01} value={weights[name] || 0} onChange={(_,v)=>setWeights(prev=>({...prev,[name]:v as number}))}/></Box>)}
                <Button size="small" onClick={()=>setWeights({})}>Đặt lại phối chuyển động</Button>
            </Stack></Box>}
        </Box>
    );
});

export default Model3dPreview;
