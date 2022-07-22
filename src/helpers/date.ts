import moment from "moment";

export function dateFormat(date: string | Date): string {

    return moment(date).format('LL');

    // if (date instanceof Date) {
    //     return date.getFullYear() + '-' + (('0' + (date.getMonth() + 1)).slice(-2)) + '-' + (('0' + date.getDate()).slice(-2));
    // }
    // return date;
}

export function dateTimeFormat(date: Date): string {
    // if (date instanceof Date) {

    return moment(date).format('YYYY-MM-DD HH:mm:ss');
    // return date.getFullYear() + '-' + (('0' + (date.getMonth() + 1)).slice(-2)) + '-' + (('0' + date.getDate()).slice(-2)) + ' ' + (('0' + date.getHours()).slice(-2)) + ':' + (('0' + date.getMinutes()).slice(-2)) + ':' + (('0' + date.getSeconds()).slice(-2));
    // }
    // return date;
}

export function compareDate<T extends Date | string>(dateStart: T, dateEnd: T): boolean {

    if (dateStart instanceof String && dateEnd instanceof String) {
        return dateStart === dateEnd;
    }

    if (dateStart instanceof Date && dateEnd instanceof Date) {
        return dateStart.getTime() === dateEnd.getTime()
    }

    return true;
}

export function convertHMS(value: number | string): string | null {
    const sec = parseInt(value + '', 10); // convert value to number if it's string
    if (sec) {
        let hours: number | string = Math.floor(sec / 3600); // get hours
        let minutes: number | string = Math.floor((sec - (hours * 3600)) / 60); // get minutes
        let seconds: number | string = sec - (hours * 3600) - (minutes * 60); //  get seconds
        // add 0 if value < 10; Example: 2 => 02
        if (hours < 10) { hours = "0" + hours; }
        if (minutes < 10) { minutes = "0" + minutes; }
        if (seconds < 10) { seconds = "0" + seconds; }
        return (hours !== '00' ? hours + ':' : '') + minutes + ':' + seconds; // Return is HH : MM : SS
    }

    return null;
}