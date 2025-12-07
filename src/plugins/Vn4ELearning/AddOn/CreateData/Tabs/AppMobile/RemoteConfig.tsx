import React from "react";
import Box from "components/atoms/Box";
import useAjax from "hook/useApi";
import { CreatePostTypeData } from 'components/pages/PostType/CreateData'
import FieldForm from "components/atoms/fields/FieldForm";
import { LoadingButton } from "@mui/lab";
import { Card, CardContent, CircularProgress, InputAdornment, IconButton, Tooltip, Grid, Typography, List, ListItem, ListItemButton, ListItemText, Divider, Chip } from "@mui/material";
import { Warning, Settings } from "@mui/icons-material";

function RemoteConfig({ data }: { data: CreatePostTypeData }) {

    const useApi = useAjax();
    const [remoteConfig, setRemoteConfig] = React.useState<JsonFormat>({});
    const [templates, setTemplates] = React.useState<JsonFormat>({});
    const [isLoadData, setIsLoadData] = React.useState<boolean>(false);
    const [selectedGroup, setSelectedGroup] = React.useState<string>('');
    const [updatingGroups, setUpdatingGroups] = React.useState<Set<string>>(new Set());

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

    const handleUpdateGroup = (groupKey: string) => {
        setUpdatingGroups(prev => new Set(prev).add(groupKey));
        
        // Lọc chỉ các fields thuộc group được chọn
        let groupData: JsonFormat = {};
        
        if (groupKey === 'untemplated') {
            // Lấy các fields không có trong bất kỳ template nào
            groupData = Object.keys(remoteConfig).reduce((acc: JsonFormat, key) => {
                const isInAnyTemplate = Object.keys(templates).some(templateKey => 
                    templates[templateKey].fields && templates[templateKey].fields[key]
                );
                if (!isInAnyTemplate) {
                    acc[key] = remoteConfig[key as keyof typeof remoteConfig];
                }
                return acc;
            }, {});
        } else {
            // Lấy các fields thuộc template group được chọn
            const groupFields = templates[groupKey]?.fields || {};
            groupData = Object.keys(groupFields).reduce((acc: JsonFormat, fieldKey) => {
                if (Object.prototype.hasOwnProperty.call(remoteConfig, fieldKey)) {
                    acc[fieldKey] = remoteConfig[fieldKey as keyof typeof remoteConfig];
                }
                return acc;
            }, {});
        }
        
        useApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/remote-config/update",
            method: "POST",
            data: {
                action: 'update',
                id: data.post.id,
                data: groupData,
                group: groupKey
            },
            success: (result) => {
                setUpdatingGroups(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(groupKey);
                    return newSet;
                });
            },
            error: () => {
                setUpdatingGroups(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(groupKey);
                    return newSet;
                });
            }
        });
    }

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
                                                            <Typography variant="subtitle1" sx={{color: isSelected ? 'primary.contrastText' : 'text.primary'}} fontWeight="bold">
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
                                                                <Typography variant="subtitle1" sx={{color: isSelected ? 'primary.contrastText' : 'text.primary'}} fontWeight="bold">
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
                        <Card sx={{ height: '100%' }}>
                            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                {selectedGroup && (templates[selectedGroup] || selectedGroup === 'untemplated') ? (
                                    <>
                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="h5" gutterBottom>
                                                {selectedGroup === 'untemplated' ? 'Untemplated Fields' : templates[selectedGroup].title}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                {selectedGroup === 'untemplated' 
                                                    ? 'Các trường chưa được định nghĩa trong template' 
                                                    : templates[selectedGroup].description || 'Không có mô tả'
                                                }
                                            </Typography>
                                            <Divider />
                                        </Box>

                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                {selectedGroup === 'untemplated' ? (
                                                    /* Render các trường không có template */
                                                    (() => {
                                                        const untemplatedFields = Object.keys(remoteConfig).filter(key => {
                                                            return !Object.keys(templates).some(groupKey => 
                                                                templates[groupKey].fields && templates[groupKey].fields[key]
                                                            );
                                                        });
                                                        
                                                        return untemplatedFields.map((key: string) => (
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
                                                        ));
                                                    })()
                                                ) : (
                                                    /* Render các trường của group được chọn */
                                                    Object.keys(templates[selectedGroup].fields || {}).map((fieldKey: string) => {
                                                        const field = templates[selectedGroup].fields[fieldKey];
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
                                                    })
                                                )}
                                            </Box>
                                        </Box>

                                        {/* Button update cho group hiện tại */}
                                        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                                            <LoadingButton 
                                                loading={updatingGroups.has(selectedGroup)}
                                                variant="contained" 
                                                color="primary" 
                                                onClick={() => handleUpdateGroup(selectedGroup)}
                                                fullWidth
                                            >
                                                Update {selectedGroup === 'untemplated' ? 'Untemplated Fields' : templates[selectedGroup].title}
                                            </LoadingButton>
                                        </Box>
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
                            </CardContent>
                        </Card>
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
