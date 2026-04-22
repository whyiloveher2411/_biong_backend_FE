import React from 'react';
import Box from 'components/atoms/Box';
import Typography from 'components/atoms/Typography';
import Divider from 'components/atoms/Divider';
import Radio from 'components/atoms/Radio';
import RadioGroup from 'components/atoms/RadioGroup';
import FormControlLabel from 'components/atoms/FormControlLabel';
import FieldForm from 'components/atoms/fields/FieldForm';
import useApi from 'hook/useApi';
import Button from 'components/atoms/Button';
import TextField from 'components/atoms/TextField';
import { TargetingState, TargetType } from './types';

interface TargetingFormProps {
    value: TargetingState;
    onChange: (next: TargetingState) => void;
}

interface ChannelOption {
    title: string;
    description?: string;
}

interface TopicConditionItem {
    id: string;
    topic: string;
}

interface TopicConditionGroup {
    id: string;
    conditions: TopicConditionItem[];
}

declare global {
    interface Window {
        __app_mobile_id?: number | string;
    }
}

export default function TargetingForm({ value, onChange }: TargetingFormProps) {
    const api = useApi();
    const setType = (type: TargetType) => onChange({ type });
    const [channels, setChannels] = React.useState<Record<string, ChannelOption>>({});
    const [loadingChannels, setLoadingChannels] = React.useState(false);
    const [topicGroups, setTopicGroups] = React.useState<TopicConditionGroup[]>([]);
    const topicMode = value.topicTargetMode ?? 'single';

    const createId = React.useCallback(() => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, []);

    const createCondition = React.useCallback((topic = ''): TopicConditionItem => ({
        id: createId(),
        topic,
    }), [createId]);

    const createGroup = React.useCallback((topic = ''): TopicConditionGroup => ({
        id: createId(),
        conditions: [createCondition(topic)],
    }), [createId, createCondition]);

    const buildTopicConditionExpression = React.useCallback((groups: TopicConditionGroup[]) => {
        return groups
            .map((group) => {
                const validConditions = group.conditions.filter((condition) => condition.topic);
                if (!validConditions.length) return '';

                const andExpression = validConditions
                    .map((condition) => `'${condition.topic}' in topics`)
                    .join(' && ');

                return `(${andExpression})`;
            })
            .filter(Boolean)
            .join(' || ');
    }, []);

    const updateTopicGroups = React.useCallback((nextGroups: TopicConditionGroup[]) => {
        setTopicGroups(nextGroups);
        const expression = buildTopicConditionExpression(nextGroups);
        onChange({
            ...value,
            topicTargetMode: 'condition',
            topic: expression,
            topicCondition: expression,
        });
    }, [buildTopicConditionExpression, onChange, value]);

    React.useEffect(() => {
        if (!window.__app_mobile_id) {
            setChannels({});
            return;
        }

        const normalizeChannels = (source: ANY): Record<string, ChannelOption> => {
            if (!source || typeof source !== 'object') return {};

            if (Array.isArray(source)) {
                return source.reduce((result: Record<string, ChannelOption>, item: ANY) => {
                    if (item && typeof item === 'object' && item.key && item.title) {
                        result[item.key] = {
                            title: item.title,
                            description: item.description || '',
                        };
                    }
                    return result;
                }, {});
            }

            return Object.keys(source).reduce((result: Record<string, ChannelOption>, key) => {
                const channel = source[key];
                if (channel && typeof channel === 'object') {
                    result[key] = {
                        title: channel.title || key,
                        description: channel.description || '',
                    };
                }
                return result;
            }, {});
        };

        setLoadingChannels(true);
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/push-notification/get-channels',
            method: 'POST',
            data: {
                app_mobile: window.__app_mobile_id,
            },
            success: (result: ANY) => {
                const channelData =
                    result?.data?.channels ??
                    result?.channels ??
                    result?.data ??
                    result;
                setChannels(normalizeChannels(channelData));
                setLoadingChannels(false);
            },
            error: () => {
                setChannels({});
                setLoadingChannels(false);
            },
        });
    }, []);

    React.useEffect(() => {
        if (topicMode === 'condition' && topicGroups.length === 0) {
            setTopicGroups([createGroup()]);
        }
    }, [createGroup, topicGroups.length, topicMode]);

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Nhắm mục tiêu</Typography>
            <RadioGroup row value={value.type} onChange={(_, v) => setType(v as TargetType)}>
                <FormControlLabel value="single" control={<Radio />} label="Single Device" />
                <FormControlLabel value="multicast" control={<Radio />} label="Multicast" />
                <FormControlLabel value="topic" control={<Radio />} label="Topic" />
                <FormControlLabel value="deviceGroup" control={<Radio />} label="Device Group" />
            </RadioGroup>
            <Divider sx={{ my: 2 }} />

            {value.type === 'single' && (
                <FieldForm
                    component="text"
                    config={{ title: "FCM Token" }}
                    name="token"
                    post={value}
                    onReview={(v) => onChange({ ...value, token: v })}
                />
            )}

            {value.type === 'multicast' && (
                <FieldForm
                    component="textarea"
                    config={{ title: "Danh sách token (mỗi dòng 1 token, tối đa 500)" }}
                    name="tokens_str"
                    post={{ tokens_str: (value.tokens || []).join('\n') }}
                    onReview={(v) => onChange({ ...value, tokens: v.split(/\n+/).map((s: string) => s.trim()).filter(Boolean) })}
                />
            )}

            {value.type === 'topic' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <RadioGroup
                        row
                        value={topicMode}
                        onChange={(_, mode) => {
                            if (mode === 'condition') {
                                const initialGroups = topicGroups.length ? topicGroups : [createGroup()];
                                setTopicGroups(initialGroups);
                                onChange({
                                    ...value,
                                    topicTargetMode: 'condition',
                                    topic: buildTopicConditionExpression(initialGroups),
                                    topicCondition: buildTopicConditionExpression(initialGroups),
                                });
                            } else {
                                const firstTopic = topicGroups[0]?.conditions[0]?.topic || value.topic || '';
                                onChange({
                                    ...value,
                                    topicTargetMode: 'single',
                                    topic: firstTopic,
                                    topicCondition: '',
                                });
                            }
                        }}
                    >
                        <FormControlLabel value="single" control={<Radio />} label="Topic đơn" />
                        <FormControlLabel value="condition" control={<Radio />} label="Điều kiện phức tạp" />
                    </RadioGroup>

                    {topicMode === 'single' && (
                        <FieldForm
                            component="select"
                            config={{
                                title: "Topic",
                                list_option: channels,
                                showKeyAfterTitle: true,
                                note: loadingChannels ? 'Đang tải danh sách channels...' : undefined,
                                inputProps: {
                                    disabled: loadingChannels,
                                }
                            }}
                            name="topic"
                            post={value}
                            onReview={(v) => onChange({ ...value, topicTargetMode: 'single', topic: v, topicCondition: '' })}
                        />
                    )}

                    {topicMode === 'condition' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Box
                                sx={{
                                    p: 1.25,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'background.default',
                                }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    Mỗi <strong>nhóm</strong> là điều kiện <strong>AND</strong> (tất cả topic trong nhóm phải đúng).
                                    Nhiều nhóm sẽ nối bằng <strong>OR</strong> (chỉ cần đúng một nhóm).
                                </Typography>
                            </Box>

                            {topicGroups.map((group, groupIndex) => (
                                <Box
                                    key={group.id}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        p: 1.5,
                                        bgcolor: 'background.paper',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="subtitle2">
                                            Nhóm {groupIndex + 1} - TẤT CẢ điều kiện sau (AND)
                                        </Typography>
                                        <Button
                                            color="error"
                                            variant="text"
                                            size="small"
                                            onClick={() => {
                                                const nextGroups = topicGroups.filter((g) => g.id !== group.id);
                                                updateTopicGroups(nextGroups.length ? nextGroups : [createGroup()]);
                                            }}
                                        >
                                            Xóa nhóm
                                        </Button>
                                    </Box>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {group.conditions.map((condition, conditionIndex) => (
                                            <Box key={condition.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                <Box sx={{ flex: 1 }}>
                                                    <FieldForm
                                                        component="select"
                                                        config={{
                                                            title: conditionIndex === 0 ? 'Chọn topic' : `Và topic ${conditionIndex + 1}`,
                                                            list_option: channels,
                                                            showKeyAfterTitle: true,
                                                            disableAlert: true,
                                                            inputProps: {
                                                                disabled: loadingChannels,
                                                            }
                                                        }}
                                                        name={`topic_condition_${group.id}_${condition.id}`}
                                                        post={{ [`topic_condition_${group.id}_${condition.id}`]: condition.topic }}
                                                        onReview={(v) => {
                                                            updateTopicGroups(
                                                                topicGroups.map((g) =>
                                                                    g.id === group.id
                                                                        ? {
                                                                            ...g,
                                                                            conditions: g.conditions.map((c) =>
                                                                                c.id === condition.id ? { ...c, topic: v } : c
                                                                            ),
                                                                        }
                                                                        : g
                                                                )
                                                            );
                                                        }}
                                                    />
                                                </Box>
                                                <Button
                                                    color="error"
                                                    variant="text"
                                                    size="small"
                                                    disabled={group.conditions.length === 1}
                                                    onClick={() => {
                                                        const nextConditions = group.conditions.filter((c) => c.id !== condition.id);
                                                        const normalizedConditions = nextConditions.length ? nextConditions : [createCondition()];
                                                        updateTopicGroups(
                                                            topicGroups.map((g) =>
                                                                g.id === group.id ? { ...g, conditions: normalizedConditions } : g
                                                            )
                                                        );
                                                    }}
                                                >
                                                    Xóa
                                                </Button>
                                            </Box>
                                        ))}
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                        <Button
                                            variant="text"
                                            size="small"
                                            onClick={() => {
                                                updateTopicGroups(
                                                    topicGroups.map((g) =>
                                                        g.id === group.id
                                                            ? { ...g, conditions: [...g.conditions, createCondition()] }
                                                            : g
                                                    )
                                                );
                                            }}
                                        >
                                            + Điều kiện AND
                                        </Button>
                                    </Box>

                                    {groupIndex < topicGroups.length - 1 && (
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                mt: 1.25,
                                                display: 'inline-block',
                                                px: 1,
                                                py: 0.25,
                                                borderRadius: 10,
                                                bgcolor: 'warning.light',
                                                color: 'warning.contrastText',
                                                fontWeight: 700
                                            }}
                                        >
                                            HOẶC (OR)
                                        </Typography>
                                    )}
                                </Box>
                            ))}

                            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <Button
                                    variant="contained"
                                    onClick={() => updateTopicGroups([...topicGroups, createGroup()])}
                                >
                                    + Thêm nhóm thay thế (OR)
                                </Button>
                            </Box>

                            <TextField
                                label="Biểu thức tạo ra"
                                value={value.topic || ''}
                                multiline
                                minRows={3}
                                InputProps={{ readOnly: true }}
                            />
                        </Box>
                    )}
                </Box>
            )}

            {value.type === 'deviceGroup' && (
                <FieldForm
                    component="text"
                    config={{ title: "Notification Key (Device Group)" }}
                    name="notificationKey"
                    post={value}
                    onReview={(v) => onChange({ ...value, notificationKey: v })}
                />
            )}
        </Box>
    );
}


