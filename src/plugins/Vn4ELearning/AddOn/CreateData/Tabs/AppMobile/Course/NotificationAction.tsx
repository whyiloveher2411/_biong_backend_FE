import { FormControl, InputLabel, ListSubheader, MenuItem, Select, SelectChangeEvent, TextField, Typography } from '@mui/material'
import Box from 'components/atoms/Box'
import FieldForm from 'components/atoms/fields/FieldForm'
import { FieldFormItemProps } from 'components/atoms/fields/type'
import React, { useEffect } from 'react'
import { notificationRoutes, NotificationRoute } from './notificationRoutesData'

function NotificationAction(props: FieldFormItemProps) {

    const [time, setTime] = React.useState(0);
    // flattened routes for easier lookup
    const allRoutes = React.useMemo(() => {
        return Object.values(notificationRoutes).flat();
    }, []);

    const [selectedRoute, setSelectedRoute] = React.useState<NotificationRoute | null>(null);
    const [routeArgs, setRouteArgs] = React.useState<{ [key: string]: string }>({});

    // Initialize from props if available
    useEffect(() => {
        const currentRoutePath = props.post[props.name]?.route;
        if (currentRoutePath) {
            let route = allRoutes.find(r => r.path === currentRoutePath);

            // Special handling for home route which has multiple tabs with same path
            if (currentRoutePath === '/') {
                try {
                    const argsStr = props.post[props.name]?.arguments;
                    const args = typeof argsStr === 'string' ? JSON.parse(argsStr) : argsStr;
                    const tabVal = args?.tab;
                    // Find specific home tab route
                    const specificRoute = allRoutes.find(r => r.path === '/' && r.defaultValues?.tab === tabVal);
                    if (specificRoute) {
                        route = specificRoute;
                    }
                } catch (e) {
                    // ignore
                }
            }

            if (route) {
                setSelectedRoute(route);
                // Try to parse arguments if they exist and are string
                try {
                    const args = props.post[props.name]?.arguments;
                    if (typeof args === 'string') {
                        setRouteArgs(JSON.parse(args));
                    } else if (typeof args === 'object') {
                        setRouteArgs(args || {});
                    }
                } catch (e) {
                    setRouteArgs({});
                }
            }
        }
    }, [allRoutes, props.post, props.name]); // Run once on mount or when props change (careful with loop) but checking deps

    const updatePostData = (route: NotificationRoute, args: { [key: string]: string }) => {
        setTime(prev => prev + 1);
        props.onReview({
            ...props.post[props.name],
            route: route.path,
            arguments: JSON.stringify(args),
        }, props.name);
    }

    const handleRouteChange = (event: SelectChangeEvent) => {
        const routeName = event.target.value;
        const route = allRoutes.find(r => r.name === routeName) || null;

        setSelectedRoute(route);
        // Reset args on route change, but check for defaultValues
        const newArgs = route?.defaultValues ? { ...route.defaultValues } : {};
        setRouteArgs(newArgs);

        if (route) {
            updatePostData(route, newArgs);
        }
    };

    const handleArgChange = (key: string, value: string) => {
        const newArgs = { ...routeArgs, [key]: value };
        setRouteArgs(newArgs);
        if (selectedRoute) {
            updatePostData(selectedRoute, newArgs);
        }
    };

    const renderRouteSelector = () => (
        <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
            <FormControl fullWidth size="small">
                <InputLabel>Select Route</InputLabel>
                <Select
                    value={selectedRoute?.name || ''}
                    label="Select Route"
                    onChange={handleRouteChange}
                >
                    <MenuItem value="">
                        <em>None</em>
                    </MenuItem>
                    {Object.entries(notificationRoutes).map(([category, routes]) => [
                        <ListSubheader key={category} sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {category.toUpperCase()}
                        </ListSubheader>,
                        ...routes.map((route) => (
                            <MenuItem key={route.name} value={route.name} sx={{ pl: 4 }}>
                                <Box>
                                    <Typography variant="body2">{route.description}</Typography>
                                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                                        {route.name}
                                    </Typography>
                                </Box>
                            </MenuItem>
                        ))
                    ])}
                </Select>
            </FormControl>

            {selectedRoute && Object.keys(selectedRoute.arguments).length > 0 && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                        Arguments for {selectedRoute.name}:
                    </Typography>
                    {Object.entries(selectedRoute.arguments).map(([key, desc]) => (
                        <TextField
                            key={key}
                            label={`${key} - ${desc}`}
                            fullWidth
                            size="small"
                            margin="dense"
                            value={routeArgs[key] || ''}
                            onChange={(e) => handleArgChange(key, e.target.value)}
                        />
                    ))}
                </Box>
            )}
        </Box>
    );

    const renderContent = () => (
        <Box>
            <FieldForm
                component={props.config.view}
                config={{ ...props.config }}
                post={props.post}
                name={props.name}
                onReview={props.onReview}
            />
            {renderRouteSelector()}
        </Box>
    );

    if (time % 2 === 0) {
        return <Box><Box>{renderContent()}</Box></Box>
    }

    return renderContent();
}

export default NotificationAction