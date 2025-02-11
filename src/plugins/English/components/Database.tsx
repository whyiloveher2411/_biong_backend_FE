import { Box, Button, IconButton, Pagination, Paper, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import useAjax from 'hook/useApi';
import React from 'react';
import { Link } from 'react-router-dom';
import schema, { IField, IPaginationData } from './schema';

interface ID {
    $oid: string;
}


const Database = <T extends { _id: ID }>({ type, editable }: {
    type: keyof typeof schema,
    editable?: boolean,
}) => {

    const api = useAjax();

    const [data, setData] = React.useState<IPaginationData<T> | null>(null);

    const [page, setPage] = React.useState(1);

    const handleChangePage = (_: React.ChangeEvent<unknown>, newPage: number) => {
        setPage(newPage);
    };

    React.useEffect(() => {
        api.ajax({
            url: `plugin/english/data/get-list`,
            data: {
                table: schema[type].table,
                page: page,
                per_page: 10,
            },
            success: (result) => {
                setData(result.data);
            }
        })
    }, [type, page]);

    const loadingComponent = Array.from({ length: 10 }).map((_, index) => <TableRow key={index}>
        {Object.keys(schema[type].fields).map((field) => <TableCell key={field}><Skeleton variant='text' /></TableCell>)}
        <TableCell><Skeleton variant='text' /></TableCell>
    </TableRow>)

    return <Box>
        <Typography variant='h1' sx={{ textTransform: 'capitalize' }}>{type}</Typography>

        <TableContainer component={Paper} sx={{ mt: 3 }}>
            <Table aria-label="simple table">
                <TableHead>
                    <TableRow>
                        {/* {renderHeader()} */}
                        {
                            Object.keys(schema[type].fields).map((field) => <TableCell sx={{ textTransform: 'capitalize' }} key={field}>{field}</TableCell>)
                        }
                        <TableCell></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {
                        api.open ? loadingComponent : data?.data.map((item) => <TableRow key={item._id.$oid}>
                            {Object.keys(schema[type].fields).map((field) => <TableCell key={field}>
                                <ShowField type={type} item={item} field={field} option={schema[type].fields[field]} />
                            </TableCell>)}
                            <TableCell>
                                {editable &&
                                    <IconButton component={Link} to={`/plugin/english/posts/${type}/${item._id.$oid}`}>
                                        <Button variant='contained' color='primary'>Edit</Button>
                                    </IconButton>
                                }
                            </TableCell>
                        </TableRow>)
                    }
                </TableBody>
            </Table>
        </TableContainer>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Typography variant='body1'>{data ? `${data?.from} - ${data?.to} of ${data?.total}` : ''}</Typography>
            <Pagination
                count={data?.last_page}
                page={page}
                onChange={handleChangePage}
            />
        </Box>
    </Box>
};

function ShowField({ type, item, field, option }: { type: keyof typeof schema, item: object, field: string, option: IField }) {

    const [post, setPost] = React.useState<ANY>(null);
    const [posts, setPosts] = React.useState<IPaginationData<ANY> | null>(null);
    const api = useAjax();
    React.useEffect(() => {
        if (option.type === 'reference') {
            api.ajax({
                url: `plugin/english/data/get-one`,
                data: {
                    table: schema[option.reference as keyof typeof schema].table,
                    id: (item[option.field as keyof typeof item] as ANY)?.$oid,
                },
                success: (result) => {
                    setPost(result.data);
                }
            });
        }
        if (option.type === 'has_many') {
            api.ajax({
                url: `plugin/english/data/get-list`,
                data: {
                    table: schema[option.reference as keyof typeof schema].table,
                    condition: {
                        [option.field as keyof typeof item]: (item['_id' as keyof typeof item] as ANY)?.$oid + '|_id',
                    },
                    page: 1,
                    per_page: 1000,
                },
                success: (result: ANY) => {
                    setPosts(result.data);
                }
            });
        }
    }, []);

    switch (option.type) {
        case 'string':
            return <>{item[field as keyof typeof item]}</>;
        case 'reference': {
            if (!post) return <></>;

            const id = (item[option.field as keyof typeof item] as ANY)?.$oid;
            const urlBack = encodeURIComponent(`/plugin/english/posts/${type}` + (window.location.search ? window.location.search : ''));
            return <Button component={Link} to={`/plugin/english/posts/${option.reference}/${id}?back=${urlBack}`} variant='contained' color='primary'>{post?.[schema[option.reference as keyof typeof schema].show_field]}</Button>
        }
        case 'has_many': {
            if (!posts) return <></>;
            const urlBack = encodeURIComponent(`/plugin/english/posts/${type}` + (window.location.search ? window.location.search : ''));
            return <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {posts.data.map((post) => <Button key={post._id.$oid} component={Link} to={`/plugin/english/posts/${option.reference}/${post._id.$oid}?back=${urlBack}`} variant='contained' color='primary'>{post?.[schema[option.reference as keyof typeof schema].show_field]}</Button>)}
            </Box>
        }
        default:
            return <></>;
    }

    return <></>;
}

export default Database;