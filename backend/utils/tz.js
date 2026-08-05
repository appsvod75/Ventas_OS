const toSVDate = (str) => {
    if (!str) return null;
    if (typeof str !== 'string') return new Date(str);
    if (str.includes('T')) return new Date(`${str}-06:00`);
    return new Date(`${str}T00:00:00-06:00`);
};

const toSVNoon = (str) => {
    if (!str) return null;
    const day = typeof str === 'string' ? str.split('T')[0] : null;
    return day ? new Date(`${day}T12:00:00-06:00`) : new Date(str);
};

const toSVEndOfDay = (str) => {
    if (!str) return null;
    const day = typeof str === 'string' ? str.split('T')[0] : null;
    return day ? new Date(`${day}T23:59:59-06:00`) : null;
};

module.exports = { toSVDate, toSVNoon, toSVEndOfDay };
