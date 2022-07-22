import { OptionsObject, SnackbarOrigin, useSnackbar, VariantType } from "notistack";
import { MessageFromApiProps } from "./useApi";


export function useFloatingMessages() {

    const { enqueueSnackbar } = useSnackbar();

    return {
        showMessage: (message: string | MessageFromApiProps, type: VariantType = 'error', snackbarOrigin?: SnackbarOrigin) => {

            let options: OptionsObject = {
                variant: type, anchorOrigin: { vertical: 'bottom', horizontal: 'left' }
            };

            if (snackbarOrigin) {
                options.anchorOrigin = {
                    ...options.anchorOrigin,
                    ...snackbarOrigin
                };
            }

            let messageContent: string;

            if (typeof message === 'string') {
                messageContent = message;
            } else {
                messageContent = message.content;

                options = message.options;
            }

            enqueueSnackbar(
                { content: messageContent, options: options }, options
            );

        }
    }
}