import { useTheme } from "@mui/material";
import { FileProps } from "components/atoms/fields/image/GoogleDrive";
import { makeid } from "helpers/dom";
import { __ } from "helpers/i18n";
import { convertToURL } from "helpers/url";
import useAjax, { ResultFromApiProps } from "hook/useApi";
import { useFloatingMessages } from "hook/useFloatingMessages";
import React from "react";

export type UpLoadFileSuccessProps = (file: FileUploaderProps) => void;
export type OnProcesingFileProps = (file: FileUploaderProps, percent: string) => void;
export type OnLoadFilesProps = (files: FileUploaderProps[]) => void;
export type UploadFileErrorProps = (file: FileUploaderProps, status: string) => void;

export interface FileDragDropProps {
    upLoadFileSuccess: UpLoadFileSuccessProps,
    onProcesingFile: OnProcesingFileProps,
    onLoadFiles: OnLoadFilesProps,
    uploadFileError: UploadFileErrorProps,
    fileOrigin: FileProps | null,
    path: string | null,
    storeType: string,
}

export default function FileDragDrop({ fileOrigin, path, onLoadFiles, onProcesingFile, upLoadFileSuccess, uploadFileError, storeType }: FileDragDropProps) {

    const ajax = useAjax();

    const theme = useTheme();

    const { showMessage } = useFloatingMessages();

    const uploadFiles = (key: string, index: number) => {


        if (!window.__fileManagerChunkFile[key]) {
            return false;
        }


        let file: FileUploaderProps = window.__fileManagerChunkFile[key].file;

        const urlApi = convertToURL(process.env.REACT_APP_BASE_URL, 'api/admin/file-manager/upload');

        let xhr = new XMLHttpRequest();
        // xhr.setRequestHeader('Accept', 'application/json');
        // xhr.setRequestHeader('Content-Type', 'application/json');
        // xhr.setRequestHeader('Origin', '*');

        xhr.upload.addEventListener("progress", (e) => {
            onProcesingFile(file, ((window.__fileManagerChunkFile[key].loaded + e.loaded) / window.__fileManagerChunkFile[key].size * 100).toFixed(1));
        }, false);

        xhr.upload.addEventListener("load", (e) => {
            let percent = ((window.__fileManagerChunkFile[key].loaded + e.loaded) / window.__fileManagerChunkFile[key].size * 100).toFixed(1);

            if (Number(percent) >= 100) {
                percent = '100';
            }

            onProcesingFile(file, percent);
        }, false);

        xhr.onreadystatechange = function () {

            if (xhr.readyState === 4) {

                if (xhr.status === 200) {

                    let result: ResultFromApiProps = JSON.parse(xhr.responseText);

                    if (result.message) {
                        showMessage(result.message)
                    }

                    if (result.require_login) {
                        ajax.requestLogin('file-manager/upload', {
                            callback: uploadFiles,
                            params: file
                        });
                    }

                    if (result.success) {

                        if (index === 0) {
                            window.__fileManagerChunkFile[key].chunkName = result.chunkName;
                        }

                        if (index < window.__fileManagerChunkFile[key].chunks.length) {
                            uploadFiles(key, index + 1);
                            window.__fileManagerChunkFile[key].loaded += window.__fileManagerChunkFile[key].chunks[index].size;
                        } else {
                            upLoadFileSuccess(file);
                        }
                    }

                } else {
                    if (xhr.statusText) {
                        uploadFileError(file, xhr.statusText);
                    }
                }
            }
        };

        let formdata = new FormData();

        if (window.__fileManagerChunkFile[key].chunks[index]) {
            formdata.append('file', window.__fileManagerChunkFile[key].chunks[index]);
        }

        formdata.append('path', path ?? '');
        formdata.append('name', window.__fileManagerChunkFile[key].name);
        formdata.append('size', window.__fileManagerChunkFile[key].size);
        formdata.append('chunkName', window.__fileManagerChunkFile[key].chunkName);
        formdata.append('storeType', storeType);
        formdata.append('chunk', index + '');
        formdata.append('chunks', window.__fileManagerChunkFile[key].chunks.length);

        xhr.open('POST',urlApi);

        xhr.onerror = (_e) => {
            if (process.env.NODE_ENV === 'development') {
                console.log(_e);
            }
            showMessage(__('An error occurred while uploading the file'), 'error');
        };
        xhr.onabort = (e) => {
            console.log(xhr);
        };

        xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem('access_token'));
        xhr.send(formdata);
        // xhr.abort();
    }

    const handleOnDrop = (ev: React.DragEvent) => {
        // Prevent default behavior (Prevent file from being opened)
        ev.preventDefault();
        ev.stopPropagation();

        let files: FileUploaderProps[] = [];
        let procesingNew = {};

        const imageTypes = ['image/png', 'image/gif', 'image/bmp', 'image/jpg', 'image/jpeg'];

        if (window.__filesUpload) {
            window.__filesUpload = [];
        }

        for (let i = 0; i < ev.dataTransfer.files.length; i++) {

            let fileType = ev.dataTransfer.files[i].type;

            //@ts-ignore
            ev.dataTransfer.files[i].is_image = imageTypes.includes(fileType);
            //@ts-ignore
            ev.dataTransfer.files[i].key = makeid(10, 'file_manage');

            //@ts-ignore
            ev.dataTransfer.files[i].chunks = [];

            const Blob = ev.dataTransfer.files[i];
            const BYTES_PER_CHUNK = 2097152; //2MB
            const SIZE = Blob.size;
            let Start = 0;
            let End = BYTES_PER_CHUNK;

            if (!window.__fileManagerChunkFile) {
                window.__fileManagerChunkFile = {};
            }
            //@ts-ignore
            window.__fileManagerChunkFile[ev.dataTransfer.files[i].key] = {};
            //@ts-ignore
            window.__fileManagerChunkFile[ev.dataTransfer.files[i].key].file = ev.dataTransfer.files[i];
            //@ts-ignore
            window.__fileManagerChunkFile[ev.dataTransfer.files[i].key].name = ev.dataTransfer.files[i].name;
            //@ts-ignore
            window.__fileManagerChunkFile[ev.dataTransfer.files[i].key].size = SIZE;
            //@ts-ignore
            window.__fileManagerChunkFile[ev.dataTransfer.files[i].key].chunk = 0;
            //@ts-ignore
            window.__fileManagerChunkFile[ev.dataTransfer.files[i].key].loaded = 0;
            //@ts-ignore
            window.__fileManagerChunkFile[ev.dataTransfer.files[i].key].chunks = [];

            while (Start < SIZE) {
                const Chunk = Blob.slice(Start, End);
                //@ts-ignore
                window.__fileManagerChunkFile[ev.dataTransfer.files[i].key].chunks.push(Chunk);
                Start = End;
                End = Start + BYTES_PER_CHUNK;
            }


            //@ts-ignore
            uploadFiles(ev.dataTransfer.files[i].key, 0);

            //@ts-ignore
            files.push(ev.dataTransfer.files[i]);
            //@ts-ignore
            procesingNew[ev.dataTransfer.files[i].name] = 0;
        }

        if (onLoadFiles) {
            onLoadFiles(files)
        }

        //@ts-ignore
        ev.currentTarget.style.bordeSize = '1px';
        //@ts-ignore
        ev.currentTarget.style.borderColor = null;
        //@ts-ignore
        ev.currentTarget.style.backgroundColor = null;
    }

    const handelOnDragOver = (ev: React.DragEvent) => {
        //@ts-ignore
        ev.currentTarget.style.bordeSize = '1px';
        //@ts-ignore
        ev.currentTarget.style.borderColor = '#2196f3';
        //@ts-ignore
        ev.currentTarget.style.backgroundColor = theme.palette.fileDropSelected;
        // Prevent default behavior (Prevent file from being opened)
        ev.preventDefault();
        ev.stopPropagation();
    }

    const handelOnDragLeave = (ev: React.DragEvent) => {
        //@ts-ignore
        ev.currentTarget.style.borderColor = null;
        //@ts-ignore
        ev.currentTarget.style.backgroundColor = null;
        //@ts-ignore
        ev.currentTarget.style.transition = 'all 0.08s';
        ev.preventDefault();
        ev.stopPropagation();
    }

    if (!fileOrigin || fileOrigin.is_dir) {
        return {
            onDrop: handleOnDrop,
            onDragOver: handelOnDragOver,
            onDragLeave: handelOnDragLeave,
        };
    }
    return {};
}


export interface FileUploaderProps {
    [key: string]: ANY,
    fileNmae: string,
    is_image: boolean,
    chunks: ANY[],
    fileReader: FileReader,
    key: string,
    percentLoaded: string | number,
    sizeUpload: number,
    thumbnail: string,
    uploadComplete: boolean,
}