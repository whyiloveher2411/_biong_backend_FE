import { Theme } from "@mui/material";
import makeCSS from "components/atoms/makeCSS";
import { __ } from "helpers/i18n";
import { FieldViewItemProps } from "../type";

const useStyles = makeCSS((theme: Theme) => ({
    pointSelect: {
        marginBottom: 2,
        display: 'inline-block',
        width: 6,
        height: 6,
        marginRight: 6,
        borderRadius: '50%',
    },
    chooseTrue: {
        backgroundColor: theme.palette.success.main,
    },
    chooseFalse: {
        backgroundColor: theme.palette.secondary.main,
    }

}))

function View(props: FieldViewItemProps) {

    const classes = useStyles();

    if (props.content) {
        if (props.config.labels) {
            return <><span className={classes.pointSelect + ' ' + classes.chooseTrue}></span>{props.config.labels[1]}</>
        }

        return <><span className={classes.pointSelect + ' ' + classes.chooseTrue}></span>{__('True')}</>
    }

    if (props.config.labels) {
        return <><span className={classes.pointSelect + ' ' + classes.chooseFalse}></span>{props.config.labels[0]}</>
    }
    return <><span className={classes.pointSelect + ' ' + classes.chooseFalse}></span>{__('False')}</>
}

export default View
