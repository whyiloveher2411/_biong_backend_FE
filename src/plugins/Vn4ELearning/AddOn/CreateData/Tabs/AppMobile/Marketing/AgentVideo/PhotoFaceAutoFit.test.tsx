import React from 'react';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import PhotoFaceEditor,{defaultPhotoFace} from './PhotoFaceEditor';
import type {PhotoFaceTargets} from './photoFaceLandmarks';

jest.mock('./photoFaceLandmarks',()=>({
    ...jest.requireActual('./photoFaceLandmarks'),
    detectFaceLandmarks:jest.fn(),
    estimateHeadShape:jest.fn(),
    estimateFeatureParameters:jest.fn(),
    fitPhotoFace:jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const landmarks=require('./photoFaceLandmarks') as {detectFaceLandmarks:jest.Mock;fitPhotoFace:jest.Mock;estimateHeadShape:jest.Mock;estimateFeatureParameters:jest.Mock};
const photo=()=>defaultPhotoFace({width:16,height:16,pixels:btoa('abc'.repeat(256))});
const targets=(parameters:Record<string,number>,head='mai_head_v1'):PhotoFaceTargets=>({version:2,points:{},frame:{rx:.1,ry:.1},layer:{width:.18,height:.24},scale:{x:1,y:1},outline:[],profiles:{y:[],widths:{},jaw:[]},parameters,head});
beforeEach(()=>{
    // CRA resets mock implementations before every test.
    landmarks.estimateHeadShape.mockImplementation(()=>({selections:{head:'heart'},parameters:{headWidth:.9,jawWidth:.85}}));
    landmarks.estimateFeatureParameters.mockImplementation(()=>({parameters:{eyeSpacing:1.05,mouthY:-.01}}));
    landmarks.fitPhotoFace.mockImplementation(photo=>({...photo,mode:'full_face',x:.02,sculpt:[{x:0,y:-.1,dx:0,dy:-.004}]}));
    const context={clearRect:jest.fn(),fillRect:jest.fn(),save:jest.fn(),restore:jest.fn(),translate:jest.fn(),rotate:jest.fn(),scale:jest.fn(),drawImage:jest.fn(),putImageData:jest.fn(),createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x:number,y:number,w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4).fill(255)})};
    jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
});
afterEach(()=>jest.restoreAllMocks());

test('auto fit reshapes the head, then the features, then sculpts — each after the preview confirms the change',async()=>{
    landmarks.detectFaceLandmarks.mockResolvedValue(Array.from({length:478},()=>({x:.5,y:.5,z:0})));
    const change=jest.fn(),design=jest.fn(),value=photo();
    const base={headWidth:1,jawWidth:1,eyeSpacing:1,mouthY:0};
    const editor=(t:PhotoFaceTargets)=><PhotoFaceEditor value={value} targets={t} onDesignChange={design} disabled={false} onChange={change} onBlink={jest.fn()}/>;
    const {rerender}=render(editor(targets(base)));
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Tự khớp khuôn mặt'}));});
    await waitFor(()=>expect(design).toHaveBeenCalledWith({selections:{head:'heart'},parameters:{headWidth:.9,jawWidth:.85}}));
    // Parameters reported, but the old head preset: still waiting.
    rerender(editor(targets({...base,headWidth:.9,jawWidth:.85})));
    expect(landmarks.estimateFeatureParameters).not.toHaveBeenCalled();
    rerender(editor(targets({...base,headWidth:.9,jawWidth:.85},'heart')));
    await waitFor(()=>expect(design).toHaveBeenLastCalledWith({parameters:{eyeSpacing:1.05,mouthY:-.01}}));
    expect(change).not.toHaveBeenCalled();
    rerender(editor(targets({...base,headWidth:.9,jawWidth:.85,eyeSpacing:1.05,mouthY:-.01},'heart')));
    await waitFor(()=>expect(change).toHaveBeenCalledWith(expect.objectContaining({x:.02,mode:'full_face',sculpt:[{x:0,y:-.1,dx:0,dy:-.004}]})));
    expect(landmarks.fitPhotoFace).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Ảnh giữ nguyên, không bị bóp méo/)).toBeTruthy();
});

test('auto fit reports a photo without a detectable face and leaves the design untouched',async()=>{
    landmarks.detectFaceLandmarks.mockResolvedValue(null);
    const change=jest.fn(),design=jest.fn();
    render(<PhotoFaceEditor value={photo()} targets={targets({})} onDesignChange={design} disabled={false} onChange={change} onBlink={jest.fn()}/>);
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Tự khớp khuôn mặt'}));});
    expect(await screen.findByText(/Không nhận diện được khuôn mặt/)).toBeTruthy();
    expect(change).not.toHaveBeenCalled();expect(design).not.toHaveBeenCalled();
});
