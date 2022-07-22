import { AlertProps } from '@mui/material';
import Alert from 'components/atoms/Alert';

function SpecialNotes({
    specialNotes
}: {
    specialNotes?: Array<{
        type: AlertProps['severity'],
        content: string,
    }>
}) {
    return (
        <>
            {
                !!specialNotes &&
                specialNotes.map((item: {
                    type: AlertProps['severity'],
                    content: string,
                }, index: number) => (
                    <Alert key={index} severity={item.type} sx={{ marginTop: 0.5 }}>
                        {item.content}
                    </Alert>
                ))

            }
        </>
    )
}

export default SpecialNotes