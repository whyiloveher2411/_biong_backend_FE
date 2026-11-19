import {ajax} from 'hook/useApi';

/** Thư viện hình ảnh của workflow video-html 3D: đồ vật THREE.SVDress, hiệu ứng THREE.SVPixelFx, vật liệu ambientCG. */
export type PixelFxEffect = {id: string; category: string; name: string; desc?: string; tags?: string[]; size: [number, number]; origin?: [number, number]; metres?: [number, number]; duration: number; loop: boolean; simulated?: boolean; screen?: boolean; actor?: boolean; impact?: number};
export type PixelFxCategory = {id: string; name: string; blurb?: string};
export type LibraryMaterial = {key: string; assetId: string; category: string; provider: string; source: string; license: string; dimensions?: {width?: number; height?: number} | null; maps: string[]; width: number; height: number; bytes: number; thumb: string; file: string};
export type VisualLibraryData = {success: boolean; message?: string; pixelfx?: {unit: number; source: string; categories: PixelFxCategory[]; effects: PixelFxEffect[]}; materials?: LibraryMaterial[]};
export type DressItem = {id: string; group: string; name: string; call: string; note?: string};

export const loadVisualLibrary = () => ajax({url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/visual-library', method: 'POST', loading: false, data: {}}) as Promise<VisualLibraryData>;

const DECOR: Array<[string, string]> = [['vase', 'Bình hoa'], ['jar', 'Hũ'], ['box', 'Hộp'], ['frame', 'Khung ảnh để bàn'], ['candle', 'Nến'], ['globe', 'Quả địa cầu'], ['trophy', 'Cúp'], ['succulent', 'Chậu sen đá'], ['basket', 'Giỏ'], ['bowl', 'Bát'], ['clock', 'Đồng hồ để bàn'], ['bottle', 'Chai']];
const DESK: Array<[string, string]> = [['keyboard', 'Bàn phím'], ['mouse', 'Chuột'], ['mug', 'Cốc'], ['pens', 'Ống bút'], ['notebooks', 'Sổ tay'], ['papers', 'Giấy tờ'], ['phone', 'Điện thoại'], ['lamp', 'Đèn bàn'], ['stickies', 'Giấy nhớ'], ['plant', 'Chậu cây nhỏ'], ['tray', 'Khay'], ['glasses', 'Kính']];
const VEHICLES: Array<[string, string, string, string?]> = [
    ['bicycle', 'Xe đạp', 'Xe đạp phố có giỏ, gác-ba-ga, chắn bùn, xích và bàn đạp.'],
    ['scooter', 'Xe tay ga', 'Xe tay ga sàn phẳng: yếm, yên, gương, ống xả, giảm xóc.', '#7EC8C8'],
    ['motorbike', 'Xe mô tô', 'Mô tô côn tay: bình xăng, động cơ có cánh tản nhiệt, ống xả crôm, phuộc.', '#C8102E'],
    ['hatchback', 'Ô tô hatchback', 'Xe nhỏ 5 cửa.', '#C8102E'],
    ['sedan', 'Ô tô sedan', 'Xe 4 cửa có cốp.', '#1F4E8C'],
    ['taxi', 'Taxi', 'Sedan màu vàng có hộp đèn nóc và dải ca-rô.'],
    ['suv', 'Ô tô SUV', 'Gầm cao, ốp vòm bánh, thanh giá nóc.', '#2F6B4F'],
    ['pickup', 'Xe bán tải', 'Cabin kép và thùng hở.', '#8A9AA6'],
    ['van', 'Xe van', 'Xe thùng kín chở hàng, cửa lùa.'],
    ['truck', 'Xe tải thùng', 'Cabin đầu bằng, thùng kín có gân, bánh đôi phía sau. accent: màu thùng, stripe: màu sọc.', '#1F4E8C'],
    ['semi', 'Xe đầu kéo container', 'Đầu kéo 3 trục + rơ-moóc container 3 trục. accent: màu container.', '#C8102E'],
    ['bus', 'Xe buýt', 'Xe buýt thành phố 11 m: hai cửa bên phải, bảng tuyến, điều hoà nóc. accent: màu sọc.', '#2F6B4F'],
    ['skateboard', 'Ván trượt', 'Bánh lăn theo D.drive.'],
    ['rowboat', 'Thuyền chèo', 'Thân hở, ghế ngang, mái chèo. Đặt mặt nước ở y ≈ 0.15.'],
    ['drone', 'Drone 4 cánh', 'Cánh quạt tự quay theo D.animate(t). rotor: tốc độ.'],
    ['plane', 'Máy bay cánh quạt nhỏ', 'Cánh quạt tự quay; bánh lăn theo D.drive. Sải cánh 11 m.'],
    ['helicopter', 'Trực thăng', 'Rotor chính và rotor đuôi tự quay theo D.animate(t).'],
];
const PLANTS: Array<[string, string]> = [['monstera', 'Trầu bà lá xẻ'], ['fern', 'Dương xỉ'], ['snake', 'Lưỡi hổ'], ['ficus', 'Cây sung cảnh'], ['succulent', 'Sen đá']];

/**
 * Các builder của THREE.SVDress (scripts/beat-html/set-dressing-runtime.mjs). `call` là biểu thức chạy với D = THREE.SVDress.create().
 * Thêm builder mới vào runtime thì thêm một dòng ở đây.
 */
/** Động vật: [kind, tên]. Hành động (idle, walk, run, eat, sit, sleep, call, fly, swim…) là trạng thái, đổi bằng D.act(con vật, tên). */
const ANIMALS: Array<[string, string]> = [
    ['dog', 'Chó'], ['cat', 'Mèo'], ['rabbit', 'Thỏ'], ['mouse', 'Chuột'], ['fox', 'Cáo'], ['wolf', 'Sói'],
    ['horse', 'Ngựa'], ['zebra', 'Ngựa vằn'], ['cow', 'Bò sữa'], ['buffalo', 'Trâu'], ['pig', 'Lợn'], ['sheep', 'Cừu'], ['goat', 'Dê'], ['deer', 'Hươu'],
    ['lion', 'Sư tử'], ['tiger', 'Hổ'], ['bear', 'Gấu nâu'], ['panda', 'Gấu trúc'], ['elephant', 'Voi'], ['giraffe', 'Hươu cao cổ'],
    ['chicken', 'Gà mái'], ['rooster', 'Gà trống'], ['chick', 'Gà con'], ['duck', 'Vịt'], ['swan', 'Thiên nga'], ['sparrow', 'Chim sẻ'], ['pigeon', 'Bồ câu'], ['crow', 'Quạ'],
    ['eagle', 'Đại bàng'], ['owl', 'Cú mèo'], ['parrot', 'Vẹt đuôi dài'], ['penguin', 'Chim cánh cụt'], ['flamingo', 'Hồng hạc'],
    ['goldfish', 'Cá vàng'], ['koi', 'Cá koi'], ['clownfish', 'Cá hề'], ['shark', 'Cá mập'], ['dolphin', 'Cá heo'], ['whale', 'Cá voi'],
    ['frog', 'Ếch'], ['turtle', 'Rùa'], ['snake', 'Rắn'], ['crab', 'Cua'], ['snail', 'Ốc sên'], ['butterfly', 'Bướm'], ['bee', 'Ong'], ['ladybug', 'Bọ rùa'],
];
const RAW_DRESS_ITEMS: DressItem[] = [
    ...ANIMALS.map(([kind, name]): DressItem => ({id: 'animal-' + kind, group: 'Động vật', name, call: `D.animal('${kind}')`, note: 'Hành động chạy theo D.animate(t); đổi bằng D.act(obj, tên) (không dựng lại). Di chuyển con vật với tốc độ obj.userData.svAnimal.speeds[hành động] (m/s) thì chân không trượt. D.lookAt(obj, điểm hoặc object) cho con vật nhìn theo; D.act(obj, \'move\') = kiểu di chuyển của loài. Tham số: action, color, seed, scale.'})),
    {id: 'tree', group: 'Cây cỏ & thiên nhiên', name: 'Cây lớn', call: 'D.tree({height: 6})', note: 'height, spread, depth (số cấp cành), leaves, leafSize, colors, blossom. Lá đung đưa theo gió.'},
    {id: 'tree-small', group: 'Cây cỏ & thiên nhiên', name: 'Cây nhỏ', call: 'D.tree({height: 2.6})', note: 'Cùng builder tree với height nhỏ.'},
    {id: 'tree-blossom', group: 'Cây cỏ & thiên nhiên', name: 'Cây hoa', call: "D.tree({height: 5, blossom: '#F4B6C2'})", note: 'blossom: màu hoa trộn vào tán lá.'},
    {id: 'tree-autumn', group: 'Cây cỏ & thiên nhiên', name: 'Cây mùa thu', call: "D.tree({height: 5.5, colors: ['#D98A29', '#C0572B', '#E3B23C', '#A8442A']})", note: 'colors: bảng màu lá.'},
    {id: 'shrub', group: 'Cây cỏ & thiên nhiên', name: 'Bụi cây', call: 'D.shrub({radius: 0.5})', note: 'radius, height, leaves.'},
    {id: 'grass', group: 'Cây cỏ & thiên nhiên', name: 'Thảm cỏ', call: 'D.grass({width: 2, depth: 2})', note: 'width, depth, count, height, colors.'},
    ...VEHICLES.map(([kind, name, note, color]): DressItem => ({id: 'vehicle-' + kind, group: 'Xe & phương tiện', name, call: color ? `D.vehicle('${kind}', {color: '${color}'})` : `D.vehicle('${kind}')`, note: note + ' Tham số chung: color, seed, scale, lights. Lăn bánh và đánh lái: D.drive(xe, quãngĐường, gócLái).'})),
    {id: 'furniture-dining-chair', group: 'Nội thất', name: 'Ghế ăn', call: "D.furniture('dining-chair')", note: 'fabric: màu đệm. Mặc định đặt trên sàn, mặt trước +Z. Tham số chung: color, seed, scale.'},
    {id: 'furniture-office-chair', group: 'Nội thất', name: 'Ghế xoay văn phòng', call: "D.furniture('office-chair')", note: 'Mặc định đặt trên sàn, mặt trước +Z. Tham số chung: color, seed, scale.'},
    {id: 'furniture-stool', group: 'Nội thất', name: 'Ghế đẩu cao', call: "D.furniture('stool')", note: 'height. Mặc định đặt trên sàn, mặt trước +Z. Tham số chung: color, seed, scale.'},
    {id: 'furniture-armchair', group: 'Nội thất', name: 'Ghế bành', call: "D.furniture('armchair')", note: 'Mặc định đặt trên sàn, mặt trước +Z. Tham số chung: color, seed, scale.'},
    {id: 'furniture-sofa', group: 'Nội thất', name: 'Sofa', call: "D.furniture('sofa')", note: 'seats: số chỗ (mặc định 3), accent: màu gối. Mặc định đặt trên sàn, mặt trước +Z. Tham số chung: color, seed, scale.'},
    {id: 'furniture-bed', group: 'Nội thất', name: 'Giường', call: "D.furniture('bed')", note: 'width (1.6 đôi, 0.9 đơn), bedding: màu chăn, wood. Mặc định đặt trên sàn, mặt trước +Z. Tham số chung: color, seed, scale.'},
    {id: 'furniture-dining-table', group: 'Nội thất', name: 'Bàn ăn', call: "D.furniture('dining-table')", note: 'width, depth, height. Mặc định đặt trên sàn, mặt trước +Z. Tham số chung: color, seed, scale.'},
    {id: 'furniture-desk', group: 'Nội thất', name: 'Bàn làm việc có hộc tủ', call: "D.furniture('desk')", note: 'width, depth, body. Mặc định đặt trên sàn, mặt trước +Z. Tham số chung: color, seed, scale.'},
    {id: 'furniture-coffee-table', group: 'Nội thất', name: 'Bàn trà', call: "D.furniture('coffee-table')", note: 'width, depth. Mặc định đặt trên sàn, mặt trước +Z. Tham số chung: color, seed, scale.'},
    {id: 'furniture-nightstand', group: 'Nội thất', name: 'Tủ đầu giường', call: "D.furniture('nightstand')", note: 'Mặc định đặt trên sàn, mặt trước +Z. Tham số chung: color, seed, scale.'},
    {id: 'furniture-round-table', group: 'Nội thất', name: 'Bàn tròn chân trụ', call: "D.furniture('round-table')", note: 'radius, height. Mặc định đặt trên sàn, mặt trước +Z. Tham số chung: color, seed, scale.'},
    {id: 'furniture-wardrobe', group: 'Nội thất', name: 'Tủ quần áo', call: "D.furniture('wardrobe')", note: 'width, height. Mặc định đặt trên sàn, mặt trước +Z. Tham số chung: color, seed, scale.'},
    {id: 'furniture-drawers', group: 'Nội thất', name: 'Tủ ngăn kéo', call: "D.furniture('drawers')", note: 'width. Mặc định đặt trên sàn, mặt trước +Z. Tham số chung: color, seed, scale.'},
    {id: 'furniture-sideboard', group: 'Nội thất', name: 'Tủ thấp / kệ TV', call: "D.furniture('sideboard')", note: 'width, height. Mặc định đặt trên sàn, mặt trước +Z. Tham số chung: color, seed, scale.'},
    {id: 'furniture-kitchen-counter', group: 'Nội thất', name: 'Tủ bếp dưới có bồn rửa và bếp', call: "D.furniture('kitchen-counter')", note: 'width, top: màu mặt đá, sink, hob, on. Mặc định đặt trên sàn, mặt trước +Z. Tham số chung: color, seed, scale.'},
    {id: 'furniture-kitchen-wall', group: 'Nội thất', name: 'Tủ bếp treo', call: "D.furniture('kitchen-wall')", note: 'width; đặt ở độ cao ~1.45 m. Mặc định đặt trên sàn, mặt trước +Z. Tham số chung: color, seed, scale.'},
    {id: 'furniture-coat-rack', group: 'Nội thất', name: 'Cây treo áo', call: "D.furniture('coat-rack')", note: 'coat: màu áo. Mặc định đặt trên sàn, mặt trước +Z. Tham số chung: color, seed, scale.'},
    {id: 'appliance-fridge', group: 'Bếp & phòng tắm', name: 'Tủ lạnh', call: "D.appliance('fridge')", note: 'Đồ gia dụng, thiết bị vệ sinh.'},
    {id: 'appliance-stove', group: 'Bếp & phòng tắm', name: 'Bếp ga có lò nướng', call: "D.appliance('stove')", note: 'on: bật lửa. Đồ gia dụng, thiết bị vệ sinh.'},
    {id: 'appliance-microwave', group: 'Bếp & phòng tắm', name: 'Lò vi sóng', call: "D.appliance('microwave')", note: 'Đồ gia dụng, thiết bị vệ sinh.'},
    {id: 'appliance-coffee-machine', group: 'Bếp & phòng tắm', name: 'Máy pha cà phê', call: "D.appliance('coffee-machine')", note: 'Đồ gia dụng, thiết bị vệ sinh.'},
    {id: 'appliance-washing-machine', group: 'Bếp & phòng tắm', name: 'Máy giặt', call: "D.appliance('washing-machine')", note: 'Đồ gia dụng, thiết bị vệ sinh.'},
    {id: 'appliance-basin', group: 'Bếp & phòng tắm', name: 'Bồn rửa mặt chân trụ', call: "D.appliance('basin')", note: 'Đồ gia dụng, thiết bị vệ sinh.'},
    {id: 'appliance-toilet', group: 'Bếp & phòng tắm', name: 'Bồn cầu', call: "D.appliance('toilet')", note: 'Đồ gia dụng, thiết bị vệ sinh.'},
    {id: 'appliance-bathtub', group: 'Bếp & phòng tắm', name: 'Bồn tắm', call: "D.appliance('bathtub')", note: 'length, water. Đồ gia dụng, thiết bị vệ sinh.'},
    {id: 'appliance-shower', group: 'Bếp & phòng tắm', name: 'Vách tắm đứng', call: "D.appliance('shower')", note: 'Đồ gia dụng, thiết bị vệ sinh.'},
    {id: 'appliance-mirror', group: 'Bếp & phòng tắm', name: 'Gương treo tường', call: "D.appliance('mirror')", note: 'width, height, round, frame: wood|metal; gắn tường z = 0. Đồ gia dụng, thiết bị vệ sinh.'},
    {id: 'appliance-pedal-bin', group: 'Bếp & phòng tắm', name: 'Thùng rác đạp chân', call: "D.appliance('pedal-bin')", note: 'Đồ gia dụng, thiết bị vệ sinh.'},
    {id: 'appliance-standing-fan', group: 'Bếp & phòng tắm', name: 'Quạt cây (cánh quay)', call: "D.appliance('standing-fan')", note: 'speed. Đồ gia dụng, thiết bị vệ sinh.'},
    {id: 'appliance-water-dispenser', group: 'Bếp & phòng tắm', name: 'Cây nước nóng lạnh', call: "D.appliance('water-dispenser')", note: 'Đồ gia dụng, thiết bị vệ sinh.'},
    {id: 'appliance-radiator', group: 'Bếp & phòng tắm', name: 'Lò sưởi gắn tường', call: "D.appliance('radiator')", note: 'width, height. Đồ gia dụng, thiết bị vệ sinh.'},
    {id: 'device-monitor', group: 'Điện tử', name: 'Màn hình máy tính', call: "D.device('monitor')", note: 'width. on: bật màn hình/đèn báo; screen: màu màn hình.'},
    {id: 'device-laptop', group: 'Điện tử', name: 'Laptop', call: "D.device('laptop')", note: 'open: góc mở (rad). on: bật màn hình/đèn báo; screen: màu màn hình.'},
    {id: 'device-tv', group: 'Điện tử', name: 'Tivi', call: "D.device('tv')", note: 'width, wall: treo tường. on: bật màn hình/đèn báo; screen: màu màn hình.'},
    {id: 'device-speaker', group: 'Điện tử', name: 'Loa', call: "D.device('speaker')", note: 'on: bật màn hình/đèn báo; screen: màu màn hình.'},
    {id: 'device-headphones', group: 'Điện tử', name: 'Tai nghe', call: "D.device('headphones')", note: 'on: bật màn hình/đèn báo; screen: màu màn hình.'},
    {id: 'device-router', group: 'Điện tử', name: 'Bộ phát wifi', call: "D.device('router')", note: 'on: bật màn hình/đèn báo; screen: màu màn hình.'},
    {id: 'device-printer', group: 'Điện tử', name: 'Máy in', call: "D.device('printer')", note: 'on: bật màn hình/đèn báo; screen: màu màn hình.'},
    {id: 'device-aircon', group: 'Điện tử', name: 'Điều hoà treo tường', call: "D.device('aircon')", note: 'gắn tường z = 0. on: bật màn hình/đèn báo; screen: màu màn hình.'},
    {id: 'device-aircon-outdoor', group: 'Điện tử', name: 'Cục nóng điều hoà (quạt quay)', call: "D.device('aircon-outdoor')", note: 'on: bật màn hình/đèn báo; screen: màu màn hình.'},
    {id: 'device-cctv', group: 'Điện tử', name: 'Camera an ninh', call: "D.device('cctv')", note: 'gắn tường, chúc xuống. on: bật màn hình/đèn báo; screen: màu màn hình.'},
    {id: 'device-vending', group: 'Điện tử', name: 'Máy bán hàng tự động', call: "D.device('vending')", note: 'accent: màu biển đèn. on: bật màn hình/đèn báo; screen: màu màn hình.'},
    {id: 'device-atm', group: 'Điện tử', name: 'Cây ATM', call: "D.device('atm')", note: 'on: bật màn hình/đèn báo; screen: màu màn hình.'},
    {id: 'device-server-rack', group: 'Điện tử', name: 'Tủ máy chủ', call: "D.device('server-rack')", note: 'on: bật màn hình/đèn báo; screen: màu màn hình.'},
    {id: 'lamp-floor', group: 'Đèn', name: 'Đèn cây đứng', call: "D.lamp('floor')", note: 'color, shade, on. userData.svLight = {at, color} là chỗ đặt PointLight; light: true|cường độ tự thêm đèn. Đèn trần treo xuống từ gốc toạ độ.'},
    {id: 'lamp-table', group: 'Đèn', name: 'Đèn bàn', call: "D.lamp('table')", note: 'userData.svLight = {at, color} là chỗ đặt PointLight; light: true|cường độ tự thêm đèn. Đèn trần treo xuống từ gốc toạ độ.'},
    {id: 'lamp-pendant', group: 'Đèn', name: 'Đèn thả trần', call: "D.lamp('pendant')", note: 'drop: chiều dài dây. userData.svLight = {at, color} là chỗ đặt PointLight; light: true|cường độ tự thêm đèn. Đèn trần treo xuống từ gốc toạ độ.'},
    {id: 'lamp-chandelier', group: 'Đèn', name: 'Đèn chùm', call: "D.lamp('chandelier')", note: 'arms. userData.svLight = {at, color} là chỗ đặt PointLight; light: true|cường độ tự thêm đèn. Đèn trần treo xuống từ gốc toạ độ.'},
    {id: 'lamp-ceiling-fan', group: 'Đèn', name: 'Quạt trần có đèn (cánh quay)', call: "D.lamp('ceiling-fan')", note: 'speed. userData.svLight = {at, color} là chỗ đặt PointLight; light: true|cường độ tự thêm đèn. Đèn trần treo xuống từ gốc toạ độ.'},
    {id: 'lamp-sconce', group: 'Đèn', name: 'Đèn gắn tường', call: "D.lamp('sconce')", note: 'userData.svLight = {at, color} là chỗ đặt PointLight; light: true|cường độ tự thêm đèn. Đèn trần treo xuống từ gốc toạ độ.'},
    {id: 'lamp-paper-lantern', group: 'Đèn', name: 'Đèn lồng giấy', call: "D.lamp('paper-lantern')", note: 'color, drop. userData.svLight = {at, color} là chỗ đặt PointLight; light: true|cường độ tự thêm đèn. Đèn trần treo xuống từ gốc toạ độ.'},
    {id: 'lamp-oil-lantern', group: 'Đèn', name: 'Đèn bão', call: "D.lamp('oil-lantern')", note: 'userData.svLight = {at, color} là chỗ đặt PointLight; light: true|cường độ tự thêm đèn. Đèn trần treo xuống từ gốc toạ độ.'},
    {id: 'lamp-neon', group: 'Đèn', name: 'Biển neon', call: "D.lamp('neon')", note: 'shape: heart|star|bolt|arrow|ring, color, size. userData.svLight = {at, color} là chỗ đặt PointLight; light: true|cường độ tự thêm đèn. Đèn trần treo xuống từ gốc toạ độ.'},
    {id: 'lamp-string', group: 'Đèn', name: 'Dây đèn trang trí', call: "D.lamp('string')", note: 'length, sag, color. userData.svLight = {at, color} là chỗ đặt PointLight; light: true|cường độ tự thêm đèn. Đèn trần treo xuống từ gốc toạ độ.'},
    {id: 'lamp-led-strip', group: 'Đèn', name: 'Thanh LED', call: "D.lamp('led-strip')", note: 'length, color. userData.svLight = {at, color} là chỗ đặt PointLight; light: true|cường độ tự thêm đèn. Đèn trần treo xuống từ gốc toạ độ.'},
    {id: 'arch-door', group: 'Kiến trúc', name: 'Cửa đi (có tay nắm, bản lề)', call: "D.arch('door')", note: 'width, height, kind: panel|glass|flush, open (rad, mở ra +Z), userData.leaf. Đặt vào lỗ tường do bối cảnh tự khoét; mặt trước +Z.'},
    {id: 'arch-window', group: 'Kiến trúc', name: 'Cửa sổ có bậu', call: "D.arch('window')", note: 'width, height, cols, rows. Đặt vào lỗ tường do bối cảnh tự khoét; mặt trước +Z.'},
    {id: 'arch-stairs', group: 'Kiến trúc', name: 'Cầu thang', call: "D.arch('stairs')", note: 'steps, rise, run, width, rail: right|left|both|none; leo lên về phía -Z, userData.top. Đặt vào lỗ tường do bối cảnh tự khoét; mặt trước +Z.'},
    {id: 'arch-railing', group: 'Kiến trúc', name: 'Lan can', call: "D.arch('railing')", note: 'length, height, kind: glass. Đặt vào lỗ tường do bối cảnh tự khoét; mặt trước +Z.'},
    {id: 'arch-column', group: 'Kiến trúc', name: 'Cột tròn cổ điển', call: "D.arch('column')", note: 'height. Đặt vào lỗ tường do bối cảnh tự khoét; mặt trước +Z.'},
    {id: 'arch-elevator', group: 'Kiến trúc', name: 'Cửa thang máy', call: "D.arch('elevator')", note: 'open: 0..1. Đặt vào lỗ tường do bối cảnh tự khoét; mặt trước +Z.'},
    {id: 'arch-blinds', group: 'Kiến trúc', name: 'Rèm sáo (treo từ gốc)', call: "D.arch('blinds')", note: 'width, height, tilt. Đặt vào lỗ tường do bối cảnh tự khoét; mặt trước +Z.'},
    {id: 'soft-blankets', group: 'Vải & đồ mềm', name: 'Chồng chăn gấp', call: "D.soft('blankets')", note: 'count.'},
    {id: 'soft-tablecloth', group: 'Vải & đồ mềm', name: 'Khăn trải bàn (trên bàn ăn)', call: "(function () { var g = new THREE.Group(); g.add(D.furniture('dining-table')); g.add(D.soft('tablecloth')); return g; })()", note: 'width, depth, height = chiều cao bàn, drop.'},
    {id: 'soft-clothes-rack', group: 'Vải & đồ mềm', name: 'Giá treo quần áo', call: "D.soft('clothes-rack')", note: 'length.'},
    {id: 'soft-backpack', group: 'Vải & đồ mềm', name: 'Balo', call: "D.soft('backpack')", note: ''},
    {id: 'soft-handbag', group: 'Vải & đồ mềm', name: 'Túi xách', call: "D.soft('handbag')", note: ''},
    {id: 'soft-suitcase', group: 'Vải & đồ mềm', name: 'Vali kéo', call: "D.soft('suitcase')", note: ''},
    {id: 'soft-shoes', group: 'Vải & đồ mềm', name: 'Đôi giày', call: "D.soft('shoes')", note: ''},
    {id: 'soft-flag', group: 'Vải & đồ mềm', name: 'Cờ trên cột (bay theo gió)', call: "D.soft('flag')", note: 'height, width, color.'},
    {id: 'soft-bunting', group: 'Vải & đồ mềm', name: 'Dây cờ đuôi nheo', call: "D.soft('bunting')", note: 'length, sag.'},
    {id: 'soft-tent', group: 'Vải & đồ mềm', name: 'Lều cắm trại', call: "D.soft('tent')", note: ''},
    {id: 'soft-towel-rail', group: 'Vải & đồ mềm', name: 'Giá khăn tắm treo tường', call: "D.soft('towel-rail')", note: ''},
    {id: 'food-apple', group: 'Đồ ăn & thức uống', name: 'Táo', call: "D.food('apple')", note: 'Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'food-orange', group: 'Đồ ăn & thức uống', name: 'Cam', call: "D.food('orange')", note: 'Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'food-banana', group: 'Đồ ăn & thức uống', name: 'Nải chuối', call: "D.food('banana')", note: 'Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'food-bread', group: 'Đồ ăn & thức uống', name: 'Ổ bánh mì', call: "D.food('bread')", note: 'Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'food-baguette', group: 'Đồ ăn & thức uống', name: 'Bánh mì que', call: "D.food('baguette')", note: 'Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'food-pizza', group: 'Đồ ăn & thức uống', name: 'Pizza trên thớt', call: "D.food('pizza')", note: 'Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'food-burger', group: 'Đồ ăn & thức uống', name: 'Hamburger', call: "D.food('burger')", note: 'Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'food-cake', group: 'Đồ ăn & thức uống', name: 'Bánh sinh nhật có nến', call: "D.food('cake')", note: 'on: nến cháy. Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'food-donut', group: 'Đồ ăn & thức uống', name: 'Bánh donut', call: "D.food('donut')", note: 'Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'food-pho', group: 'Đồ ăn & thức uống', name: 'Tô phở', call: "D.food('pho')", note: 'Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'food-coffee-cup', group: 'Đồ ăn & thức uống', name: 'Ly cà phê mang đi', call: "D.food('coffee-cup')", note: 'Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'food-water-bottle', group: 'Đồ ăn & thức uống', name: 'Chai nước', call: "D.food('water-bottle')", note: 'Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'food-soda-can', group: 'Đồ ăn & thức uống', name: 'Lon nước ngọt', call: "D.food('soda-can')", note: 'color. Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'food-wine-bottle', group: 'Đồ ăn & thức uống', name: 'Chai rượu vang', call: "D.food('wine-bottle')", note: 'Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'food-takeout-box', group: 'Đồ ăn & thức uống', name: 'Hộp đồ ăn mang đi', call: "D.food('takeout-box')", note: 'Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'food-plated-meal', group: 'Đồ ăn & thức uống', name: 'Đĩa bít tết', call: "D.food('plated-meal')", note: 'Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'food-fruit-crate', group: 'Đồ ăn & thức uống', name: 'Sọt trái cây', call: "D.food('fruit-crate')", note: 'color. Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'food-watermelon', group: 'Đồ ăn & thức uống', name: 'Nửa quả dưa hấu', call: "D.food('watermelon')", note: 'Gốc ở mặt bàn (y = 0), đặt ở độ cao mặt bàn.'},
    {id: 'prop-crate', group: 'Dụng cụ & vật phẩm', name: 'Thùng gỗ', call: "D.prop('crate')", note: 'size. Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-barrel', group: 'Dụng cụ & vật phẩm', name: 'Thùng gỗ tròn', call: "D.prop('barrel')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-oil-drum', group: 'Dụng cụ & vật phẩm', name: 'Thùng phuy', call: "D.prop('oil-drum')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-pallet', group: 'Dụng cụ & vật phẩm', name: 'Pallet gỗ', call: "D.prop('pallet')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-chest', group: 'Dụng cụ & vật phẩm', name: 'Rương kho báu', call: "D.prop('chest')", note: 'open (rad). Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-toolbox', group: 'Dụng cụ & vật phẩm', name: 'Hộp dụng cụ', call: "D.prop('toolbox')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-ladder', group: 'Dụng cụ & vật phẩm', name: 'Thang chữ A', call: "D.prop('ladder')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-bucket', group: 'Dụng cụ & vật phẩm', name: 'Xô', call: "D.prop('bucket')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-paint-can', group: 'Dụng cụ & vật phẩm', name: 'Thùng sơn', call: "D.prop('paint-can')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-shovel', group: 'Dụng cụ & vật phẩm', name: 'Xẻng', call: "D.prop('shovel')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-hammer', group: 'Dụng cụ & vật phẩm', name: 'Búa', call: "D.prop('hammer')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-wrench', group: 'Dụng cụ & vật phẩm', name: 'Cờ lê', call: "D.prop('wrench')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-broom', group: 'Dụng cụ & vật phẩm', name: 'Chổi', call: "D.prop('broom')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-key', group: 'Dụng cụ & vật phẩm', name: 'Chìa khoá', call: "D.prop('key')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-medkit', group: 'Dụng cụ & vật phẩm', name: 'Hộp y tế', call: "D.prop('medkit')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-sack', group: 'Dụng cụ & vật phẩm', name: 'Bao tải', call: "D.prop('sack')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-jerrycan', group: 'Dụng cụ & vật phẩm', name: 'Can xăng', call: "D.prop('jerrycan')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-cardboard-box', group: 'Dụng cụ & vật phẩm', name: 'Thùng các-tông', call: "D.prop('cardboard-box')", note: 'width, depth, height, open. Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-trash-bag', group: 'Dụng cụ & vật phẩm', name: 'Túi rác', call: "D.prop('trash-bag')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-fire-extinguisher', group: 'Dụng cụ & vật phẩm', name: 'Bình chữa cháy', call: "D.prop('fire-extinguisher')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-wheelbarrow', group: 'Dụng cụ & vật phẩm', name: 'Xe rùa', call: "D.prop('wheelbarrow')", note: 'Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'prop-tire', group: 'Dụng cụ & vật phẩm', name: 'Lốp xe', call: "D.prop('tire')", note: 'flat: nằm. Dụng cụ nhỏ (xẻng, búa, cờ lê, chổi, chìa khoá) nằm phẳng trên mặt đất.'},
    {id: 'street-street-lamp', group: 'Đường phố', name: 'Đèn đường', call: "D.street('street-lamp')", note: 'height, on, light. Mặt trước +Z quay ra đường.'},
    {id: 'street-traffic-light', group: 'Đường phố', name: 'Đèn giao thông', call: "D.street('traffic-light')", note: 'state: red|yellow|green. Mặt trước +Z quay ra đường.'},
    {id: 'street-sign', group: 'Đường phố', name: 'Biển báo: dừng', call: "D.street('sign')", note: 'sign: stop|no-entry|give-way|speed|crossing|parking|direction, limit (biển tốc độ). Mặt trước +Z quay ra đường.'},
    {id: 'street-bench', group: 'Đường phố', name: 'Ghế công viên', call: "D.street('bench')", note: 'length. Mặt trước +Z quay ra đường.'},
    {id: 'street-bin', group: 'Đường phố', name: 'Thùng rác công cộng', call: "D.street('bin')", note: 'Mặt trước +Z quay ra đường.'},
    {id: 'street-dumpster', group: 'Đường phố', name: 'Thùng rác lớn', call: "D.street('dumpster')", note: 'Mặt trước +Z quay ra đường.'},
    {id: 'street-hydrant', group: 'Đường phố', name: 'Trụ cứu hoả', call: "D.street('hydrant')", note: 'Mặt trước +Z quay ra đường.'},
    {id: 'street-cone', group: 'Đường phố', name: 'Cọc tiêu', call: "D.street('cone')", note: 'Mặt trước +Z quay ra đường.'},
    {id: 'street-barrier', group: 'Đường phố', name: 'Rào chắn sọc đỏ trắng', call: "D.street('barrier')", note: 'Mặt trước +Z quay ra đường.'},
    {id: 'street-jersey-barrier', group: 'Đường phố', name: 'Dải phân cách bê tông', call: "D.street('jersey-barrier')", note: 'length. Mặt trước +Z quay ra đường.'},
    {id: 'street-bollard', group: 'Đường phố', name: 'Cột chắn', call: "D.street('bollard')", note: 'Mặt trước +Z quay ra đường.'},
    {id: 'street-bus-stop', group: 'Đường phố', name: 'Nhà chờ xe buýt', call: "D.street('bus-stop')", note: 'width. Mặt trước +Z quay ra đường.'},
    {id: 'street-manhole', group: 'Đường phố', name: 'Nắp cống', call: "D.street('manhole')", note: 'Mặt trước +Z quay ra đường.'},
    {id: 'street-power-pole', group: 'Đường phố', name: 'Cột điện', call: "D.street('power-pole')", note: 'height, transformer; dây điện dùng D.cable. Mặt trước +Z quay ra đường.'},
    {id: 'street-mailbox', group: 'Đường phố', name: 'Hòm thư', call: "D.street('mailbox')", note: 'Mặt trước +Z quay ra đường.'},
    {id: 'street-bike-rack', group: 'Đường phố', name: 'Giá để xe đạp', call: "D.street('bike-rack')", note: 'count. Mặt trước +Z quay ra đường.'},
    {id: 'street-picket-fence', group: 'Đường phố', name: 'Hàng rào gỗ', call: "D.street('picket-fence')", note: 'length, height. Mặt trước +Z quay ra đường.'},
    {id: 'street-iron-fence', group: 'Đường phố', name: 'Hàng rào sắt', call: "D.street('iron-fence')", note: 'length, height. Mặt trước +Z quay ra đường.'},
    {id: 'street-crosswalk', group: 'Đường phố', name: 'Vạch kẻ qua đường', call: "D.street('crosswalk')", note: 'width, length. Mặt trước +Z quay ra đường.'},
    {id: 'street-planter', group: 'Đường phố', name: 'Bồn cây bê tông', call: "D.street('planter')", note: 'width. Mặt trước +Z quay ra đường.'},
    {id: 'street-awning', group: 'Đường phố', name: 'Mái hiên cửa hàng (treo từ gốc)', call: "D.street('awning')", note: 'width, depth, drop, accent. Mặt trước +Z quay ra đường.'},
    {id: 'street-parking-meter', group: 'Đường phố', name: 'Cột thu phí đỗ xe', call: "D.street('parking-meter')", note: 'Mặt trước +Z quay ra đường.'},
    {id: 'street-fuel-pump', group: 'Đường phố', name: 'Cây xăng', call: "D.street('fuel-pump')", note: 'Mặt trước +Z quay ra đường.'},
    {id: 'street-parasol', group: 'Đường phố', name: 'Ô che nắng', call: "D.street('parasol')", note: 'open, radius. Mặt trước +Z quay ra đường.'},
    {id: 'street-billboard', group: 'Đường phố', name: 'Bảng quảng cáo', call: "D.street('billboard')", note: 'width, height, elevation, lit. Mặt trước +Z quay ra đường.'},
    {id: 'nature-rock', group: 'Cây cỏ & thiên nhiên', name: 'Hòn đá', call: "D.nature('rock')", note: 'size, moss. Ngoài các cây đã có: đá, cây lá kim, cọ, tre, hoa, dây leo, nước. Thác, đài phun, lửa trại dùng hiệu ứng pixel.'},
    {id: 'nature-boulder', group: 'Cây cỏ & thiên nhiên', name: 'Tảng đá phủ rêu', call: "D.nature('boulder')", note: 'size. Ngoài các cây đã có: đá, cây lá kim, cọ, tre, hoa, dây leo, nước. Thác, đài phun, lửa trại dùng hiệu ứng pixel.'},
    {id: 'nature-rocks', group: 'Cây cỏ & thiên nhiên', name: 'Cụm đá', call: "D.nature('rocks')", note: 'count, radius, size. Ngoài các cây đã có: đá, cây lá kim, cọ, tre, hoa, dây leo, nước. Thác, đài phun, lửa trại dùng hiệu ứng pixel.'},
    {id: 'nature-pebbles', group: 'Cây cỏ & thiên nhiên', name: 'Sỏi rải', call: "D.nature('pebbles')", note: 'width, depth, count. Ngoài các cây đã có: đá, cây lá kim, cọ, tre, hoa, dây leo, nước. Thác, đài phun, lửa trại dùng hiệu ứng pixel.'},
    {id: 'nature-pine', group: 'Cây cỏ & thiên nhiên', name: 'Cây thông', call: "D.nature('pine')", note: 'height. Ngoài các cây đã có: đá, cây lá kim, cọ, tre, hoa, dây leo, nước. Thác, đài phun, lửa trại dùng hiệu ứng pixel.'},
    {id: 'nature-palm', group: 'Cây cỏ & thiên nhiên', name: 'Cây dừa / cọ (lá bay theo gió)', call: "D.nature('palm')", note: 'height. Ngoài các cây đã có: đá, cây lá kim, cọ, tre, hoa, dây leo, nước. Thác, đài phun, lửa trại dùng hiệu ứng pixel.'},
    {id: 'nature-bamboo', group: 'Cây cỏ & thiên nhiên', name: 'Bụi tre', call: "D.nature('bamboo')", note: 'count, height. Ngoài các cây đã có: đá, cây lá kim, cọ, tre, hoa, dây leo, nước. Thác, đài phun, lửa trại dùng hiệu ứng pixel.'},
    {id: 'nature-flowers', group: 'Cây cỏ & thiên nhiên', name: 'Luống hoa', call: "D.nature('flowers')", note: 'width, depth, colors. Ngoài các cây đã có: đá, cây lá kim, cọ, tre, hoa, dây leo, nước. Thác, đài phun, lửa trại dùng hiệu ứng pixel.'},
    {id: 'nature-vine', group: 'Cây cỏ & thiên nhiên', name: 'Dây leo trên tường', call: "D.nature('vine')", note: 'width, height; gắn tường z = 0. Ngoài các cây đã có: đá, cây lá kim, cọ, tre, hoa, dây leo, nước. Thác, đài phun, lửa trại dùng hiệu ứng pixel.'},
    {id: 'nature-log', group: 'Cây cỏ & thiên nhiên', name: 'Khúc gỗ', call: "D.nature('log')", note: 'length. Ngoài các cây đã có: đá, cây lá kim, cọ, tre, hoa, dây leo, nước. Thác, đài phun, lửa trại dùng hiệu ứng pixel.'},
    {id: 'nature-stump', group: 'Cây cỏ & thiên nhiên', name: 'Gốc cây', call: "D.nature('stump')", note: 'Ngoài các cây đã có: đá, cây lá kim, cọ, tre, hoa, dây leo, nước. Thác, đài phun, lửa trại dùng hiệu ứng pixel.'},
    {id: 'nature-mushrooms', group: 'Cây cỏ & thiên nhiên', name: 'Cụm nấm', call: "D.nature('mushrooms')", note: 'color. Ngoài các cây đã có: đá, cây lá kim, cọ, tre, hoa, dây leo, nước. Thác, đài phun, lửa trại dùng hiệu ứng pixel.'},
    {id: 'nature-cactus', group: 'Cây cỏ & thiên nhiên', name: 'Xương rồng', call: "D.nature('cactus')", note: 'height. Ngoài các cây đã có: đá, cây lá kim, cọ, tre, hoa, dây leo, nước. Thác, đài phun, lửa trại dùng hiệu ứng pixel.'},
    {id: 'nature-reeds', group: 'Cây cỏ & thiên nhiên', name: 'Bụi lau sậy', call: "D.nature('reeds')", note: 'Ngoài các cây đã có: đá, cây lá kim, cọ, tre, hoa, dây leo, nước. Thác, đài phun, lửa trại dùng hiệu ứng pixel.'},
    {id: 'nature-hedge', group: 'Cây cỏ & thiên nhiên', name: 'Hàng rào cây xén', call: "D.nature('hedge')", note: 'width, height, depth. Ngoài các cây đã có: đá, cây lá kim, cọ, tre, hoa, dây leo, nước. Thác, đài phun, lửa trại dùng hiệu ứng pixel.'},
    {id: 'nature-pond', group: 'Cây cỏ & thiên nhiên', name: 'Ao nhỏ có đá và lá súng', call: "D.nature('pond')", note: 'radius. Ngoài các cây đã có: đá, cây lá kim, cọ, tre, hoa, dây leo, nước. Thác, đài phun, lửa trại dùng hiệu ứng pixel.'},
    {id: 'nature-puddle', group: 'Cây cỏ & thiên nhiên', name: 'Vũng nước', call: "D.nature('puddle')", note: 'radius. Ngoài các cây đã có: đá, cây lá kim, cọ, tre, hoa, dây leo, nước. Thác, đài phun, lửa trại dùng hiệu ứng pixel.'},
    {id: 'street-sign-no-entry', group: 'Đường phố', name: 'Biển báo: cấm đi ngược chiều', call: "D.street('sign', {sign: 'no-entry'})", note: 'Cùng builder sign.'},
    {id: 'street-sign-give-way', group: 'Đường phố', name: 'Biển báo: nhường đường', call: "D.street('sign', {sign: 'give-way'})", note: 'Cùng builder sign.'},
    {id: 'street-sign-speed', group: 'Đường phố', name: 'Biển báo: giới hạn tốc độ', call: "D.street('sign', {sign: 'speed'})", note: 'Cùng builder sign.'},
    {id: 'street-sign-crossing', group: 'Đường phố', name: 'Biển báo: đường cho người đi bộ', call: "D.street('sign', {sign: 'crossing'})", note: 'Cùng builder sign.'},
    {id: 'street-sign-parking', group: 'Đường phố', name: 'Biển báo: nơi đỗ xe', call: "D.street('sign', {sign: 'parking'})", note: 'Cùng builder sign.'},
    {id: 'street-sign-direction', group: 'Đường phố', name: 'Biển báo: chỉ hướng', call: "D.street('sign', {sign: 'direction'})", note: 'Cùng builder sign.'},
    ...PLANTS.map(([kind, name]): DressItem => ({id: 'plant-' + kind, group: 'Cây cỏ & thiên nhiên', name: 'Chậu cây: ' + name, call: `D.plant({kind: '${kind}'})`, note: 'kind: monstera | fern | snake | ficus | succulent; height.'})),
    {id: 'books', group: 'Sách và kệ', name: 'Dãy sách', call: 'D.books({width: 0.8})', note: 'width, height, depth, fill, palette.'},
    {id: 'shelfRow', group: 'Sách và kệ', name: 'Một tầng kệ (sách + đồ)', call: 'D.shelfRow({width: 0.9})', note: 'width, depth, height, books (tỷ lệ sách).'},
    {id: 'bookcase', group: 'Sách và kệ', name: 'Tủ sách', call: 'D.bookcase({width: 1.2, height: 1.9})', note: 'width, height, depth, shelves, color.'},
    {id: 'wallShelf', group: 'Sách và kệ', name: 'Kệ treo tường', call: 'D.wallShelf({width: 0.9})', note: 'width, depth, color.'},
    {id: 'frame', group: 'Treo tường', name: 'Tranh / khung ảnh', call: 'D.frame({w: 0.4, h: 0.5})', note: 'w, h, depth, color.'},
    {id: 'gallery', group: 'Treo tường', name: 'Cụm tranh', call: 'D.gallery({width: 1.6, height: 1.0, count: 5})', note: 'width, height, count.'},
    {id: 'wallClock', group: 'Treo tường', name: 'Đồng hồ treo tường', call: 'D.wallClock({radius: 0.16})', note: 'radius, color; kim nằm trong nhóm clock_hands.'},
    {id: 'calendar', group: 'Treo tường', name: 'Lịch treo', call: 'D.calendar({width: 0.3})', note: 'width, color.'},
    {id: 'wallPlates', group: 'Treo tường', name: 'Ổ cắm / công tắc / điều nhiệt', call: "D.wallPlates([{kind: 'socket', x: 0, y: 0}, {kind: 'switch', x: 0.2, y: 0}, {kind: 'thermostat', x: 0.42, y: 0}])", note: 'Mảng {kind: socket | switch | thermostat, x, y}.'},
    ...DECOR.map(([kind, name]): DressItem => ({id: 'decor-' + kind, group: 'Đồ trang trí', name, call: `D.decor('${kind}')`, note: 'scale, color.'})),
    ...DESK.map(([kind, name]): DressItem => ({id: 'desk-' + kind, group: 'Đồ bàn làm việc', name, call: `D.deskItem('${kind}')`, note: 'color.'})),
    {id: 'deskSet', group: 'Bộ đồ sắp sẵn', name: 'Bộ đồ bàn làm việc', call: 'D.deskSet({width: 1.4, depth: 0.7})', note: 'width, depth của mặt bàn; items: danh sách món muốn có.'},
    {id: 'tableSet', group: 'Bộ đồ sắp sẵn', name: 'Bộ bàn ăn', call: 'D.tableSet()', note: 'seats: [[x, z, hướng]…], color.'},
    {id: 'kitchenSet', group: 'Bộ đồ sắp sẵn', name: 'Bộ đồ bếp', call: 'D.kitchenSet({width: 1.8})', note: 'width của mặt bếp.'},
    {id: 'cushion', group: 'Vải & đồ mềm', name: 'Gối tựa', call: 'D.cushion({width: 0.45})', note: 'width, color.'},
    {id: 'rug', group: 'Vải & đồ mềm', name: 'Thảm', call: 'D.rug({width: 2, depth: 1.4})', note: 'width, depth, color, inner.'},
    {id: 'curtains', group: 'Vải & đồ mềm', name: 'Rèm cửa', call: 'D.curtains({width: 2, height: 2.2})', note: 'width, height, panel, color, sway. Rèm đung đưa theo gió.'},
];
/** Groups shown in this order in the library (rooms first, then outdoors). */
const GROUP_ORDER = ['Động vật', 'Nội thất', 'Bếp & phòng tắm', 'Điện tử', 'Đèn', 'Kiến trúc', 'Sách và kệ', 'Treo tường', 'Đồ trang trí', 'Đồ bàn làm việc', 'Bộ đồ sắp sẵn', 'Vải & đồ mềm', 'Đồ ăn & thức uống', 'Dụng cụ & vật phẩm', 'Đường phố', 'Xe & phương tiện', 'Cây cỏ & thiên nhiên'];
export const DRESS_ITEMS: DressItem[] = RAW_DRESS_ITEMS.map((item, i) => ({item, i})).sort((a, b) => ((GROUP_ORDER.indexOf(a.item.group) + 1 || 99) - (GROUP_ORDER.indexOf(b.item.group) + 1 || 99)) || a.i - b.i).map(({item}) => item);


const RUNTIME_URL = '/three.min.js?v=0.186.1';
const sources = new Map<string, Promise<string>>();
/** Sandbox của iframe không tự tải được file cùng máy chủ, nên trang cha tải rồi nhúng vào srcDoc. */
export function fetchSource(url: string): Promise<string> {
    if (!sources.has(url)) {
        sources.set(url, fetch(url).then(async (response) => {
            if (!response.ok) throw new Error(`Không tải được ${url} (HTTP ${response.status}).`);
            return response.text();
        }).catch((error) => { sources.delete(url); throw error; }));
    }
    return sources.get(url) as Promise<string>;
}
export const threeRuntimeSource = () => fetchSource(RUNTIME_URL);
export const materialRuntimeSource = () => fetchSource('/sv-material-runtime.js');

const inline = (code: string) => `<script>${code.replace(/<\/script/gi, '<\\/script')}</script>`;
const page = (scripts: string[], background: string) => `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;overflow:hidden;background:${background}}canvas{display:block;max-width:100%;max-height:100%}#err{position:fixed;left:8px;bottom:8px;right:8px;font:12px sans-serif;color:#c0392b;white-space:pre-wrap}</style></head><body><div id="err"></div>${scripts.map(inline).join('')}</body></html>`;
const GUARD = `window.addEventListener('error',function(e){document.getElementById('err').textContent=e.message;});`;

/** iframe sandbox có thể báo khung nhìn 0×0 cho tới lần layout đầu: các trang xem trước khởi động với cỡ hộp thoại (852×420).
 * Cảnh 3D có ánh sáng + nền; drag để xoay, lăn chuột để zoom. `view(object)` đặt máy quay vừa khít vật. */
const STAGE = `
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

/**
 * Worker iframes (ẩn) dựng ảnh thu nhỏ THEO YÊU CẦU: trang cha gửi {type: 'sv-thumb-request', id, call?}, worker dựng đúng
 * món đó và trả {type: 'sv-library-thumbs', kind, id, url}. Trang cha chỉ gửi món đang nằm trong khung nhìn, từng món một.
 */
export function dressWorkerDocument(runtime: string): string {
    return page([GUARD, runtime, STAGE, `
(function () {
  var S = svStage(168, 168, false), T = S.T; S.R.domElement.style.visibility = 'hidden';
  window.addEventListener('message', function (e) {
    var m = e.data; if (e.source !== parent || !m || m.type !== 'sv-thumb-request' || typeof m.call !== 'string') return;
    var url = '';
    try {
      var D = T.SVDress.create({seed: 7, prefix: 'lib'}), o = new Function('D', 'THREE', 'return ' + m.call)(D, T);
      S.scene.add(o); S.view(o); D.animate(0.6, 0.25); S.render(0); url = S.R.domElement.toDataURL('image/jpeg', 0.82); S.scene.remove(o);
      o.traverse(function (x) { if (x.geometry) x.geometry.dispose(); if (x.material) (Array.isArray(x.material) ? x.material : [x.material]).forEach(function (q) { q.dispose(); }); });
    } catch (err) { url = ''; }
    parent.postMessage({type: 'sv-library-thumbs', kind: 'dress', id: m.id, url: url}, '*');
  });
  parent.postMessage({type: 'sv-thumb-ready', kind: 'dress'}, '*');
})();`], '#E9EDF2');
}

/** Worker dựng ảnh hiệu ứng pixel ở khoảnh khắc đặc trưng (mốc impact hoặc giữa hiệu ứng), từng hiệu ứng một. */
export function pixelFxWorkerDocument(runtime: string): string {
    return page([GUARD, runtime, `
(function () {
  var T = THREE, scene = new T.Scene(), TW = 132, TH = 96, byId = {}; T.SVPixelFx.catalog.forEach(function (c) { byId[c.id] = c; });
  window.addEventListener('message', function (e) {
    var m = e.data; if (e.source !== parent || !m || m.type !== 'sv-thumb-request') return;
    var c = byId[m.id], url = '';
    try {
      var PX = T.SVPixelFx.create({scene: scene, seed: 5}), it = PX.add(c.id, {at: [0, 0, 0], start: 1}), W = c.size[0], H = c.size[1];
      PX.update(1 + (!c.loop && c.impact ? c.impact + 0.04 : c.duration * 0.45));
      var out = document.createElement('canvas'); out.width = TW; out.height = TH; var g = out.getContext('2d'); g.fillStyle = '#15131d'; g.fillRect(0, 0, TW, TH); g.imageSmoothingEnabled = false;
      var s = Math.min((TW - 8) / W, (TH - 8) / H);
      it.layers.forEach(function (L) { var d = L.data, tile = document.createElement('canvas'); tile.width = W; tile.height = H; var id = new ImageData(W, H);
        for (var i = 0; i < d.length; i += 4) { id.data[i] = d[i]; id.data[i + 1] = d[i + 1]; id.data[i + 2] = d[i + 2]; id.data[i + 3] = Math.max(d[i + 3], d[i], d[i + 1], d[i + 2]); }
        tile.getContext('2d').putImageData(id, 0, 0); g.drawImage(tile, (TW - W * s) / 2, (TH - H * s) / 2, W * s, H * s); });
      url = out.toDataURL('image/png'); PX.dispose();
    } catch (err) { url = ''; }
    parent.postMessage({type: 'sv-library-thumbs', kind: 'pixelfx', id: m.id, url: url}, '*');
  });
  parent.postMessage({type: 'sv-thumb-ready', kind: 'pixelfx'}, '*');
})();`], '#15131d');
}

/** Dấu phiên bản runtime: ảnh đã lưu chỉ dùng lại khi runtime và lời gọi builder không đổi. */
export function textFingerprint(text: string): string {
    let h = 2166136261; const step = Math.max(1, Math.floor(text.length / 20000));
    for (let i = 0; i < text.length; i += step) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36) + '-' + text.length.toString(36);
}

/** Bộ nhớ ảnh thu nhỏ trong IndexedDB của trình duyệt (mỗi người xem một bản; lỗi hoặc chế độ riêng tư thì bỏ qua). */
let dbRequest: Promise<IDBDatabase | null> | null = null;
function thumbDb(): Promise<IDBDatabase | null> {
    if (!dbRequest) {
        dbRequest = new Promise((resolve) => {
            try {
                const req = indexedDB.open('sv-visual-library', 1);
                req.onupgradeneeded = () => { req.result.createObjectStore('thumbs'); };
                req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); req.onblocked = () => resolve(null);
            } catch { resolve(null); }
        });
    }
    return dbRequest;
}
export async function readThumb(key: string): Promise<string> {
    const db = await thumbDb(); if (!db) return '';
    return new Promise((resolve) => { try { const r = db.transaction('thumbs').objectStore('thumbs').get(key); r.onsuccess = () => resolve(typeof r.result === 'string' ? r.result : ''); r.onerror = () => resolve(''); } catch { resolve(''); } });
}
export async function writeThumb(key: string, url: string): Promise<void> {
    const db = await thumbDb(); if (!db) return;
    try { db.transaction('thumbs', 'readwrite').objectStore('thumbs').put(url, key); } catch { /* quota or private mode: keep the in-memory copy only */ }
}

export function dressPreviewDocument(runtime: string, item: DressItem, state?: string): string {
    return page([GUARD, runtime, STAGE, `
(function () {
  var S = svStage(window.innerWidth || 852, window.innerHeight || 420, true), T = S.T, D = T.SVDress.create({seed: 7, prefix: 'lib'});
  var o = new Function('D', 'THREE', 'return ' + ${JSON.stringify(item.call)})(D, T), st = ${JSON.stringify(state || '')};
  if (st && o.userData.svStates && o.userData.svStates.indexOf(st) >= 0) D.setState(o, st);
  S.scene.add(o); S.view(o);
  parent.postMessage({type: 'sv-preview-states', states: o.userData.svStates || [], current: o.userData.svState || ''}, '*');
  var start = performance.now(), last = start;
  (function frame(now) { D.animate((now - start) / 1000, 0.3); S.render((now - last) / 1000); last = now; requestAnimationFrame(frame); })(start);
})();`], '#E9EDF2');
}

/** Hiệu ứng chạy thật trong cảnh Three.js: thẻ 2D quay về máy quay, hiệu ứng một lần tự lặp lại. */
export function pixelFxPreviewDocument(runtime: string, effect: PixelFxEffect, unit: number): string {
    return page([GUARD, runtime, `
(function () {
  var T = THREE, c = ${JSON.stringify({id: effect.id, size: effect.size, origin: effect.origin || [effect.size[0] / 2, effect.size[1]], duration: effect.duration, loop: effect.loop, screen: !!effect.screen})}, u = ${Number(unit) || 0.045};
  var R = new T.WebGLRenderer({antialias: false}); R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); document.body.appendChild(R.domElement);
  var scene = new T.Scene(); scene.background = new T.Color('#15131d'); scene.add(new T.HemisphereLight('#ffffff', '#30304a', 1));
  var camera = new T.PerspectiveCamera(35, 16 / 9, 0.05, 400), W = c.size[0] * u, H = c.size[1] * u, cx = (c.size[0] / 2 - c.origin[0]) * u, cy = (c.origin[1] - c.size[1] / 2) * u;
  var line = new T.Mesh(new T.PlaneGeometry(Math.max(W * 1.6, 4), 0.02), new T.MeshBasicMaterial({color: '#3b3852'})); line.position.set(cx, -0.01, -0.02); if (!c.screen) scene.add(line);
  function fit() {
    var w = window.innerWidth || 852, h = window.innerHeight || 420; R.setSize(w, h); camera.aspect = w / h;
    var tan = Math.tan(T.MathUtils.degToRad(camera.fov / 2)), d = Math.max(H / 2 / tan, W / 2 / (tan * camera.aspect)) * 1.18;
    camera.position.set(cx, cy, d); camera.lookAt(cx, cy, 0); camera.updateProjectionMatrix();
  }
  var PX = T.SVPixelFx.create({scene: scene, seed: 5}); PX.add(c.id, c.loop ? {at: [0, 0, 0]} : {at: [0, 0, 0], start: 0.35});
  var start = performance.now(), cycle = c.loop ? 3600 : c.duration + 1.1;
  function draw(now) { PX.update(((now - start) / 1000) % cycle); R.render(scene, camera); }
  fit(); window.addEventListener('resize', function () { fit(); draw(performance.now()); });
  (function frame(now) { draw(now); requestAnimationFrame(frame); })(start + (c.loop ? 0 : (0.35 + (c.duration || 1) * 0.5) * 1000));
})();`], '#15131d');
}

/** Vật liệu PBR phủ lên quả cầu (UV) và khối hộp + sàn (chiếu hộp theo kích thước thật của gói). */
export function materialPreviewDocument(runtime: string, materialRuntime: string, pack: string, material: LibraryMaterial): string {
    const tile = Math.max(0.2, Number(material.dimensions?.width) > 0 ? Number(material.dimensions?.width) / 100 : 1);
    return page([GUARD, runtime, materialRuntime, pack, STAGE, `
(function () {
  var S = svStage(window.innerWidth || 852, window.innerHeight || 420, true), T = S.T, root = new T.Group(), key = ${JSON.stringify(material.key)}, tile = ${tile};
  var uv = new T.MeshStandardMaterial(), boxed = new T.MeshStandardMaterial(); uv.name = 'lib_uv'; boxed.name = 'lib_box';
  var ball = new T.Mesh(new T.SphereGeometry(0.6, 64, 40), uv); ball.position.set(-0.75, 0.6, 0); root.add(ball);
  var cube = new T.Mesh(new T.BoxGeometry(1, 1, 1), boxed); cube.position.set(0.75, 0.5, 0); root.add(cube);
  var floor = new T.Mesh(new T.BoxGeometry(3.4, 0.04, 2.4), boxed); floor.position.set(0, -0.02, 0); root.add(floor);
  S.scene.add(root);
  window.SVMaterialRuntime.apply({root: root}, {
    lib_uv: {pack: key, projection: 'uv', repeat: [3, 1.5], tileSizeM: [tile, tile], normalScale: 1},
    lib_box: {pack: key, projection: 'box', tileSizeM: [tile, tile], normalScale: 1}
  }, window.SVEnvironmentMaterialPacks, T);
  S.view(root, false);
  var last = performance.now();
  (function frame(now) { S.render((now - last) / 1000); last = now; requestAnimationFrame(frame); })(last);
})();`], '#E9EDF2');
}
