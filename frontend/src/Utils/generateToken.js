import crypto from 'crypto-js';
import Logger from '../Logger';

const logger = new Logger('generateToken');



export default async (data) => {
    var d = new Date
    var n = d.toUTCString();
    var n = n.slice(0, -7)
    var inp = n + data
    // console.log(data)
    // console.log(n)
    var ciphertext = crypto.SHA256(inp)
    return ciphertext.toString(crypto.enc.Base64);;
};

// var token = await encryption("bhavya", true)
// logger.log(token)