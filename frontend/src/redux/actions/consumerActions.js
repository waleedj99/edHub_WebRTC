export const addConsumer = (consumer, peerId) => ({
    type: 'ADD_CONSUMER',
    payload: { consumer, peerId }
});

export const setConsumerPaused = (consumerId, originator) =>
    ({
        type: 'SET_CONSUMER_PAUSED',
        payload: { consumerId, originator }
    });

export const removeConsumer = (consumerId, peerId) =>
    ({
        type: 'REMOVE_CONSUMER',
        payload: { consumerId, peerId }
    });

export const setConsumerResumed = (consumerId, originator) =>
    ({
        type: 'SET_CONSUMER_RESUMED',
        payload: { consumerId, originator }
    });