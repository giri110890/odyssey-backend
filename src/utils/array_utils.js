function arrayEquals(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;

    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.

    for (var i = 0; i < a.length; ++i) {
        if (a[i] instanceof Array && b[i] instanceof Array) {
            if (!arrayEquals(a[i], b[i])) return false;
        }
        else if (a[i] != b[i]) return false;
    }
    return true;
}

function deepEquals(obj1, obj2) {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (const key of keys1) {
        const val1 = obj1[key];
        const val2 = obj2[key];
        const areObjects = isObject(val1) && isObject(val2);
        if ((val1 !== val2) && !(areObjects && deepEquals(val1, val2))) {
            return false;
        }
    }

    return true;
}

function isObject(object) {
    return object != null && typeof object === 'object';
}


module.exports = {
    arrayEquals,
    deepEquals
}