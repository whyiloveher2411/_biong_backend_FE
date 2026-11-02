import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import Breakdown from './MarketingWorkflowBreakdown';
import {buildWorkflowBreakdownPlan,fetchWorkflowPromptText,WorkflowPromptItem} from 'helpers/marketingWorkflowPrompts';
import {startDeepseekStep2Chunk,fetchDeepseekStep2Status} from 'helpers/marketingDeepseekVideoImage';
jest.mock('hook/useApi',()=>({ajax:jest.fn()}));
jest.mock('helpers/marketingWorkflowPrompts',()=>({...jest.requireActual('helpers/marketingWorkflowPrompts'),fetchWorkflowPromptText:jest.fn()}));
jest.mock('helpers/marketingDeepseekVideoImage',()=>({startDeepseekStep2Chunk:jest.fn(),fetchDeepseekStep2Status:jest.fn(),openDeepseekChunkChat:jest.fn()}));
jest.mock('./AgentVideo/agentVideoApi',()=>({importManualBeatPromptFile:jest.fn()}));
const plan=buildWorkflowBreakdownPlan('BEAT 01: First.\n\nBEAT 02: Second.\n\nBEAT 03: Third.',2)!;
const item={label:'Thiết kế visual',file:'create-beat-visual.md',exists:true,scriptBreakdown:2,updateField:'prompt-image-v2-final',buttonUpdate:'imagePromptBeatUpdate'} as WorkflowPromptItem;
beforeEach(()=>{
 jest.clearAllMocks();
 (fetchWorkflowPromptText as jest.Mock).mockResolvedValue({ok:true,text:'Resolved visual prompt'});
 (startDeepseekStep2Chunk as jest.Mock).mockResolvedValue({success:true});
 (fetchDeepseekStep2Status as jest.Mock).mockResolvedValue({success:false});
});
test.each(['claude','deepseek'] as const)('run all sends every chunk to %s with its own beat range',async provider=>{
 const view=render(<Breakdown workflowKey="video-html" item={item} plan={plan} savedValue="" shortVideoId={67} showMessage={jest.fn()}/>);
 const label=provider==='claude'?'Claude':'DeepSeek';
 fireEvent.click(screen.getByRole('button',{name:`Chạy ${label} tất cả phần`}));
 await waitFor(()=>expect(startDeepseekStep2Chunk).toHaveBeenCalledTimes(2));
 expect(startDeepseekStep2Chunk).toHaveBeenNthCalledWith(1,expect.objectContaining({provider,index:0,startOrder:1,beatCount:2,prompt:'Resolved visual prompt'}));
 expect(startDeepseekStep2Chunk).toHaveBeenNthCalledWith(2,expect.objectContaining({provider,index:1,startOrder:3,beatCount:1}));
 expect(screen.getByRole('button',{name:`${label} đang chạy…`})).toBeDisabled();
 expect(screen.getAllByRole('button',{name:'Claude'})).toHaveLength(2);
 view.unmount();
});
test('compact Claude button runs only its own part and displays supplied logo',async()=>{
 const view=render(<Breakdown workflowKey="video-html" item={item} plan={plan} savedValue="" shortVideoId={67} showMessage={jest.fn()}/>);
 const button=screen.getAllByRole('button',{name:'Claude'})[1];
 expect(button.querySelector('img')).toHaveAttribute('src','/images/workflow/claude.svg');
 fireEvent.click(button);
 await waitFor(()=>expect(startDeepseekStep2Chunk).toHaveBeenCalledTimes(1));
 expect(startDeepseekStep2Chunk).toHaveBeenCalledWith(expect.objectContaining({provider:'claude',index:1,startOrder:3,beatCount:1}));
 view.unmount();
});
