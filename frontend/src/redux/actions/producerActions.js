export const addProducer = (producer) =>
    ({
        type: 'ADD_PRODUCER',
        payload: { producer }
    });

export const removeProducer = (producerId) =>
    ({
        type: 'REMOVE_PRODUCER',
        payload: { producerId }
    });

export const setProducerPaused = (producerId, originator) =>
    ({
        type: 'SET_PRODUCER_PAUSED',
        payload: { producerId, originator }
    });

export const setProducerResumed = (producerId, originator) =>
    ({
        type: 'SET_PRODUCER_RESUMED',
        payload: { producerId, originator }
    });