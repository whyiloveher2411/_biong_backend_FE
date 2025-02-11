import { Box, InputLabel, FormControl, Select, MenuItem, Typography } from '@mui/material'
import Database from '../components/Database'
import EditPost from '../components/EditPost'
import schema, { IField, IPaginationData } from '../components/schema'
import FieldForm from 'components/atoms/fields/FieldForm'
import useAjax from 'hook/useApi'
import React from 'react'

function Posts({ subtab, subtab2 }: { subtab: string, subtab2: string }) {

    if (subtab && schema[subtab]) {

        if (subtab2) {
            return <EditPost id={subtab2} type={subtab} renderForm={(post, setPost) => {
                const fields: React.ReactNode[] = [];

                Object.keys(schema[subtab].fields).forEach((field) => {

                    switch (schema[subtab].fields[field].type) {
                        case 'string':
                            fields.push(<FieldForm
                                key={field}
                                component='text'
                                config={
                                    {
                                        title: field.charAt(0).toUpperCase() + field.slice(1),
                                    }
                                }
                                post={post ?? {}}
                                name={field}
                                onReview={(value) => {
                                    if (post) {
                                        setPost({ ...post, [field]: value });
                                    }
                                }}
                            />);
                            break;
                        case 'reference':
                            fields.push(<ReferenceSelect key={field} type={subtab} field={field} post={post} setPost={setPost} option={schema[subtab].fields[field] as { type: string, reference: string, field: string }} />);
                            break;
                        case 'object':
                            fields.push(<ObjectSelect key={field} type={subtab} field={field} post={post} setPost={setPost} option={schema[subtab].fields[field] as { type: string, reference: string, field: string }} />);
                            break;
                    }
                });

                return fields;
            }
            } />
        }

        return (
            <Box
                sx={{
                    margin: '0 auto',
                    width: '100%',
                    maxWidth: '1200px',
                    padding: '20px',
                }}
            >
                <Database type={subtab} editable />
            </Box>
        )
    }

    return <></>
}

export default Posts

function ReferenceSelect({ type, field, post, setPost, option }: { type: string, field: string, post: ANY, setPost: (post: ANY) => void, option: IField }) {

    const [posts, setPosts] = React.useState<IPaginationData<ANY> | null>(null);
    const api = useAjax();
    React.useEffect(() => {
        if (post) {
            api.ajax({
                url: `plugin/english/data/get-list`,
                data: {
                    table: schema[option.reference as keyof typeof schema].table,
                    page: 1,
                    per_page: 1000,
                },
                success: (result) => {
                    setPosts(result.data);
                }
            });
        }
    }, [post, type]);

    if (!post) return <></>;

    return <FormControl fullWidth>
        <InputLabel>{field.charAt(0).toUpperCase() + field.slice(1)}</InputLabel>
        <Select
            value={(post[option.field as keyof typeof post] as ANY)?.$oid}
            label={field.charAt(0).toUpperCase() + field.slice(1)}
            onChange={(event) => {
                setPost({ ...post, [option.field as keyof typeof post]: { $oid: event.target.value } });
            }}
        >
            {posts?.data.map((post) => (
                <MenuItem selected={post._id.$oid === (post[option.field as keyof typeof post] as ANY)?.$oid} value={post._id.$oid}>{post[schema[option.reference as keyof typeof schema].show_field]}</MenuItem>
            ))}
        </Select>
    </FormControl>
}

function ObjectSelect({ type, field, post, setPost, option }: { type: string, field: string, post: ANY, setPost: (post: ANY) => void, option: IField }) {

    const [object, setObject] = React.useState<{ [key: string]: ANY }>({});
    const initData = React.useRef(false);

    React.useEffect(() => {
        if (post) {
            setPost({ ...post, [field as keyof typeof post]: object });
        }
    }, [object]);

    React.useEffect(() => {
        if (post && !initData.current) {
            setObject(post[field as keyof typeof post] ?? {});
            initData.current = true;
        }
    }, [post]);

    return <Box>
        <Typography variant='body1' sx={{ mb: 3 }}>{field.charAt(0).toUpperCase() + field.slice(1)}</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {
                Object.keys(option.objectStructure ?? {}).map((key) => {
                    return <FieldForm
                        key={key}
                        component='text'
                        config={{ title: key.charAt(0).toUpperCase() + key.slice(1) }}
                        post={object}
                        name={key}
                        onReview={(value) => {
                            setObject({ ...object, [key]: value });
                        }}
                    />
                })
            }
        </Box>
    </Box>
}
