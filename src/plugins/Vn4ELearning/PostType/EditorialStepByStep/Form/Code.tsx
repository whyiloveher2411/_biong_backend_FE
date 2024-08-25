import { Box } from '@mui/material'
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type'
import React from 'react'

interface ICodeStepByStep {
    position: number,
    prePostion: number,
    code: string,
    comment?: string
}

function Code(props: FieldFormItemProps) {

    const [stepByStep, setStepByStep] = React.useState<Array<ICodeStepByStep>>([]);

    const isFirstLoad = React.useRef(true);

    React.useEffect(() => {
        if (props.post.step_by_step && typeof props.post.step_by_step === 'string') {
            let temps: Array<ICodeStepByStep> = [];
            try {
                temps = JSON.parse(props.post.step_by_step) ?? [] as Array<ICodeStepByStep>;
            } catch (error) {
                temps = [];
            }
            setStepByStep(temps);
        }

        isFirstLoad.current = false;
    }, []);

    React.useEffect(() => {

        if (!isFirstLoad.current) {
            setStepByStep((prev) => {
                const temps: Array<ICodeStepByStep> = [];
                (props.post.code as string)?.trim().split("\n").forEach((code, index) => {
                    temps.push({
                        code: code.replaceAll(' ','__'),
                        position: prev[index]?.position !== undefined ? prev[index].position : (index ?? 0),
                        prePostion: prev[index]?.prePostion !== undefined ? prev[index].prePostion : -1,
                        comment: prev[index]?.comment !== undefined ? prev[index].comment : '',
                    });
                });
                return temps;
            });
        }
    }, [props.post.code]);

    React.useEffect(() => {
        if (!isFirstLoad.current) {
            props.onReview(stepByStep, 'step_by_step')
        }
    }, [stepByStep]);

    return (
        <Box>
            <FieldForm
                component='textarea'
                config={{
                    title: 'Code Editorial',
                }}
                name="code"
                post={props.post}
                onReview={(value: ANY, value2: ANY) => {
                    props.onReview(value, 'code');
                }}
            />
            <Box
                sx={{
                    display: 'flex',
                    gap: 1,
                    flexDirection: 'column',
                    mt: 2,
                }}
            >
                {
                    stepByStep.map((step, index) => <Box
                        key={index}
                        sx={{
                            border: '1px solid',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            borderColor: "divider",
                            p: 1,
                        }}
                    >
                        <Box
                            sx={{
                                width: 70,
                            }}
                        >
                            <FieldForm
                                component='number'
                                config={{
                                    title: false,
                                    size: 'small',
                                }}
                                name="position"
                                post={step}
                                onReview={(value: ANY) => {
                                    setStepByStep(prev => {
                                        prev[index].position = value;
                                        return prev;
                                    })
                                }}
                            />
                        </Box>
                        <Box
                            sx={{
                                width: 70,
                            }}
                        >
                            <FieldForm
                                component='number'
                                config={{
                                    title: false,
                                    size: 'small',
                                }}
                                name="prePostion"
                                post={step}
                                onReview={(value: ANY) => {
                                    setStepByStep(prev => {
                                        prev[index].prePostion = value;
                                        return prev;
                                    })
                                }}
                            />
                        </Box>
                        <Box
                            dangerouslySetInnerHTML={{ __html: step.code.replace(' ', '&nbsp;') }}
                        />
                        <Box
                            sx={{
                                width: 200,
                            }}
                        >
                            <FieldForm
                                component='text'
                                config={{
                                    title: 'comment',
                                    size: 'small',
                                }}
                                name="comment"
                                post={step}
                                onReview={(value: ANY) => {
                                    setStepByStep(prev => {
                                        prev[index].comment = value;
                                        return prev;
                                    })
                                }}
                            />
                        </Box>
                    </Box>)
                }
            </Box>
        </Box>
    )
}

export default Code
