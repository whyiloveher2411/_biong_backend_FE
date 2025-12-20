import React from 'react';
import { convertToURL } from 'helpers/url';

const urlPrefixDefault = convertToURL(process.env.REACT_APP_HOST_API_KEY, '/api/admin/');

export interface StreamProgressData {
    type: 'init' | 'progress' | 'course' | 'translates' | 'translate' | 'lessons' | 'course_complete' | 'finished' | 'final' | 'error';
    stage?: string;
    message?: string | { content: string; options?: ANY };
    progress?: number;
    totalObjects?: number;
    completedObjects?: number;
    course_id?: string;
    course_name?: string;
    current?: number;
    total?: number;
    [key: string]: ANY;
}

export interface UseStreamSyncProps {
    sync: (params: StreamSyncParams) => void;
    isSyncing: boolean;
    progress: number;
    currentStage: string;
    messages: StreamProgressData[];
    error: string | null;
    totalObjects: number;
    completedObjects: number;
    reset: () => void;
}

export interface StreamSyncParams {
    url: string;
    data?: {
        id: string | number;
        course_id?: string | number;
    };
    onProgress?: (data: StreamProgressData) => void;
    onComplete?: (data: StreamProgressData) => void;
    onError?: (error: string) => void;
}

// Helper function to extract message string from message that can be string or object
export const extractMessageString = (message: string | { content: string; options?: ANY } | undefined): string => {
    if (!message) return '';
    if (typeof message === 'string') return message;
    if (typeof message === 'object' && message !== null && 'content' in message) {
        return message.content;
    }
    return String(message);
};

export default function useStreamSync(): UseStreamSyncProps {
    const [isSyncing, setIsSyncing] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [currentStage, setCurrentStage] = React.useState('');
    const [messages, setMessages] = React.useState<StreamProgressData[]>([]);
    const [error, setError] = React.useState<string | null>(null);
    const [totalObjects, setTotalObjects] = React.useState(0);
    const [completedObjects, setCompletedObjects] = React.useState(0);

    const reset = React.useCallback(() => {
        setIsSyncing(false);
        setProgress(0);
        setCurrentStage('');
        setMessages([]);
        setError(null);
        setTotalObjects(0);
        setCompletedObjects(0);
    }, []);

    const sync = React.useCallback(async (params: StreamSyncParams) => {
        const { url, data, onProgress, onComplete, onError } = params;
        const syncData: { id?: string | number; course_id?: string | number } = data || {};

        setIsSyncing(true);
        setProgress(0);
        setCurrentStage('');
        setMessages([]);
        setError(null);
        setTotalObjects(0);
        setCompletedObjects(0);

        try {
            // Build URL with stream parameter
            const urlParams = new URLSearchParams();
            if (syncData.id) {
                urlParams.append('id', String(syncData.id));
            }
            if (syncData.course_id) {
                urlParams.append('course_id', String(syncData.course_id));
            }
            urlParams.append('stream', '1');

            const fullUrl = `${urlPrefixDefault}${url}?${urlParams.toString()}`;

            const headers: HeadersInit = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            };

            if (localStorage.getItem('access_token')) {
                headers.Authorization = 'Bearer ' + localStorage.getItem('access_token');
            }

            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            // eslint-disable-next-line no-constant-condition
            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    try {
                        const data: StreamProgressData = JSON.parse(trimmedLine);

                        setMessages((prev) => [...prev, data]);

                        // Update totalObjects and completedObjects
                        if (data.totalObjects !== undefined) {
                            setTotalObjects(data.totalObjects);
                        }
                        if (data.completedObjects !== undefined) {
                            setCompletedObjects(data.completedObjects);
                        }

                        // Update progress
                        if (data.progress !== undefined) {
                            setProgress(data.progress);
                        }

                        // Update stage
                        if (data.stage) {
                            setCurrentStage(data.stage);
                        } else if (data.type) {
                            setCurrentStage(data.type);
                        }

                        // Handle different message types
                        switch (data.type) {
                            case 'error': {
                                const errorMessage = extractMessageString(data.message) || 'Unknown error';
                                setError(errorMessage);
                                setIsSyncing(false);
                                if (onError) {
                                    onError(errorMessage);
                                }
                                break;
                            }

                            case 'final':
                            case 'finished':
                                setIsSyncing(false);
                                if (onComplete) {
                                    onComplete(data);
                                }
                                break;

                            default:
                                if (onProgress) {
                                    onProgress(data);
                                }
                                break;
                        }
                    } catch (e) {
                        console.error('Error parsing JSON:', e, trimmedLine);
                    }
                }
            }

            // Process remaining buffer
            if (buffer.trim()) {
                try {
                    const data: StreamProgressData = JSON.parse(buffer.trim());
                    setMessages((prev) => [...prev, data]);
                    if (data.progress !== undefined) {
                        setProgress(data.progress);
                    }
                    if (data.type === 'final' || data.type === 'finished') {
                        setIsSyncing(false);
                        if (onComplete) {
                            onComplete(data);
                        }
                    }
                } catch (e) {
                    console.error('Error parsing final buffer:', e);
                }
            }
        } catch (err: ANY) {
            const errorMessage = err?.message || 'Có lỗi xảy ra khi đồng bộ';
            setError(errorMessage);
            setIsSyncing(false);
            if (onError) {
                onError(errorMessage);
            }
        }
    }, []);

    return {
        sync,
        isSyncing,
        progress,
        currentStage,
        messages,
        error,
        totalObjects,
        completedObjects,
        reset,
    };
}

