# MediaPipe Face Landmarker (self-hosted)

- `vision_bundle.mjs`, `wasm/*`: npm `@mediapipe/tasks-vision@0.10.21` (Apache-2.0, Google LLC).
- `face_landmarker.task`: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task (Apache-2.0).

Used by `PhotoFaceEditor` to detect 478 face landmarks in the uploaded photo (runs locally in
the browser, the photo is never sent anywhere). Loaded lazily with a native `import()`.
64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff  /Users/mac/Desktop/backend/_biong_backend_FE/public/short-video/mediapipe/face_landmarker.task
40f4123dfcd75cfa58add046919cc6f52fde66f009ff582997c09ba54c6ba27c  /Users/mac/Desktop/backend/_biong_backend_FE/public/short-video/mediapipe/vision_bundle.mjs
