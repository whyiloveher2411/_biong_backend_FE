import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import CharacterWardrobeEditor from './CharacterWardrobeEditor';
import {characterRequest, CharacterPart} from 'helpers/marketingShortVideoModel3dApi';
jest.mock('helpers/marketingShortVideoModel3dApi',()=>({characterRequest:jest.fn(),parseShortVideoModel3dApiMessage:()=> 'Lỗi thử'}));
const request=characterRequest as jest.Mock;
const part: CharacterPart={id:'helmet',name:'Tóc mũ thử',slot:'hair',parts:[{bone:'head',shape:'sphere',size:[.1,.1,.1],color:'#ffcc00'}]};
beforeEach(()=>{request.mockReset();});
afterEach(()=>{jest.useRealTimers();});
test('requires a saved character before starting headless generation',()=>{
    render(<CharacterWardrobeEditor value={{enabled:true}} onChange={jest.fn()} modelId={0} library={[]}/>);
    fireEvent.change(screen.getByLabelText('Mô tả thiết kế'),{target:{value:'Mũ vàng'}});
    expect((screen.getByRole('button',{name:'Tạo asset bằng DeepSeek'}) as HTMLButtonElement).disabled).toBe(true);
    expect(request).not.toHaveBeenCalled();
});
test('copies a reusable library recipe into the selected character',()=>{
    const change=jest.fn();render(<CharacterWardrobeEditor value={{enabled:true}} onChange={change} modelId={3} library={[part]}/>);
    fireEvent.mouseDown(screen.getAllByLabelText('Tóc')[0]);
    fireEvent.click(screen.getByText('Tóc mũ thử · Thư viện'));
    expect(change.mock.calls[0][0].selections.hair).toBe('helmet');
    expect(change.mock.calls[0][0].library).toEqual([part]);
});
test('polls headless generation and adds completed assets without auto-selecting them',async()=>{
    jest.useFakeTimers(); const change=jest.fn();
    request.mockResolvedValueOnce({success:true}).mockResolvedValueOnce({success:true,model:{character_generation:{status:'completed'},character:{library:[part]}}});
    render(<CharacterWardrobeEditor value={{enabled:true,shirt:'#123456',selections:{hair:'short'}}} onChange={change} modelId={3} library={[]}/>);
    fireEvent.change(screen.getByLabelText('Mô tả thiết kế'),{target:{value:'Mũ vàng'}});
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Tạo asset bằng DeepSeek'}));});
    expect(request).toHaveBeenCalledWith('generate',{model_id:3,slot:'hair',request:'Mũ vàng'});
    await act(async()=>{jest.advanceTimersByTime(5000);});
    expect(request).toHaveBeenCalledWith('get',{model_id:3});
    expect(change.mock.calls[0][0]).toMatchObject({shirt:'#123456',selections:{hair:'short'},library:[part]});
    expect(screen.getByText(/Asset đã được kiểm tra cấu trúc/)).toBeTruthy();
});

test('skinned wardrobe keeps connected garments instead of offering rigid replacement limbs',()=>{
    render(<CharacterWardrobeEditor value={{enabled:true,surface_mode:'skinned_v2'}} onChange={jest.fn()} modelId={4} library={[]}/>);
    expect(screen.queryByLabelText('Tay')).toBeNull();
    expect(screen.queryByLabelText('Chân')).toBeNull();
    expect(screen.getAllByLabelText('Tóc').length).toBeGreaterThan(0);
    expect(screen.getByText(/Áo, tay áo và quần dùng bề mặt liền/)).toBeTruthy();
});

test('connected wardrobe applies a complete palette and saves facial expression',()=>{
    const change=jest.fn(); render(<CharacterWardrobeEditor value={{enabled:true,surface_mode:'skinned_v2'}} onChange={change} modelId={4} library={[]}/>);
    fireEvent.mouseDown(screen.getByLabelText('Bộ phối trang phục')); fireEvent.click(screen.getByText('Sport · Xanh / cam'));
    expect(change.mock.calls[0][0]).toMatchObject({outfit:'sport',shirt:'#315b87',accent:'#f49b38',surface_mode:'skinned_v2'});
    fireEvent.mouseDown(screen.getByLabelText('Biểu cảm mặc định'));fireEvent.click(screen.getByText('Ngạc nhiên'));
    expect(change.mock.calls[1][0].expression).toBe('surprised');
});

test('all workflow emotions are selectable and the effect setting persists',()=>{
 const change=jest.fn();render(<CharacterWardrobeEditor value={{enabled:true}} onChange={change} modelId={4} library={[]}/>);
 fireEvent.mouseDown(screen.getByLabelText('Biểu cảm mặc định'));
 for(const name of ['Lo lắng','Đắc ý','Suy nghĩ','Khóc','Cười lớn'])expect(screen.getByRole('option',{name})).toBeTruthy();
 fireEvent.click(screen.getByRole('option',{name:'Cười lớn'}));expect(change.mock.calls[0][0].expression).toBe('laughing');
 fireEvent.click(screen.getByLabelText('Ký hiệu cảm xúc cartoon'));expect(change.mock.calls[1][0].emotionEffects).toBe(false);
});
