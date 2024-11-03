import { Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import Label from 'components/atoms/Label';
import NotFound from 'components/molecules/NotFound';
import { convertHMS } from 'helpers/date';
import useAjax from 'hook/useApi';
import useDebounce from 'hook/useDebounce';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import React, { useState } from 'react';
// import { TableComponents, TableVirtuoso } from 'react-virtuoso';

interface TranscriptItem {
    start: string;
    duration: string;
    text: string;
    target: string;
}

function SubtitlesSourceCustom(props: FieldFormItemProps) {

    let valueInital: Array<TranscriptItem> = [];
    let valueInitalTarget: Array<TranscriptItem> = [];

    let [changeTranscript, setChangeTranscript] = useState<{ text: string, start: string, duration: string }>({ text: '', start: '', duration: '' });

    const debounceChangeTranscript = useDebounce(changeTranscript, 1000);

    const postApi = useAjax();
    const postApiClear = useAjax();

    // let [changeTranscript, setChangeTranscript] = useState<Array<string>>([]);

    try {
        if (props.post['subtitles_source'] && typeof props.post['subtitles_source'] === 'object') {
            valueInital = props.post['subtitles_source'];
        } else {
            if (props.post['subtitles_source']) {
                valueInital = JSON.parse(props.post['subtitles_source']);
            } else {
                valueInital = [];
            }
        }

    } catch (error) {
        valueInital = [];
    }

    try {
        if (props.post['subtitles_target'] && typeof props.post['subtitles_target'] === 'object') {
            valueInitalTarget = props.post['subtitles_target'];
        } else {
            if (props.post['subtitles_target']) {
                valueInitalTarget = JSON.parse(props.post['subtitles_target']);
            } else {
                valueInitalTarget = [];
            }
        }

    } catch (error) {
        valueInitalTarget = [];
    }

    const navigate = useNavigate();

    const valueInitalTargetObject = valueInitalTarget.reduce((accumulator, currentItem) => {
        accumulator[currentItem.start] = currentItem;
        return accumulator;
    }, {} as { [key: string]: { start: string, duration: string, text: string } });

    useEffect(() => {
        if (debounceChangeTranscript.start) {

            postApi.ajax({
                url: 'plugin/vn4-e-learning/actions/ai_mindmap/update-subtitles-target',
                method: 'POST',
                data: {
                    id: props.post['id'],
                    text: debounceChangeTranscript.text,
                    start: debounceChangeTranscript.start,
                    duration: debounceChangeTranscript.duration
                }
            });
        }
    }, [debounceChangeTranscript]);

    const handleClear = () => {
        postApiClear.ajax({
            url: 'plugin/vn4-e-learning/actions/ai_mindmap/clear-subtitles-target',
            method: 'POST',
            data: {
                id: props.post['id'],
            },
            success: () => {
                navigate(0);
            }
        })
    }

    // const rows: TranscriptItem[] = valueInital.map((item) => ({
    //     ...item,
    //     target: valueInitalTargetObject[item.start]?.text ?? '',
    // }));

    // const VirtuosoTableComponents: TableComponents<TranscriptItem> = {
    //     Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
    //         <TableContainer component={Paper} {...props} ref={ref} />
    //     )),
    //     Table: (props) => (
    //         <Table {...props} sx={{ borderCollapse: 'separate', tableLayout: 'fixed' }} />
    //     ),
    //     TableHead: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
    //         <TableHead {...props} ref={ref} />
    //     )),
    //     TableRow,
    //     TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
    //         <TableBody {...props} ref={ref} />
    //     )),
    // };

    // function fixedHeaderContent() {
    //     return (
    //         <TableRow>
    //             <TableCell
    //                 variant="head"
    //                 style={{ width: 60 }}
    //                 sx={{ backgroundColor: 'background.paper' }}
    //             >
    //                 Time
    //             </TableCell>
    //             <TableCell
    //                 variant="head"
    //                 sx={{ backgroundColor: 'background.paper' }}
    //             >
    //                 Source
    //             </TableCell>
    //             <TableCell
    //                 variant="head"
    //                 sx={{ backgroundColor: 'background.paper' }}
    //             >
    //                 Target (VI)
    //             </TableCell>
    //         </TableRow>
    //     );
    // }

    // function rowContent(index: number, row: TranscriptItem) {
    //     return (
    //         <React.Fragment>
    //             <TableCell sx={{
    //                 ...(row.target ? {} : { backgroundColor: 'primary.light' }),
    //             }}>
    //                 <Label
    //                     sx={{
    //                         color: '#2a59d1 !important',
    //                         backgroundColor: 'rgba(62,121,247,.1) !important',
    //                         textShadow: 'unset !important',
    //                         fontWeight: 'bold !important',
    //                         fontSize: '14px !important',
    //                     }}
    //                 >{convertHMS(parseInt(row.start)) ?? '00:00'}</Label>
    //             </TableCell>
    //             <TableCell sx={{
    //                 ...(row.target ? {} : { backgroundColor: 'primary.light' }),
    //             }}>
    //                 <span dangerouslySetInnerHTML={{ __html: row.text }} />
    //             </TableCell>
    //             <TableCell sx={{
    //                 ...(row.target ? {} : { backgroundColor: 'primary.light' }),
    //             }}>
    //                 <OutlinedInput
    //                     fullWidth
    //                     type='text'
    //                     value={changeTranscript[index] ? changeTranscript[index] : row.target}
    //                     sx={{
    //                         pr: 0,
    //                     }}
    //                     size='small'
    //                     onBlur={() => {
    //                         // 
    //                     }}
    //                     onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
    //                         setChangeTranscript(prev => {
    //                             prev[index] = e.currentTarget.value;
    //                             return [...prev];
    //                         })
    //                     }}
    //                     endAdornment={<IconButton
    //                         onClick={() => {
    //                             console.log(changeTranscript[index]);
    //                         }}
    //                     >
    //                         <Icon icon="ArrowUpwardRounded" />
    //                     </IconButton>}
    //                 />
    //             </TableCell>
    //         </React.Fragment>
    //     );
    // }


    return (<> <Paper style={{ width: '100%' }}>
        {/* <TableVirtuoso
            data={rows}
            components={VirtuosoTableComponents}
            fixedHeaderContent={fixedHeaderContent}
            itemContent={rowContent}
        /> */}
        {
            valueInital.length > 0 &&
            <TableContainer sx={{ maxHeight: 440 }}>
                <Table
                    stickyHeader
                >
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: '60px' }}>
                                <Typography>
                                    Time
                                </Typography>
                            </TableCell>
                            <TableCell sx={{ width: '50%' }}>
                                <Typography>
                                    Source
                                </Typography>
                            </TableCell>
                            <TableCell sx={{ width: '50%' }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <Typography>
                                        Target (VI)
                                    </Typography>
                                    <Button
                                        variant='contained'
                                        color='error'
                                        size='small'
                                        onClick={handleClear}
                                    >
                                        Clear
                                    </Button>
                                </Box>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {
                            valueInital.map((item, index) => (
                                <TableRow
                                    key={index}
                                    sx={{
                                        ...(valueInitalTargetObject[item.start] ? {} : { backgroundColor: 'primary.light' }),
                                    }}
                                >
                                    <TableCell>
                                        <Label
                                            sx={{
                                                color: '#2a59d1 !important',
                                                backgroundColor: 'rgba(62,121,247,.1) !important',
                                                textShadow: 'unset !important',
                                                fontWeight: 'bold !important',
                                                fontSize: '14px !important',
                                            }}
                                        >{convertHMS(parseInt(item.start) / 1000) ?? '00:00'}</Label>
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            dangerouslySetInnerHTML={{ __html: item.text }}
                                        />
                                    </TableCell>
                                    <TableCell
                                        contentEditable
                                        onInput={(e) => {
                                            setChangeTranscript({ text: e.currentTarget.innerText, start: item.start, duration: item.duration });
                                        }}
                                        dangerouslySetInnerHTML={{ __html: valueInitalTargetObject[item.start]?.text ?? '' }}
                                    />
                                </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>
            </TableContainer>
        }

        {
            valueInital.length === 0 &&
            <Box
                sx={{
                    pb: 3
                }}
            >
                <NotFound
                    title='No subtitles source'
                    subTitle='Please upload video to get subtitles source'
                />
            </Box>
        }
    </Paper>

    </>
    )
}

export default SubtitlesSourceCustom
