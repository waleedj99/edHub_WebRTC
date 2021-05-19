export const ChatType = {
    TEXT: 'text',
    IMAGE: 'img',
    FILE: 'file',
}

export const SHAPES = {
    CIRCLE: 'shapeCircle',
    RECTANGLE: 'shapeRectangle',
    LINE: 'shapeLine',
    ARROW: 'shapeArrow',
    TRIANGLE: 'shapeTriangle',
    ROUNDED_RECTANGLE : 'shapeRoundedRectangle',
}

export const AcceptableFileType = ['application/pdf','image/jpeg','image/png','image/gif','image/webp','image/svg+xml','text/csv','text/plain','text/html',];
export const ImageFileType = ['image/jpeg','image/png','image/gif','image/webp','image/svg+xml'];

export const FILE_SIZE_LIMIT = process.env.FILE_SIZE_LIMIT || 16000000; // in bytes