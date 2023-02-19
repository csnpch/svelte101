const randomNumberBetween = (start, end) => { // min and max included 
    return Math.floor(Math.random() * (end - start + 1) + start)
}


const randomStringLength = (length) => {
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
}


export default {
    randomNumberBetween,
    randomStringLength
}