/** CMS-owned inspection UI. Only the canonical factory is executed, never AI-authored UI. */
export function characterPreviewDocument(html: string, runtime: string): string | null {
    const scripts = Array.from(html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi));
    const module = scripts.find(match => /\bid\s*=\s*["']sv-asset-module["']/i.test(match[1]));
    if (!module) return null;
    const safeRuntime = runtime.replace(/<\/script/gi, '<\\/script');
    return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#10151d;color:#e2e8f0;font:13px system-ui}*{box-sizing:border-box}
#toolbar{position:absolute;inset:0 0 auto;z-index:2;display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:10px;background:#131c27;border-bottom:1px solid #334155}
[hidden]{display:none!important}label{display:flex;gap:6px;align-items:center}select,button{background:#243247;color:#fff;border:1px solid #64748b;border-radius:5px;padding:5px}#stage{position:absolute;inset:0}canvas{display:block}#error{position:absolute;bottom:10px;left:12px;right:12px;color:#fca5a5}
</style></head><body><div id="toolbar" aria-label="Điều khiển nhân vật">
<label>Biểu cảm <select id="emotion"><option value="neutral">Trung tính</option><option value="happy">Vui</option><option value="sad">Buồn</option><option value="angry">Giận</option><option value="surprised">Ngạc nhiên</option><option value="worried">Lo lắng</option><option value="smug">Tự mãn</option><option value="thinking">Suy nghĩ</option></select></label>
<label>Tư thế <select id="pose"><option value="idle">Đứng</option><option value="sit">Ngồi</option></select></label>
<label>Bước đi <input id="gait" aria-label="Bước đi" type="range" min="0" max="6.283185" step="0.05" value="0"></label>
<label id="deadpan-control" hidden><input id="deadpan" aria-label="Mặt đơ hài" type="checkbox">Mặt đơ hài</label>
<label id="intensity-control" hidden>Cường độ <input id="intensity" aria-label="Cường độ cảm xúc" type="range" min="0" max="1" step="0.05" value="1"></label>
<label>Thời gian <input id="preview-time" aria-label="Thời gian biểu cảm" type="range" min="0" max="3" step="0.02" value="0"><output id="time-value">0.00s</output></label>
<button id="play" type="button">Phát biểu cảm</button>
<button id="reset">Đặt lại</button><span>Kéo để xoay · Cuộn để phóng to</span></div>
<div id="stage"></div><div id="error" role="alert"></div>
<script data-sv-three-version="0.186.1">${safeRuntime}</script><script id="sv-asset-module">${module[2]}</script><script>
(function(){
try {
 const stage=document.getElementById('stage'),toolbar=document.getElementById('toolbar');
 const renderer=new THREE.WebGLRenderer({antialias:true});stage.appendChild(renderer.domElement);
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#10151d');
 const camera=new THREE.PerspectiveCamera(35,1,.01,100);
 const asset=window.SVAssetFactory(THREE,{});scene.add(asset.root);
 if(typeof asset.update!=='function')throw new Error('Nhân vật chưa hỗ trợ giao diện update(t,state). Hãy tạo lại hồ sơ.');
 let previewTime=0,playing=false,playStarted=0,playOffset=0,frameId=0;
 const state={neutralCue:false,emotionTime:0,emotionEffects:true,emotionIntensity:1,emotion:'neutral',pose:'idle',gaitPhase:0,walkWeight:0,jointRotations:{}};
 if(asset.capabilities?.neutralCue===true)document.getElementById('deadpan-control').hidden=false;
 if(asset.capabilities?.emotionIntensity){document.getElementById('intensity-control').hidden=false;for(const id of ['crying','laughing'])if(asset.capabilities.emotions?.includes(id)){const option=document.createElement('option');option.value=id;option.textContent=id==='crying'?'Khóc thành dòng':'Cười lớn';document.getElementById('emotion').appendChild(option);}}
 asset.update(0,state);asset.root.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(asset.root),size=bounds.getSize(new THREE.Vector3());
 if(bounds.isEmpty())throw new Error('Nhân vật không có hình học.');
 // Reserve peak-size headroom for declared anime graphics without fitting hidden zero-scale meshes.
 if(asset.capabilities?.emotionEffects==='anime_v2')bounds.max.y+=size.y*.22;
 bounds.getSize(size);
 const scale=Math.max(size.y,size.x,size.z,.1),center=bounds.getCenter(new THREE.Vector3());
 const key=new THREE.DirectionalLight(0xffe2bb,3.0);key.position.copy(center).add(new THREE.Vector3(-2,3,4).multiplyScalar(scale));key.target.position.copy(center);key.castShadow=true;
 key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=key.shadow.camera.bottom=-scale*2;key.shadow.camera.right=key.shadow.camera.top=scale*2;key.shadow.camera.far=scale*15;key.shadow.normalBias=.015;scene.add(key,key.target);
 const fill=new THREE.DirectionalLight(0xb5cefa,.8);fill.position.copy(center).add(new THREE.Vector3(2,1,3).multiplyScalar(scale));scene.add(fill);
 scene.add(new THREE.HemisphereLight(0xaabbd2,0x26201b,.3));
 const rim=new THREE.DirectionalLight(0x8cafff,.6);rim.position.copy(center).add(new THREE.Vector3(2,2,-3).multiplyScalar(scale));scene.add(rim);
 // Small muted softboxes provide real material reflections without washing out the subject.
 const envScene=new THREE.Scene();envScene.background=new THREE.Color(0x151c28);
 [[-3,2,3],[3,1,1]].forEach(function(p){const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.5,3),new THREE.MeshBasicMaterial({color:0x8997aa,side:THREE.DoubleSide}));panel.position.set(p[0],p[1],p[2]);panel.lookAt(0,0,0);envScene.add(panel);});
 const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(envScene);scene.environment=env.texture;scene.environmentIntensity=.2;pmrem.dispose();
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(scale*16,scale*16),new THREE.MeshStandardMaterial({color:0x20242e,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.01;ground.receiveShadow=true;scene.add(ground);
 let yaw=.18,pitch=.06,distance=1,baseDistance=1,target=center.clone();
 function render(){camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);renderer.render(scene,camera);}
 function fit(){const top=toolbar.getBoundingClientRect().height,w=innerWidth,h=Math.max(1,innerHeight-top);stage.style.top=top+'px';renderer.setSize(w,h);camera.aspect=w/h;camera.far=Math.max(100,scale*100);camera.updateProjectionMatrix();const v=THREE.MathUtils.degToRad(camera.fov/2),horizontal=Math.atan(Math.tan(v)*camera.aspect);baseDistance=Math.max(size.y/(2*Math.tan(v)),Math.hypot(size.x,size.z)/(2*Math.tan(horizontal)))*1.25+size.z/2;distance=baseDistance;render();}
 function update(){state.emotionTime=previewTime;state.effectFacingYaw=yaw;asset.update(previewTime,state);asset.root.updateMatrixWorld(true);render();document.getElementById('preview-time').value=String(previewTime);document.getElementById('time-value').textContent=previewTime.toFixed(2)+'s';}
 function stop(){playing=false;cancelAnimationFrame(frameId);document.getElementById('play').textContent='Phát biểu cảm';}
 function tick(now){if(!playing)return;previewTime=Math.min(3,playOffset+(now-playStarted)/1000);update();if(previewTime>=3){stop();return;}frameId=requestAnimationFrame(tick);}
 function play(){stop();if(previewTime>=3)previewTime=0;playOffset=previewTime;playStarted=performance.now();playing=true;document.getElementById('play').textContent='Dừng';frameId=requestAnimationFrame(tick);}
 document.getElementById('preview-time').oninput=function(){stop();previewTime=Number(this.value);update();};
 document.getElementById('play').onclick=function(){if(playing)stop();else play();};
 document.getElementById('deadpan').onchange=function(){stop();previewTime=0;state.neutralCue=this.checked;state.emotion='neutral';document.getElementById('emotion').value='neutral';update();};
 document.getElementById('intensity').oninput=function(){state.emotionIntensity=Number(this.value);update();};
 document.getElementById('emotion').onchange=function(){stop();previewTime=0;state.neutralCue=false;document.getElementById('deadpan').checked=false;state.emotion=this.value;update();if(this.value==='laughing'||this.value==='crying')play();};
 document.getElementById('pose').onchange=function(){state.pose=this.value;state.walkWeight=0;document.getElementById('gait').value='0';state.gaitPhase=0;update();};
 document.getElementById('gait').oninput=function(){state.gaitPhase=Number(this.value);state.walkWeight=state.gaitPhase?1:0;state.pose='idle';document.getElementById('pose').value='idle';update();};
 document.getElementById('reset').onclick=function(){stop();previewTime=0;state.neutralCue=false;document.getElementById('deadpan').checked=false;state.emotionIntensity=1;document.getElementById('intensity').value='1';state.emotion='neutral';state.pose='idle';state.gaitPhase=0;state.walkWeight=0;document.getElementById('emotion').value='neutral';document.getElementById('pose').value='idle';document.getElementById('gait').value='0';yaw=.18;pitch=.06;target.copy(center);update();fit();};
 let drag=null;renderer.domElement.onpointerdown=function(e){drag=[e.clientX,e.clientY];this.setPointerCapture(e.pointerId);};
 renderer.domElement.onpointermove=function(e){if(!drag)return;yaw-=(e.clientX-drag[0])*.008;pitch=Math.max(-.45,Math.min(.9,pitch+(e.clientY-drag[1])*.006));drag=[e.clientX,e.clientY];render();};renderer.domElement.onpointerup=renderer.domElement.onpointercancel=function(){drag=null;};
 renderer.domElement.addEventListener('wheel',function(e){e.preventDefault();distance=Math.max(baseDistance*.35,Math.min(baseDistance*3,distance*Math.exp(e.deltaY*.001)));render();},{passive:false});
 window.addEventListener('pagehide',stop);
 new ResizeObserver(fit).observe(toolbar);window.addEventListener('resize',fit);fit();
 window.__SV_CHARACTER_PREVIEW={asset,scene,camera,renderer,state};
} catch(e){document.getElementById('error').textContent=String(e.message||e);}
})();
</script></body></html>`;
}
