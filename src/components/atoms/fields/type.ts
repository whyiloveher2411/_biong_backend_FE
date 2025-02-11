//eslint-disable-next-line
export type OnReviewProps = (value?: any, key?: null | string | JsonFormat | { [key: string]: any }) => void

export type FieldFormProps = {
    //eslint-disable-next-line
    [key: string]: any,
    component: string,
    config: FieldConfigProps,
    name: string,
    post: JsonFormat,
    onReview: OnReviewProps,
    dataPostType?: JsonFormat
}

export type FieldFormItemProps = {
    //eslint-disable-next-line
    [key: string]: any,
    component: string,
    config: JsonFormat,
    post: JsonFormat,
    onReview: OnReviewProps
    name: string,
    dataPostType?: JsonFormat
}

export type FieldViewProps = {
    //eslint-disable-next-line
    [key: string]: any,
    component: string,
    config: FieldConfigProps,
    name: string,
    post: JsonFormat,
    actionLiveEdit?: (value: string | JsonFormat, key: string | JsonFormat, post: JsonFormat) => void
}

export type FieldViewItemProps = {
    //eslint-disable-next-line
    [key: string]: any,
    component: string,
    config: JsonFormat,
    name: string
    post: JsonFormat,
    //eslint-disable-next-line
    content: any,
    actionLiveEdit?: (value: string | JsonFormat, key: string | JsonFormat, post: JsonFormat) => void
}

export interface FieldConfigProps {
    //eslint-disable-next-line
    [key: string]: any,
    title?: string | boolean | null | undefined,
    view?: string,
    customViewList?: string,
    customViewForm?: string,
    inlineEdit?: boolean,
    sortable?: boolean,
}
