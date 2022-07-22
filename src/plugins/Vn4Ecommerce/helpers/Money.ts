import { numberWithSeparator } from "helpers/number";

export function moneyFormat(money: string | number, $isSpace = false) {

    if (money) {
        return '$' + ($isSpace ? ' ' : '') + numberWithSeparator(Number((parseFloat(money as string)).toFixed(2)));
    }
    return '$' + ($isSpace ? ' ' : '') + '0';
}

export const calculateProfit = (price: string | number, cost: string | number): {
    money: number,
    margin: number
} | false => {
    if (price && cost) {

        return {
            money: parseFloat(price as string) - parseFloat(cost as string),
            margin: Number(((parseFloat(price as string) - parseFloat(cost as string)) / parseFloat(price as string) * 100).toFixed(1))
        };

    } else {
        return false;
    }
}

export const precentFormat = (precent: string | number) => {
    return Number(precent).toFixed(1) + '%';
}

export const calculatePercentDiscount = (compare_price: number, price: number) => {

    if (compare_price && price) {
        return Number(100 - (price * 100 / (compare_price ?? 1))).toFixed(1) + '%';
    } else {
        return false;
    }
}

export const calculateTax = (price: string, percentage: string): number => {
    return Number((Number(Number(percentage) / 100 * Number(price))).toFixed(6));
}

export const calculatePricing = ({ price = 0, compare_price = 0, cost = 0, enable_tax, tax_class_detail, tax_class }: {
    [key: string]: ANY,
    price: number,
    compare_price: number,
    cost: number,
    enable_tax: boolean,
    tax_class_detail: string | {
        percentage: number
    },
    tax_class: string
}) => {

    let profit = Number((Number(price) - Number(cost)).toFixed(2));

    let profit_margin = Number((((Number(price) - Number(cost)) / Number(price)) * 100).toFixed(2));

    let percent_discount = 0;

    if (Number(compare_price) > 0) {
        percent_discount = Number(Number(100 - (Number(price) * 100 / (Number(compare_price) ?? 1))).toFixed(1));
    }

    let tax = 0;

    if (enable_tax === undefined || enable_tax) {

        if (typeof tax_class_detail !== 'object') {
            try {
                tax_class_detail = JSON.parse(tax_class_detail);
            } catch (error) {
                tax_class_detail = {
                    percentage: 0
                };
            }
        }

        if (typeof tax_class_detail === 'object' && tax_class_detail?.percentage) {
            tax = Number(Number(Number(Number(tax_class_detail.percentage) / 100 * Number(price))).toFixed(3));
        }

    }

    let price_after_tax = Number(Number(Number(price) + Number(tax)).toFixed(2));

    return {
        price,
        compare_price,
        cost,
        enable_tax,
        tax_class,
        tax_class_detail,

        profit,
        profit_margin,
        percent_discount,
        tax,
        price_after_tax,
    };
}

export function calculateTotal(products: JsonFormat, coupons: { total: number }, discount: { value: number, type: string }): number {
    let total = products.total - coupons.total
        - (discount.value ? discount.type === '%' ? Number((products.total * discount.value / 100).toFixed(2)) : discount.value : 0)

    if (total > 0) return total;

    return 0;
}