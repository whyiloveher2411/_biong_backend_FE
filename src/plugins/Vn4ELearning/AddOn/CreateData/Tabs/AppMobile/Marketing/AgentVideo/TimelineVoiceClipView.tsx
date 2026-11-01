import React from 'react';
import {Box,IconButton} from '@mui/material';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import TimelineAudioClipView from './TimelineAudioClipView';
import type {VoiceMix} from 'helpers/timelineVoice';
export default function TimelineVoiceClipView({mix,duration,onVolume,onToggle}:{mix:VoiceMix;duration:number;onVolume:(volume:number)=>void;onToggle:()=>void}){
 const clip={id:'main_voice',sound_id:'main_voice',sound:{id:'main_voice',file:'',title:'Voice',duration_sec:duration,category:'voice',license:'',source:''},start_sec:0,duration_sec:duration,offset_sec:0,volume:mix.volume,muted:mix.muted,loop:false,speed:1,fade_in:0,fade_out:0};
 return <Box sx={{position:'relative',width:'100%',height:'100%'}}><TimelineAudioClipView clip={clip} selected={false} onSelect={()=>{}} onVolume={onVolume} color="#8058a5"/><Box component="output" aria-label="Phần trăm âm lượng Voice" sx={{position:'absolute',left:mix.muted?118:56,top:3,color:'#fff',bgcolor:'rgba(0,0,0,.45)',borderRadius:.5,px:.5,fontSize:12,fontWeight:700,lineHeight:'18px',pointerEvents:'none'}}>{Math.round(mix.volume*100)}%</Box><IconButton size="small" aria-label={mix.muted?'Bật Voice':'Tắt Voice'} title={mix.muted?'Bật lời đọc':'Tắt lời đọc để nghe hiệu ứng'} onPointerDown={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onToggle();}} sx={{position:'absolute',right:4,top:0,p:0.5,color:'#fff'}}>{mix.muted?<VolumeOffIcon fontSize="small"/>:<VolumeUpIcon fontSize="small"/>}</IconButton></Box>;
}
