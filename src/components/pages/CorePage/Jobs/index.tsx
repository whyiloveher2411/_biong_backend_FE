import { Theme } from '@mui/material'
import Avatar from 'components/atoms/Avatar'
import Box from 'components/atoms/Box'
import Icon, { IconFormat } from 'components/atoms/Icon'
import LoadingButton from 'components/atoms/LoadingButton'
import makeCSS from 'components/atoms/makeCSS'
import Skeleton from 'components/atoms/Skeleton'
import Typography from 'components/atoms/Typography'
import NoticeContent from 'components/molecules/NoticeContent'
import Page from 'components/templates/Page'
import { __ } from 'helpers/i18n'
import useAjax from 'hook/useApi'
import React from 'react'

const useStyles = makeCSS((theme: Theme) => ({
    selectGroupType: {
        cursor: 'pointer',
        border: '1px solid ' + theme.palette.dividerDark,
        '&:hover': {
            background: theme.palette.backgroundSelected
        }
    }
}));

function Jobs() {

    const useAjaxHook = useAjax();

    const [groupJob, setGroupJob] = React.useState<{ [key: string]: GroupJobProps } | null>(null);

    React.useEffect(() => {

        useAjaxHook.ajax({
            url: '/job/list',
            success: (result: { groupJob: { [key: string]: GroupJobProps } }) => {
                setGroupJob(result.groupJob)
            }
        })

    }, []);

    const keyGroupJob = groupJob ? Object.keys(groupJob) : [];

    return (
        <Page
            title={__('Jobs')}
            isHeaderSticky
            header={
                <>
                    <Typography component="h2" gutterBottom variant="overline">{__('Trigger')}</Typography>
                    <Typography component="h1" variant="h3">{__('Jobs')}</Typography>
                </>
            }
        >
            <Box>

                {
                    groupJob ?
                        keyGroupJob.length ?
                            <>
                                <Typography>{__('Jobs that require frequent running will be automatically run by cronjob, background job or any other scheduling software, but there will be times when you need to trigger it manually right away, look for those jobs at here or nowhere else')}</Typography>
                                {
                                    keyGroupJob.map((keyGroup) => (
                                        <Box sx={{ mt: 2 }} key={keyGroup}>
                                            <Typography variant='h5'>{groupJob[keyGroup].title}</Typography>
                                            <Box
                                                sx={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '1fr 1fr',
                                                    gap: 2,
                                                    mt: 1
                                                }}
                                            >
                                                {
                                                    Object.keys(groupJob[keyGroup].jobs).map((keyJob) => (
                                                        <JobItem
                                                            key={keyJob}
                                                            job={groupJob[keyGroup].jobs[keyJob]}
                                                            keyGroup={keyGroup}
                                                            keyJob={keyJob}
                                                        />
                                                    ))
                                                }
                                            </Box>
                                        </Box>
                                    ))
                                }
                            </>
                            :
                            <NoticeContent
                                title={__('No job has been declared yet')}
                                description={__('Jobs that require frequent running will be automatically run by cronjob, background job or any other scheduling software, but there will be times when you need to trigger it manually right away, look for those jobs at here or nowhere else')}
                                image="/images/undraw_page_not_found_su7k.svg"
                            />
                        :
                        [1, 2, 3].map((group) => (
                            <Box sx={{ mt: 2 }} key={group}>
                                <Skeleton>
                                    <Typography variant='h5'>Job Group title</Typography>
                                </Skeleton>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 2,
                                        mt: 1
                                    }}
                                >
                                    {
                                        [1, 2, 3, 4, 5, 6].map((job) => (
                                            <JobItem
                                                key={job}
                                            />
                                        ))
                                    }
                                </Box>
                            </Box>
                        ))
                }
            </Box>
        </Page >
    )
}

export default Jobs


function JobItem({ job, keyGroup, keyJob }: { job?: JobsProps, keyGroup?: string, keyJob?: string }) {

    const classes = useStyles();
    const useAjaxHook = useAjax();

    const handleTrigger = () => {
        useAjaxHook.ajax({
            url: '/job/action',
            data: {
                group: keyGroup,
                job: keyJob,
            }
        });
    }

    if (job) {

        return <Box
            className={classes.selectGroupType}
            sx={{
                display: 'flex',
                gap: 1.625,
                p: 1,
            }}
        >
            <Avatar
                variant='square'
                sx={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 0.5
                }}
            >
                <Icon sx={{ color: 'primary.contrastText' }} icon={job.icon} />
            </Avatar>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.625,
                }}
            >
                <Typography sx={{ color: 'primary.main' }} variant='h5'>{job.title}</Typography>
                <Typography variant='body2'>{job.description}</Typography>
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    ml: 'auto',
                }}
            >
                <LoadingButton
                    loading={useAjaxHook.open}
                    loadingPosition="center"
                    size="small"
                    variant='contained'
                    onClick={handleTrigger}
                >{__('Trigger')}
                </LoadingButton>
            </Box>
        </Box>
    }

    return <Box
        className={classes.selectGroupType}
        sx={{
            display: 'flex',
            gap: 1.625,
            p: 1,
        }}
    >
        <Skeleton variant='rectangular' sx={{ width: '48px', height: '48px', transform: 'scale(1,1)' }}>
            <Avatar
                variant='square'
                sx={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 0.5
                }}
            >
                <Icon sx={{ color: 'primary.contrastText' }} icon="Star" />
            </Avatar>
        </Skeleton>
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.625,
                width: '100%',
            }}
        >
            <Skeleton>
                <Typography sx={{ color: 'primary.main' }} variant='h5'>Job Title</Typography>
            </Skeleton>
            <Skeleton>
                <Typography variant='body2'>Job Description Lorem ipsum dolor sit amet</Typography>
            </Skeleton>
        </Box>
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                ml: 'auto',
            }}
        >
            <Skeleton variant='rectangular'>
                <LoadingButton
                    size="small"
                    variant='contained'
                >{__('Trigger')}
                </LoadingButton>
            </Skeleton>
        </Box>
    </Box>

}

interface GroupJobProps {
    title: string,
    jobs: { [key: string]: JobsProps }
}

interface JobsProps {
    title: string,
    icon: IconFormat,
    description: string,
}