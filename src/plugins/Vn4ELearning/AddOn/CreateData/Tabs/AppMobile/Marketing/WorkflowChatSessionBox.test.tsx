import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import ChatBox from './WorkflowChatSessionBox';
const state={chatUrl:'https://claude.ai/chat/latest',sessionAlive:false,message:'',beatCount:4,translationCount:0,hasOriginalAudio:true};
test('compact provider buttons share one URL and one resume action',async()=>{
    const deepseek=jest.fn(async()=>{}),claude=jest.fn(async()=>{}),resume=jest.fn(async()=>{});
    render(<ChatBox options={[{provider:'deepseek',label:'DeepSeek',disabled:false,open:deepseek},{provider:'claude',label:'Claude',disabled:false,open:claude}]} state={state} busy={false} onResume={resume}/>);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link')).toHaveAttribute('href',state.chatUrl);
    const deepseekButton=screen.getByRole('button',{name:'DeepSeek'});
    expect(deepseekButton.querySelector('img')).toHaveAttribute('src','/images/workflow/deepseek.svg');
    fireEvent.click(deepseekButton);await waitFor(()=>expect(deepseek).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button',{name:'Claude'}));await waitFor(()=>expect(claude).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button',{name:'Mở lại chat'}));expect(resume).toHaveBeenCalledTimes(1);
});
test('opening a session disables both provider buttons and resume',()=>{
    render(<ChatBox options={[{provider:'deepseek',label:'DeepSeek',disabled:false,open:jest.fn()},{provider:'claude',label:'Claude',disabled:false,open:jest.fn()}]} state={state} busy/>);
    screen.getAllByRole('button').forEach(button=>expect(button).toBeDisabled());
});
