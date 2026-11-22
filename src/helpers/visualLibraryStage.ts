/** Khung trang + sân khấu Three.js dùng chung cho các trang xem trước / worker ảnh của Thư viện hình ảnh. */
export const inline = (code: string) => `<script>${code.replace(/<\/script/gi, '<\\/script')}</script>`;
export const page = (scripts: string[], background: string) => `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;overflow:hidden;background:${background}}canvas{display:block;max-width:100%;max-height:100%}#err{position:fixed;left:8px;bottom:8px;right:8px;font:12px sans-serif;color:#c0392b;white-space:pre-wrap}</style></head><body><div id="err"></div>${scripts.map(inline).join('')}</body></html>`;
export const GUARD = `window.addEventListener('error',function(e){document.getElementById('err').textContent=e.message;});`;

/** iframe sandbox có thể báo khung nhìn 0×0 cho tới lần layout đầu: các trang xem trước khởi động với cỡ hộp thoại (852×420).
 * Cảnh 3D có ánh sáng + nền; drag để xoay, lăn chuột để zoom. `view(object)` đặt máy quay vừa khít vật. */
export const STAGE = `
function svStage(width, height, live) {
  width = Math.max(1, width); height = Math.max(1, height);
  var T = THREE, R = new T.WebGLRenderer({antialias: true, preserveDrawingBuffer: !live});
  R.setPixelRatio(live ? Math.min(2, window.devicePixelRatio || 1) : 1); R.setSize(width, height); R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
  document.body.appendChild(R.domElement);
  var scene = new T.Scene(); scene.background = new T.Color('#E9EDF2');
  // Studio environment so paint, chrome and glass have something to reflect.
  var env = new T.Scene(), panel = function (c, k, w, h, x, y, z) { var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({color: new T.Color(c).multiplyScalar(k), side: T.DoubleSide})); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
  env.background = new T.Color('#9FB2C6'); panel('#ffffff', 3, 14, 14, 0, 12, 0); panel('#ffffff', 1.6, 10, 6, -12, 4, 6); panel('#FFE9C8', 1.4, 8, 5, 12, 3, -6); panel('#5B5F66', 1, 40, 40, 0, -6, 0);
  var pm = new T.PMREMGenerator(R); scene.environment = pm.fromScene(env, 0.03).texture; scene.environmentIntensity = 0.6; pm.dispose();
  scene.add(new T.HemisphereLight('#ffffff', '#8d96a3', 0.9));
  var sun = new T.DirectionalLight('#fff4e0', 2.0); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0004; scene.add(sun); scene.add(sun.target);
  var ground = new T.Mesh(new T.CircleGeometry(1, 48), new T.MeshLambertMaterial({color: '#BFC6CE'})); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  var camera = new T.PerspectiveCamera(32, width / height, 0.01, 500), centre = new T.Vector3(), radius = 1, fit = 0.84, yaw = 0.55, pitch = 0.3, zoom = 1, spin = live, box = new T.Box3(), size = new T.Vector3();
  function place() {
    var d = radius / Math.sin(T.MathUtils.degToRad(camera.fov / 2)) * fit * zoom;
    camera.position.set(centre.x + Math.sin(yaw) * Math.cos(pitch) * d, centre.y + Math.sin(pitch) * d, centre.z + Math.cos(yaw) * Math.cos(pitch) * d); camera.lookAt(centre);
    camera.near = Math.max(0.0008, d / 200); camera.far = d * 20; camera.updateProjectionMatrix();
  }
  function view(object, floor) {
    object.traverse(function (m) { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    box.setFromObject(object); box.getCenter(centre); box.getSize(size); radius = Math.max(0.006, size.length() / 2); fit = size.y > Math.max(size.x, size.z) * 1.2 ? 1.12 : 0.84;
    ground.visible = floor !== false; ground.position.set(centre.x, box.min.y - 0.001, centre.z); ground.scale.setScalar(radius * 1.7);
    sun.position.set(centre.x + radius * 1.6, centre.y + radius * 2.6, centre.z + radius * 1.9); sun.target.position.copy(centre);
    var c = sun.shadow.camera; c.left = c.bottom = -radius * 1.5; c.right = c.top = radius * 1.5; c.near = 0.01; c.far = radius * 8; c.updateProjectionMatrix();
    zoom = 1; place();
  }
  if (live) {
    var el = R.domElement, down = null; el.style.cursor = 'grab';
    el.addEventListener('pointerdown', function (e) { down = [e.clientX, e.clientY]; spin = false; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', function (e) { if (!down) return; yaw -= (e.clientX - down[0]) * 0.008; pitch = Math.max(-0.2, Math.min(1.4, pitch + (e.clientY - down[1]) * 0.006)); down = [e.clientX, e.clientY]; });
    el.addEventListener('pointerup', function () { down = null; });
    el.addEventListener('wheel', function (e) { e.preventDefault(); zoom = Math.max(0.25, Math.min(4, zoom * (e.deltaY > 0 ? 1.1 : 0.9))); }, {passive: false});
    window.addEventListener('resize', function () { var w = window.innerWidth || 852, h = window.innerHeight || 420; R.setSize(w, h); camera.aspect = w / h; render(0); });
  }
  function render(dt) { if (spin) yaw += Math.min(0.1, dt || 0) * 0.35; place(); R.render(scene, camera); }
  return {T: T, R: R, scene: scene, camera: camera, view: view, render: render};
}`;

