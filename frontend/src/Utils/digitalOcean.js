// digitalOcean.js
import AWS from 'aws-sdk'

const regionName = 'fra1'
const accessKeyId = process.env.ACCESS_KEY_ID || 'XX2GWTNW2QT2EHTEROJG';
const accessSecretKey = process.env.ACCESS_SECRET_KEY || '9FqB1gvSWm0xgLXN+LdcbZVKnbKTyz/dulxd5gWD+6I';
export const bucketName = 'webrtc-testing-edhub'

const endpointUrl = `${regionName}.digitaloceanspaces.com`
export const bucketUrl = `https://${bucketName}.${endpointUrl}/`

/**
 * Digital Ocean Spaces Connection
 */

const spacesEndpoint = new AWS.Endpoint(endpointUrl);
export const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: accessKeyId,
  secretAccessKey: accessSecretKey,
});
