import React from 'react';
import {Box, Button, Chip, CircularProgress, Stack, Typography} from '@mui/material';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';

type Option = {provider: 'deepseek'|'claude'|'chatgpt'; label:string; disabled:boolean; open:(resume?:boolean)=>Promise<void>};
type Props = {options:Option[]; state:{chatUrl:string;sessionAlive:boolean;message:string;beatCount:number;translationCount:number;hasOriginalAudio:boolean};busy:boolean;onResume?:()=>Promise<void>};
export default function WorkflowChatSessionBox({options,state,busy,onResume}:Props){
    const [opening,setOpening]=React.useState('');
    return <Box sx={{mt:1,p:1,border:'1px solid',borderColor:'divider',borderRadius:1.5}}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {options.map(option=><Button key={option.provider} size="small" variant="outlined" disabled={option.disabled||busy} startIcon={opening===option.provider?<CircularProgress size={16}/>:option.provider==='chatgpt'?<SmartToyOutlinedIcon fontSize="small"/>:<img src={`${process.env.PUBLIC_URL||''}/images/workflow/${option.provider}.svg`} width={20} height={20} alt=""/>} onClick={async()=>{setOpening(option.provider);try{await option.open();}finally{setOpening('');}}} sx={{textTransform:'none'}}>{option.label}</Button>)}
            {state.sessionAlive?<Chip size="small" color="success" variant="outlined" label="Browser đang mở" sx={{height:22}}/>:null}
            {state.beatCount>0?<Typography variant="caption" color="text.secondary">{state.beatCount} beat</Typography>:null}
            {state.translationCount>0?<Typography variant="caption" color="text.secondary">Dịch {state.translationCount}</Typography>:null}
        </Stack>
        {state.chatUrl?<Stack direction="row" spacing={1} alignItems="center" sx={{mt:.75,minWidth:0}}>
            <Button size="small" disabled={busy||!onResume} startIcon={<OpenInNewOutlinedIcon sx={{fontSize:14}}/>} onClick={()=>{void onResume?.();}} sx={{whiteSpace:'nowrap',textTransform:'none',flexShrink:0}}>Mở lại chat</Button>
            <Typography component="a" href={state.chatUrl} target="_blank" rel="noopener noreferrer" variant="caption" title={state.chatUrl} sx={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{state.chatUrl}</Typography>
        </Stack>:null}
        {state.message?<Typography variant="caption" color="text.secondary" sx={{display:'block',mt:.5}}>{state.message}</Typography>:null}
    </Box>;
}
