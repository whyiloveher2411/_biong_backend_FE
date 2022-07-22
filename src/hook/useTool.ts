import { getLanguages } from "helpers/i18n";
import { UseAjaxProps } from "./useApi";

export default function useTool() {

    return {
        cache: {
            getListType: ({ ajaxHandle, callback }: { ajaxHandle: UseAjaxProps, callback?: ((result: ToolCacheListType) => void) }) => {
                ajaxHandle.ajax({
                    url: 'tool/cache',
                    method: 'POST',
                    success: (result: ToolCacheListType) => {
                        if (callback) {
                            callback(result);
                        }
                    }
                });
            },
            clear: ({ ajaxHandle, key = 'all', callback }: { ajaxHandle: UseAjaxProps, key?: string, callback?: ((result: ANY) => void) }) => {
                ajaxHandle.ajax({
                    url: 'tool/cache',
                    method: 'POST',
                    data: {
                        action: 'clear',
                        key: key
                    },
                    success: (result) => {
                        if (callback) {
                            callback(result);
                        }
                    }
                });
            }
        },
        database: {
            check: ({ ajaxHandle, callback }: { ajaxHandle: UseAjaxProps, callback?: ((result: ANY) => void) }) => {
                ajaxHandle.ajax({
                    url: 'tool/database-check',
                    method: 'POST',
                    success: (result) => {
                        if (callback) {
                            callback(result);
                        }
                    }
                });
            },
            backup: ({ ajaxHandle, callback }: { ajaxHandle: UseAjaxProps, callback?: ((result: ANY) => void) }) => {
                ajaxHandle.ajax({
                    url: 'tool/database-backup',
                    method: 'POST',
                    success: (result) => {
                        if (callback) {
                            callback(result);
                        }
                    }
                });
            }
        },
        development: {
            deployStaticData: ({ ajaxHandle, callback }: { ajaxHandle: UseAjaxProps, callback?: ((result: ANY) => void) }) => {
                ajaxHandle.ajax({
                    url: 'tool/development-asset',
                    method: 'POST',
                    success: (result) => {
                        if (callback) {
                            callback(result);
                        }
                    }
                });
            },
            declareHook: ({ ajaxHandle, callback }: { ajaxHandle: UseAjaxProps, callback?: ((result: ANY) => void) }) => {
                ajaxHandle.ajax({
                    url: 'tool/compile-di',
                    method: 'POST',
                    success: (result) => {
                        if (callback) {
                            callback(result);
                        }
                    }
                });
            },
            refreshView: ({ ajaxHandle, callback }: { ajaxHandle: UseAjaxProps, callback?: ((result: ANY) => void) }) => {
                ajaxHandle.ajax({
                    url: 'tool/development-refresh-view',
                    method: 'POST',
                    success: (result) => {
                        if (callback) {
                            callback(result);
                        }
                    }
                });
            },
            renderLanguage: ({ ajaxHandle, callback }: { ajaxHandle: UseAjaxProps, callback?: ((result: ANY) => void) }) => {
                ajaxHandle.ajax({
                    url: 'tool/check-language',
                    method: 'POST',
                    data: {
                        languages: getLanguages()
                    },
                    success: (result) => {
                        if (callback) {
                            callback(result);
                        }
                    }
                });
            }
        },
        optimize: {
            minifyHTML: ({ ajaxHandle, callback }: { ajaxHandle: UseAjaxProps, callback?: ((result: ANY) => void) }) => {
                ajaxHandle.ajax({
                    url: 'tool/optimize-minify-html',
                    method: 'POST',
                    success: (result) => {
                        if (callback) {
                            callback(result);
                        }
                    }
                });
            }
        }
    };

}

export interface ToolCacheListType {
    rows: {
        [key: string]: {
            title: string,
            type: string,
            description: string,
            creator: string
        }
    },
    totalSize: string,
}