import React from "react";
import Box from "components/atoms/Box";
import useAjax from "hook/useApi";
import { CreatePostTypeData } from 'components/pages/PostType/CreateData'
import FieldForm from "components/atoms/fields/FieldForm";
import { LoadingButton } from "@mui/lab";
import { Card, CardContent, CircularProgress, InputAdornment, IconButton, Tooltip, Grid, Typography, List, ListItem, ListItemButton, ListItemText, Divider, Chip } from "@mui/material";
import { Warning, Settings } from "@mui/icons-material";

import useLanguages from './hooks/useLanguages';

function RemoteConfig({ data }: { data: CreatePostTypeData }) {

    const useApi = useAjax();
    const [remoteConfig, setRemoteConfig] = React.useState<JsonFormat>({});
    const [templates, setTemplates] = React.useState<JsonFormat>({});
    const [isLoadData, setIsLoadData] = React.useState<boolean>(false);
    const [selectedGroup, setSelectedGroup] = React.useState<string>('');
    const [updatingGroups, setUpdatingGroups] = React.useState<Set<string>>(new Set());

    useLanguages();

    const handleGetData = () => {
        useApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/remote-config/remote-config",
            method: "POST",
            data: {
                action: 'get',
                id: data.post.id,
            },
            success: (result) => {
                setRemoteConfig(result.data);
                setTemplates(result.templates);
                setIsLoadData(true);
                // Tự động chọn group đầu tiên
                const groupKeys = Object.keys(result.templates);
                if (groupKeys.length > 0) {
                    setSelectedGroup(groupKeys[0]);
                }
            },
        });
    }

    React.useEffect(() => {
        handleGetData();
    }, []);

    const handleUpdateGroup = (templateKey: string, groupKey?: string) => {
        const updateKey = groupKey ? `${templateKey}_${groupKey}` : templateKey;
        setUpdatingGroups(prev => new Set(prev).add(updateKey));

        // Lọc chỉ các fields thuộc group được chọn
        let groupData: JsonFormat = {};

        if (groupKey) {
            // Lấy các fields thuộc group cụ thể
            const template = templates[templateKey];
            const group = template?.groups?.[groupKey];
            if (group && group.fields) {
                group.fields.forEach((fieldKey: string) => {
                    if (Object.prototype.hasOwnProperty.call(remoteConfig, fieldKey)) {
                        groupData[fieldKey] = remoteConfig[fieldKey as keyof typeof remoteConfig];
                    }
                });
            }
        } else {
            // Lấy tất cả fields của template (bao gồm cả các fields trong groups nếu có)
            const template = templates[templateKey];
            if (template?.fields) {
                Object.keys(template.fields).forEach((fieldKey: string) => {
                    if (Object.prototype.hasOwnProperty.call(remoteConfig, fieldKey)) {
                        groupData[fieldKey] = remoteConfig[fieldKey as keyof typeof remoteConfig];
                    }
                });
            }
        }

        useApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/remote-config/update",
            method: "POST",
            data: {
                action: 'update',
                id: data.post.id,
                data: groupData,
                group: updateKey
            },
            success: (result) => {
                setUpdatingGroups(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(updateKey);
                    return newSet;
                });
            },
            error: () => {
                setUpdatingGroups(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(updateKey);
                    return newSet;
                });
            }
        });
    }

    const renderFields = (templateKey: string, fieldKeys: string[]) => {
        const template = templates[templateKey];
        return fieldKeys.map((fieldKey: string) => {
            const field = template?.fields?.[fieldKey];
            if (!field) return null;

            return (
                <FieldForm
                    key={fieldKey}
                    component={field.view || 'text'}
                    config={{
                        ...field,
                    }}
                    name={fieldKey}
                    post={remoteConfig}
                    onReview={(value) => {
                        setRemoteConfig((prev) => ({
                            ...prev,
                            [fieldKey]: value,
                        }))
                    }}
                />
            );
        }).filter(Boolean);
    };

    const renderTemplateContent = (templateKey: string) => {
        const template = templates[templateKey];
        if (!template) return null;

        const hasGroups = template?.groups && Object.keys(template.groups).length > 0;

        if (hasGroups) {
            // Nếu có groups: render mỗi group là 1 card
            return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {Object.keys(template.groups).map((groupKey: string) => {
                        const group = template.groups[groupKey];

                        return (
                            <Card key={groupKey}>
                                <CardContent>
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="h6" gutterBottom>
                                            {group.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            {group.description || 'Không có mô tả'}
                                        </Typography>
                                        <Divider />
                                    </Box>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        {renderFields(templateKey, group.fields || [])}
                                    </Box>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Box>
            );
        } else {
            // Nếu không có groups: render tất cả fields trong 1 card
            const allFieldKeys = Object.keys(template.fields || {});
            if (allFieldKeys.length === 0) return null;

            return (
                <Card>
                    <CardContent>
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                {template.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {template.description || 'Không có mô tả'}
                            </Typography>
                            <Divider />
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {renderFields(templateKey, allFieldKeys)}
                        </Box>
                    </CardContent>
                </Card>
            );
        }
    };

    return (
        <Box sx={{ height: '100%' }}>
            {isLoadData ? (
                <Grid container spacing={2} sx={{ height: '100%' }}>
                    {/* Cột trái - Danh sách groups */}
                    <Grid item xs={12} md={4}>
                        <Box sx={{ height: '100%' }}>
                            <List>
                                {/* Render các groups có template */}
                                {Object.keys(templates).map((groupKey: string) => {
                                    const group = templates[groupKey];
                                    const isSelected = selectedGroup === groupKey;
                                    const fieldCount = Object.keys(group.fields || {}).length;

                                    return (
                                        <ListItem key={groupKey} disablePadding>
                                            <ListItemButton
                                                selected={isSelected}
                                                onClick={() => setSelectedGroup(groupKey)}
                                                sx={{
                                                    borderRadius: 1,
                                                    mb: 1,
                                                    '&.Mui-selected': {
                                                        backgroundColor: 'primary.main',
                                                        color: 'white',
                                                        '&:hover': {
                                                            backgroundColor: 'primary.dark',
                                                        },
                                                        '& .MuiListItemText-primary': {
                                                            color: 'white',
                                                        },
                                                        '& .MuiListItemText-secondary': {
                                                            color: 'rgba(255,255,255,0.7)',
                                                        },
                                                        '& .MuiChip-root': {
                                                            backgroundColor: 'rgba(255,255,255,0.2)',
                                                            color: 'white',
                                                        }
                                                    }
                                                }}
                                            >
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography variant="subtitle1" sx={{ color: isSelected ? 'primary.contrastText' : 'text.primary' }} fontWeight="bold">
                                                                {group.title}
                                                            </Typography>
                                                            <Chip
                                                                label={fieldCount}
                                                                size="small"
                                                                color={isSelected ? "default" : "primary"}
                                                                variant={isSelected ? "filled" : "outlined"}
                                                            />
                                                        </Box>
                                                    }
                                                    secondary={
                                                        <Typography variant="body2" color={isSelected ? "rgba(255,255,255,0.7)" : "text.secondary"}>
                                                            {group.description || 'Không có mô tả'}
                                                        </Typography>
                                                    }
                                                />
                                            </ListItemButton>
                                        </ListItem>
                                    );
                                })}

                                {/* Render group cho các fields không có template */}
                                {(() => {
                                    const untemplatedFields = Object.keys(remoteConfig).filter(key => {
                                        // Kiểm tra xem field có tồn tại trong bất kỳ template nào không
                                        return !Object.keys(templates).some(groupKey =>
                                            templates[groupKey].fields && templates[groupKey].fields[key]
                                        );
                                    });

                                    if (untemplatedFields.length > 0) {
                                        const isSelected = selectedGroup === 'untemplated';
                                        return (
                                            <ListItem key="untemplated" disablePadding>
                                                <ListItemButton
                                                    selected={isSelected}
                                                    onClick={() => setSelectedGroup('untemplated')}
                                                    sx={{
                                                        borderRadius: 1,
                                                        mb: 1,
                                                        '&.Mui-selected': {
                                                            backgroundColor: 'primary.main',
                                                            color: 'white',
                                                            '&:hover': {
                                                                backgroundColor: 'primary.dark',
                                                            },
                                                            '& .MuiListItemText-primary': {
                                                                color: 'white',
                                                            },
                                                            '& .MuiListItemText-secondary': {
                                                                color: 'rgba(255,255,255,0.7)',
                                                            },
                                                            '& .MuiChip-root': {
                                                                backgroundColor: 'rgba(255,255,255,0.2)',
                                                                color: 'white',
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <ListItemText
                                                        primary={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Typography variant="subtitle1" sx={{ color: isSelected ? 'primary.contrastText' : 'text.primary' }} fontWeight="bold">
                                                                    Untemplated Fields
                                                                </Typography>
                                                                <Chip
                                                                    label={untemplatedFields.length}
                                                                    size="small"
                                                                    color={isSelected ? "default" : "warning"}
                                                                    variant={isSelected ? "filled" : "outlined"}
                                                                />
                                                            </Box>
                                                        }
                                                        secondary={
                                                            <Typography variant="body2" color={isSelected ? "rgba(255,255,255,0.7)" : "text.secondary"}>
                                                                Các trường chưa được định nghĩa trong template
                                                            </Typography>
                                                        }
                                                    />
                                                </ListItemButton>
                                            </ListItem>
                                        );
                                    }
                                    return null;
                                })()}
                            </List>
                        </Box>
                    </Grid>

                    {/* Cột phải - Content của group được chọn */}
                    <Grid item xs={12} md={8}>
                        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ flex: 1, overflow: 'auto' }}>
                                {selectedGroup && (templates[selectedGroup] || selectedGroup === 'untemplated') ? (
                                    <>
                                        {selectedGroup === 'untemplated' ? (
                                            /* Render các trường không có template */
                                            (() => {
                                                const untemplatedFields = Object.keys(remoteConfig).filter(key => {
                                                    return !Object.keys(templates).some(groupKey =>
                                                        templates[groupKey].fields && templates[groupKey].fields[key]
                                                    );
                                                });

                                                return (
                                                    <Card>
                                                        <CardContent>
                                                            <Box sx={{ mb: 3 }}>
                                                                <Typography variant="h6" gutterBottom>
                                                                    Untemplated Fields ⚠️
                                                                </Typography>
                                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                                    Các trường chưa được định nghĩa trong template
                                                                </Typography>
                                                                <Divider />
                                                            </Box>

                                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                                {untemplatedFields.map((key: string) => (
                                                                    <FieldForm
                                                                        key={key}
                                                                        component="textarea"
                                                                        config={{
                                                                            title: `${key} ⚠️ (Chưa config template)`,
                                                                            view: "textarea",
                                                                            placeholder: "Giá trị hiện tại...",
                                                                            inputProps: {
                                                                                endAdornment: (
                                                                                    <InputAdornment position="end">
                                                                                        <Tooltip title="Trường chưa được config template - hiển thị dưới dạng textarea">
                                                                                            <IconButton size="small" color="warning">
                                                                                                <Warning fontSize="small" />
                                                                                            </IconButton>
                                                                                        </Tooltip>
                                                                                    </InputAdornment>
                                                                                )
                                                                            }
                                                                        }}
                                                                        name={key}
                                                                        post={remoteConfig}
                                                                        onReview={(value) => {
                                                                            setRemoteConfig((prev) => ({
                                                                                ...prev,
                                                                                [key]: value,
                                                                            }))
                                                                        }}
                                                                    />
                                                                ))}
                                                            </Box>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })()
                                        ) : (
                                            /* Render nội dung template với logic groups */
                                            renderTemplateContent(selectedGroup)
                                        )}
                                    </>
                                ) : (
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        height: '100%',
                                        flexDirection: 'column',
                                        gap: 2
                                    }}>
                                        <Settings sx={{ fontSize: 48, color: 'text.secondary' }} />
                                        <Typography variant="h6" color="text.secondary">
                                            Chọn một group để cấu hình
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {/* Nút Update ở cuối mỗi template */}
                            {selectedGroup && (templates[selectedGroup] || selectedGroup === 'untemplated') && (
                                <Box sx={{ mt: 3, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
                                    <LoadingButton
                                        loading={updatingGroups.has(selectedGroup)}
                                        variant="contained"
                                        color="primary"
                                        onClick={() => {
                                            if (selectedGroup === 'untemplated') {
                                                const untemplatedFields = Object.keys(remoteConfig).filter(key => {
                                                    return !Object.keys(templates).some(groupKey =>
                                                        templates[groupKey].fields && templates[groupKey].fields[key]
                                                    );
                                                });
                                                const untemplatedData: JsonFormat = {};
                                                untemplatedFields.forEach((key: string) => {
                                                    untemplatedData[key] = remoteConfig[key as keyof typeof remoteConfig];
                                                });
                                                setUpdatingGroups(prev => new Set(prev).add('untemplated'));
                                                useApi.ajax({
                                                    url: "plugin/vn4-e-learning/app-mobile/remote-config/update",
                                                    method: "POST",
                                                    data: {
                                                        action: 'update',
                                                        id: data.post.id,
                                                        data: untemplatedData,
                                                        group: 'untemplated'
                                                    },
                                                    success: () => {
                                                        setUpdatingGroups(prev => {
                                                            const newSet = new Set(prev);
                                                            newSet.delete('untemplated');
                                                            return newSet;
                                                        });
                                                    },
                                                    error: () => {
                                                        setUpdatingGroups(prev => {
                                                            const newSet = new Set(prev);
                                                            newSet.delete('untemplated');
                                                            return newSet;
                                                        });
                                                    }
                                                });
                                            } else {
                                                handleUpdateGroup(selectedGroup);
                                            }
                                        }}
                                    >
                                        Update {selectedGroup === 'untemplated' ? 'Untemplated Fields' : templates[selectedGroup].title}
                                    </LoadingButton>
                                </Box>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            ) : (
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    minHeight: 400
                }}>
                    <CircularProgress size={40} />
                </Box>
            )}
        </Box>
    );
}

export default RemoteConfig;
