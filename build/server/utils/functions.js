"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkValidity = checkValidity;
function checkValidity(obj, expected) {
    for (const key in obj) {
        if (typeof obj[key] != typeof expected[key])
            return false;
    }
    return true;
}
