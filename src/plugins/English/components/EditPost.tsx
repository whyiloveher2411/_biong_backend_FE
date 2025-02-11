import { ArrowBack } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { Box, Button, Card, CardContent, CircularProgress, IconButton, Typography } from "@mui/material";
import useApi from "hook/useApi";
import React from "react";
import { Link } from "react-router-dom";
import schema from "./schema";

interface ID {
    $oid: string;
}

const EditPost = <T extends { _id: ID }>({ id, type, renderForm }: { id: string, type: string, renderForm: (post: T | null, setPost: React.Dispatch<React.SetStateAction<T | null>>) => React.ReactNode }) => {

    const [post, setPost] = React.useState<T | null>(null);

    const back = new URLSearchParams(window.location.search).get('back') || `/plugin/english/posts/${type}`;

    const api = useApi();
    React.useEffect(() => {
        api.ajax({
            url: `plugin/english/data/get-one`,
            data: {
                table: schema[type].table,
                id: id,
            },
            success: (result) => {
                setPost(result.data);
            }
        })
    }, [id, type]);

    const handleSubmit = () => {
        if (post) {
            api.ajax({
                url: `plugin/english/data/update`,
                data: {
                    table: schema[type].table,
                    data: post,
                },
                success: (result) => {
                    api.showMessage('Post updated successfully', 'success');
                }
            })
        }
    }

    return <Box
        sx={{
            margin: '0 auto',
            width: '100%',
            maxWidth: '1200px',
            padding: '20px',
        }}
    >
        <Typography variant='h1' sx={{ textTransform: 'capitalize' }}><IconButton component={Link} to={back}><ArrowBack /></IconButton> {post ? post[schema[type].show_field as keyof typeof post] : ''}</Typography>
        <Card sx={{ mt: 3 }}>
            <CardContent
                sx={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                }}
            >
                <Box sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    display: api.open ? 'flex' : 'none',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                }}>
                    <CircularProgress />
                </Box>
                {renderForm(post, setPost)}
            </CardContent>
        </Card>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant='contained' component={Link} to={`/plugin/english/posts/${type}`} color='error'>Cancel</Button>
            <LoadingButton loading={api.open} variant='contained' color='success' onClick={handleSubmit}>Submit</LoadingButton>
        </Box>
    </Box>
}

export default EditPost;

export function usePosts<T extends { _id: ID }>(type: string) {
    const api = useApi();
    const [posts, setPosts] = React.useState<T[]>([]);
    React.useEffect(() => {
        api.ajax({
            url: `plugin/english/data/get-all`,
            data: {
                table: schema[type].table,
            },
            success: (result) => {
                setPosts(result.data);
            }
        })
    }, [type]);
    return { posts, loading: api.open };
}

export function usePost<T extends { _id: ID }>(id: string, type: string) {
    const api = useApi();
    const [post, setPost] = React.useState<T | null>(null);
    React.useEffect(() => {
        api.ajax({
            url: `plugin/english/data/get-one`,
            data: {
                table: schema[type].table,
                id: id,
            },
            success: (result) => {
                setPost(result.data);
            }
        })
    }, [id, type]);
    return post
}