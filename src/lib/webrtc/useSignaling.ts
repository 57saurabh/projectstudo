import { useSignalingContext } from './SignalingContext';

export const useSignaling = () => {
    return useSignalingContext();
};
