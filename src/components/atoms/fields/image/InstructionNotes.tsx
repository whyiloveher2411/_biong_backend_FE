import Alert from 'components/atoms/Alert';
import { __ } from 'helpers/i18n';


interface InstructionNotesProps {
    size?: {
        [key: string]: string
    }
    thumbnail?: {
        [key: string]: {
            [key: string]: string
        }
    }
}


export default function InstructionNotes({ size, thumbnail }: InstructionNotesProps) {

    if (size || thumbnail) {
        return <Alert icon={false} severity="info" style={{
            fontSize: 14,
            lineHeight: '22px',
        }}>
            {
                size &&
                <>
                    <div>{__('Condition: Your image needs to meet the following conditions, this will help the website work better')}</div>

                    {
                        Boolean(size.width) &&
                        <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • {__('Width')}: {size.width}px</div>
                    }
                    {
                        Boolean(size.height) &&
                        <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • {__('Height')}: {size.height}px</div>
                    }
                    {
                        Boolean(size.maxWidth) &&
                        <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • {__('Max-Width')}: {size.maxWidth}px</div>
                    }
                    {
                        Boolean(size.maxHeight) &&
                        <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • {__('Max-Height')}: {size.maxHeight}px</div>
                    }
                    {
                        Boolean(size.minWidth) &&
                        <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • {__('Min-Width')}: {size.minWidth}px</div>
                    }
                    {
                        Boolean(size.minHeight) &&
                        <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • {__('Min-Height')}: {size.minHeight}px</div>
                    }
                    {
                        Boolean(size.ratio) &&
                        <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • {__('Ratio')}: {size.ratio}</div>
                    }
                    {/*
                    {
                        Object.keys(size).map(key => (
                            <p key={key}><strong>&nbsp;&nbsp;&nbsp;&nbsp;{unCamelCase(key)}:</strong> {size[key]}{key !== "ratio" ? "px" : ""}</p>
                        ))
                    } */}
                </>
            }
            {
                thumbnail &&
                <>
                    <div style={{ marginTop: 8 }}>{__('Thumbnail: The thumbnails will be automatically created by the website and used for different purposes')}</div>
                    {
                        Object.keys(thumbnail).map(key => (
                            <div key={key}>
                                 &nbsp;&nbsp;&nbsp;&nbsp;{thumbnail[key].title}
                                {
                                    Boolean(thumbnail[key].width) &&
                                    <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • {__('Width')}: {thumbnail[key].width}px</div>
                                }
                                {
                                    Boolean(thumbnail[key].height) &&
                                    <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • {__('Height')}: {thumbnail[key].height}px</div>
                                }
                                {
                                    Boolean(thumbnail[key].maxWidth) &&
                                    <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • {__('Max-Width')}: {thumbnail[key].maxWidth}px</div>
                                }
                                {
                                    Boolean(thumbnail[key].maxHeight) &&
                                    <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • {__('Max-Height')}: {thumbnail[key].maxHeight}px</div>
                                }
                                {
                                    Boolean(thumbnail[key].minWidth) &&
                                    <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • {__('Min-Width')}: {thumbnail[key].minWidth}px</div>
                                }
                                {
                                    Boolean(thumbnail[key].minHeight) &&
                                    <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; • {__('Min-Height')}: {thumbnail[key].minHeight}px</div>
                                }
                            </div>
                        ))
                    }
                </>
            }
        </Alert >
    }

    return null;
}