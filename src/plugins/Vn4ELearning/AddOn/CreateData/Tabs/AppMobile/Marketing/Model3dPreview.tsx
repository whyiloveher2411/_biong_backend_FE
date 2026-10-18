import React from 'react';
import {
    Box,
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
    { url, sx, onLoaded, onError },
    ref,
) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [failed, setFailed] = React.useState(false);
    const [clipNames, setClipNames] = React.useState<string[]>([]);
    const [activeClip, setActiveClip] = React.useState<string>(NO_CLIP);
    const [paused, setPaused] = React.useState(false);

    const runtimeRef = React.useRef<PreviewRuntime | null>(null);
    const actionsRef = React.useRef<Map<string, ANY> | null>(null);
    const activeActionRef = React.useRef<ANY>(null);
    const mixerRef = React.useRef<ANY>(null);

    const onLoadedRef = React.useRef(onLoaded);
    onLoadedRef.current = onLoaded;
    const onErrorRef = React.useRef(onError);
    onErrorRef.current = onError;

    React.useImperativeHandle(ref, () => ({
        captureThumbnail: () => (runtimeRef.current ? runtimeRef.current.capture() : Promise.resolve(null)),
        resetView: () => {
            runtimeRef.current?.reset();
        },
    }), []);

    /** Phát 1 clip theo tên (NO_CLIP = dừng về bind pose). */
    const playClip = React.useCallback((name: string) => {
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

                clock = new three.Clock();

                const render = () => {
                    if (disposed) {
                        return;
                    }
                    raf = requestAnimationFrame(render);
                    if (mixer) {
                        mixer.update(clock.getDelta());
                    }
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
            runtimeRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

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
                            {name}
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
        </Box>
    );
});

export default Model3dPreview;
