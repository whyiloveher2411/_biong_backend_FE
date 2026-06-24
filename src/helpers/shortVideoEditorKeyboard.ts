export function isKeyboardEditableTarget(target: EventTarget | null): boolean {
    const editableSelector = 'input, textarea, select, [contenteditable="true"], [role="textbox"]';

    const elementMatchesEditable = (element: Element | null | undefined): boolean => {
        if (!(element instanceof HTMLElement)) {
            return false;
        }
        if (element.matches(editableSelector) || element.closest(editableSelector)) {
            return true;
        }
        return element.isContentEditable || Boolean(element.closest('[contenteditable="true"]'));
    };

    if (elementMatchesEditable(target instanceof HTMLElement ? target : null)) {
        return true;
    }

    return elementMatchesEditable(document.activeElement);
}
