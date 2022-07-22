import { UseAjaxProps } from 'hook/useApi';
import React from 'react'
import { FileProps, StateConfigProps } from '.';

const FileManagerContext = React.createContext({});

export default FileManagerContext;

export interface FileManagerProviderProps {
    fileSelected: [
        {
            open: boolean;
            file: null | { [key: string]: FileProps };
        },
        React.Dispatch<React.SetStateAction<{
            open: boolean;
            file: null | { [key: string]: FileProps };
        }>>
    ],
    openNewDialog: [{
        open: boolean;
        file: {
            filename: string;
        };
        folder: FileProps | null;
        onSubmit: null | (() => void);
        success: ((result: {
            success: boolean;
        }) => void) | null;
    }, React.Dispatch<React.SetStateAction<{
        open: boolean;
        file: {
            filename: string;
        };
        folder: FileProps | null;
        onSubmit: null | (() => void);
        success: ((result: {
            success: boolean;
        }) => void) | null;
    }>>],
    openRenameDialog: [{
        open: boolean;
        file: FileProps | null;
        origin: FileProps | null;
        onSubmit: () => void;
        success: (result: JsonFormat) => void;
    }, React.Dispatch<React.SetStateAction<{
        open: boolean;
        file: FileProps | null;
        origin: FileProps | null;
        onSubmit: () => void;
        success: (result: JsonFormat) => void;
    }>>],
    onDoubleClickFile: (file: FileProps) => void,
    onDoubleClickDir: (file: FileProps) => void,
    onDoubleClickImage: (file: FileProps) => void,
    configrmDialog: [{
        open: boolean;
        file: null | FileProps;
        success: (result: JsonFormat) => void;
    }, React.Dispatch<React.SetStateAction<{
        open: boolean;
        file: null | FileProps;
        success: (result: JsonFormat) => void;
    }>>],
    moveFileOrFolder: (file: FileProps, folder: FileProps, success: (result: {
        success: boolean;
    }) => void) => void,
    extensions: {
        [key: string]: number;
    },
    config: StateConfigProps,
    search: {
        query: string;
    },
    ajax: UseAjaxProps,
}