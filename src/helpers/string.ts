export function toCamelCase(str: string): string {
    return str.replaceAll('_', '-').replace(/\b(\w)/g, function (match, capture) {
        return capture.toUpperCase();
    }).replace(/[^a-zA-Z0-9/ ]/g, '');
}

export function unCamelCase(str: string): string {
    return str.replace(/([A-Z])/g, ' $1')
        .replace(/^./, function (str) { return str.toUpperCase(); });
}

export function convertToSlug(text: string) {
    text = text.toString().toLowerCase().trim();

    const sets = [
        { to: 'a', from: '[ÀÁÂÃÄÅÆĀĂĄẠẢẤẦẨẪẬẮẰẲẴẶἀ]' },
        { to: 'c', from: '[ÇĆĈČ]' },
        { to: 'd', from: '[ÐĎĐÞ]' },
        { to: 'e', from: '[ÈÉÊËĒĔĖĘĚẸẺẼẾỀỂỄỆ]' },
        { to: 'g', from: '[ĜĞĢǴ]' },
        { to: 'h', from: '[ĤḦ]' },
        { to: 'i', from: '[ÌÍÎÏĨĪĮİỈỊ]' },
        { to: 'j', from: '[Ĵ]' },
        { to: 'ij', from: '[Ĳ]' },
        { to: 'k', from: '[Ķ]' },
        { to: 'l', from: '[ĹĻĽŁ]' },
        { to: 'm', from: '[Ḿ]' },
        { to: 'n', from: '[ÑŃŅŇ]' },
        { to: 'o', from: '[ÒÓÔÕÖØŌŎŐỌỎỐỒỔỖỘỚỜỞỠỢǪǬƠ]' },
        { to: 'oe', from: '[Œ]' },
        { to: 'p', from: '[ṕ]' },
        { to: 'r', from: '[ŔŖŘ]' },
        { to: 's', from: '[ßŚŜŞŠȘ]' },
        { to: 't', from: '[ŢŤ]' },
        { to: 'u', from: '[ÙÚÛÜŨŪŬŮŰŲỤỦỨỪỬỮỰƯ]' },
        { to: 'w', from: '[ẂŴẀẄ]' },
        { to: 'x', from: '[ẍ]' },
        { to: 'y', from: '[ÝŶŸỲỴỶỸ]' },
        { to: 'z', from: '[ŹŻŽ]' },
        { to: '-', from: '[·/_,:;\']' }
    ];

    sets.forEach(set => {
        text = text.replace(new RegExp(set.from, 'gi'), set.to)
    });

    return text
        .replace(/\s+/g, '-')    // Replace spaces with -
        .replace(/[^-a-zа-я\u0370-\u03ff\u1f00-\u1fff]+/g, '') // Remove all non-word chars
        .replace(/--+/g, '-')    // Replace multiple - with single -
        .replace(/^-+/, '')      // Trim - from start of text
        .replace(/-+$/, '')      // Trim - from end of text
}