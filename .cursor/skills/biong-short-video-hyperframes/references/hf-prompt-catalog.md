# Universal Composer + visual description

Pipeline schema v2 không chọn prompt type theo beat. Tất cả beat dùng một contract nền:

```text
@hyperframes/prompts/universal-composer.md
@hf-prompt-beat-contract.md
visual_style toàn clip
visual_description của beat
assets/beat-timing/beat_N.json
```

`visual_style` quyết định palette, typography, spacing, texture và motion language chung. `visual_description` chỉ quyết định content, composition, hierarchy và motion progression của beat.

## Contract visual_description

- Bắt buộc tiếng Anh, 8–80 từ.
- Không tự đặt palette, font, texture hoặc theme.
- Không thêm fact, số liệu, command hoặc claim ngoài nguồn.
- Có thể nhắc exact media catalog ID; một ID chỉ thuộc tối đa một beat.
- Hai beat liền kề không được có description giống nhau.

Script `assign-beat-prompt-types.mjs` giữ tên cũ để tương thích tooling, nhưng nhiệm vụ mới là bảo đảm `visual_description` hợp lệ. Các prompt markdown khác vẫn được giữ làm tài liệu legacy, không nằm trong đường chọn tự động.
