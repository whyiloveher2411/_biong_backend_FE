import React from 'react';
import {fireEvent,render,screen} from '@testing-library/react';
import {PipelineGroupedWorkflowListV3,resolveRestartableSet} from './FullAutoPipelineGroupedSteps';
import {normalizeFullAutoStepToggles} from './agentVideoApi';
jest.mock('./PipelineHeadlessPrerequisitesHint',()=>({PipelineHeadlessPrerequisitesHint:()=>null}));
import type {FullAutoPipelineStepKey,FullAutoStepToggles} from './agentVideoApi';
const readySteps=['beat_division','beat_audio','sfx','beat_html','bgm'] as const;
const statuses=Object.fromEntries(readySteps.map(key=>[key,{status:'done'}]));
const ready=new Set<FullAutoPipelineStepKey>([...readySteps,'whiteboard_render']);
const props={steps:statuses,agentVisualMode:'video_2s',beatAudioMode:true,hasBeatHtmlPrompt:true,pipelineStatus:'paused',currentStep:'whiteboard_render',onStepToggleChange:jest.fn(),onRunSingleStep:jest.fn()};
function bgmCheckbox(){let el:HTMLElement|null=screen.getByText('Audio background');while(el&&!el.querySelector('input[type="checkbox"]'))el=el.parentElement;return el?.querySelector('input[type="checkbox"]') as HTMLInputElement;}
test('saved HTML/BGM readiness enables beat render without enabling final mux prematurely',()=>{
 render(<PipelineGroupedWorkflowListV3 {...props} restartableSet={ready}/>);
 const projected=resolveRestartableSet(['beat_audio','sfx','beat_html','bgm','render','whiteboard_render'],statuses,'whiteboard_render');
 expect(projected.has('whiteboard_render')).toBe(true);
 const beat=screen.getByTestId('pipeline-run-single-render') as HTMLButtonElement;
 expect(beat.disabled).toBe(false);expect((screen.getByTestId('pipeline-run-single-whiteboard_mux') as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(beat);expect(props.onRunSingleStep).toHaveBeenCalledWith('whiteboard_render');
});
test('backend readiness restrictions stay authoritative when HTML is missing',()=>{
 const restricted=resolveRestartableSet(['beat_audio','sfx','beat_html'],statuses,'whiteboard_render');
 render(<PipelineGroupedWorkflowListV3 {...props} restartableSet={restricted}/>);
 expect((screen.getByTestId('pipeline-run-single-render') as HTMLButtonElement).disabled).toBe(true);
});
test('BGM defaults on consistently, while an explicit saved off preference is preserved',()=>{
 expect(normalizeFullAutoStepToggles().bgm).toBe(true);expect(normalizeFullAutoStepToggles({bgm:false}).bgm).toBe(false);
 const view=render(<PipelineGroupedWorkflowListV3 {...props} restartableSet={ready}/>);
 expect(bgmCheckbox().checked).toBe(true);
 view.rerender(<PipelineGroupedWorkflowListV3 {...props} restartableSet={ready} stepToggles={{...normalizeFullAutoStepToggles(),bgm:false} as FullAutoStepToggles}/>);
 expect(bgmCheckbox().checked).toBe(false);
});
